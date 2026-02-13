#!/usr/bin/env python3

import typer

app = typer.Typer(name="spyCNV", help="", add_completion=False)


@app.command()
def generate():
    typer.echo("generate html")


@app.command()
def serve():
    typer.echo("serve html")


if __name__ == "__main__":
    app()
