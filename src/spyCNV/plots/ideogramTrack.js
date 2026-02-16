ideogramTrack = (assembly, options = {}) => ({
    height: options.height ?? 24,

    data: {
        url: `https://genomespy.app/data/genomes/${assembly}/cytoBand.${assembly}.tsv`
    },

    transform: [
        // Remove unlocalized/unplaced scaffolds etc.
        { type: "filter", expr: "!test(/_/, datum.chrom)" }
    ],

    encoding: {
        x: {
            chrom: "chrom",
            pos: "chromStart",
            type: "locus",
            axis: null
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
})
