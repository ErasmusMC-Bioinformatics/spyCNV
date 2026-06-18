# spyCNV

spyCNV is a modern copy number variation (CNV) analysis tool that produces standalone HTML reports. It can be used both as a command‑line application and imported as a Python library in pipelines.
<img width="1920" height="799" alt="image" src="https://github.com/user-attachments/assets/092b1f90-cf60-468e-b2b8-b788a3b692e8" />
[Live Demo](https://dznnx.github.io/spyCNV/)


## Features

- Gene annotation prioritization based on citation counts, with boosted scores for TSO500 oncogenes.
- Generation of interactive, self‑contained HTML reports.
- Support for both CLI usage and programmatic integration.
- Lightweight, pure‑Python implementation with no external runtime dependencies.

## Installation

### Using `devenv`

If the project is managed with `devenv`, run:

```bash
devenv up
```

This will set up a reproducible development environment defined in `devenv.nix`.

### From `pyproject.toml`

Install the package in a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Alternatively, install directly from the source repository:

```bash
pip install git+https://github.com/dznnx/spyCNV.git
# pin commit with commit hash
spyCNV @ git+https://github.com/dznnx/spyCNV.git@6f70deaa9b4267dd046313c9232769e48cf78131
```

Or include in requirements.txt:
```
spyCNV @ git+https://github.com/dznnx/spyCNV.git
# pin commit with commit hash
spyCNV @ git+https://github.com/dznnx/spyCNV.git@6f70deaa9b4267dd046313c9232769e48cf78131
```

## Usage

### Command‑line interface

```bash
spycnv run \
    --input path/to/bam_or_cram \
    --reference path/to/reference.fasta \
    --output report.html
```

Options:

- `--input` – Input alignment file (BAM/CRAM).
- `--reference` – Reference genome FASTA.
- `--output` – Destination HTML report file.

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

Running the following command generates a report for `sample.bam`:

```bash
spycnv run --input sample.bam --reference hg38.fa --output sample_report.html
```

The resulting `sample_report.html` contains interactive plots, a table of prioritized gene annotations, and download links for raw results.

## License

This project is licensed under the MIT License.

## Acknowledgements

- Inspired by ReconCNV and GenomeSpy.
