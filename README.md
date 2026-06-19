# spyCNV

spyCNV is a modern copy number variation (CNV) analysis tool that produces standalone HTML reports. It can be used both as a command‑line application and imported as a Python library in pipelines. 
<img width="1920" height="799" alt="image" src="https://github.com/user-attachments/assets/092b1f90-cf60-468e-b2b8-b788a3b692e8" />
[Live Demo](https://ErasmusMC-Bioinformatics.github.io/spyCNV/) (the test data is fictive and might contain unrealistic oncogenic patterns)


## Features

- Generation of interactive, self‑contained HTML reports.
- Support for both CLI usage and programmatic integration.
- Lightweight Python implementation with minimal external dependencies (jinja2, pydantic, typer).
- Out‑of‑the‑box support for Illumina DRAGEN TSO500 pipeline outputs.


## Installation

### Using `devenv`

If the project is managed with `devenv`, run:

```bash
git clone git@github.com:ErasmusMC-Bioinformatics/spyCNV.git
cd spyCNV

devenv shell
```

This will set up a reproducible development environment defined in `devenv.nix`.

### Using `uv`
```bash
git clone git@github.com:ErasmusMC-Bioinformatics/spyCNV.git
cd spyCNV

uv sync
source .venv/bin/activate
```

### Using `pip`
```bash
git clone git@github.com:ErasmusMC-Bioinformatics/spyCNV.git
cd spyCNV

python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Alternatively, install directly from the source repository:

```bash
pip install git+https://github.com/ErasmusMC-Bioinformatics/spyCNV.git
```
Or pin a specific commit:
```bash
pip install git+https://github.com/ErasmusMC-Bioinformatics/spyCNV.git@0a52fc08e3b2d9a3e6de84506c7edeb246bdae01
```

Or include in requirements.txt:
```
spyCNV @ git+https://github.com/ErasmusMC-Bioinformatics/spyCNV.git
# pin commit with commit hash (replace with desired commit hash)
spyCNV @ git+https://github.com/ErasmusMC-Bioinformatics/spyCNV.git@0a52fc08e3b2d9a3e6de84506c7edeb246bdae01
```
Or pyproject.toml:
```toml
[project]
dependencies = [
    "spyCNV @ git+https://github.com/ErasmusMC-Bioinformatics/spyCNV.git",
]
```

## Usage
Command‑line interface

```bash
spy generate [OPTIONS]
```

Options:

| Option         | Short | Description                         |
| ------------   | ----- | ----------------------------------- |
| `--sample-id`  | `-s`  | Sample ID                           |
| `--vcf`        | `-v`  | Path to TSO500 hard-filtered VCF    |
| `--tn`         | `-t`  | Path to TSO500 tn.tsv.gz (LogRatio) |
| `--ballele`    | `-b`  | Path to HRD bAllele.tsv (BAF)       |
| `--logratio`   | `-l`  | Path to HRD logRatio.tsv            |
| `--segments`   |       | Path to segments file (.seg)             |
| `--output-dir` |       | Path to output directory (default:.)     |



### As a library

```python
from spyCNV.core import generate_html

# Generate HTML report for a sample
html = generate_html(
    sample_id="sample1",
    vcf=None,
    tn=None,
    ballele=None,
    logratio=None,
    segments=None,
    output_path="reports"
)
```

## Example

### Quick test
After installing, you can immediately generate a demo report using the included test data:
```bash
spy generate --sample-id SXX-XXXT \
    --vcf tests/data/SXX-XXXT.hard-filtered.vcf.gz \
    --tn tests/data/SXX-XXXT.tn.tsv.gz \
    --ballele tests/data/SXX-XXXT_bAllele.tsv \
    --logratio tests/data/SXX-XXXT_logRatio.tsv \
    --segments tests/data/SXX-XXXT.seg.called.merged
```
Output: `SXX-XXXT.spyCNV.html`

### Illumina DRAGEN TSO500
Example command matching the TSO500 output folder structure:
```bash
spy generate --sample-id SAMPLE01 \
    --vcf DnaDragenCaller/SAMPLE01/SAMPLE01.hard-filtered.vcf.gz \
    --tn DnaDragenCaller/SAMPLE01/SAMPLE01.tn.tsv.gz \
    --ballele Gis/SAMPLE01/SAMPLE01_bAllele.tsv \
    --logratio Gis/SAMPLE01/SAMPLE01_logRatio.tsv \
    --segments DnaDragenCaller/SAMPLE01/SAMPLE01.seg.called.merged
```
Output: `SAMPLE01.spyCNV.html`

## License

This project is licensed under the MIT License.

## Acknowledgements

- Inspired by [reconCNV](https://github.com/rghu/reconCNV)
- Built with [genome-spy](https://github.com/genome-spy/genome-spy).
