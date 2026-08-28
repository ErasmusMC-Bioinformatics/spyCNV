{
  pkgs,
  ...
}:

{
  packages = with pkgs; [
    entr
    fd
    ruff
    basedpyright
  ];

  languages = {
    javascript = {
      enable = true;
      npm = {
        enable = true;
        install = {
          enable = true;
        };
      };
    };
    python = {
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
  };

  scripts = {
    dev = {
      description = "run pytest on src file change";
      exec = ''
        fd -tf -E node_modules | entr -c pytest
      '';
      packages = with pkgs; [
        fd
        entr
      ];
    };
    dev-html = {
      description = "watch frontend/backend sources, rebuild the JS bundle, regenerate the report, and serve it with live reload";
      exec = ''
        # Rebuild + regenerate + serve with a live-reload loop:
        #   - any change under src/ (TS/Py/jinja2/css) rebuilds the JS bundle
        #     (npm run build -> static/app.js) and regenerates the report
        #   - a small dev server serves the report and auto-reloads the tab
        #     when it is regenerated (injects a reload snippet on the fly)
        # Open http://localhost:8000/SXX-XXXT.spyCNV.html
        export SPYCNV_DEV_DIR=/tmp/spycnv-dev
        export SPYCNV_DEV_PORT=8910
        mkdir -p "$SPYCNV_DEV_DIR"

        fd -tf -e ts -e mjs -e py -e jinja2 -e css -E node_modules \
          | entr -c sh -c '(cd src/spyCNV/frontend && npm run build) && spy generate --sample-id SXX-XXXT \
              --vcf tests/data/SXX-XXXT.hard-filtered.vcf.gz \
              --tn tests/data/SXX-XXXT.tn.tsv.gz \
              --ballele tests/data/SXX-XXXT_bAllele.tsv \
              --logratio tests/data/SXX-XXXT_logRatio.tsv \
              --segments tests/data/SXX-XXXT.seg.called.merged \
              --output-dir "$SPYCNV_DEV_DIR"' &
        WATCH_PID=$!
        trap 'kill "$WATCH_PID" 2>/dev/null' EXIT INT TERM

        echo "Serving http://localhost:$SPYCNV_DEV_PORT/SXX-XXXT.spyCNV.html (Ctrl-C to stop)"
        python3 src/spyCNV/scripts/dev_server.py --port "$SPYCNV_DEV_PORT" --directory "$SPYCNV_DEV_DIR"
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
    echo "|   dev      - run pytest on src change |"
    echo "|   dev-html - live frontend dev server |"
    echo "========================================="
  '';
}
