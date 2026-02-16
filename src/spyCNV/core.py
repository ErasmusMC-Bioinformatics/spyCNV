#!/usr/bin/env python3

import json

from jinja2 import Environment, FileSystemLoader


def read_file(file: str):
    with open(file, "r") as f:
        return f.read()


def write_file(file: str, content: str):
    with open(file, "w") as f:
        f.write(content)


def render(sample_id, spec):
    js_content = read_file("static/genome-spy_core@0.64.x.js")

    env = Environment(loader=FileSystemLoader("templates"))
    template = env.get_template("base.html.jinja2")
    html = template.render(sample_id=sample_id, genomespy_js=js_content, spec=spec)
    return html


sample_id = "M25-XXXXT"
html = render(sample_id, json.dumps({1: "one", 2: "two"}))
write_file(f"{sample_id}.html", html)
