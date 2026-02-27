const bAlleleFrequencyTrack = (data, options = {}) => ({
    height: options.height ?? 300,
    data: { values: data, format: { type: "json" } },
    mark: {
        type: "point",
        size: { expr: "clamp(pow(1.5, zoomLevel) * 1, 5, 100)" },
        opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" }
    },
    encoding: {
        x: {
            chrom: "contig",
            pos: "start",
            type: "locus",
            scale: {
                name: "genomeScale",
            },
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
            scale: { domain: [0, 1] },
            axis: {
                values: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
                grid: true,
                title: "B-Allele Frequency"
            }
        },
        color: { value: "#8589ff" },
        stroke: { value: "#3c45e8" },
        tooltip: [
            { field: "chrom", type: "nominal", title: "Chromosome" },
            { field: "start", type: "quantitative", title: "Position" },
            { field: "name", type: "nominal", title: "Gene" },
            { field: "value", type: "quantitative", title: "VAF", format: ".4f" }
        ]
    }
});
