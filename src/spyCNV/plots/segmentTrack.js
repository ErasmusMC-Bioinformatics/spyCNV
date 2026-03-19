const segmentTrack = (data, options = {}) => ({
    name: "segments",
    description: "Copy Number Segments",
    height: options.height ?? 300,
    data: {
        values: data, format: { type: "json" },
    },
    mark: {
        type: "rule",
        size: 3,
        tooltip: null
    },
    encoding: {
        x: {
            chrom: "contig",
            pos: "start",
            type: "locus",
            scale: {
                name: "genomeScale",
            },
            axis: null
        },
        x2: {
            chrom: "contig",
            pos: "end",
            type: "locus"
        },
        y: {
            field: "value",
            type: "quantitative",
            scale: {
                domain: [-5, 5],
                clamp: true
            },
            axis: null
        },
        color: {
            value: "#000000"
        },
        tooltip: [
            { field: "contig", type: "nominal", title: "Chromosome" },
            { field: "start", type: "quantitative", title: "Start Position" },
            { field: "end", type: "quantitative", title: "End Position" },
            { field: "name", type: "nominal", title: "Segment Name" },
            { field: "value", type: "quantitative", title: "Log2" }
        ]
    }
});
