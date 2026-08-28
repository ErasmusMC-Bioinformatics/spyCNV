#!/usr/bin/env node
/**
 * Headless smoke test for the bundled app (src/spyCNV/static/app.js).
 *
 * Stubs the browser environment (window/document/genomeSpyEmbed/gridjs),
 * boots the bundle with the real payload extracted from a generated report,
 * and exercises the main interactions:
 *   - renderPlot() in the default "both" mode
 *   - namedDataProvider lookups (all datasets)
 *   - mode switch to "tso500" (updateNamedData path)
 *   - mode switch to "bin" (re-embed path)
 *   - grid.js table generation + filter forceRender
 *   - row-click zooming in both genome and bin views
 *
 * Usage: node smoke_app.mjs <path-to-generated.html>
 */
import { readFileSync } from "node:fs";

const htmlPath = process.argv[2];
if (!htmlPath) {
    console.error("usage: node smoke_app.mjs <generated.html>");
    process.exit(1);
}

//  helpers
let failures = 0;
function check(name, cond) {
    if (cond) {
        console.log(`  ok: ${name}`);
    } else {
        failures++;
        console.error(`  FAIL: ${name}`);
    }
}

function extractPayload(html) {
    const start = html.lastIndexOf("window.spyCNV.init(") + "window.spyCNV.init(".length;
    const brace = html.indexOf("{", start);
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = brace;
    while (end < html.length) {
        const c = html[end];
        if (inStr) {
            if (esc) esc = false;
            else if (c === "\\") esc = true;
            else if (c === '"') inStr = false;
        } else {
            if (c === '"') inStr = true;
            else if (c === "{") depth++;
            else if (c === "}") {
                depth--;
                if (depth === 0) break;
            }
        }
        end++;
    }
    return JSON.parse(html.slice(brace, end + 1));
}

// DOM stubs
class StubElement {
    constructor(id) {
        this.id = id;
        this.innerHTML = "";
        this.innerText = "";
        this.value = "";
        this.checked = false;
        this._listeners = {};
    }
    addEventListener(type, fn) {
        (this._listeners[type] ||= []).push(fn);
    }
    dispatch(type) {
        for (const fn of this._listeners[type] || []) fn({ target: this });
    }
}

const elements = new Map();
const getElementById = id => {
    if (!elements.has(id)) elements.set(id, new StubElement(id));
    return elements.get(id);
};

const displayModeRadios = ["both", "tso500", "hrd", "bin"].map(v => {
    const el = new StubElement(`radio-display-${v}`);
    el.value = v;
    el.checked = v === "both";
    return el;
});
const log2FilterRadios = ["All", "All Amplification and Loss", "Gain", "Loss", "Deep Loss"].map(v => {
    const el = new StubElement(`radio-filter-${v}`);
    el.value = v;
    el.checked = v === "All";
    return el;
});
const prioToggle = getElementById("prio-toggle");

const documentStub = {
    getElementById,
    querySelectorAll(sel) {
        if (sel === 'input[name="displayMode"]') return displayModeRadios;
        if (sel === 'input[name="log2Filter"]') return log2FilterRadios;
        return [];
    },
    querySelector(sel) {
        if (sel === 'input[name="log2Filter"]:checked') {
            return log2FilterRadios.find(r => r.checked) || null;
        }
        return null;
    },
};

// library stubs
const gridjsStub = {
    html: content => ({ __html: content }),
    instances: [],
    forceRenderCount: 0,
    Grid: class {
        constructor(config) {
            this.config = config;
            gridjsStub.instances.push(this);
        }
        render(el) {
            this.el = el;
            return this;
        }
        forceRender() {
            gridjsStub.forceRenderCount++;
            return this;
        }
        on(event, fn) {
            this.handlers = { ...(this.handlers || {}), [event]: fn };
            return this;
        }
    },
};

const embedCalls = [];
let activeEmbed = null;
const genomeSpyEmbedStub = {
    embed(container, spec, options) {
        const res = {
            spec,
            provider: options.namedDataProvider,
            namedData: {},
            scales: {},
            updateNamedData(name, data) {
                this.namedData[name] = data;
            },
            getScaleResolutionByName(name) {
                const scale = {
                    name,
                    zoomCalls: [],
                    zoomTo(domain, animate) {
                        this.zoomCalls.push({ domain, animate });
                    },
                };
                this.scales[name] = scale;
                return scale;
            },
        };
        embedCalls.push(res);
        activeEmbed = res;
        return Promise.resolve(res);
    },
};

// ------------------------------------------------------------------ boot ----
const appJs = readFileSync(new URL("../static/app.js", import.meta.url), "utf8");
const html = readFileSync(htmlPath, "utf8");
const config = extractPayload(html);
const data = config.data;

const windowStub = {};
const setTimeoutStub = fn => {
    fn();
    return 0;
};

const boot = new Function(
    "window", "document", "setTimeout", "genomeSpyEmbed", "gridjs",
    appJs
);
boot(windowStub, documentStub, setTimeoutStub, genomeSpyEmbedStub, gridjsStub);

const flush = () => new Promise(resolve => queueMicrotask(resolve));

async function main() {
    console.log("booting init with real payload...");
    windowStub.spyCNV.init(config);
    await flush();

    console.log("genome (both) view:");
    check("embed called once", embedCalls.length === 1);
    const genomeEmbed = embedCalls[0];
    check("spec has 4 vconcat tracks", genomeEmbed.spec.vconcat.length === 4);
    check("assembly is hg19", genomeEmbed.spec.assembly === "hg19");
    check("genomeScale resolution fetched", !!genomeEmbed.scales.genomeScale);
    check("binScale resolution null", genomeEmbed.scales.binScale === undefined);

    const p = name => genomeEmbed.provider(name);
    check("hrd_logratio provided", p("hrd_logratio")?.length === data.hrd_logratio.length);
    check("tso500_logratio provided", p("tso500_logratio")?.length === data.tso500_logratio.length);
    check("hrd_baf provided", p("hrd_baf")?.length === data.hrd_baf.length);
    check("tso500_baf provided", p("tso500_baf")?.length === data.tso500_baf.length);
    check("min_logratio provided", Array.isArray(p("min_logratio")) && p("min_logratio")[0]._value === -2.5);
    check("gain_threshold default 0.5", p("gain_threshold")[0]._val === 0.5);
    const segs = p("segments_classified");
    check("segments classified", segs.length === data.segments.length);
    check("segments have cnvStatus", segs.every(s => ["gain", "loss", "deeploss", "neutral"].includes(s.cnvStatus)));

    console.log("switch to tso500 (updateNamedData path):");
    displayModeRadios[1].checked = true;
    displayModeRadios[1].dispatch("change");
    check("embed NOT re-created", embedCalls.length === 1);
    check("hrd_logratio cleared", activeEmbed.namedData.hrd_logratio.length === 0);
    check("tso500_logratio kept", activeEmbed.namedData.tso500_logratio.length === data.tso500_logratio.length);
    check("hrd_baf cleared", activeEmbed.namedData.hrd_baf.length === 0);

    console.log("switch to bin (re-embed path):");
    displayModeRadios[3].checked = true;
    displayModeRadios[3].dispatch("change");
    await flush();
    check("embed re-created", embedCalls.length === 2);
    const binEmbed = embedCalls[1];
    check("bin spec has 1 vconcat track", binEmbed.spec.vconcat.length === 1);
    check("binScale resolution fetched", !!binEmbed.scales.binScale);
    const bp = name => binEmbed.provider(name);
    check("tso500_logratio_bin provided", bp("tso500_logratio_bin")?.length === data.tso500_logratio.length);
    check("hrd_logratio_bin provided", bp("hrd_logratio_bin")?.length === data.hrd_logratio.length);
    check("chrom_regions provided", Array.isArray(bp("chrom_regions")) && bp("chrom_regions").length > 0);
    check("chrom_labels provided", Array.isArray(bp("chrom_labels")) && bp("chrom_labels").length > 0);
    check("segments_classified_bin provided", Array.isArray(bp("segments_classified_bin")));

    console.log("gene table (grid.js):");
    check("grid created", gridjsStub.instances.length === 1);
    const grid = gridjsStub.instances[0];
    check("grid has 5 columns", grid.config.columns.length === 5);
    check("filter radio change forces render", (() => {
        log2FilterRadios[2].checked = true;
        log2FilterRadios[2].dispatch("change");
        return gridjsStub.forceRenderCount === 1;
    })());
    check("prio toggle change forces render", (() => {
        prioToggle.dispatch("change");
        return gridjsStub.forceRenderCount === 2;
    })());
    const rows = grid.config.data();
    check("filtered rows returned", Array.isArray(rows));
    check("rows have 5 cells", rows.every(r => r.length === 5));

    console.log("row-click zoom (bin view):");
    const rowClick = grid.handlers.rowClick;
    check("rowClick handler registered", typeof rowClick === "function");
    const row = {
        cells: [
            { data: data.tso500_logratio[0].contig },
            { data: data.tso500_logratio[0].gene },
            { data: data.tso500_logratio[0].value },
            { data: data.tso500_logratio[0].start },
            { data: data.tso500_logratio[0].start + 1000 },
        ],
    };
    rowClick({}, row);
    check("binScale zoomed", binEmbed.scales.binScale.zoomCalls.length === 1);
    check("zoom domain is numeric pair", Array.isArray(binEmbed.scales.binScale.zoomCalls[0].domain) && binEmbed.scales.binScale.zoomCalls[0].domain.length === 2);

    console.log("row-click zoom (genome view):");
    displayModeRadios[0].checked = true;
    displayModeRadios[0].dispatch("change");
    await flush();
    check("embed re-created", embedCalls.length === 3);
    const genomeEmbed2 = embedCalls[2];
    rowClick({}, row);
    check("genomeScale zoomed", genomeEmbed2.scales.genomeScale.zoomCalls.length === 1);
    const zoomDomain = genomeEmbed2.scales.genomeScale.zoomCalls[0].domain;
    check(
        "zoom domain is chrom/pos pair",
        zoomDomain.length === 2 && zoomDomain[0].chrom === `chr${row.cells[0].data}` && typeof zoomDomain[0].pos === "number"
    );

    console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
}

main();
