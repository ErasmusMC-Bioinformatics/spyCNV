#!/usr/bin/env python3
from pathlib import Path

from spyCNV.io.loaders import (
    CNVRecord,
    _open_file,
    create_cnv_data,
    load_input,
    load_resource,
    parse_generic_tsv,
    parse_tn,
    parse_vcf,
)

BAF_TSV = Path("tests/data/SXX-XXXT_bAllele.tsv")
TN_TSV = Path("tests/data/SXX-XXXT.tn.tsv.gz")
HARDFILTERED_VCF = Path("tests/data/SXX-XXXT.hard-filtered.vcf.gz")


# def test_load_resource():
#     plot_ideomTrack = load_resource(Path("plots", "ideogramTrack.js"))
#     gs_0_70 = load_resource(Path("static", "genome-spy_core@0.70.0.js"))

#     assert len(plot_ideomTrack) == 3472
#     assert len(gs_0_70) == 777136


def test_open_file():
    with _open_file(BAF_TSV) as fh:
        assert len(fh.read()) == 885143


class TestLoadInput:
    def test_load_input_tsv_without_header(self):
        result = load_input(
            BAF_TSV, type="tsv", header=["chrom", "pos", "name", "value"]
        )
        assert isinstance(result, list)
        assert all(isinstance(row, dict) for row in result)
        assert result[0] == {
            "chrom": "chr1",
            "pos": "841085",
            "name": "rs1574243",
            "value": "0.0",
        }

    def test_load_input_tsv_with_header_and_comments(self):
        result = load_input(TN_TSV, type="tsv")
        assert isinstance(result, list)
        assert all(isinstance(row, dict) for row in result)
        assert result[0] == {
            "contig": "chr1",
            "start": "2488102",
            "stop": "2488174",
            "name": "TNFRSF14-chr1.0",
            "SXX-XXXT": "0.7692201318004654",
            "improper_pairs": "16",
        }

    def test_load_input_vcf(self):
        result = load_input(HARDFILTERED_VCF, type="vcf")
        assert isinstance(result, list)
        assert all(isinstance(row, dict) for row in result)
        assert result[0] == {
            "CHROM": "chr1",
            "POS": "2488139",
            "ID": ".",
            "REF": "G",
            "ALT": "C",
            "QUAL": ".",
            "FILTER": "weak_evidence",
            "INFO": "DP=178;MQ=247.75;FractionInformativeReads=0.944;AQ=8.35",
            "FORMAT": "GT:SQ:AD:AF:F1R2:F2R1:DP:SB:MB",
            "SXX-XXXT": "0/1:0.00:167,1:0.0060:75,1:92,0:168:78,89,1,0:84,83,1,0",
        }


class TestParseInput:
    def test_parse_vcf(self):
        expect = [
            {
                "CHROM": "chr1",
                "POS": "19072316",
                "ID": ".",
                "REF": "A",
                "ALT": "T",
                "QUAL": ".",
                "FILTER": "low_depth;weak_evidence",
                "INFO": "DP=1;MQ=124.00;FractionInformativeReads=1.000;AQ=28.36",
                "FORMAT": "GT:SQ:AD:AF:F1R2:F2R1:DP:SB:MB",
                "SXX-XXXT": "0/1:0.86:0,1:1.0000:0,0:0,1:1:0,0,1,0:0,0,0,1",
            },
            {
                "CHROM": "chr3",
                "POS": "39946102",
                "ID": ".",
                "REF": "T",
                "ALT": "C",
                "QUAL": ".",
                "FILTER": "PASS",
                "INFO": "DP=1;MQ=227.00;FractionInformativeReads=1.000;AQ=40.97;GermlineStatus=Germline_DB",
                "FORMAT": "GT:SQ:AD:AF:F1R2:F2R1:DP:SB:MB",
                "SXX-XXXT": "0/1:4.69:0,1:1.0000:0,1:0,0:1:0,0,0,1:0,0,0,1",
            },
        ]
        records = parse_vcf(expect)
        assert isinstance(records, list)
        assert all(isinstance(r, CNVRecord) for r in records)
        assert records == [
            CNVRecord(contig="3", start=39946102, name="pos_39946102", value=1.0)
        ]

    def test_parse_generic_tsv(self):
        rows = [
            {"chrom": "chr1", "pos": "100", "name": "rs1", "value": "0.5"},
            {"chrom": "2", "pos": "200", "name": "rs2", "value": "1.5"},
            {
                "chrom": "chr3",
                "pos": "invalid",
                "name": "rs3",
                "value": "2.5",
            },
        ]
        records = parse_generic_tsv(rows)
        assert len(records) == 2
        assert records[0] == CNVRecord(contig="1", start=100, name="rs1", value=0.5)
        assert records[1] == CNVRecord(contig="2", start=200, name="rs2", value=1.5)

    def test_parse_tn(self):
        rows = [
            {
                "contig": "chr1",
                "start": "100",
                "stop": "200",
                "name": "geneA",
                "SAMPLE-1": "0.1",
                "improper_pairs": "0",
            },
            {
                "contig": "2",
                "start": "300",
                "stop": "400",
                "name": "geneB",
                "SAMPLE-1": "0.2",
                "improper_pairs": "0",
            },
            {
                "contig": "chr3",
                "start": "500",
                "stop": "600",
                "name": "geneC",
            },
        ]
        records = parse_tn(rows, "SAMPLE-1")
        assert len(records) == 2
        assert records[0] == CNVRecord(contig="1", start=100, name="geneA", value=0.1)
        assert records[1] == CNVRecord(contig="2", start=300, name="geneB", value=0.2)
