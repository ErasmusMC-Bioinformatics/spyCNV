#!/usr/bin/env python3


from typing import Annotated

import typer

from spyCNV.core import generate_html

app = typer.Typer(name="spyCNV", help="", add_completion=False)


@app.command()
def generate(
    sample_id: Annotated[str, typer.Option("--sample-id", "-s", help="Sample ID")],
    vcf: Annotated[
        str | None, typer.Option("--vcf", "-v", help="Path to TSO500 hard-filtered VCF")
    ] = None,
    tn: Annotated[
        str | None,
        typer.Option("--tn", "-t", help="Path to TSO500 tn.tsv.gz (LogRatio)"),
    ] = None,
    ballele: Annotated[
        str | None,
        typer.Option("--ballele", "-b", help="Path to HRD bAllele.tsv (BAF)"),
    ] = None,
    logratio: Annotated[
        str | None, typer.Option("--logratio", "-l", help="Path to HRD logRatio.tsv")
    ] = None,
    segments: Annotated[
        str | None, typer.Option("--segments", help="Path to segments file (.seg)")
    ] = None,
    output_dir: Annotated[
        str | None, typer.Option("--output-dir", help="Path to output directory")
    ] = ".",
):
    typer.echo("Generating HTML report...")
    if not output_dir:
        output_dir = "."
    generate_html(
        sample_id=sample_id,
        tn=tn,
        vcf=vcf,
        logratio=logratio,
        ballele=ballele,
        segments=segments,
        output_path=output_dir,
    )

    typer.echo(f"Report written successfully.")


@app.command()
def serve():
    typer.echo("serve html")


if __name__ == "__main__":
    app()
