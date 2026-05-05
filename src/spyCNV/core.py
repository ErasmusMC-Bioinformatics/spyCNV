#!/usr/bin/env python3
import json
from importlib.resources import files
from pathlib import Path

from jinja2 import Environment, PackageLoader

from spyCNV.io.loaders import CNVData, create_cnv_data, load_resource

_APP = "spyCNV"
_PKG = files(_APP)


def write_file(file: str, content: str):
    with open(file, "w") as f:
        f.write(content)


def generate_html(
    sample_id: str,
    vcf: str | None,
    tn: str | None,
    ballele: str | None,
    logratio: str | None,
    segments: str | None,
    output_path: str,
):
    cnv_data = create_cnv_data(
        sample_id=sample_id,
        tn_file=tn,
        filtered_vcf=vcf,
        logratio_file=logratio,
        ballele_file=ballele,
        segment_file=segments,
    )
    html_content = render_html(sample_id=sample_id, cnv_data=cnv_data)
    out_file = Path(output_path, f"{sample_id}.spyCNV.html")
    write_file(str(out_file), html_content)


def render_html(sample_id: str, cnv_data: CNVData, genome: str = "hg19") -> str:
    """Render html with embedded javascript."""
    env = Environment(loader=PackageLoader(_APP, "templates"))
    template = env.get_template("base.html.jinja2")

    genomespy_js = load_resource(Path("static", "genome-spy_core@0.75.0.js"))
    plots = {
        "ideogram": load_resource(Path("plots", "ideogramTrack.js")),
        "logratio": load_resource(Path("plots", "logratioTrack.js")),
        "baf": load_resource(Path("plots", "bAlleleFrequencyTrack.js")),
        "geneAnnotation": load_resource(Path("plots", "geneAnnotationTrack.js")),
    }

    data: dict[str, str | list[dict] | None] = {
        "cytoband": load_resource(Path("data", f"cytoBand.{genome}.tsv")),
        "refseq": load_resource(
            Path("data", f"refSeq_genes_scored_compressed.{genome}.tsv")
        ),
        "hrd_baf": [
            {"contig": r.contig, "start": r.start, "name": r.name, "value": r.value}
            for r in cnv_data.hrd.baf
        ]
        if cnv_data.hrd
        else None,
        "hrd_logratio": [
            {"contig": r.contig, "start": r.start, "name": r.name, "value": r.value}
            for r in cnv_data.hrd.logratio
        ]
        if cnv_data.hrd
        else None,
        "tso500_baf": [
            {
                "contig": r.contig,
                "start": r.start,
                "name": r.name,
                "value": r.value,
                "gene": r.gene,
                "exon": r.exon,
                "Tx": r.transcript,
            }
            for r in cnv_data.tso500.baf
        ]
        if cnv_data.tso500
        else None,
        "tso500_logratio": [
            {
                "contig": r.contig,
                "start": r.start,
                "name": r.name,
                "value": r.value,
                "gene": r.gene,
                "exon": r.exon,
                "Tx": r.transcript,
            }
            for r in cnv_data.tso500.logratio
        ]
        if cnv_data.tso500
        else None,
        "segments": [
            {
                "contig": r.contig,
                "start": r.start,
                "end": r.end,
                "name": r.name,
                "value": r.value,
            }
            for r in cnv_data.segments
        ]
        if cnv_data.segments
        else None,
    }

    html = template.render(
        sample_id=sample_id,
        genomespy_js=genomespy_js,
        data=data,
        plots=plots,
    )
    return html
