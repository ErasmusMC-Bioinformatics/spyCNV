#!/usr/bin/env python3
import csv
import gzip
import io
import json
import math
from importlib.resources import files
from pathlib import Path
from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict

_PKG = files("spyCNV")


class BafRecord(BaseModel):
    chrom: str
    pos: int
    vaf: float

    model_config: ClassVar[ConfigDict] = {"populate_by_name": True}


class CNVRecord(BaseModel):
    contig: str
    start: int
    name: str
    value: float

    model_config: ClassVar[ConfigDict] = {"populate_by_name": True}


class CNVData(BaseModel):
    baf: list[BafRecord]
    logratio: list[CNVRecord]


def _open_file(filepath: Path | str) -> io.TextIOWrapper | io.StringIO:
    """Open a file or a .gz compressed file."""
    path = Path(filepath)
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return open(path, "r", encoding="utf-8")


def load_resource(filepath: Path | str) -> str:
    """Load package assets."""
    path = _PKG / str(filepath)
    resolved = Path(str(path))
    with _open_file(resolved) as f:
        return f.read()


def load_input(
    filepath: Path | str,
    type: Literal["tsv", "vcf", "json"],
    header: list[str] | None = None,
) -> list[dict[str, str]]:
    """
    Input file loader. Loads TSV, VCF, and JSON format.
    Supports gzipped files.

    TSV files require a header;
        if header == None the first non-comment line will be used.
    """
    with _open_file(filepath) as f:
        content = f.read()

    if type == "tsv":
        lines = [l for l in content.splitlines() if not l.startswith("#")]
        if header:
            reader = csv.DictReader(lines, fieldnames=header, delimiter="\t")
        else:
            reader = csv.DictReader(lines, delimiter="\t")
        return list(reader)
    elif type == "vcf":
        lines = [l for l in content.splitlines() if not l.startswith("##")]
        if not lines:
            return []
        lines[0] = lines[0].lstrip("#")
        reader = csv.DictReader(lines, delimiter="\t")
        return list(reader)
    elif type == "json":
        return json.loads(content)
    else:
        raise ValueError(f"Unsupported type: {type}")


def parse_vcf(rows: list[dict[str, str]]) -> list[BafRecord]:
    """
    Parse TSO500 BAF from hard-filtered VCF rows.
    Only PASS variants are included. Extracts VF or AF from FORMAT/SAMPLE.
    POS is used as name since ID is always '.'.
    """
    records: list[BafRecord] = []

    if not rows:
        return records

    samplename_column = list(rows[0].keys())[-1]

    for row in rows:
        if row.get("FILTER", "") != "PASS":
            continue

        format_keys = row["FORMAT"].split(":")
        format_vals = row[samplename_column].split(":")
        format_dict = dict(zip(format_keys, format_vals))

        try:
            pos = int(row["POS"])
            allele_freq = float(format_dict["AF"])
        except (ValueError, TypeError):
            continue

        records.append(
            BafRecord(
                chrom=row["CHROM"].replace("chr", ""),
                pos=pos,
                vaf=allele_freq,
            )
        )

    return records


def parse_hrd_baf(filepath: Path | str) -> list[BafRecord]:
    """
    Parse HRD BAF from headerless bAllele.tsv.
    Columns: chrom, start, rs, freq
    """
    rows = _parse_headerless_tsv(filepath, _BAllele_FIELDS)
    records = []

    for row in rows:
        rs = row.get("rs", "")
        freq_str = row.get("freq", "")

        if not rs or not freq_str:
            continue

        try:
            freq = float(freq_str)
        except ValueError:
            continue

        records.append(
            CNVRecord(
                contig=row["chrom"].replace("chr", ""),
                start=int(row["start"]),
                name=rs,
                value=freq,
            )
        )

    return records


def _parse_headerless_tsv(
    filepath: Path | str, fieldnames: list[str]
) -> list[dict[str, str]]:
    """Load a headerless TSV file with explicit field names."""
    with _open_file(filepath) as f:
        content = f.read()
    reader = csv.DictReader(io.StringIO(content), fieldnames=fieldnames, delimiter="\t")
    return list(reader)


_BAllele_FIELDS = ["chrom", "start", "rs", "freq"]
_LOGRATIO_FIELDS = ["chrom", "start", "end", "rs", "log2"]


def parse_hrd_logratio(filepath: Path | str) -> list[CNVRecord]:
    """
    Parse HRD logRatio from headerless logRatio.tsv.
    Columns: chrom, start, end, rs, log2
    """
    rows = _parse_headerless_tsv(filepath, _LOGRATIO_FIELDS)
    records = []

    for row in rows:
        rs = row.get("rs", "")
        log2_str = row.get("log2", "")

        if not rs or not log2_str:
            continue

        try:
            log2 = float(log2_str)
        except ValueError:
            continue

        records.append(
            CNVRecord(
                contig=row["chrom"].replace("chr", ""),
                start=int(row["start"]),
                name=rs,
                value=log2,
            )
        )

    return records


def parse_logratio(rows: list[dict[str, str]]) -> list[CNVRecord]:
    """
    Parse TSO500 logRatio from tn.tsv.gz rows.
    Expected columns: contig, start, stop, name, <sample_col>, <last_col>
    The normalized count is the second-to-last column (fieldnames[-2]).
    Skips header lines starting with '#sex' (handled by load_input).
    """
    records = []

    if not rows:
        return records

    # The sample column is the second-to-last field, matching create_cnr_from_tn logic
    fieldnames = list(rows[0].keys())
    sample_column = fieldnames[-2]

    for row in rows:
        contig = row["contig"]
        chrom = contig.replace("chr", "")

        gene = row["name"]
        # Strip the contig suffix from gene name (e.g. "GENE-chr1" -> "GENE")
        gene_cut = gene.find(f"-{contig}")
        if gene_cut >= 0:
            gene = gene[:gene_cut]

        norm_count_str = row.get(sample_column, "")
        try:
            norm_count = float(norm_count_str)
        except ValueError:
            continue

        records.append(
            CNVRecord(
                contig=chrom,
                start=int(row["start"]),
                name=gene,
                value=norm_count,
            )
        )

    return records


def create_cnv_data(
    tn_file: Path | str,
    filtered_vcf: Path | str,
    logratio_file: Path | str,
    ballele_file: Path | str,
) -> CNVData:
    """
    Create a CNVData object from TSO500 and HRD input files.
    BAF and logRatio records from both sources are combined and sorted
    by contig and start position.
    """
    tso_baf = parse_vcf(load_input(filtered_vcf, "vcf"))
    hrd_baf = parse_hrd_baf(ballele_file)

    tso_logratio = parse_logratio(load_input(tn_file, "tsv"))
    hrd_logratio = parse_hrd_logratio(logratio_file)

    def sort_key(r: CNVRecord) -> tuple[int | str, int]:
        return (int(r.contig) if r.contig.isnumeric() else ord(r.contig[0]), r.start)

    baf = sorted(tso_baf + hrd_baf, key=sort_key)
    logratio = sorted(tso_logratio + hrd_logratio, key=sort_key)

    return CNVData(baf=baf, logratio=logratio)
