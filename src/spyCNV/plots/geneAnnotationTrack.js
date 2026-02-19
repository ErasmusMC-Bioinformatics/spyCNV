geneAnnotationTrack = (refseqGenes, options = {}) => ({
    name: "geneAnnotations",

    description: [
        "RefSeq genes scored by their citation counts",
        "The scoring method: https://docs.higlass.io/data_preparation.html#gene-annotation-tracks",
        "Some background: https://www.nature.com/articles/d41586-017-07291-9"
    ],

    height: options.height ?? 70,

    data: {
        values: refseqGenes,
        format: {
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
        // We linearize the coordinate upfront to make it more straightforward to fit the top n gene symbols
        // into the available space.
        {
            type: "linearizeGenomicCoordinate",
            chrom: "chrom",
            pos: "start",
            as: "_start"
        },
        {
            type: "formula",
            expr: "datum._start + +datum.length",
            as: "_end"
        },
        // Centroid is used for centering the gene symbols
        {
            type: "formula",
            expr: "datum._start + datum.length / 2",
            as: "_centroid"
        },
        // Pileup needs sorted data
        {
            type: "collect",
            sort: { field: ["_start"] }
        },
        // Choose lanes for genes.
        {
            type: "pileup",
            start: "_start",
            end: "_end",
            as: "_lane",
            preference: "strand",
            preferredOrder: ["-", "+"]
        },
        // Display a maximum of three lanes to conserve space.
        {
            type: "filter",
            expr: "datum._lane < 3"
        }
    ],

    encoding: {
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
                // Index scale is zoomable by default. Prevent it.
                zoom: false
            },
            axis: null
        }
    },

    layer: [
        {
            name: "transcripts",

            // Implement semantic zooming by making the layer visible only when zoomed close enough.
            opacity: {
                // Units per pixel = Base pairs per pixel
                unitsPerPixel: [100000, 40000],
                values: [0, 1]
            },

            encoding: {
                color: { value: "#909090" }
            },

            layer: [
                {
                    name: "exons",

                    transform: [
                        // Save memory by getting rid of extra field – Only retain the required ones
                        { type: "project", fields: ["_lane", "_start", "exons"] },
                        // The data file uses delta encoding for alternating exon/intron lengths to compress it.
                        // This transform decompresses it and generates a new data item for each exon.
                        { type: "flattenCompressedExons", start: "_start" }
                    ],

                    mark: {
                        type: "rect",
                        minOpacity: 0.2,
                        minWidth: 0.5,
                        buildIndex: true,
                        tooltip: null
                    },

                    encoding: {
                        x: { field: "exonStart", type: "locus" },
                        x2: { field: "exonEnd" }
                    }
                },
                {
                    name: "bodies",

                    mark: {
                        type: "rule",
                        minLength: 0.5,
                        size: 1,
                        buildIndex: true,
                        tooltip: null
                    },
                    encoding: {
                        x: { field: "_start", type: "locus", axis: null },
                        x2: { field: "_end" },
                        search: { field: "symbol", type: "nominal" }
                    }
                }
            ]
        },
        {
            name: "symbols",

            transform: [
                // Measures the widths of the symbol labels. Used by the subsequent transform.
                {
                    type: "measureText",
                    fontSize: 11,
                    field: "symbol",
                    as: "_textWidth"
                },
                // The following transform buffers the data items and reflows a subset of them when the scale
                // domain associated with the "_centroid" field is changed, i.e., the user zooms or pans.
                // The transform chooses the top n (by score) data items from the domain and eagerly tries to
                // fit them into the available space. If there was no space, the next data item is tried.
                {
                    type: "filterScoredLabels",
                    lane: "_lane",
                    score: "score",
                    width: "_textWidth",
                    pos: "_centroid",
                    padding: 5
                }
            ],

            layer: [
                {
                    name: "labels",
                    mark: {
                        type: "text",
                        size: 11,
                        yOffset: 7,
                        tooltip: {
                            // Using a custom tooltip handler that fetches summary descriptions from RefSeq Gene
                            handler: "refseqgene"
                        }
                    },
                    encoding: {
                        x: {
                            field: "_centroid",
                            type: "locus"
                        },
                        text: { field: "symbol", type: "nominal" }
                    }
                },
                {
                    name: "arrows",
                    // Semantic zooming
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
                            field: "_centroid",
                            type: "locus"
                        },
                        dx: {
                            expr: "(datum._textWidth / 2 + 5) * (datum.strand == '-' ? -1 : 1)",
                            type: "quantitative",
                            scale: null
                        },
                        color: { value: "black" },
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
