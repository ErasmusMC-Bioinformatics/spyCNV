"use strict";
var spyCNVApp = (() => {
  // data.ts
  function chrOrder(chr) {
    const val = String(chr).replace("chr", "").trim();
    if (!isNaN(Number(val))) return parseInt(val, 10);
    if (val === "X" || val === "x") return 23;
    if (val === "Y" || val === "y") return 24;
    if (val === "M" || val === "m" || val === "MT" || val === "mt") return 25;
    return 99;
  }
  function prepareCombinedBinData(tso500Records, hrdRecords) {
    const allRecords = [];
    if (tso500Records) {
      for (const r of tso500Records) {
        allRecords.push({ ...r, _source: "tso500" });
      }
    }
    if (hrdRecords) {
      for (const r of hrdRecords) {
        allRecords.push({ ...r, _source: "hrd" });
      }
    }
    if (!allRecords.length) {
      return {
        tso500Data: [],
        hrdData: [],
        allData: [],
        chromBoundaries: [],
        chromRegions: [],
        chromLabels: []
      };
    }
    const formatted = allRecords.map((d) => {
      const val = d.value !== void 0 ? d.value : d.log2;
      const chr = String(d.contig || d.chromosome || d.Chr || "").replace("chr", "");
      const gene = d.gene ? d.gene.split("_")[0] : d.name || "";
      return {
        Chr: `chr${chr}`,
        contig: chr,
        start: d.start,
        end: d.end || d.start,
        gene,
        exon: d.exon || "",
        Tx: d.Tx || "",
        value: val,
        _source: d._source
      };
    });
    formatted.sort((a, b) => {
      const numA = chrOrder(a.contig);
      const numB = chrOrder(b.contig);
      if (numA !== numB) return numA - numB;
      return (a.start || 0) - (b.start || 0);
    });
    const allData = formatted.map((d, i) => ({ ...d, _binIndex: i }));
    const chromBoundaries = [];
    const chromRegions = [];
    const chromLabels = [];
    let lastChrom = null;
    let chromStart = 0;
    allData.forEach((d, i) => {
      if (d.contig !== lastChrom) {
        if (lastChrom !== null) {
          chromBoundaries.push({ boundary: i, chrom: lastChrom });
          const midpoint = (chromStart + i - 1) / 2;
          chromRegions.push({
            start: chromStart,
            end: i - 1,
            chrom: lastChrom,
            midpoint,
            isEven: chromRegions.length % 2 === 0 ? "even" : "odd"
          });
          chromLabels.push({
            position: midpoint,
            label: lastChrom
          });
          chromStart = i;
        }
        lastChrom = d.contig;
      }
    });
    if (lastChrom !== null && allData.length > 0) {
      const midpoint = (chromStart + allData.length - 1) / 2;
      chromRegions.push({
        start: chromStart,
        end: allData.length - 1,
        chrom: lastChrom,
        midpoint,
        isEven: chromRegions.length % 2 === 0 ? "even" : "odd"
      });
      chromLabels.push({
        position: midpoint,
        label: lastChrom
      });
    }
    const tso500Data = allData.filter((d) => d._source === "tso500");
    const hrdData = allData.filter((d) => d._source === "hrd");
    return {
      tso500Data,
      hrdData,
      allData,
      chromBoundaries,
      chromRegions,
      chromLabels
    };
  }
  function classifySegments(segments, thresholds) {
    if (!segments) return [];
    return segments.map((s) => ({
      ...s,
      cnvStatus: s.value >= thresholds.gain ? "gain" : s.value <= thresholds.deeploss ? "deeploss" : s.value <= thresholds.loss ? "loss" : "neutral"
    }));
  }
  function classifyBinSegments(segments, combinedBinData, thresholds) {
    if (!segments) return [];
    const baseData = combinedBinData == null ? void 0 : combinedBinData.allData;
    if (!baseData || !baseData.length) return [];
    const classified = classifySegments(segments, thresholds);
    const result = [];
    for (const seg of classified) {
      const segChr = String(seg.contig).replace("chr", "");
      const matching = baseData.filter(
        (r) => r.contig === segChr && r.start >= seg.start && r.start <= seg.end
      );
      if (matching.length > 0) {
        const startBin = matching[0]._binIndex;
        const endBin = matching[matching.length - 1]._binIndex;
        result.push({ ...seg, startBin, endBin });
      }
    }
    return result;
  }
  function parseRefseqGenes(refseq) {
    const lines = refseq.trim().split("\n");
    return lines.map((line) => {
      const cols = line.split("	");
      return {
        symbol: cols[0],
        chrom: cols[1] ? cols[1].replace("chr", "") : "",
        start: parseInt(cols[2], 10),
        end: parseInt(cols[2], 10) + parseInt(cols[3], 10),
        score: parseInt(cols[5], 10) || 0
      };
    });
  }

  // constants.ts
  var ASSEMBLY = "hg19";
  var MIN_LOGRATIO = -2.5;
  var min_logratio = [{ _value: MIN_LOGRATIO }];
  var DEFAULT_THRESHOLDS = {
    gain: 0.5,
    loss: -0.5,
    deeploss: -1
  };
  var PRIO1 = [
    "BRCA1",
    "BRCA2",
    "CDKN2A",
    "PTEN",
    "RB1",
    "STK11",
    "TP53",
    "APC",
    "ATM",
    "BAP1",
    "CDH1",
    "MLH1",
    "MSH2",
    "MSH6",
    "NF1",
    "NF2",
    "RAD51C",
    "VHL"
  ];
  var PRIO2 = [
    "AR",
    "BRAF",
    "CCND1",
    "CCNE1",
    "CDK4",
    "CDK6",
    "EGFR",
    "ERBB2",
    "ERBB3",
    "FGFR1",
    "FGFR3",
    "KRAS",
    "MCL1",
    "MDM2",
    "MET",
    "MITF",
    "MYC",
    "MYCL1",
    "MYCN",
    "NKX2-1",
    "PDGFRA",
    "PIK3CA",
    "SOX2",
    "TERT",
    "ZNF703"
  ];

  // state.ts
  var state = {
    data: null,
    currentDisplayMode: "both",
    thresholds: { ...DEFAULT_THRESHOLDS },
    embedResult: null,
    genomeScale: null,
    binScale: null,
    combinedBinData: null
  };

  // tracks/bAlleleFrequencyTrack.ts
  var bAlleleFrequencyTrack = (hrdData, tso500Data, cytobandData, options = {}) => {
    var _a;
    let layers = [];
    const xEncoding = {
      chrom: "contig",
      pos: "start",
      type: "locus",
      scale: { name: "genomeScale" },
      axis: {
        chromTickColor: "#8B9DC3",
        chromLabelColor: "#7A8A99",
        grid: true,
        gridColor: "#CCCCCC",
        gridOpacity: 0.3,
        gridDash: [1, 11],
        chromGrid: true,
        chromGridDash: [3, 3],
        chromGridColor: "#B0B8C0",
        chromGridOpacity: 0.4,
        chromGridFillEven: "#FFFFFF",
        chromGridFillOdd: "#FAFAFA"
      }
    };
    const yEncoding2 = {
      field: "value",
      type: "quantitative",
      scale: { domain: [-0.03, 1.03] },
      axis: { values: [0, 0.2, 0.4, 0.6, 0.8, 1], grid: true, title: "B-Allele Frequency" }
    };
    const baf_data_encoding = function(data_name) {
      return {
        data: { name: data_name },
        transform: [],
        mark: { type: "point", clip: true, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
        encoding: {
          x: xEncoding,
          y: yEncoding2,
          color: { value: "#c3ced8" },
          stroke: { value: "#8696a2" },
          tooltip: [
            { field: "contig", type: "nominal", title: "Chromosome" },
            { field: "start", type: "quantitative", title: "Position" },
            { field: "value", type: "quantitative", title: "VAF", format: ".4f" }
          ]
        }
      };
    };
    if (hrdData) {
      layers.push(baf_data_encoding("hrd_baf"));
    }
    if (tso500Data) {
      layers.push(baf_data_encoding("tso500_baf"));
    }
    if (cytobandData) {
      layers.push({
        data: { values: cytobandData, format: { type: "tsv" } },
        transform: [
          { type: "filter", expr: "datum.gieStain === 'acen'" },
          {
            type: "aggregate",
            groupby: ["chrom"],
            fields: ["chromStart"],
            ops: ["max"],
            as: ["pArmEnd"]
          },
          { type: "formula", expr: "substring(datum.chrom, 3)", as: "contig" }
        ],
        stops: [5e5],
        multiscale: [
          {
            mark: { type: "rule", color: "#B0B8C0", strokeDash: [3, 3], size: 0.5, opacity: 0.4 }
          },
          {
            mark: { type: "rule", color: "#D73027", strokeDash: [3, 3], size: 0.5, opacity: 0.5 }
          }
        ],
        encoding: {
          x: { chrom: "contig", pos: "pArmEnd", type: "locus", scale: { name: "genomeScale" } }
        }
      });
    }
    return {
      name: "bAlleleFrequencyTrack",
      height: (_a = options.height) != null ? _a : 300,
      layer: layers,
      resolve: { scale: { y: "shared" } }
    };
  };

  // tracks/geneAnnotationTrack.ts
  var geneAnnotationTrack = (refseqGenes, options = {}) => {
    var _a;
    return {
      name: "geneAnnotations",
      description: [
        "RefSeq genes scored by their citation counts",
        "The scoring method: https://docs.higlass.io/data_preparation.html#gene-annotation-tracks",
        "Some background: https://www.nature.com/articles/d41586-017-07291-9"
      ],
      params: [{ name: "symbolFontSize", value: 11 }],
      height: (_a = options.height) != null ? _a : 70,
      data: {
        values: refseqGenes,
        format: {
          type: "tsv",
          // Specify types explicitly. Skips type inference, which is a bit slow.
          parse: {
            symbol: "string",
            chrom: "string",
            start: "integer",
            length: "integer",
            strand: "string",
            score: "integer",
            exons: "string"
          }
        }
      },
      transform: [
        {
          type: "linearizeGenomicCoordinate",
          chrom: "chrom",
          pos: "start",
          as: "_start"
        },
        {
          type: "formula",
          expr: "datum._start + datum.length",
          as: "_end"
        },
        {
          type: "formula",
          expr: "datum.score >= 20000 ? 'priority' : (datum.score >= 10000 ? 'oncogene' : 'normal')",
          as: "geneClass"
        },
        {
          type: "collect",
          sort: { field: ["_start"] }
        },
        {
          type: "pileup",
          start: "_start",
          end: "_end",
          as: "_lane",
          preference: "strand",
          preferredOrder: ["-", "+"]
        },
        {
          type: "filter",
          expr: "datum._lane < 3"
        }
      ],
      encoding: {
        x: { axis: null },
        y: {
          field: "_lane",
          type: "ordinal",
          scale: {
            type: "index",
            align: 0,
            paddingInner: 0.4,
            paddingOuter: 0.2,
            domain: [0, 3],
            reverse: true,
            zoom: false
          },
          axis: null
        }
      },
      layer: [
        {
          name: "transcripts",
          opacity: {
            unitsPerPixel: [1e5, 4e4],
            values: [0, 1]
          },
          layer: [
            {
              name: "bodies",
              title: "Gene annotations",
              mark: {
                type: "rule",
                minLength: 0.5,
                size: 1,
                yOffset: 0.5,
                tooltip: null
              },
              encoding: {
                x: { field: "_start", type: "locus", axis: null },
                x2: { field: "_end", band: 0 },
                search: { field: "symbol" },
                color: {
                  field: "geneClass",
                  type: "nominal",
                  scale: {
                    domain: ["priority", "oncogene", "normal"],
                    range: ["#E69F00", "#A55AF4", "#b0b0b0"]
                  }
                }
              }
            },
            {
              name: "exons",
              transform: [
                { type: "project", fields: ["_lane", "_start", "exons", "geneClass"] },
                { type: "flattenCompressedExons", start: "_start" }
              ],
              mark: {
                type: "rect",
                strokeWidth: 1,
                minOpacity: 0.2,
                minWidth: 0.1,
                yOffset: 0.5,
                tooltip: null
              },
              encoding: {
                x: { field: "exonStart", type: "locus" },
                x2: { field: "exonEnd" },
                stroke: {
                  field: "geneClass",
                  type: "nominal",
                  scale: {
                    domain: ["priority", "oncogene", "normal"],
                    range: ["#E69F00", "#A55AF4", "#b0b0b0"]
                  }
                },
                fill: {
                  field: "geneClass",
                  type: "nominal",
                  scale: {
                    domain: ["priority", "oncogene", "normal"],
                    range: ["#FDE8C5", "#EEDDF5", "#f0f0f0"]
                  }
                }
              }
            }
          ]
        },
        {
          name: "symbols",
          transform: [
            { type: "collect" },
            {
              type: "measureText",
              fontSize: { expr: "symbolFontSize" },
              field: "symbol",
              as: "_textWidth"
            },
            {
              type: "filterScoredLabels",
              lane: "_lane",
              score: "score",
              width: "_textWidth",
              pos: "_start",
              pos2: "_end",
              asMidpoint: "_midpoint",
              padding: 8
            }
          ],
          layer: [
            {
              name: "labels",
              mark: {
                type: "text",
                size: { expr: "symbolFontSize" },
                yOffset: 7,
                tooltip: {
                  handler: "refseqgene"
                }
              },
              encoding: {
                x: {
                  field: "_midpoint",
                  type: "locus"
                },
                text: { field: "symbol" },
                color: {
                  field: "geneClass",
                  type: "nominal",
                  scale: {
                    domain: ["priority", "oncogene", "normal"],
                    range: ["#b37b00", "#763cb5", "#8B8B8B"]
                  }
                }
              }
            },
            {
              name: "arrows",
              opacity: {
                unitsPerPixel: [1e5, 4e4],
                values: [0, 1]
              },
              mark: {
                type: "point",
                yOffset: 7,
                size: 50,
                tooltip: null
              },
              encoding: {
                x: {
                  field: "_midpoint",
                  type: "locus"
                },
                dx: {
                  expr: "(datum._textWidth / 2 + 5) * (datum.strand == '-' ? -1 : 1)",
                  type: "quantitative",
                  scale: null
                },
                color: {
                  field: "geneClass",
                  type: "nominal",
                  scale: {
                    domain: ["priority", "oncogene", "normal"],
                    range: ["#b37b00", "#763cb5", "#8B8B8B"]
                  }
                },
                shape: {
                  field: "strand",
                  type: "nominal",
                  scale: {
                    domain: ["-", "+"],
                    range: ["triangle-left", "triangle-right"]
                  }
                }
              }
            }
          ]
        }
      ]
    };
  };

  // tracks/ideogramTrack.ts
  var ideogramTrack = (cytobandValues, options = {}) => {
    var _a;
    return {
      spacing: 0,
      vconcat: [
        {
          "$schema": "https://cdn.jsdelivr.net/npm/@genome-spy/core/dist/schema.json",
          "resolve": { "scale": { "x": "excluded" } },
          "spacing": 0,
          "vconcat": [
            {
              "name": "chromosomes",
              "height": 20,
              "view": { "stroke": "#d0d0d0", "strokeZindex": 10 },
              "cursor": "text",
              "data": { "lazy": { "type": "axisGenome", "channel": "x" } },
              "encoding": {
                "x": {
                  "field": "continuousStart",
                  "type": "locus",
                  "axis": null,
                  "scale": { "zoom": false }
                },
                "x2": { "field": "continuousEnd" },
                "text": { "field": "name" }
              },
              "layer": [
                {
                  "encoding": {
                    "fill": {
                      "field": "odd",
                      "type": "nominal",
                      "scale": {
                        "domain": [true, false],
                        "range": ["#f0f0f0", "white"]
                      }
                    }
                  },
                  "mark": {
                    "type": "rect",
                    "tooltip": null,
                    "clip": true
                  }
                },
                {
                  "mark": {
                    "type": "text",
                    "paddingX": 3,
                    "paddingY": 5,
                    "tooltip": null
                  }
                }
              ],
              "params": [
                {
                  "name": "brush",
                  "persist": false,
                  "select": {
                    "type": "interval",
                    "encodings": ["x"],
                    "mark": {
                      "clip": false,
                      "zindex": 11,
                      "stroke": "#048",
                      "strokeOpacity": 0.6,
                      "fillOpacity": 0.02,
                      "fill": "#08F",
                      "shadowBlur": 5,
                      "shadowColor": "#08F",
                      "shadowOpacity": 0.8
                    }
                  },
                  "push": "outer"
                }
              ]
            },
            {
              "name": "link-decoration",
              "height": 30,
              "data": { "lazy": { "type": "axisGenome", "channel": "x" } },
              "transform": [
                {
                  "type": "aggregate",
                  "fields": ["continuousEnd"],
                  "ops": ["max"],
                  "as": ["genomeEnd"]
                },
                { "type": "formula", "expr": "[0, datum.genomeEnd]", "as": "x2" },
                { "type": "flatten", "fields": ["x2"], "index": "side" },
                { "type": "collect" },
                {
                  "type": "formula",
                  "expr": "brush.intervals.x ? brush.intervals.x[datum.side] : datum.x2",
                  "as": "x"
                }
              ],
              "encoding": {
                "x": {
                  "field": "x",
                  "type": "locus",
                  "scale": { "zoom": false },
                  "axis": null
                },
                "x2": { "field": "x2" }
              },
              "mark": {
                "type": "link",
                "linkShape": "diagonal",
                "y": 1,
                "y2": 0,
                "color": "#8CF"
              }
            }
          ]
        },
        {
          height: (_a = options.height) != null ? _a : 24,
          data: {
            values: cytobandValues,
            format: { type: "tsv" }
          },
          view: { stroke: "#b0b0b0" },
          transform: [
            // Remove unlocalized/unplaced scaffolds etc.
            { type: "filter", expr: "!test(/_/, datum.chrom)" }
          ],
          encoding: {
            x: {
              chrom: "chrom",
              pos: "chromStart",
              type: "locus",
              axis: null,
              scale: {
                domain: { param: "brush" }
              }
            },
            x2: { chrom: "chrom", pos: "chromEnd" }
          },
          // The layered views must not have a shared color scale because the background (rect mark) and
          // foreground (text mark) colors have the same domain but different ranges.
          resolve: {
            scale: {
              color: "independent"
            }
          },
          layer: [
            {
              title: "Cytoband",
              mark: "rect",
              encoding: {
                color: {
                  field: "gieStain",
                  type: "nominal",
                  scale: {
                    domain: [
                      "gneg",
                      "gpos25",
                      "gpos50",
                      "gpos75",
                      "gpos100",
                      "acen",
                      "stalk",
                      "gvar"
                    ],
                    range: [
                      "#f0f0f0",
                      "#e0e0e0",
                      "#d0d0d0",
                      "#c0c0c0",
                      "#a0a0a0",
                      "#cc4444",
                      "#338833",
                      "#000000"
                    ]
                  }
                }
              }
            },
            {
              mark: {
                type: "text",
                align: "center",
                baseline: "middle",
                paddingX: 4,
                tooltip: null
              },
              encoding: {
                color: {
                  field: "gieStain",
                  type: "nominal",
                  scale: {
                    domain: [
                      "gneg",
                      "gpos25",
                      "gpos50",
                      "gpos75",
                      "gpos100",
                      "acen",
                      "stalk",
                      "gvar"
                    ],
                    range: [
                      "black",
                      "black",
                      "black",
                      "black",
                      "black",
                      "black",
                      "white",
                      "white"
                    ]
                  }
                },
                text: {
                  field: "name",
                  type: "nominal"
                }
              }
            },
            {
              transform: [
                {
                  type: "filter",
                  expr: "datum.chromStart == 0 && datum.chrom != 'chr1'"
                }
              ],
              encoding: {
                x2: null
              },
              mark: {
                type: "rule",
                color: "#a0a0a0",
                strokeDash: [3, 3],
                strokeDashOffset: 2
              }
            }
          ]
        }
      ]
    };
  };

  // tracks/logratioTrack.ts
  var cnvStatus_encoding = {
    field: "cnvStatus",
    type: "nominal",
    scale: {
      domain: ["gain", "neutral", "loss", "deeploss"],
      range: ["#D73027", "#000000", "#4575B4", "#1A237E"]
    }
  };
  var yEncoding = {
    field: "_clampedValue",
    type: "quantitative",
    scale: { zero: false, padding: 0.05 },
    axis: { grid: true, title: "Log2", tickCount: 5 }
  };
  var thresholdLayers = [
    {
      data: { name: "min_logratio" },
      mark: { type: "rule", clip: true, size: 1, opacity: 0.3 },
      encoding: { y: { field: "_value", type: "quantitative" }, color: { value: "#D73027" } }
    },
    {
      data: { name: "gain_threshold" },
      mark: { type: "rule", clip: true, size: 1, strokeDash: [4, 4], opacity: 0.6 },
      encoding: { y: { field: "_val", type: "quantitative" }, color: { value: "#D73027" } }
    },
    {
      data: { name: "loss_threshold" },
      mark: { type: "rule", clip: true, size: 1, strokeDash: [4, 4], opacity: 0.6 },
      encoding: { y: { field: "_val", type: "quantitative" }, color: { value: "#4575B4" } }
    },
    {
      data: { name: "deeploss_threshold" },
      mark: { type: "rule", clip: true, size: 1, strokeDash: [4, 4], opacity: 0.6 },
      encoding: { y: { field: "_val", type: "quantitative" }, color: { value: "#1A237E" } }
    }
  ];
  var clampMin = -2.5;
  var clampOutliers = [
    { type: "formula", expr: `(datum.value < ${clampMin} ? ${clampMin} : datum.value)`, as: "_clampedValue" },
    { type: "formula", expr: `datum.value < ${clampMin} ? 'outlier' : 'typical'`, as: "_outlierStatus" }
  ];
  var logratioTrack = (hrdData, tso500Data, segments, cytobandData, options = {}) => {
    var _a;
    let layers = [];
    const xEncoding = {
      chrom: "contig",
      pos: "start",
      type: "locus",
      scale: { name: "genomeScale" },
      axis: {
        chromTickColor: "#8B9DC3",
        chromLabelColor: "#7A8A99",
        grid: true,
        gridColor: "#CCCCCC",
        gridOpacity: 0.3,
        gridDash: [1, 11],
        chromGrid: true,
        chromGridDash: [3, 3],
        chromGridColor: "#B0B8C0",
        chromGridOpacity: 0.4,
        chromGridFillEven: "#FFFFFF",
        chromGridFillOdd: "#FAFAFA"
      }
    };
    layers.push(...thresholdLayers);
    const logratio_data_encoding = function(data_name, extraTooltip = []) {
      return {
        data: { name: data_name },
        transform: clampOutliers,
        mark: { type: "point", clip: true, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
        encoding: {
          x: xEncoding,
          y: yEncoding,
          color: { field: "_outlierStatus", type: "nominal", scale: { domain: ["typical", "outlier"], range: ["#c3ced8", "red"] }, legend: null },
          stroke: { field: "_outlierStatus", type: "nominal", scale: { domain: ["typical", "outlier"], range: ["#8696a2", "darkred"] }, legend: null },
          tooltip: [
            { field: "value", type: "quantitative", title: "Log2", format: ".3f" },
            ...extraTooltip
          ]
        }
      };
    };
    if (hrdData) {
      layers.push(logratio_data_encoding("hrd_logratio"));
    }
    if (tso500Data) {
      layers.push(logratio_data_encoding("tso500_logratio", [
        { field: "gene", type: "nominal", title: "Gene" },
        { field: "exon", type: "nominal", title: "Exon/Intron" },
        { field: "Tx", type: "nominal", title: "Transcript" }
      ]));
    }
    if (segments) {
      layers.push({
        data: { name: "segments_classified" },
        transform: [
          { type: "formula", expr: `(datum.value < ${clampMin} ? ${clampMin} : datum.value)`, as: "_clampedValue" }
        ],
        encoding: {
          x: Object.assign({}, xEncoding, { pos: "start" }),
          x2: { chrom: "contig", pos: "end", type: "locus" },
          y: yEncoding,
          stroke: cnvStatus_encoding,
          color: cnvStatus_encoding,
          tooltip: [
            { field: "name", type: "nominal", title: "Gene" },
            { field: "value", type: "quantitative", title: "Log2", format: ".3f" },
            { field: "cnvStatus", type: "nominal", title: "Status" }
          ]
        },
        stops: [1e4],
        multiscale: [
          {
            transform: [{ type: "filter", expr: "datum.cnvStatus !== 'neutral'" }],
            mark: { type: "rect", minWidth: 5, cornerRadius: 5, clip: true, size: 3, fillOpacity: 0.4, strokeWidth: 2, strokeOpacity: 0.6 }
          },
          {
            mark: { type: "rule", clip: true, size: 3, opacity: 0.8 }
          }
        ]
      });
    }
    if (cytobandData) {
      layers.push({
        data: { values: cytobandData, format: { type: "tsv" } },
        transform: [
          { type: "filter", expr: "datum.gieStain === 'acen'" },
          {
            type: "aggregate",
            groupby: ["chrom"],
            fields: ["chromStart"],
            ops: ["max"],
            as: ["pArmEnd"]
          },
          { type: "formula", expr: "substring(datum.chrom, 3)", as: "contig" }
        ],
        stops: [5e5],
        multiscale: [
          {
            mark: { type: "rule", color: "#B0B8C0", strokeDash: [3, 3], size: 0.5, opacity: 0.4 }
          },
          {
            mark: { type: "rule", color: "#D73027", strokeDash: [3, 3], size: 0.5, opacity: 0.5 }
          }
        ],
        encoding: {
          x: { chrom: "contig", pos: "pArmEnd", type: "locus", scale: { name: "genomeScale" } }
        }
      });
    }
    return {
      name: "logratioTrack",
      height: (_a = options.height) != null ? _a : 300,
      layer: layers,
      resolve: {
        scale: {
          y: "shared",
          color: "independent",
          stroke: "independent"
        }
      }
    };
  };
  var logratioBinTrack = (hrdData, tso500Data, segments, options = {}) => {
    var _a;
    let layers = [];
    const xEncoding = {
      field: "_binIndex",
      type: "quantitative",
      scale: {
        name: "binScale",
        zoom: true,
        nice: false
      },
      axis: {
        title: "Bin index",
        grid: true,
        gridColor: "#CCCCCC",
        gridOpacity: 0.3,
        gridDash: [1, 11],
        labels: false,
        ticks: false
      }
    };
    layers.push({
      data: { name: "chrom_regions" },
      mark: {
        type: "rect",
        tooltip: null,
        opacity: 0.3
      },
      encoding: {
        x: {
          title: null,
          field: "start",
          type: "quantitative",
          scale: { name: "binScale", zoom: true, nice: false }
        },
        x2: {
          title: null,
          field: "end"
        },
        color: {
          field: "isEven",
          type: "nominal",
          scale: {
            domain: ["even", "odd"],
            range: ["#ECECEC", "#FFFFFF"]
          },
          legend: null
        }
      }
    });
    layers.push(...thresholdLayers);
    const logratio_bin_data_encoding = function(data_name, extraTooltip = []) {
      return {
        data: { name: data_name },
        transform: clampOutliers,
        mark: {
          type: "point",
          clip: true,
          size: { expr: "min(0.1 * pow(zoomLevel, 2), 120)" },
          opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" }
        },
        encoding: {
          x: xEncoding,
          y: yEncoding,
          color: { field: "_outlierStatus", type: "nominal", scale: { domain: ["typical", "outlier"], range: ["#c3ced8", "red"] }, legend: null },
          stroke: { field: "_outlierStatus", type: "nominal", scale: { domain: ["typical", "outlier"], range: ["#8696a2", "darkred"] }, legend: null },
          tooltip: [
            { field: "contig", type: "nominal", title: "Chromosome" },
            { field: "start", type: "quantitative", title: "Start" },
            { field: "value", type: "quantitative", title: "Log2", format: ".3f" },
            ...extraTooltip
          ]
        }
      };
    };
    if (hrdData) {
      layers.push(logratio_bin_data_encoding("hrd_logratio_bin"));
    }
    if (tso500Data) {
      layers.push(logratio_bin_data_encoding("tso500_logratio_bin", [
        { field: "gene", type: "nominal", title: "Gene" },
        { field: "exon", type: "nominal", title: "Exon/Intron" },
        { field: "Tx", type: "nominal", title: "Transcript" }
      ]));
    }
    layers.push({
      data: { name: "chrom_boundaries" },
      mark: {
        type: "rule",
        color: "#B0B8C0",
        strokeWidth: 1,
        strokeDash: [3, 3],
        tooltip: null
      },
      encoding: {
        x: {
          title: null,
          field: "boundary",
          type: "quantitative",
          scale: { name: "binScale", zoom: true, nice: false }
        }
      }
    });
    layers.push({
      data: { name: "chrom_labels" },
      mark: {
        type: "text",
        dy: 120,
        size: 11,
        color: "#0e0e0e",
        tooltip: null
      },
      encoding: {
        x: {
          title: null,
          field: "position",
          type: "quantitative",
          scale: { name: "binScale", zoom: true, nice: false }
        },
        text: {
          field: "label",
          type: "nominal"
        }
      }
    });
    if (segments) {
      layers.push({
        data: { name: "segments_classified_bin" },
        transform: [
          { type: "formula", expr: `(datum.value < ${clampMin} ? ${clampMin} : datum.value)`, as: "_clampedValue" }
        ],
        encoding: {
          x: { field: "startBin", type: "quantitative", scale: { name: "binScale", zoom: true, nice: false } },
          x2: { field: "endBin" },
          y: yEncoding,
          stroke: cnvStatus_encoding,
          color: cnvStatus_encoding,
          tooltip: [
            { field: "name", type: "nominal", title: "Gene" },
            { field: "value", type: "quantitative", title: "Log2", format: ".3f" },
            { field: "cnvStatus", type: "nominal", title: "Status" }
          ]
        },
        stops: [0.5],
        multiscale: [
          {
            transform: [{ type: "filter", expr: "datum.cnvStatus !== 'neutral'" }],
            mark: { type: "rect", minWidth: 5, cornerRadius: 5, clip: true, size: 3, fillOpacity: 0.4, strokeWidth: 2, strokeOpacity: 0.6 }
          },
          {
            mark: { type: "rule", clip: true, size: 3, opacity: 0.8 }
          }
        ]
      });
    }
    return {
      name: "logratioBinTrack",
      height: (_a = options.height) != null ? _a : 300,
      layer: layers,
      resolve: {
        scale: {
          y: "shared",
          color: "independent",
          stroke: "independent"
        }
      }
    };
  };

  // spec.ts
  function requireData() {
    if (!state.data) {
      throw new Error("spyCNV: cannot build spec before init()");
    }
    return state.data;
  }
  function getSpec() {
    const data = requireData();
    const { thresholds } = state;
    return {
      assembly: ASSEMBLY,
      params: [{ name: "brush" }],
      config: {
        legend: { disable: true }
      },
      vconcat: [
        ideogramTrack(data.cytoband),
        logratioTrack(data.hrd_logratio, data.tso500_logratio, data.segments, data.cytoband, {
          gainThreshold: thresholds.gain,
          lossThreshold: thresholds.loss,
          deepLossThreshold: thresholds.deeploss
        }),
        geneAnnotationTrack(data.refseq),
        bAlleleFrequencyTrack(data.hrd_baf, data.tso500_baf, data.cytoband)
      ]
    };
  }
  function getBinSpec() {
    const data = requireData();
    const { thresholds } = state;
    return {
      config: {
        legend: { disable: true }
      },
      vconcat: [
        logratioBinTrack(data.hrd_logratio, data.tso500_logratio, data.segments, {
          height: 300,
          gainThreshold: thresholds.gain,
          lossThreshold: thresholds.loss,
          deepLossThreshold: thresholds.deeploss
        })
      ]
    };
  }
  function showMinLogratio(showHrd, showTso500) {
    const data = state.data;
    if (!data) return false;
    const minHrdLog = data.hrd_logratio ? Math.min(...data.hrd_logratio.map((r) => r.value)) : 0;
    const minTsoLog = data.tso500_logratio ? Math.min(...data.tso500_logratio.map((r) => r.value)) : 0;
    return showHrd && minHrdLog <= MIN_LOGRATIO || showTso500 && minTsoLog <= MIN_LOGRATIO;
  }

  // table.ts
  var tableData = [];
  var grid = null;
  function forceTableRender() {
    grid == null ? void 0 : grid.forceRender();
  }
  function getGeneClass(gene) {
    if (PRIO1.includes(gene)) return "gene-prio1";
    if (PRIO2.includes(gene)) return "gene-prio2";
    return "";
  }
  function getPrio(gene) {
    if (PRIO1.includes(gene)) return 1;
    if (PRIO2.includes(gene)) return 2;
    return 3;
  }
  function annotateCNVstatus(log, thresholds) {
    const logFl = parseFloat(log);
    let symbol = "";
    let cls = "";
    if (logFl >= thresholds.gain) {
      symbol = "\u{1F871}";
      cls = "gain";
    } else if (logFl <= thresholds.deeploss) {
      symbol = "\u{1F873}\u{1F873}";
      cls = "deeploss";
    } else if (logFl <= thresholds.loss) {
      symbol = "\u{1F873}";
      cls = "loss";
    }
    return `<div class="cnv-cell">
      <span class="${cls}">${symbol}</span>
      <span style="text-align: right;">
          ${logFl.toFixed(3)}
      </span>
  </div>`;
  }
  function generateTableData() {
    const { data, thresholds } = state;
    if (!data || !data.segments || !data.refseq) return;
    const genes = parseRefseqGenes(data.refseq);
    tableData = [];
    data.segments.forEach((seg) => {
      const segChr = seg.contig;
      const segStart = seg.start;
      const segEnd = seg.end;
      const segLog2 = seg.value;
      genes.forEach((g) => {
        if (g.chrom === segChr && Math.max(g.start, segStart) <= Math.min(g.end, segEnd)) {
          tableData.push({
            chr: segChr,
            start: g.start,
            end: g.end,
            gene: g.symbol,
            log2: segLog2,
            score: g.score
          });
        }
      });
    });
    const uniqueGenes = {};
    tableData.forEach((item) => {
      if (!uniqueGenes[item.gene] || Math.abs(item.log2) > Math.abs(uniqueGenes[item.gene].log2)) {
        uniqueGenes[item.gene] = item;
      }
    });
    tableData = Object.values(uniqueGenes);
    tableData.sort((a, b) => {
      const pA = getPrio(a.gene);
      const pB = getPrio(b.gene);
      if (pA !== pB) return pA - pB;
      return Math.abs(b.log2) - Math.abs(a.log2);
    });
    grid = new gridjs.Grid({
      columns: [
        {
          name: "Chr",
          sort: {
            compare: (a, b) => chrOrder(String(a)) - chrOrder(String(b))
          }
        },
        {
          name: "Gene",
          formatter: (cell) => {
            const cls = getGeneClass(String(cell));
            if (cls) {
              return gridjs.html(`<span class="${cls}">${cell}</span>`);
            }
            return cell;
          }
        },
        {
          name: "Log2(FC)",
          sort: true,
          formatter: (log) => gridjs.html(annotateCNVstatus(String(log), thresholds))
        },
        "Start",
        { name: "_idx", hidden: true }
      ],
      data: () => {
        const filterRadio = document.querySelector('input[name="log2Filter"]:checked');
        const filter = filterRadio ? filterRadio.value : "All";
        const prioEl = document.getElementById("prio-toggle");
        const prioOnly = prioEl ? prioEl.checked : false;
        let dt = tableData;
        if (prioOnly) {
          dt = dt.filter((d) => getPrio(d.gene) < 3);
        }
        if (filter === "Gain") {
          dt = dt.filter((d) => d.log2 >= thresholds.gain);
        } else if (filter === "Loss") {
          dt = dt.filter((d) => d.log2 <= thresholds.loss && d.log2 > thresholds.deeploss);
        } else if (filter === "Deep Loss") {
          dt = dt.filter((d) => d.log2 <= thresholds.deeploss);
        } else if (filter === "All Amplification and Loss") {
          dt = dt.filter((d) => d.log2 >= thresholds.gain || d.log2 <= thresholds.loss);
        }
        return dt.map((r) => [r.chr, r.gene, r.log2, r.start, r.end]);
      },
      search: true,
      sort: true,
      fixedHeader: true,
      maxHeight: "600px"
    }).render(document.getElementById("gene-table-wrapper"));
    grid.on("rowClick", (...args) => {
      var _a, _b;
      const row = args[1];
      const rawChr = String(row.cells[0].data);
      const chr = "chr" + rawChr;
      const cleanChr = rawChr.replace("chr", "");
      const gene = String(row.cells[1].data);
      const start = parseInt(String(row.cells[3].data), 10);
      const end = parseInt(String(row.cells[4].data), 10);
      const { currentDisplayMode, combinedBinData, binScale, genomeScale } = state;
      if (currentDisplayMode === "bin") {
        const geneBins = ((_a = combinedBinData == null ? void 0 : combinedBinData.allData) != null ? _a : []).filter(
          (r) => r.gene === gene || r.contig === cleanChr && r.start >= start && r.start <= end
        );
        if (geneBins.length > 0) {
          const minBin = Math.min(...geneBins.map((b) => b._binIndex));
          const maxBin = Math.max(...geneBins.map((b) => b._binIndex));
          const pad = Math.max(15, (maxBin - minBin + 1) * 2);
          if (binScale) {
            binScale.zoomTo([Math.max(0, minBin - pad), maxBin + pad], true);
          }
        } else {
          const chrRegion = ((_b = combinedBinData == null ? void 0 : combinedBinData.chromRegions) != null ? _b : []).find((c) => c.chrom === cleanChr);
          if (chrRegion && binScale) {
            binScale.zoomTo([chrRegion.start - 5, chrRegion.end + 5], true);
          }
        }
      } else if (genomeScale) {
        const zoomDomain = [
          { chrom: chr, pos: Math.max(0, start - 15e6) },
          { chrom: chr, pos: end + 15e6 }
        ];
        genomeScale.zoomTo(zoomDomain, true);
      }
    });
  }

  // plot.ts
  function renderPlot() {
    const container = document.getElementById("visualization");
    if (!container) return;
    container.innerHTML = "";
    const isBin = state.currentDisplayMode === "bin";
    const { data, thresholds, combinedBinData } = state;
    const namedDataProvider = (name) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
      if (isBin) {
        switch (name) {
          case "tso500_logratio_bin":
            return (_a = combinedBinData == null ? void 0 : combinedBinData.tso500Data) != null ? _a : [];
          case "hrd_logratio_bin":
            return (_b = combinedBinData == null ? void 0 : combinedBinData.hrdData) != null ? _b : [];
          case "chrom_regions":
            return (_c = combinedBinData == null ? void 0 : combinedBinData.chromRegions) != null ? _c : [];
          case "chrom_boundaries":
            return (_d = combinedBinData == null ? void 0 : combinedBinData.chromBoundaries) != null ? _d : [];
          case "chrom_labels":
            return (_e = combinedBinData == null ? void 0 : combinedBinData.chromLabels) != null ? _e : [];
          case "min_logratio":
            return showMinLogratio(true, true) ? min_logratio : [];
          case "gain_threshold":
            return [{ _val: thresholds.gain }];
          case "loss_threshold":
            return [{ _val: thresholds.loss }];
          case "deeploss_threshold":
            return [{ _val: thresholds.deeploss }];
          case "segments_classified_bin":
            return classifyBinSegments((_f = data == null ? void 0 : data.segments) != null ? _f : null, combinedBinData, thresholds);
          default:
            return [];
        }
      }
      const showHrd = state.currentDisplayMode === "both" || state.currentDisplayMode === "hrd";
      const showTso500 = state.currentDisplayMode === "both" || state.currentDisplayMode === "tso500";
      switch (name) {
        case "hrd_logratio":
          return showHrd ? (_g = data == null ? void 0 : data.hrd_logratio) != null ? _g : [] : [];
        case "tso500_logratio":
          return showTso500 ? (_h = data == null ? void 0 : data.tso500_logratio) != null ? _h : [] : [];
        case "hrd_baf":
          return showHrd ? (_i = data == null ? void 0 : data.hrd_baf) != null ? _i : [] : [];
        case "tso500_baf":
          return showTso500 ? (_j = data == null ? void 0 : data.tso500_baf) != null ? _j : [] : [];
        case "min_logratio":
          return showMinLogratio(showHrd, showTso500) ? min_logratio : [];
        case "gain_threshold":
          return [{ _val: thresholds.gain }];
        case "loss_threshold":
          return [{ _val: thresholds.loss }];
        case "deeploss_threshold":
          return [{ _val: thresholds.deeploss }];
        case "segments_classified":
          return classifySegments((_k = data == null ? void 0 : data.segments) != null ? _k : null, thresholds);
        default:
          return [];
      }
    };
    const spec = isBin ? getBinSpec() : getSpec();
    genomeSpyEmbed.embed(container, spec, { namedDataProvider }).then((res) => {
      state.embedResult = res;
      if (isBin) {
        state.binScale = res.getScaleResolutionByName("binScale");
        state.genomeScale = null;
      } else {
        state.genomeScale = res.getScaleResolutionByName("genomeScale");
        state.binScale = null;
      }
    });
  }
  function updateDisplayMode(value) {
    const prevMode = state.currentDisplayMode;
    state.currentDisplayMode = value;
    if (value === "bin" || prevMode === "bin") {
      renderPlot();
      return;
    }
    const { embedResult, data } = state;
    if (!embedResult) return;
    const showHrd = value === "both" || value === "hrd";
    const showTso500 = value === "both" || value === "tso500";
    embedResult.updateNamedData("min_logratio", showMinLogratio(showHrd, showTso500) ? min_logratio : []);
    embedResult.updateNamedData("hrd_logratio", showHrd ? data == null ? void 0 : data.hrd_logratio : []);
    embedResult.updateNamedData("tso500_logratio", showTso500 ? data == null ? void 0 : data.tso500_logratio : []);
    embedResult.updateNamedData("hrd_baf", showHrd ? data == null ? void 0 : data.hrd_baf : []);
    embedResult.updateNamedData("tso500_baf", showTso500 ? data == null ? void 0 : data.tso500_baf : []);
  }

  // app.ts
  function init(config) {
    state.data = config.data;
    state.combinedBinData = prepareCombinedBinData(
      config.data.tso500_logratio,
      config.data.hrd_logratio
    );
    document.querySelectorAll('input[name="displayMode"]').forEach((el) => {
      el.addEventListener("change", () => updateDisplayMode(el.value));
    });
    document.querySelectorAll('input[name="log2Filter"]').forEach((el) => {
      el.addEventListener("change", forceTableRender);
    });
    const prioToggle = document.getElementById("prio-toggle");
    if (prioToggle) {
      prioToggle.addEventListener("change", forceTableRender);
    }
    renderPlot();
    setTimeout(generateTableData, 500);
  }

  // main.ts
  window.spyCNV = { init };
})();
