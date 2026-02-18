#!/usr/bin/env python3
import json
import os

from spyCNV.core import render, write_file


def test_render():
    sample_id = "M25-XXXXT"
    output_path = f"{sample_id}.html"
    html_content = render(sample_id, json.dumps({1: "one", 2: "two"}))
    write_file(output_path, html_content)

    assert os.path.exists(output_path)
    os.unlink(output_path)
    assert not os.path.exists(output_path)
