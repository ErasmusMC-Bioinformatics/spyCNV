#!/usr/bin/env python3
import os
from pathlib import Path

from spyCNV.core import render_html, write_file
from spyCNV.io.loaders import CNVData, CNVRecord, load_resource


def test_render():
    sample_id = "TEST-sample"
    output_path = f"{sample_id}.html"
    cnv_data = CNVData(**{"baf": [], "logratio": []})
    html_content = render_html(sample_id, cnv_data, "hg19")
    write_file(output_path, html_content)

    assert os.path.exists(output_path)
    # os.unlink(output_path)
    # assert not os.path.exists(output_path)


def test_load_tsv():
    genome = "hg19"
    data = {
        "cytoband": load_resource(Path("data", f"cytoBand.{genome}.tsv")),
        "refseq": load_resource(
            Path("data", f"refSeq_genes_scored_compressed.{genome}.tsv")
        ),
    }
    assert len(data["cytoband"]) == 30794
    assert len(data["refseq"]) == 2896192
