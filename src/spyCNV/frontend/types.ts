/**
 * Shared types for the spyCNV report frontend.
 *
 * These mirror the JSON payload that the Python backend (spyCNV/core.py)
 * serializes with `{{ data | tojson }}` into the standalone HTML file.
 */

/** A single log-ratio or BAF measurement (a point in a genome-spy track). */
export interface CNVRecord {
  contig: string;
  start: number;
  end?: number;
  name?: string;
  value: number;
  gene?: string;
  exon?: string;
  Tx?: string;
}

/** A called CNV segment (contig/start/end/value). */
export interface SegmentRecord extends CNVRecord {
  end: number;
  name: string;
}

/** Everything the Python backend hands to the frontend at bootstrap time. */
export interface DataPayload {
  cytoband: string;
  refseq: string;
  hrd_baf: CNVRecord[] | null;
  hrd_logratio: CNVRecord[] | null;
  tso500_baf: CNVRecord[] | null;
  tso500_logratio: CNVRecord[] | null;
  segments: SegmentRecord[] | null;
}

/** The object passed to `window.spyCNV.init(...)` by the inline bootstrap script. */
export interface InitConfig {
  sampleId: string;
  data: DataPayload;
}
