const logratioTrack = (hrdData, tso500Data, segments, options = {}) => {
    let layers = [];

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
        scale: { domain: [-6.3, 6.3] },
        axis: { grid: true, title: "Log2", tickCount: 5 }
    };

    const clampOutliers = [
        { type: "formula", expr: "datum.value > 6 ? 6 : (datum.value < -6 ? -6 : datum.value)", as: "_clampedValue" },
        { type: "formula", expr: "datum.value > 6 || datum.value < -6 ? 'outlier' : 'normal'", as: "_outlierStatus" }
    ]

    if (hrdData) {
        layers.push({
            data: { name: "hrd_logratio" },
            transform: clampOutliers,
            mark: { type: "point", geometricZoomBound: 12, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            encoding: {
                x: xEncoding,
                y: yEncoding,
                size: { value: 120 },
                color: { field: "_outlierStatus", type: "nominal", scale: { domain: ["normal", "outlier"], range: ["#8589ff", "red"] }, legend: null },
                stroke: { field: "_outlierStatus", type: "nominal", scale: { domain: ["normal", "outlier"], range: ["#3c45e8", "darkred"] }, legend: null },
                tooltip: [{ field: "contig", type: "nominal", title: "Chromosome" }, { field: "start", type: "quantitative", title: "Position" }, { field: "value", type: "quantitative", title: "Log2", format: ".3f" }]
            }
        });
    }

    if (tso500Data) {
        layers.push({
            data: { name: "tso500_logratio" },
            transform: clampOutliers,
            mark: { type: "point", geometricZoomBound: 12, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            encoding: {
                x: xEncoding,
                y: yEncoding,
                size: { value: 120 },
                color: { field: "_outlierStatus", type: "nominal", scale: { domain: ["normal", "outlier"], range: ["#ffb14e", "red"] }, legend: null },
                stroke: { field: "_outlierStatus", type: "nominal", scale: { domain: ["normal", "outlier"], range: ["#3c45e8", "darkred"] }, legend: null },
                tooltip: [{ field: "contig", type: "nominal", title: "Chromosome" }, { field: "start", type: "quantitative", title: "Position" }, { field: "value", type: "quantitative", title: "Log2", format: ".3f" }]
            }
        });
    }

    if (segments) {
        layers.push({
            data: { values: segments, format: { type: "json" } },
            transform: [
                { type: "formula", expr: "datum.value > 6 ? 6 : (datum.value < -6 ? -6 : datum.value)", as: "_clampedValue" }
            ],
            mark: { type: "rule", size: 3, tooltip: null },
            encoding: {
                x: Object.assign({}, xEncoding, { pos: "start" }),
                x2: { chrom: "contig", pos: "end", type: "locus" },
                y: yEncoding,
                color: { value: "#000000" },
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
        resolve: { scale: { y: "shared" } }
    };
};
