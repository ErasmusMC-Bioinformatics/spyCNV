const logratioTrack = (hrdData, tso500Data, segments, options = {}) => {
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
        mark: { type: "rule", clip: false, size: 1, opacity: 0.3 },
        tooltip: false,
        encoding: {
            y: {
                field: "value",
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
            mark: { type: "rule", clip: true, size: 3, opacity: 0.8 },
            encoding: {
                x: Object.assign({}, xEncoding, { pos: "start" }),
                x2: { chrom: "contig", pos: "end", type: "locus" },
                y: yEncoding,
                color: {
                    field: "cnvStatus",
                    type: "nominal",
                    scale: {
                        domain: ["gain", "neutral", "loss", "deeploss"],
                        range: ["#D73027", "#000000", "#4575B4", "#1A237E"]
                    }
                },
                tooltip: [
                    { field: "contig", type: "nominal", title: "Chromosome" },
                    { field: "start", type: "quantitative", title: "Start Position" },
                    { field: "end", type: "quantitative", title: "End Position" },
                    { field: "value", type: "quantitative", title: "Log2", format: ".3f" }
                ]
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
