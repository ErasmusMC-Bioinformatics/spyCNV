#!/usr/bin/env python3
import os

from spyCNV.core import _load_resource, render_html, write_file


def test_render():
    sample_id = "TEST-sample"
    output_path = f"{sample_id}.html"
    html_content = render_html(sample_id, "hg19")
    write_file(output_path, html_content)

    assert os.path.exists(output_path)
    os.unlink(output_path)
    assert not os.path.exists(output_path)


def test_load_resource():
    plot_ideomTrack = _load_resource(["plots", "ideogramTrack.js"])
    gs_0_70 = _load_resource(["static", "genome-spy_core@0.70.0.js"])

    assert len(plot_ideomTrack) == 3504
    assert len(gs_0_70) == 777136
