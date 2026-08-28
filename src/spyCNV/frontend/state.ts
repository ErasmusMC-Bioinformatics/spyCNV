import { DEFAULT_THRESHOLDS, type Thresholds } from "./constants";
import type { CombinedBinData } from "./data";
import type { DataPayload } from "./types";

/**
 * Module-level application state.
 *
 * Kept in a single mutable object so the UI modules (plot/table/spec) can
 * share references without passing values through every call site.
 */
export interface AppState {
  /** Data payload injected by the Python backend via window.spyCNV.init(). */
  data: DataPayload | null;
  currentDisplayMode: string;
  thresholds: Thresholds;
  /** Handle to the current genome-spy embed (recreated on every renderPlot()). */
  embedResult: GenomeSpyEmbed | null;
  genomeScale: GenomeScaleResolution | null;
  binScale: GenomeScaleResolution | null;
  combinedBinData: CombinedBinData | null;
}

export const state: AppState = {
  data: null,
  currentDisplayMode: "both",
  thresholds: { ...DEFAULT_THRESHOLDS },
  embedResult: null,
  genomeScale: null,
  binScale: null,
  combinedBinData: null,
};
