#!/usr/bin/env python3
"""Extract and validate the JSON payload injected into a generated spyCNV report."""
import json
import sys

html = open(sys.argv[1], encoding="utf-8").read()

# Find the LAST occurrence (the app.js bundle mentions window.spyCNV.init in a
# comment, so the first match is not the bootstrap script).
start = html.rindex("window.spyCNV.init(") + len("window.spyCNV.init(")
brace = html.index("{", start)

# Extract the balanced JSON object (handles strings and escapes).
depth = 0
in_str = False
esc = False
end = brace
while end < len(html):
    c = html[end]
    if in_str:
        if esc:
            esc = False
        elif c == "\\":
            esc = True
        elif c == '"':
            in_str = False
    else:
        if c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                break
    end += 1

payload = json.loads(html[brace : end + 1])
print("sampleId:", payload["sampleId"])

data = payload["data"]
for key in (
    "cytoband", "refseq", "hrd_baf", "hrd_logratio",
    "tso500_baf", "tso500_logratio", "segments",
):
    val = data.get(key)
    if isinstance(val, list):
        print(f"{key}: {len(val)} records, first={val[0] if val else None}")
    else:
        print(f"{key}: {type(val).__name__}, {len(val)} chars" if val else f"{key}: {val}")

# Spot-check record shapes
assert data["hrd_baf"], "expected HRD baf data"
assert data["hrd_logratio"], "expected HRD logratio data"
assert data["tso500_baf"], "expected TSO500 baf data"
assert data["tso500_logratio"], "expected TSO500 logratio data"
assert data["segments"], "expected segments"
assert set(data["hrd_baf"][0]) <= {"contig", "start", "name", "value"}
assert set(data["tso500_baf"][0]) <= {"contig", "start", "name", "value", "gene", "exon", "Tx"}
assert set(data["segments"][0]) <= {"contig", "start", "end", "name", "value"}
assert "chr" in data["cytoband"][:200]
assert "\t" in data["refseq"][:200]

print("OK: payload is valid JSON with the expected shape")
