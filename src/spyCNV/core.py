#!/usr/bin/env python3

from jinja2 import Environment, PackageLoader


def read_file(file: str):
    with open(file, "r") as f:
        return f.read()


def write_file(file: str, content: str):
    with open(file, "w") as f:
        f.write(content)


def render(sample_id: str, spec: str) -> str:

    env = Environment(loader=PackageLoader("spyCNV", "templates"))
    template = env.get_template("base.html.jinja2")
    html = template.render(sample_id=sample_id, spec=spec)
    return html
