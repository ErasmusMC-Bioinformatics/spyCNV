#!/usr/bin/env python3
import bisect
import csv
import gzip
import io
import json
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
    gene: str | None = None
    exon: str | None = None
    transcript: str | None = None

    model_config: ClassVar[ConfigDict] = {"populate_by_name": True}


class SegmentRecord(BaseModel):
    contig: str
    start: int
    end: int
    value: float
    name: str


class CNVDict(BaseModel):
    baf: list[CNVRecord]
    logratio: list[CNVRecord]

    def filter_logratio_by_baf(self) -> "CNVDict":
        baf_positions = {(r.contig, r.start) for r in self.baf}
        return self.model_copy(
            update={
                "logratio": [
                    r for r in self.logratio if (r.contig, r.start) in baf_positions
                ]
            }
        )


class CNVData(BaseModel):
    hrd: CNVDict | None = None
    tso500: CNVDict | None = None
    segments: list[SegmentRecord]


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
                contig=row["CHROM"].replace("chr", ""),
                start=pos,
                name=f"pos_{pos}",
                value=allele_freq,
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
                    contig=row["chrom"].replace("chr", ""),
                    start=int(row["pos"]),
                    name=row["name"],
                    value=float(row["value"]),
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
                    contig=row["contig"].replace("chr", ""),
                    start=int(row["start"]),
                    name=row["name"],
                    value=float(row[sample_id]),
                )
            )
        except (ValueError, TypeError, KeyError):
            continue

    return records


def parse_segments(rows: list[dict[str, str]]) -> list[SegmentRecord]:
    """Parse .seg file"""
    records: list[SegmentRecord] = []
    for row in rows:
        try:
            contig = row["Chromosome"].replace("chr", "")
            start = int(row["Start"])
            end = int(row["End"])
            name = row.get("Segment_Name", "")
            value = round(math.log2(float(row["Segment_Mean"])), 3)
            records.append(
                SegmentRecord(
                    contig=contig,
                    start=start,
                    end=end,
                    name=name,
                    value=value,
                )
            )
        except (ValueError, TypeError, KeyError):
            continue
    return records


def load_exon_data() -> dict[str, list[tuple[int, int, dict[str, str]]]]:
    try:
        manifest_str = load_resource("data/manifest_from_ncbiRefSeq.bed")
    except Exception:
        return {}

    intervals: dict[str, list[tuple[int, int, dict[str, str]]]] = {}
    for line in manifest_str.splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.strip().split("\t")
        if len(parts) >= 4:
            contig = parts[0].replace("chr", "")
            try:
                start = int(parts[1])
                end = int(parts[2])
                name = parts[3]
            except ValueError:
                continue

            name_parts = name.split("_")
            if len(name_parts) >= 3 and (
                "Exon" in name_parts[1] or "Intron" in name_parts[1]
            ):
                gene = name_parts[0]
                exon = (
                    name_parts[1].replace("Exon", "Exon ").replace("Intron", "Intron ")
                )
                transcript = "_".join(name_parts[2:])

                if contig not in intervals:
                    intervals[contig] = []
                intervals[contig].append(
                    (
                        start + 1,
                        end,
                        {"gene": gene, "exon": exon, "transcript": transcript},
                    )
                )
    return intervals


def annotate_records(
    records: list[CNVRecord], manifest: dict[str, list[tuple[int, int, dict[str, str]]]]
):
    if not manifest:
        return

    sorted_manifest = {}
    manifest_starts = {}
    for contig, ivs in manifest.items():
        sorted_ivs = sorted(ivs, key=lambda x: x[0])
        sorted_manifest[contig] = sorted_ivs
        manifest_starts[contig] = [iv[0] for iv in sorted_ivs]

    for r in records:
        if r.contig in sorted_manifest:
            ivs = sorted_manifest[r.contig]
            starts = manifest_starts[r.contig]
            idx = bisect.bisect_right(starts, r.start)
            for i in range(idx - 1, max(-1, idx - 5), -1):
                start, end, anno = ivs[i]
                if start <= r.start <= end:
                    r.gene = anno["gene"]
                    r.exon = anno["exon"]
                    r.transcript = anno["transcript"]
                    break


def create_cnv_data(
    sample_id: str,
    tn_file: str | None = None,
    filtered_vcf: str | None = None,
    logratio_file: str | None = None,
    ballele_file: str | None = None,
    segment_file: str | None = None,
) -> CNVData:
    """Combine TSO500 and/or HRD and segments datasets into a single CNVData object"""
    hrd_dict: CNVDict | None = None
    tso500_dict: CNVDict | None = None
    segments: list[SegmentRecord] = []

    manifest = load_exon_data()

    if ballele_file and logratio_file:
        baf_rows = load_input(
            ballele_file, type="tsv", header=["chrom", "pos", "name", "value"]
        )
        baf_records = parse_generic_tsv(baf_rows)

        lr_rows = load_input(
            logratio_file, type="tsv", header=["chrom", "pos", "end", "name", "value"]
        )
        logratio_records = parse_generic_tsv(lr_rows)
        hrd_dict = CNVDict(
            baf=baf_records, logratio=logratio_records
        ).filter_logratio_by_baf()

        annotate_records(hrd_dict.baf, manifest)
        annotate_records(hrd_dict.logratio, manifest)

    if filtered_vcf and tn_file:
        vcf_rows = load_input(filtered_vcf, type="vcf")
        baf_records = parse_vcf(vcf_rows)

        tn_rows = load_input(tn_file, type="tsv")
        logratio_records = parse_tn(tn_rows, sample_id)

        annotate_records(baf_records, manifest)
        annotate_records(logratio_records, manifest)

        tso500_dict = CNVDict(baf=baf_records, logratio=logratio_records)

    if segment_file:
        seg_rows = load_input(segment_file, type="tsv")
        segments = parse_segments(seg_rows)

    return CNVData(hrd=hrd_dict, tso500=tso500_dict, segments=segments)
