geneAnnotationTrack = (refseqGenes, options = {}) => ({
    name: "geneAnnotations",

    description: [
        "RefSeq genes scored by their citation counts",
        "The scoring method: https://docs.higlass.io/data_preparation.html#gene-annotation-tracks",
        "Some background: https://www.nature.com/articles/d41586-017-07291-9"
    ],
    params: [{ name: "symbolFontSize", value: 11 }],
    height: options.height ?? 70,

    data: {
        values: refseqGenes,
        format: {
            type: "tsv",
            // Specify types explicitly. Skips type inference, which is a bit slow.
            parse: {
                symbol: "string",
                chrom: "string",
                start: "integer",
                length: "integer",
                strand: "string",
                score: "integer",
                exons: "string"
            }
        }
    },

    transform: [
        {
            type: "linearizeGenomicCoordinate",
            chrom: "chrom",
            pos: "start",
            as: "_start"
        },
        {
            type: "formula",
            expr: "datum._start + datum.length",
            as: "_end"
        },
        {
            type: "formula",
            expr: "datum.score >= 20000 ? 'priority' : (datum.score >= 10000 ? 'oncogene' : 'normal')",
            as: "geneClass"
        },
        {
            type: "collect",
            sort: { field: ["_start"] }
        },
        {
            type: "pileup",
            start: "_start",
            end: "_end",
            as: "_lane",
            preference: "strand",
            preferredOrder: ["-", "+"]
        },
        {
            type: "filter",
            expr: "datum._lane < 3"
        }
    ],

    encoding: {
        x: { axis: null },
        y: {
            field: "_lane",
            type: "ordinal",
            scale: {
                type: "index",
                align: 0,
                paddingInner: 0.4,
                paddingOuter: 0.2,
                domain: [0, 3],
                reverse: true,
                zoom: false
            },
            axis: null
        }
    },

    layer: [
        {
            name: "transcripts",

            opacity: {
                unitsPerPixel: [100000, 40000],
                values: [0, 1]
            },

            layer: [
                {
                    name: "bodies",

                    title: "Gene annotations",

                    mark: {
                        type: "rule",
                        minLength: 0.5,
                        size: 1,
                        yOffset: 0.5,
                        tooltip: null
                    },
                    encoding: {
                        x: { field: "_start", type: "locus", axis: null },
                        x2: { field: "_end", band: 0 },
                        search: { field: "symbol" },
                        color: {
                            field: "geneClass",
                            type: "nominal",
                            scale: {
                                domain: ["priority", "oncogene", "normal"],
                                range: ["#E69F00", "#A55AF4", "#b0b0b0"]
                            }
                        }
                    }
                },
                {
                    name: "exons",

                    transform: [
                        { type: "project", fields: ["_lane", "_start", "exons", "geneClass"] },
                        { type: "flattenCompressedExons", start: "_start" }
                    ],

                    mark: {
                        type: "rect",
                        strokeWidth: 1,
                        minOpacity: 0.2,
                        minWidth: 0.1,
                        yOffset: 0.5,
                        tooltip: null
                    },

                    encoding: {
                        x: { field: "exonStart", type: "locus" },
                        x2: { field: "exonEnd" },
                        stroke: {
                            field: "geneClass",
                            type: "nominal",
                            scale: {
                                domain: ["priority", "oncogene", "normal"],
                                range: ["#E69F00", "#A55AF4", "#b0b0b0"]
                            }
                        },
                        fill: {
                            field: "geneClass",
                            type: "nominal",
                            scale: {
                                domain: ["priority", "oncogene", "normal"],
                                range: ["#FDE8C5", "#EEDDF5", "#f0f0f0"]
                            }
                        }
                    }
                }
            ]
        },
        {
            name: "symbols",

            transform: [
                { type: "collect" },
                {
                    type: "measureText",
                    fontSize: { expr: "symbolFontSize" },
                    field: "symbol",
                    as: "_textWidth"
                },
                {
                    type: "filterScoredLabels",
                    lane: "_lane",
                    score: "score",
                    width: "_textWidth",
                    pos: "_start",
                    pos2: "_end",
                    asMidpoint: "_midpoint",
                    padding: 8
                }
            ],

            layer: [
                {
                    name: "labels",
                    mark: {
                        type: "text",
                        size: { expr: "symbolFontSize" },
                        yOffset: 7,
                        tooltip: {
                            handler: "refseqgene"
                        }
                    },
                    encoding: {
                        x: {
                            field: "_midpoint",
                            type: "locus"
                        },
                        text: { field: "symbol" },
                        color: {
                            field: "geneClass",
                            type: "nominal",
                            scale: {
                                domain: ["priority", "oncogene", "normal"],
                                range: ["#b37b00", "#763cb5", "black"]
                            }
                        }
                    }
                },
                {
                    name: "arrows",
                    opacity: {
                        unitsPerPixel: [100000, 40000],
                        values: [0, 1]
                    },
                    mark: {
                        type: "point",
                        yOffset: 7,
                        size: 50,
                        tooltip: null
                    },
                    encoding: {
                        x: {
                            field: "_midpoint",
                            type: "locus"
                        },
                        dx: {
                            expr: "(datum._textWidth / 2 + 5) * (datum.strand == '-' ? -1 : 1)",
                            type: "quantitative",
                            scale: null
                        },
                        color: {
                            field: "geneClass",
                            type: "nominal",
                            scale: {
                                domain: ["priority", "oncogene", "normal"],
                                range: ["#b37b00", "#763cb5", "black"]
                            }
                        },
                        shape: {
                            field: "strand",
                            type: "nominal",
                            scale: {
                                domain: ["-", "+"],
                                range: ["triangle-left", "triangle-right"]
                            }
                        }
                    }
                }
            ]
        }
    ]
});
