#!/usr/bin/env python3


import typer

from spyCNV.core import generate_html

app = typer.Typer(name="spyCNV", help="", add_completion=False)


@app.command()
def generate(
    sample_id: str = typer.Option(..., "--sample-id", "-s", help="Sample ID"),
    vcf: str | None = typer.Option(
        None, "--vcf", "-v", help="Path to TSO500 hard-filtered VCF"
    ),
    tn: str | None = typer.Option(
        None, "--tn", "-t", help="Path to TSO500 tn.tsv.gz (LogRatio)"
    ),
    ballele: str | None = typer.Option(
        None, "--ballele", "-b", help="Path to HRD bAllele.tsv (BAF)"
    ),
    logratio: str | None = typer.Option(
        None, "--logratio", "-l", help="Path to HRD logRatio.tsv"
    ),
    segments: str | None = typer.Option(
        None, "--segments", help="Path to segments file (.seg)"
    ),
    output_dir: str | None = typer.Option(
        ".", "--output-dir", help="Path to output directory"
    ),
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
