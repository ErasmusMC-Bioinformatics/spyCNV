ideogramTrack = (cytobandValues, options = {}) => ({
    spacing: 0,
    vconcat: [
        {
            "$schema": "https://cdn.jsdelivr.net/npm/@genome-spy/core/dist/schema.json",

            "resolve": { "scale": { "x": "excluded" } },

            "spacing": 0,

            "vconcat": [
                {
                    "name": "chromosomes",

                    "height": 20,

                    "view": { "stroke": "#d0d0d0", "strokeZindex": 10 },

                    "cursor": "text",

                    "data": { "lazy": { "type": "axisGenome", "channel": "x" } },

                    "encoding": {
                        "x": {
                            "field": "continuousStart",
                            "type": "locus",
                            "axis": null,
                            "scale": { "zoom": false }
                        },
                        "x2": { "field": "continuousEnd" },
                        "text": { "field": "name" }
                    },

                    "layer": [
                        {
                            "encoding": {
                                "fill": {
                                    "field": "odd",
                                    "type": "nominal",
                                    "scale": {
                                        "domain": [true, false],
                                        "range": ["#f0f0f0", "white"]
                                    }
                                }
                            },

                            "mark": {
                                "type": "rect",
                                "tooltip": null,
                                "clip": true
                            }
                        },
                        {
                            "mark": {
                                "type": "text",
                                "paddingX": 3,
                                "paddingY": 5,
                                "tooltip": null
                            }
                        }
                    ],

                    "params": [
                        {
                            "name": "brush",
                            "persist": false,
                            "select": {
                                "type": "interval",
                                "encodings": ["x"],
                                "mark": {
                                    "clip": false,
                                    "zindex": 11,
                                    "stroke": "#048",
                                    "strokeOpacity": 0.6,
                                    "fillOpacity": 0.02,
                                    "fill": "#08F",
                                    "shadowBlur": 5,
                                    "shadowColor": "#08F",
                                    "shadowOpacity": 0.8
                                }
                            },
                            "push": "outer"
                        }
                    ]
                },
                {
                    "name": "link-decoration",
                    "height": 30,
                    "data": { "lazy": { "type": "axisGenome", "channel": "x" } },
                    "transform": [
                        {
                            "type": "aggregate",
                            "fields": ["continuousEnd"],
                            "ops": ["max"],
                            "as": ["genomeEnd"]
                        },
                        { "type": "formula", "expr": "[0, datum.genomeEnd]", "as": "x2" },
                        { "type": "flatten", "fields": ["x2"], "index": "side" },
                        { "type": "collect" },
                        {
                            "type": "formula",
                            "expr": "brush.intervals.x ? brush.intervals.x[datum.side] : datum.x2",
                            "as": "x"
                        }
                    ],
                    "encoding": {
                        "x": {
                            "field": "x",
                            "type": "locus",
                            "scale": { "zoom": false },
                            "axis": null
                        },
                        "x2": { "field": "x2" }
                    },
                    "mark": {
                        "type": "link",
                        "linkShape": "diagonal",
                        "y": 1,
                        "y2": 0,
                        "color": "#8CF"
                    }
                }
            ]
        },
        {
            height: options.height ?? 24,

            data: {
                values: cytobandValues,
                format: { type: "tsv" }
            },

            view: { stroke: "#b0b0b0" },

            transform: [
                // Remove unlocalized/unplaced scaffolds etc.
                { type: "filter", expr: "!test(/_/, datum.chrom)" }
            ],

            encoding: {
                x: {
                    chrom: "chrom",
                    pos: "chromStart",
                    type: "locus",
                    axis: null,
                    scale: {
                        domain: { param: "brush" },
                    }
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
        }
    ],





});
