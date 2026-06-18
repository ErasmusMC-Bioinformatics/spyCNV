{
  pkgs,
  ...
}:

{
  packages = with pkgs; [
    entr
    fd
    ruff
    ty
  ];

  languages.python = {
    enable = true;
    venv.enable = true;
    uv = {
      enable = true;
      sync = {
        enable = true;
        allGroups = true;
      };
    };
  };

  scripts = {
    dev = {
      description = "run pytest on src file change";
      exec = ''
        fd -tf | entr -c pytest
      '';
      packages = with pkgs; [
        fd
        entr
      ];
    };
    gh-pages = {
      description = "generate html from sample data for github pages";
      exec = ''
        spy generate --sample-id SXX-XXXT \
          --vcf tests/data/SXX-XXXT.hard-filtered.vcf.gz \
          --tn tests/data/SXX-XXXT.tn.tsv.gz \
          --ballele tests/data/SXX-XXXT_bAllele.tsv \
          --logratio tests/data/SXX-XXXT_logRatio.tsv \
          --segments tests/data/SXX-XXXT.seg.called.merged \
          --output-dir docs/ && mv docs/SXX-XXXT.spyCNV.html docs/index.html
      '';
    };
  };

  enterShell = ''
    echo "========================================="
    echo "| Available commands:                   |"
    echo "|   dev - run pytest on src file change |"
    echo "========================================="
  '';
}
