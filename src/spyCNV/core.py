#!/usr/bin/env python3

from importlib.resources import files

from jinja2 import Environment, PackageLoader

_app = "spyCNV"
_pkg = files(_app)


def read_file(file: str):
    with open(file, "r") as f:
        return f.read()


def write_file(file: str, content: str):
    with open(file, "w") as f:
        f.write(content)


def _load_resource(path_parts: list[str]) -> str:
    content = (_pkg.joinpath(*path_parts)).read_text()
    return content


def render_html(sample_id: str, genome: str = "hg19") -> str:
    """Render html with embedded javascript."""
    env = Environment(loader=PackageLoader(_app, "templates"))
    template = env.get_template("base.html.jinja2")

    genomespy_js = _load_resource(["static", "genome-spy_core@0.70.0.js"])
    plots_js = (
        _load_resource(["plots", "ideogramTrack.js"])
        + _load_resource(["plots", "geneAnnotationTrack.js"]),
    )
    cytoband_data = _load_resource(["data", f"cytoBand.{genome}.tsv"])
    refseq_gene_data = _load_resource(
        ["data", f"refSeq_genes_scored_compressed.{genome}.tsv"]
    )

    spec = {
        "genome": {"name": "hg19"},
        "vconcat": [
            f'ideogramTrack("{cytoband_data}")',
            f'geneAnnotationTrack("{refseq_gene_data}")',
        ],
    }

    html = template.render(
        sample_id=sample_id,
        genomespy_js=genomespy_js,
        plots_js=plots_js,
        spec=spec,
    )
    return html
