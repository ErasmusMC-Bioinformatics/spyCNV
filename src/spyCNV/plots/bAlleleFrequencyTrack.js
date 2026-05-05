const bAlleleFrequencyTrack = (hrdData, tso500Data, cytobandData, options = {}) => {
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

    const baf_data_encoding = function(data_name) {
        return {
            data: { name: data_name },
            transform: [],
            mark: { type: "point", clip: true, size: { "expr": "min(0.1 * pow(zoomLevel, 2), 120)" }, opacity: { expr: "clamp(1 - zoomLevel * 0.1, 0.7, 1)" } },
            encoding: {
                x: xEncoding, y: yEncoding,
                color: { value: "#c3ced8" }, stroke: { value: "#8696a2" },
                tooltip: [
                    { field: "contig", type: "nominal", title: "Chromosome" },
                    { field: "start", type: "quantitative", title: "Position" },
                    { field: "value", type: "quantitative", title: "VAF", format: ".4f" }
                ]
            }
        }
    }

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
        name: "bAlleleFrequencyTrack",
        height: options.height ?? 300,
        layer: layers,
        resolve: { scale: { y: "shared" } }
    };
};
