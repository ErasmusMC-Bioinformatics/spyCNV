import type { Thresholds } from "./constants";
import type { CNVRecord, SegmentRecord } from "./types";

/** Sort key for chromosomes: 1..22, X=23, Y=24, M=25, anything else last. */
export function chrOrder(chr: string | number): number {
    const val = String(chr).replace("chr", "").trim();
    if (!isNaN(Number(val))) return parseInt(val, 10);
    if (val === "X" || val === "x") return 23;
    if (val === "Y" || val === "y") return 24;
    if (val === "M" || val === "m" || val === "MT" || val === "mt") return 25;
    return 99;
}

/** A log-ratio point after normalization for the bin view. */
export interface BinRecord {
    Chr: string;
    contig: string;
    start: number;
    end: number;
    gene: string;
    exon: string;
    Tx: string;
    value: number | undefined;
    _source: string;
    _binIndex: number;
}

export interface ChromRegion {
    start: number;
    end: number;
    chrom: string;
    midpoint: number;
    isEven: "even" | "odd";
}

export interface ChromBoundary {
    boundary: number;
    chrom: string;
}

export interface ChromLabel {
    position: number;
    label: string;
}

export interface CombinedBinData {
    tso500Data: BinRecord[];
    hrdData: BinRecord[];
    allData: BinRecord[];
    chromBoundaries: ChromBoundary[];
    chromRegions: ChromRegion[];
    chromLabels: ChromLabel[];
}

/**
 * Combine the TSO500 and HRD log-ratio datasets (used by the "Bin" view).
 * Records are sorted by chromosome then start.
 * Each record gets a `_binIndex`.
 */
export function prepareCombinedBinData(
    tso500Records: CNVRecord[] | null,
    hrdRecords: CNVRecord[] | null
): CombinedBinData {
    type RawRecord = CNVRecord & {
        log2?: number;
        chromosome?: string;
        Chr?: string;
    };
    const allRecords: Array<RawRecord & { _source: string }> = [];
    if (tso500Records) {
        for (const r of tso500Records) {
            allRecords.push({ ...r, _source: "tso500" });
        }
    }
    if (hrdRecords) {
        for (const r of hrdRecords) {
            allRecords.push({ ...r, _source: "hrd" });
        }
    }

    if (!allRecords.length) {
        return {
            tso500Data: [],
            hrdData: [],
            allData: [],
            chromBoundaries: [],
            chromRegions: [],
            chromLabels: [],
        };
    }

    const formatted: Array<Omit<BinRecord, "_binIndex">> = allRecords.map(d => {
        const val = d.value !== undefined ? d.value : d.log2;
        const chr = String(d.contig || d.chromosome || d.Chr || "").replace("chr", "");
        const gene = d.gene ? d.gene.split("_")[0] : (d.name || "");
        return {
            Chr: `chr${chr}`,
            contig: chr,
            start: d.start,
            end: d.end || d.start,
            gene: gene,
            exon: d.exon || "",
            Tx: d.Tx || "",
            value: val,
            _source: d._source,
        };
    });

    formatted.sort((a, b) => {
        const numA = chrOrder(a.contig);
        const numB = chrOrder(b.contig);
        if (numA !== numB) return numA - numB;
        return (a.start || 0) - (b.start || 0);
    });

    const allData = formatted.map((d, i) => ({ ...d, _binIndex: i }));

    const chromBoundaries: ChromBoundary[] = [];
    const chromRegions: ChromRegion[] = [];
    const chromLabels: ChromLabel[] = [];
    let lastChrom: string | null = null;
    let chromStart = 0;

    allData.forEach((d, i) => {
        if (d.contig !== lastChrom) {
            if (lastChrom !== null) {
                chromBoundaries.push({ boundary: i, chrom: lastChrom });
                const midpoint = (chromStart + i - 1) / 2;
                chromRegions.push({
                    start: chromStart,
                    end: i - 1,
                    chrom: lastChrom,
                    midpoint: midpoint,
                    isEven: chromRegions.length % 2 === 0 ? "even" : "odd",
                });
                chromLabels.push({
                    position: midpoint,
                    label: lastChrom,
                });
                chromStart = i;
            }
            lastChrom = d.contig;
        }
    });

    if (lastChrom !== null && allData.length > 0) {
        const midpoint = (chromStart + allData.length - 1) / 2;
        chromRegions.push({
            start: chromStart,
            end: allData.length - 1,
            chrom: lastChrom,
            midpoint: midpoint,
            isEven: chromRegions.length % 2 === 0 ? "even" : "odd",
        });
        chromLabels.push({
            position: midpoint,
            label: lastChrom,
        });
    }

    const tso500Data = allData.filter(d => d._source === "tso500");
    const hrdData = allData.filter(d => d._source === "hrd");

    return {
        tso500Data,
        hrdData,
        allData,
        chromBoundaries,
        chromRegions,
        chromLabels,
    };
}

export type CNVStatus = "gain" | "loss" | "deeploss" | "neutral";

export type ClassifiedSegment = SegmentRecord & { cnvStatus: CNVStatus };

/** Annotate each segment with a CNV status based on the current thresholds. */
export function classifySegments(
    segments: SegmentRecord[] | null,
    thresholds: Thresholds
): ClassifiedSegment[] {
    if (!segments) return [];
    return segments.map(s => ({
        ...s,
        cnvStatus: s.value >= thresholds.gain ? "gain"
            : s.value <= thresholds.deeploss ? "deeploss"
                : s.value <= thresholds.loss ? "loss"
                    : "neutral",
    }));
}

export type ClassifiedBinSegment = ClassifiedSegment & { startBin: number; endBin: number };

/** Like classifySegments(), but additionally maps each segment onto bin indices. */
export function classifyBinSegments(
    segments: SegmentRecord[] | null,
    combinedBinData: CombinedBinData | null,
    thresholds: Thresholds
): ClassifiedBinSegment[] {
    if (!segments) return [];
    const baseData = combinedBinData?.allData;
    if (!baseData || !baseData.length) return [];

    const classified = classifySegments(segments, thresholds);
    const result: ClassifiedBinSegment[] = [];
    for (const seg of classified) {
        const segChr = String(seg.contig).replace("chr", "");
        const matching = baseData.filter(
            r => r.contig === segChr && r.start >= seg.start && r.start <= seg.end
        );
        if (matching.length > 0) {
            const startBin = matching[0]._binIndex;
            const endBin = matching[matching.length - 1]._binIndex;
            result.push({ ...seg, startBin, endBin });
        }
    }
    return result;
}

/** A single gene row parsed from the RefSeq TSV (used by the gene table). */
export interface RefSeqGene {
    symbol: string;
    chrom: string;
    start: number;
    end: number;
    score: number;
}

/** Parse the RefSeq gene annotation TSV into records for the gene table. */
export function parseRefseqGenes(refseq: string): RefSeqGene[] {
    const lines = refseq.trim().split("\n");
    return lines.map(line => {
        const cols = line.split("\t");
        return {
            symbol: cols[0],
            chrom: cols[1] ? cols[1].replace("chr", "") : "",
            start: parseInt(cols[2], 10),
            end: parseInt(cols[2], 10) + parseInt(cols[3], 10),
            score: parseInt(cols[5], 10) || 0,
        };
    });
}
