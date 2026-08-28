import type { CNVRecord, SegmentRecord } from "./types";

/** Genome assembly used for all specs (the backend only ships hg19/hg38 cytoband files). */
export const ASSEMBLY = "hg19";

/**
 * Values below this are clamped for display in the log-ratio tracks.
 * Kept in sync with MIN_LOGRATIO below.
 */
export const CLAMP_MIN = -2.5;

/** A red guide line is shown when a lower logratio value is present. */
export const MIN_LOGRATIO = -2.5;

/** Named data payload for the min-logratio guide line (field `_value`). */
export const min_logratio = [{ _value: MIN_LOGRATIO }];

export interface Thresholds {
    gain: number;
    loss: number;
    deeploss: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
    gain: 0.5,
    loss: -0.5,
    deeploss: -1.0,
};

/** Tier-1 key cancer genes (highlighted in the gene table). */
export const PRIO1 = [
    "BRCA1", "BRCA2", "CDKN2A", "PTEN", "RB1", "STK11", "TP53",
    "APC", "ATM", "BAP1", "CDH1", "MLH1", "MSH2", "MSH6",
    "NF1", "NF2", "RAD51C", "VHL",
];

/** Tier-2 key cancer genes (highlighted in the gene table). */
export const PRIO2 = [
    "AR", "BRAF", "CCND1", "CCNE1", "CDK4", "CDK6", "EGFR", "ERBB2", "ERBB3",
    "FGFR1", "FGFR3", "KRAS", "MCL1", "MDM2", "MET", "MITF", "MYC", "MYCL1",
    "MYCN", "NKX2-1", "PDGFRA", "PIK3CA", "SOX2", "TERT", "ZNF703",
];
