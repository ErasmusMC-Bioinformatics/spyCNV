const logratioTrack = (data, options = {}) => ({
    height: options.height ?? 300,
    data: {
        values: data, format: { type: "json" },
    },
    mark: {
        type: "point",
        // size: {expr: "min(1 * pow(zoomLevel, 1), 70)"},
        size: { expr: "clamp(pow(1.5, zoomLevel) * 1, 5, 100)" },
        opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" }
        // opacity: 0.7
    },
    encoding: {
        x: {
            chrom: "contig",
            pos: "start",
            type: "locus",
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
        },
        y: {
            field: "value",
            type: "quantitative",
            scale: {
                // domain: [-3, 3],
                clamp: true
            },
            axis: {
                grid: true,
                title: "Logratio"
            }
        },
        color: { value: "#8589ff" },
        stroke: { value: "#3c45e8" },
        tooltip: [
            { field: "contig", type: "nominal", title: "Chromosome" },
            { field: "start", type: "quantitative", title: "Position" },
            { field: "name", type: "nominal", title: "Gene" },
        ]
    }
});
