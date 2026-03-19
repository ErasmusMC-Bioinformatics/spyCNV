#!/usr/bin/env python3

from pathlib import Path
from typing import Annotated

import typer

from spyCNV.core import render_html, write_file
from spyCNV.io.loaders import create_cnv_data

app = typer.Typer(name="spyCNV", help="", add_completion=False)


@app.command()
def generate(
    sample_id: str = typer.Option(..., "--sample-id", "-s", help="Sample ID"),
    vcf: str | None = typer.Option(None, "--vcf", "-v", help="Path to TSO500 hard-filtered VCF"),
    tn: str | None = typer.Option(None, "--tn", "-t", help="Path to TSO500 tn.tsv.gz (LogRatio)"),
    ballele: str | None = typer.Option(None, "--ballele", "-b", help="Path to HRD bAllele.tsv (BAF)"),
    logratio: str | None = typer.Option(None, "--logratio", "-l", help="Path to HRD logRatio.tsv"),
    segments: str | None = typer.Option(None, "--segments", help="Path to segments file (.seg)"),
):
    typer.echo("Generating HTML report...")
    cnv_data = create_cnv_data(
        sample_id=sample_id,
        tn_file=tn,
        filtered_vcf=vcf,
        logratio_file=logratio,
        ballele_file=ballele,
        segment_file=segments,
    )

    html_content = render_html(sample_id=sample_id, cnv_data=cnv_data)
    out_file = Path(f"{sample_id}.html")
    write_file(str(out_file), html_content)
    typer.echo(f"Report written to {out_file}")


@app.command()
def serve():
    typer.echo("serve html")


if __name__ == "__main__":
    app()
