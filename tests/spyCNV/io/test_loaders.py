#!/usr/bin/env python3
from pathlib import Path

from spyCNV.io.loaders import (
    CNVRecord,
    _open_file,
    load_input,
    load_resource,
    parse_generic_tsv,
    parse_tn,
    parse_vcf,
    create_cnv_data,
)

BAF_TSV = Path("tests/data/MXX-ABCDT_bAllele.tsv")
BAF_CNV = Path("tests/data/MXX-ABCDT.cnv.vcf.gz")
TN_TSV = Path("tests/data/MXX-ABCDT.tn.tsv.gz")
HARDFILTERED_VCF = Path("tests/data/MXX-ABCDT.hard-filtered.vcf")


# def test_load_resource():
#     plot_ideomTrack = load_resource(Path("plots", "ideogramTrack.js"))
#     gs_0_70 = load_resource(Path("static", "genome-spy_core@0.70.0.js"))

#     assert len(plot_ideomTrack) == 3472
#     assert len(gs_0_70) == 777136


def test_open_file():
    with _open_file(BAF_TSV) as fh:
        assert len(fh.read()) == 592334


class TestLoadInput:
    def test_load_input_tsv_without_header(self):
        result = load_input(
            BAF_TSV, type="tsv", header=["chrom", "pos", "name", "value"]
        )
        assert isinstance(result, list)
        assert all(isinstance(row, dict) for row in result)
        assert result[0] == {
            "chrom": "chr1",
            "pos": "756268",
            "name": "rs12567639",
            "value": "0.308849",
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
            "MXX-ABCDT": "0",
            "improper_pairs": "0",
        }

    def test_load_input_vcf(self):
        result = load_input(HARDFILTERED_VCF, type="vcf")
        assert isinstance(result, list)
        assert all(isinstance(row, dict) for row in result)
        assert result[0] == {
            "CHROM": "chr1",
            "POS": "19072316",
            "ID": ".",
            "REF": "A",
            "ALT": "T",
            "QUAL": ".",
            "FILTER": "low_depth;weak_evidence",
            "INFO": "DP=1;MQ=124.00;FractionInformativeReads=1.000;AQ=28.36",
            "FORMAT": "GT:SQ:AD:AF:F1R2:F2R1:DP:SB:MB",
            "MXX-ABCDT": "0/1:0.86:0,1:1.0000:0,0:0,1:1:0,0,1,0:0,0,0,1",
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
                "MXX-ABCDT": "0/1:0.86:0,1:1.0000:0,0:0,1:1:0,0,1,0:0,0,0,1",
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
                "MXX-ABCDT": "0/1:4.69:0,1:1.0000:0,1:0,0:1:0,0,0,1:0,0,0,1",
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
            {"chrom": "chr3", "pos": "invalid", "name": "rs3", "value": "2.5"} # Should be skipped
        ]
        records = parse_generic_tsv(rows)
        assert len(records) == 2
        assert records[0] == CNVRecord(contig="1", start=100, name="rs1", value=0.5)
        assert records[1] == CNVRecord(contig="2", start=200, name="rs2", value=1.5)

    def test_parse_tn(self):
        rows = [
            {"contig": "chr1", "start": "100", "stop": "200", "name": "geneA", "SAMPLE-1": "0.1", "improper_pairs": "0"},
            {"contig": "2", "start": "300", "stop": "400", "name": "geneB", "SAMPLE-1": "0.2", "improper_pairs": "0"},
            {"contig": "chr3", "start": "500", "stop": "600", "name": "geneC"} # Missing SAMPLE-1, should logically be skipped
        ]
        records = parse_tn(rows, "SAMPLE-1")
        assert len(records) == 2
        assert records[0] == CNVRecord(contig="1", start=100, name="geneA", value=0.1)
        assert records[1] == CNVRecord(contig="2", start=300, name="geneB", value=0.2)



# def test_correct_keys():
#     result = load_input(BALLELE_TSV_PATH, type="tsv")
#     assert set(result[0].keys()) == {"contig", "start", "stop", "name", "value"}


#     def test_correct_values(self, tsv_file):
#         result = load_input(tsv_file, type="tsv")
#         assert result[0]["contig"] == "chr1"
#         assert result[0]["start"] == "100"
#         assert result[1]["value"] == "-1.2"

#     def test_comment_lines_stripped(self, tsv_file):
#         result = load_input(tsv_file, type="tsv")
#         for row in result:
#             for key in row:
#                 assert not key.startswith("#")

#     def test_empty_file_returns_empty_list(self, tmp_path):
#         f = write_plain(tmp_path / "empty.tsv", "")
#         assert load_input(f, type="tsv") == []

#     def test_empty_gz_returns_empty_list(self, tmp_path):
#         f = write_gz(tmp_path / "empty.tsv.gz", "")
#         assert load_input(f, type="tsv") == []

#     def test_only_comments_returns_empty_list(self, tmp_path):
#         f = write_plain(tmp_path / "comments.tsv", "# c1\n# c2\n")
#         assert load_input(f, type="tsv") == []

#     def test_accepts_string_path(self, tsv_file):
#         result = load_input(str(tsv_file), type="tsv")
#         assert isinstance(result, list)

#     def test_accepts_absolute_path(self, tsv_file):
#         assert tsv_file.is_absolute()
#         result = load_input(tsv_file, type="tsv")
#         assert len(result) == 2

#     def test_file_not_found_raises(self, tmp_path):
#         with pytest.raises(FileNotFoundError):
#             load_input(tmp_path / "missing.tsv", type="tsv")


# class TestLoadInputVcf:
#     @pytest.fixture(params=["plain", "gz"])
#     def vcf_file(self, request, tmp_path) -> Path:
#         if request.param == "plain":
#             return write_plain(tmp_path / "sample.vcf", VCF_CONTENT)
#         return write_gz(tmp_path / "sample.vcf.gz", VCF_CONTENT)

#     def test_returns_string(self, vcf_file):
#         assert isinstance(load_input(vcf_file, type="vcf"), str)

#     def test_preserves_comment_lines(self, vcf_file):
#         result = load_input(vcf_file, type="vcf")
#         assert "##fileformat" in result
#         assert "#CHROM" in result

#     def test_preserves_data_lines(self, vcf_file):
#         result = load_input(vcf_file, type="vcf")
#         assert "chr1" in result
#         assert "SNP1" in result

#     def test_full_content_preserved(self, vcf_file):
#         assert load_input(vcf_file, type="vcf") == VCF_CONTENT

#     def test_file_not_found_raises(self, tmp_path):
#         with pytest.raises(FileNotFoundError):
#             load_input(tmp_path / "missing.vcf", type="vcf")


# class TestLoadInputJson:
#     @pytest.fixture(params=["plain", "gz"])
#     def json_file(self, request, tmp_path) -> Path:
#         if request.param == "plain":
#             return write_plain(tmp_path / "data.json", JSON_CONTENT)
#         return write_gz(tmp_path / "data.json.gz", JSON_CONTENT)

#     def test_returns_string(self, json_file):
#         assert isinstance(load_input(json_file, type="json"), str)

#     def test_content_roundtrip(self, json_file):
#         result = load_input(json_file, type="json")
#         parsed = json.loads(json.loads(result))
#         assert parsed["key"] == "value"

#     def test_file_not_found_raises(self, tmp_path):
#         with pytest.raises(FileNotFoundError):
#             load_input(tmp_path / "missing.json", type="json")


# class TestLoadInputUnsupportedType:
#     def test_raises_value_error(self, tmp_path):
#         f = write_plain(tmp_path / "data.txt", "data")
#         with pytest.raises(ValueError, match="Unsupported type"):
#             load_input(f, type="xml")  # type: ignore[arg-type]

#     def test_error_message_contains_type(self, tmp_path):
#         f = write_plain(tmp_path / "data.txt", "data")
#         with pytest.raises(ValueError, match="xml"):
#             load_input(f, type="xml")  # type: ignore[arg-type]


# # ---------------------------------------------------------------------------
# # Separation of concerns: load_input must NOT use _PKG
# # ---------------------------------------------------------------------------


# class TestLoadInputIgnoresPkg:
#     def test_absolute_path_outside_pkg(self, tmp_path, monkeypatch):
#         """load_input resolves from filesystem root, not _PKG."""
#         # Point _PKG somewhere else entirely
#         other_dir = tmp_path / "pkg"
#         other_dir.mkdir()
#         monkeypatch.setattr(loader_module, "_PKG", other_dir)

#         # File lives outside _PKG
#         user_file = write_plain(tmp_path / "user_data.tsv", SIMPLE_TSV)
#         result = load_input(user_file, type="tsv")
#         assert len(result) == 2

#     def test_load_resource_fails_for_user_files(self, tmp_path, monkeypatch):
#         """load_resource must NOT find files outside _PKG."""
#         pkg_dir = tmp_path / "pkg"
#         pkg_dir.mkdir()
#         monkeypatch.setattr(loader_module, "_PKG", pkg_dir)

#         user_file = write_plain(tmp_path / "user_data.txt", "user data")
#         with pytest.raises(FileNotFoundError):
#             load_resource(user_file)
