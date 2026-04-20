const bAlleleFrequencyTrack = (hrdData, tso500Data, options = {}) => {
    let layers = [];

    const xEncoding = {
        chrom: "contig", pos: "start", type: "locus",
        scale: { name: "genomeScale" },
        axis: {
            chromTickColor: "#8B9DC3", chromLabelColor: "#7A8A99",
            grid: true, gridColor: "#CCCCCC", gridOpacity: 0.3, gridDash: [1, 11],
            chromGrid: true, chromGridDash: [3, 3], chromGridColor: "#B0B8C0", chromGridOpacity: 0.4,
            chromGridFillEven: "#FFFFFF", chromGridFillOdd: "#FAFAFA"
        }
    };

    const yEncoding = {
        field: "value", type: "quantitative", scale: { domain: [-0.03, 1.03] },
        axis: { values: [0, 0.2, 0.4, 0.6, 0.8, 1.0], grid: true, title: "B-Allele Frequency" }
    };

    if (hrdData) {
        layers.push({
            data: { name: "hrd_baf" },
            transform: [],
            mark: { type: "point", clip: false, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            encoding: {
                x: xEncoding, y: yEncoding,
                color: { value: "#8589ff" }, stroke: { value: "#3c45e8" },
                tooltip: [
                    { field: "contig", type: "nominal", title: "Chromosome" },
                    { field: "start", type: "quantitative", title: "Position" },
                    { field: "value", type: "quantitative", title: "VAF", format: ".4f" }
                ]
            }
        });
    }

    if (tso500Data) {
        layers.push({
            data: { name: "tso500_baf" },
            transform: [],
            mark: { type: "point", clip: false, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            encoding: {
                x: xEncoding, y: yEncoding,
                color: { value: "#8589ff" }, stroke: { value: "#3c45e8" },
                tooltip: [
                    { field: "contig", type: "nominal", title: "Chromosome" },
                    { field: "start", type: "quantitative", title: "Position" },
                    { field: "value", type: "quantitative", title: "VAF", format: ".4f" }
                ]
            }
        });
    }

    return {
        name: "bAlleleFrequencyTrack",
        height: options.height ?? 350,
        layer: layers,
        resolve: { scale: { y: "shared" } }
    };
};
