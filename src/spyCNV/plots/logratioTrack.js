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
        // { type: "formula", expr: `datum.value > ${clampMax} ? ${clampMax} : (datum.value < ${clampMin} ? ${clampMin} : datum.value)`, as: "_clampedValue" },
        { type: "formula", expr: `(datum.value < ${clampMin} ? ${clampMin} : datum.value)`, as: "_clampedValue" },
        // { type: "formula", expr: `datum.value > ${clampMax} || datum.value < ${clampMin} ? 'outlier' : 'normal'`, as: "_outlierStatus" }
        { type: "formula", expr: `datum.value < ${clampMin} ? 'outlier' : 'normal'`, as: "_outlierStatus" }
    ]

    // layers.push({
    //     data: { values: [{ value: -3 }] },
    //     mark: { type: "rule", clip: false, size: 1, opacity: 0.3 },
    //     tooltip: false,
    //     encoding: {
    //         y: {
    //             field: "value",
    //             type: "quantitative"
    //         },
    //         color: { value: "#4575B4" }
    //     }
    // });

    if (hrdData) {
        layers.push({
            data: { name: "hrd_logratio" },
            transform: clampOutliers,
            // mark: { type: "point", clip: true, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            mark: { type: "point", clip: true, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            encoding: {
                x: xEncoding,
                y: yEncoding,
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
            mark: { type: "point", clip: true, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            encoding: {
                x: xEncoding,
                y: yEncoding,
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
                { type: "formula", expr: `datum.value > 6 ? 6 : (datum.value < ${clampMin} ? ${clampMin} : datum.value)`, as: "_clampedValue" }
            ],
            mark: { type: "rule", clip: true, size: 3, tooltip: null },
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
        height: options.height ?? 350,
        layer: layers,
        resolve: { scale: { y: "shared" } }
    };
};
