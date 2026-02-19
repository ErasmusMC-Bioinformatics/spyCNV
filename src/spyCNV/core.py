#!/usr/bin/env python3
import csv
import io
from importlib.resources import files

from jinja2 import Environment, PackageLoader

_APP = "spyCNV"
_PKG = files(_APP)


def read_file(file: str):
    with open(file, "r") as f:
        return f.read()


def write_file(file: str, content: str):
    with open(file, "w") as f:
        f.write(content)


def _load_resource(path_parts: list[str]) -> str:
    content = (_PKG.joinpath(*path_parts)).read_text()
    return content


def _load_tsv(path_parts: list[str]) -> list[dict]:
    content = (_PKG.joinpath(*path_parts)).read_text()
    tsv = list(csv.DictReader(io.StringIO(content), delimiter="\t"))
    return tsv


def render_html(sample_id: str, genome: str = "hg19") -> str:
    """Render html with embedded javascript."""
    env = Environment(loader=PackageLoader(_APP, "templates"))
    template = env.get_template("base.html.jinja2")

    genomespy_js = _load_resource(["static", "genome-spy_core@0.70.0.js"])
    plots = {
        "ideogram": _load_resource(["plots", "ideogramTrack.js"]),
        "geneAnnotation": _load_resource(["plots", "geneAnnotationTrack.js"]),
    }

    data = {
        "cytoband": _load_tsv(["data", f"cytoBand.{genome}.tsv"]),
        "refseq": _load_tsv(["data", f"refSeq_genes_scored_compressed.{genome}.tsv"]),
    }

    spec = {
        "genome": {"name": "hg19"},
        "vconcat": [
            f'ideogramTrack("{data["cytoband"]}")',
            f'geneAnnotationTrack("{data["refseq"]}")',
        ],
    }

    html = template.render(
        sample_id=sample_id,
        genomespy_js=genomespy_js,
        data=data,
        plots=plots,
        spec=spec,
    )
    return html
