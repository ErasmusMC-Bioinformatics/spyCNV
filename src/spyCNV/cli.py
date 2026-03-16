#!/usr/bin/env python3

from pathlib import Path
from typing import Annotated

import typer

from spyCNV.core import render_html, write_file
from spyCNV.io.loaders import create_cnv_data

app = typer.Typer(name="spyCNV", help="", add_completion=False)


@app.command()
def generate(
    sample_id: Annotated[str, typer.Option("--sample-id", "-s", help="Sample ID")],
    vcf: Annotated[
        str | None,
        typer.Option(None, "--vcf", "-v", help="Path to TSO500 hard-filtered VCF"),
    ],
    tn: Annotated[
        str | None,
        typer.Option("--tn", "-t", help="Path to TSO500 tn.tsv.gz (LogRatio)"),
    ],
    ballele: Annotated[
        str | None,
        typer.Option("--ballele", "-b", help="Path to HRD bAllele.tsv (BAF)"),
    ],
    logratio: Annotated[
        str | None,
        typer.Option("--logratio", "-l", help="Path to HRD logRatio.tsv"),
    ],
):
    typer.echo("Generating HTML report...")
    cnv_data = create_cnv_data(
        sample_id=sample_id,
        tn_file=tn,
        filtered_vcf=vcf,
        logratio_file=logratio,
        ballele_file=ballele,
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
