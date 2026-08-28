import { PRIO1, PRIO2, type Thresholds } from "./constants";
import { chrOrder, parseRefseqGenes } from "./data";
import { state } from "./state";

/** A row in the gene log2 table (one row per gene, deduplicated). */
interface TableRow {
    chr: string;
    start: number;
    end: number;
    gene: string;
    log2: number;
    score: number;
}

/** Minimal view of the grid.js row-click payload. */
interface GridRowCell {
    data: unknown;
}

interface GridRow {
    cells: GridRowCell[];
}

let tableData: TableRow[] = [];
let grid: gridjs.GridInstance | null = null;

/** Re-evaluate the grid.js data provider (used by the filter controls). */
export function forceTableRender(): void {
    grid?.forceRender();
}

function getGeneClass(gene: string): string {
    if (PRIO1.includes(gene)) return "gene-prio1";
    if (PRIO2.includes(gene)) return "gene-prio2";
    return "";
}

function getPrio(gene: string): number {
    if (PRIO1.includes(gene)) return 1;
    if (PRIO2.includes(gene)) return 2;
    return 3;
}

/** Render a Log2 cell with a CNV status arrow and color. */
function annotateCNVstatus(log: string, thresholds: Thresholds): string {
    const logFl = parseFloat(log);
    let symbol = "";
    let cls = "";

    if (logFl >= thresholds.gain) {
        symbol = "🡱";
        cls = "gain";
    } else if (logFl <= thresholds.deeploss) {
        symbol = "🡳🡳";
        cls = "deeploss";
    } else if (logFl <= thresholds.loss) {
        symbol = "🡳";
        cls = "loss";
    }

    return `<div class="cnv-cell">
      <span class="${cls}">${symbol}</span>
      <span style="text-align: right;">
          ${logFl.toFixed(3)}
      </span>
  </div>`;
}

/**
 * Build the gene x segment intersection table and hand it to grid.js.
 * Called once after init (deferred) — the segments and refSeq genes must
 * already be present in the payload.
 */
export function generateTableData(): void {
    const { data, thresholds } = state;
    if (!data || !data.segments || !data.refseq) return;

    const genes = parseRefseqGenes(data.refseq);

    tableData = [];

    data.segments.forEach(seg => {
        const segChr = seg.contig;
        const segStart = seg.start;
        const segEnd = seg.end;
        const segLog2 = seg.value;

        genes.forEach(g => {
            if (g.chrom === segChr && Math.max(g.start, segStart) <= Math.min(g.end, segEnd)) {
                tableData.push({
                    chr: segChr,
                    start: g.start,
                    end: g.end,
                    gene: g.symbol,
                    log2: segLog2,
                    score: g.score,
                });
            }
        });
    });

    const uniqueGenes: Record<string, TableRow> = {};
    tableData.forEach(item => {
        if (!uniqueGenes[item.gene] || Math.abs(item.log2) > Math.abs(uniqueGenes[item.gene].log2)) {
            uniqueGenes[item.gene] = item;
        }
    });

    tableData = Object.values(uniqueGenes);
    tableData.sort((a, b) => {
        const pA = getPrio(a.gene);
        const pB = getPrio(b.gene);
        if (pA !== pB) return pA - pB;
        return Math.abs(b.log2) - Math.abs(a.log2);
    });

    grid = new gridjs.Grid({
        columns: [
            {
                name: "Chr",
                sort: {
                    compare: (a: unknown, b: unknown) => chrOrder(String(a)) - chrOrder(String(b)),
                },
            },
            {
                name: "Gene",
                formatter: (cell: unknown) => {
                    const cls = getGeneClass(String(cell));
                    if (cls) {
                        return gridjs.html(`<span class="${cls}">${cell}</span>`);
                    }
                    return cell;
                },
            },
            {
                name: "Log2(FC)",
                sort: true,
                formatter: (log: unknown) => gridjs.html(annotateCNVstatus(String(log), thresholds)),
            },
            "Start",
            { name: "_idx", hidden: true },
        ],
        data: () => {
            const filterRadio = document.querySelector<HTMLInputElement>('input[name="log2Filter"]:checked');
            const filter = filterRadio ? filterRadio.value : "All";
            const prioEl = document.getElementById("prio-toggle") as HTMLInputElement | null;
            const prioOnly = prioEl ? prioEl.checked : false;
            let dt = tableData;
            if (prioOnly) {
                dt = dt.filter(d => getPrio(d.gene) < 3);
            }
            if (filter === "Gain") {
                dt = dt.filter(d => d.log2 >= thresholds.gain);
            } else if (filter === "Loss") {
                dt = dt.filter(d => d.log2 <= thresholds.loss && d.log2 > thresholds.deeploss);
            } else if (filter === "Deep Loss") {
                dt = dt.filter(d => d.log2 <= thresholds.deeploss);
            } else if (filter === "All Amplification and Loss") {
                dt = dt.filter(d => d.log2 >= thresholds.gain || d.log2 <= thresholds.loss);
            }
            return dt.map(r => [r.chr, r.gene, r.log2, r.start, r.end]);
        },
        search: true,
        sort: true,
        fixedHeader: true,
        maxHeight: "600px",
    }).render(document.getElementById("gene-table-wrapper")!);

    grid.on("rowClick", (...args: unknown[]) => {
        const row = args[1] as GridRow;
        const rawChr = String(row.cells[0].data);
        const chr = "chr" + rawChr;
        const cleanChr = rawChr.replace("chr", "");
        const gene = String(row.cells[1].data);
        const start = parseInt(String(row.cells[3].data), 10);
        const end = parseInt(String(row.cells[4].data), 10);

        const { currentDisplayMode, combinedBinData, binScale, genomeScale } = state;

        if (currentDisplayMode === "bin") {
            const geneBins = (combinedBinData?.allData ?? []).filter(
                r => r.gene === gene || (r.contig === cleanChr && r.start >= start && r.start <= end)
            );
            if (geneBins.length > 0) {
                const minBin = Math.min(...geneBins.map(b => b._binIndex));
                const maxBin = Math.max(...geneBins.map(b => b._binIndex));
                const pad = Math.max(15, (maxBin - minBin + 1) * 2);
                if (binScale) {
                    binScale.zoomTo([Math.max(0, minBin - pad), maxBin + pad], true);
                }
            } else {
                const chrRegion = (combinedBinData?.chromRegions ?? []).find(c => c.chrom === cleanChr);
                if (chrRegion && binScale) {
                    binScale.zoomTo([chrRegion.start - 5, chrRegion.end + 5], true);
                }
            }
        } else if (genomeScale) {
            const zoomDomain = [
                { chrom: chr, pos: Math.max(0, start - 15000000) },
                { chrom: chr, pos: end + 15000000 },
            ];
            genomeScale.zoomTo(zoomDomain, true);
        }
    });
}
