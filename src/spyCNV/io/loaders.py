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


class CNVRecord(BaseModel):
    contig: str
    start: int
    name: str
    value: float

    model_config: ClassVar[ConfigDict] = {"populate_by_name": True}


class CNVData(BaseModel):
    baf: list[CNVRecord]
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


def parse_vcf(rows: list[dict[str, str]]) -> list[CNVRecord]:
    """
    Parse TSO500 BAF from hard-filtered VCF rows.
    Only PASS variants are included. Extracts VF or AF from FORMAT/SAMPLE.
    POS is used as name since ID is always '.'.
    """
    records: list[CNVRecord] = []

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
            CNVRecord(
                **{
                    "contig": row["CHROM"].replace("chr", ""),
                    "start": pos,
                    "name": f"pos_{pos}",
                    "value": allele_freq,
                }
            )
        )

    return records


def parse_generic_tsv(rows: list[dict[str, str]]) -> list[CNVRecord]:
    """Parse headerless bAllele and logRatio files."""
    records: list[CNVRecord] = []
    for row in rows:
        try:
            records.append(
                CNVRecord(
                    **{
                        "contig": row["chrom"].replace("chr", ""),
                        "start": int(row["pos"]),
                        "name": row["name"],
                        "value": float(row["value"]),
                    }
                )
            )
        except (ValueError, TypeError, KeyError):
            continue
    return records


def parse_tn(rows: list[dict[str, str]], sample_id: str) -> list[CNVRecord]:
    """Parse TN TSV (logratio) file with header."""
    records: list[CNVRecord] = []

    if not rows:
        return records

    for row in rows:
        try:
            records.append(
                CNVRecord(
                    **{
                        "contig": row["contig"].replace("chr", ""),
                        "start": int(row["start"]),
                        "name": row["name"],
                        "value": float(row[sample_id]),
                    }
                )
            )
        except (ValueError, TypeError, KeyError):
            continue

    return records


def create_cnv_data(
    sample_id: str,
    tn_file: str | None = None,
    filtered_vcf: str | None = None,
    logratio_file: str | None = None,
    ballele_file: str | None = None,
) -> CNVData:
    baf_records = []
    logratio_records = []

    if ballele_file and logratio_file:
        baf_rows = load_input(
            ballele_file, type="tsv", header=["chrom", "pos", "name", "value"]
        )
        baf_records = parse_generic_tsv(baf_rows)

        lr_rows = load_input(
            logratio_file, type="tsv", header=["chrom", "pos", "name", "value"]
        )
        logratio_records = parse_generic_tsv(lr_rows)
    elif filtered_vcf and tn_file:
        vcf_rows = load_input(filtered_vcf, type="vcf")
        baf_records = parse_vcf(vcf_rows)

        tn_rows = load_input(tn_file, type="tsv")
        logratio_records = parse_tn(tn_rows, sample_id)

    return CNVData(baf=baf_records, logratio=logratio_records)  # type: ignore
