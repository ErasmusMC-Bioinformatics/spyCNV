const logratioTrack = (hrdData, tso500Data, segments, cytobandData, options = {}) => {
    let layers = [];

    let clampMin = -3

    const xEncoding = {
        chrom: "contig",
        pos: "start",
        type: "locus",
        scale: { name: "genomeScale" },
        axis: {
            chromTickColor: "#8B9DC3", chromLabelColor: "#7A8A99",
            grid: true, gridColor: "#CCCCCC", gridOpacity: 0.3, gridDash: [1, 11],
            chromGrid: true, chromGridDash: [3, 3], chromGridColor: "#B0B8C0", chromGridOpacity: 0.4,
            chromGridFillEven: "#FFFFFF", chromGridFillOdd: "#FAFAFA"
        }
    };

    const yEncoding = {
        field: "_clampedValue",
        type: "quantitative",
        scale: { zero: false, padding: 0.02 },
        axis: { grid: true, title: "Log2", tickCount: 5 }
    };

    const clampOutliers = [
        { type: "formula", expr: `(datum.value < ${clampMin} ? ${clampMin} : datum.value)`, as: "_clampedValue" },
        { type: "formula", expr: `datum.value < ${clampMin} ? 'outlier' : 'typical'`, as: "_outlierStatus" }
    ]

    layers.push({
        data: { name: "min_logratio" },
        mark: { type: "rule", clip: true, size: 1, opacity: 0.3 },
        encoding: {
            y: {
                field: "_value",
                type: "quantitative"
            },
            color: { value: "#D73027" }
        }
    });

    const logratio_data_encoding = function(data_name) {
        return {
            data: { name: data_name },
            transform: clampOutliers,
            mark: { type: "point", clip: true, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            encoding: {
                x: xEncoding,
                y: yEncoding,
                color: { field: "_outlierStatus", type: "nominal", scale: { domain: ["typical", "outlier"], range: ["#c3ced8", "red"] }, legend: null },
                stroke: { field: "_outlierStatus", type: "nominal", scale: { domain: ["typical", "outlier"], range: ["#8696a2", "darkred"] }, legend: null },
                tooltip: [{ field: "contig", type: "nominal", title: "Chromosome" }, { field: "start", type: "quantitative", title: "Position" }, { field: "value", type: "quantitative", title: "Log2", format: ".3f" }]
            }
        }
    }

    const cnvStatus_encoding = {
        field: "cnvStatus",
        type: "nominal",
        scale: {
            domain: ["gain", "neutral", "loss", "deeploss"],
            range: ["#D73027", "#000000", "#4575B4", "#1A237E"]
        }
    }


    if (hrdData) {
        layers.push(logratio_data_encoding("hrd_logratio"));
    }

    if (tso500Data) {
        layers.push(logratio_data_encoding("tso500_logratio"));
    }

    if (segments) {
        layers.push({
            data: { values: segments, format: { type: "json" } },
            transform: [
                { type: "formula", expr: `datum.value > 6 ? 6 : (datum.value < ${clampMin} ? ${clampMin} : datum.value)`, as: "_clampedValue" },
                {
                    type: "formula",
                    expr: "datum.value >= 0.5 ? 'gain' : (datum.value > -0.5 ? 'neutral' : (datum.value <= -1 ? 'deeploss' : 'loss'))",
                    as: "cnvStatus"
                }
            ],
            encoding: {
                x: Object.assign({}, xEncoding, { pos: "start" }),
                x2: { chrom: "contig", pos: "end", type: "locus" },
                y: yEncoding,
                stroke: cnvStatus_encoding,
                color: cnvStatus_encoding,
                tooltip: [
                    { field: "contig", type: "nominal", title: "Chromosome" },
                    { field: "start", type: "quantitative", title: "Start Position" },
                    { field: "end", type: "quantitative", title: "End Position" },
                    { field: "value", type: "quantitative", title: "Log2", format: ".3f" }
                ]
            },
            stops: [30000],
            multiscale: [
                {
                    transform: [{ type: "filter", expr: "datum.cnvStatus !== 'neutral'" }],
                    mark: { type: "rect", minWidth: 5, cornerRadius: 5, clip: true, size: 3, fillOpacity: 0.4, strokeWidth: 2, strokeOpacity: 0.6 }
                    // mark: { type: "rect", minWidth: 5, cornerRadius: 5, clip: true, size: 3, opacity: 0.7 }
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
            stops: [500000],
            multiscale: [
                {
                    mark: { type: "rule", color: "#B0B8C0", strokeDash: [3, 3], size: .5, opacity: 0.4 },
                },
                {
                    mark: { type: "rule", color: "#D73027", strokeDash: [3, 3], size: .5, opacity: 0.5 },
                },
            ],
            encoding: {
                x: { chrom: "contig", pos: "pArmEnd", type: "locus", scale: { name: "genomeScale" } }
            }
        });
    }

    return {
        name: "logratioTrack",
        height: options.height ?? 300,
        layer: layers,
        resolve: {
            scale: {
                y: "shared",
                color: "independent",
                stroke: "independent"
            }
        },
    };
};
