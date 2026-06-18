# spyCNV

spyCNV is a modern copy number variation (CNV) analysis tool that produces standalone HTML reports. It can be used both as a command‑line application and imported as a Python library in pipelines. 
<img width="1920" height="799" alt="image" src="https://github.com/user-attachments/assets/092b1f90-cf60-468e-b2b8-b788a3b692e8" />
[Live Demo](https://dznnx.github.io/spyCNV/)


## Features

- Generation of interactive, self‑contained HTML reports.
- Support for both CLI usage and programmatic integration.
- Lightweight, pure‑Python implementation with no external runtime dependencies.
- Out‑of‑the‑box support for TSO500 pipeline outputs.


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
Usage
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
| `--segments`   | Path  | to segments file (.seg)             |
| `--output-dir` | Path  | to output directory (default:.)     |



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

Running the following command generates a report:

```bash
spycnv generate --sample-id SAMPLE01 \
    --vcf DnaDragenCaller/SAMPLE01/SAMPLE01.hard-filtered.vcf.gz \
    --tn DnaDragenCaller/SAMPLE01/SAMPLE01.tn.tsv.gz \
    --ballele Gis/SAMPLE01/SAMPLE01_bAllele.tsv \
    --logratio Gis/SAMPLE01/SAMPLE01_logRatio.tsv \
    --segments DnaDragenCaller/SAMPLE01/SAMPLE01.seg.merged.called
```

The resulting `SAMPLE01.spyCNV.html` contains interactive plots, a table of prioritized gene annotations.

## License

This project is licensed under the MIT License.

## Acknowledgements

- Inspired by ![reconCNV](https://github.com/rghu/reconCNV)
- Built with ![genome-spy](https://github.com/genome-spy/genome-spy).
