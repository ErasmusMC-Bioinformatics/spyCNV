import { ASSEMBLY, MIN_LOGRATIO } from "./constants";
import { state } from "./state";
import { bAlleleFrequencyTrack } from "./tracks/bAlleleFrequencyTrack";
import { geneAnnotationTrack } from "./tracks/geneAnnotationTrack";
import { ideogramTrack } from "./tracks/ideogramTrack";
import { logratioBinTrack, logratioTrack } from "./tracks/logratioTrack";

function requireData(): NonNullable<typeof state.data> {
  if (!state.data) {
    throw new Error("spyCNV: cannot build spec before init()");
  }
  return state.data;
}

/** Genome-spy spec for the standard ("All"/"TSO500"/"HRD") views. */
export function getSpec() {
  const data = requireData();
  const { thresholds } = state;
  return {
    assembly: ASSEMBLY,
    params: [{ name: "brush" }],
    config: {
      legend: { disable: true },
    },
    vconcat: [
      ideogramTrack(data.cytoband),
      logratioTrack(data.hrd_logratio, data.tso500_logratio, data.segments, data.cytoband, {
        gainThreshold: thresholds.gain,
        lossThreshold: thresholds.loss,
        deepLossThreshold: thresholds.deeploss,
      }),
      geneAnnotationTrack(data.refseq),
      bAlleleFrequencyTrack(data.hrd_baf, data.tso500_baf, data.cytoband),
    ],
  };
}

/** Genome-spy spec for the "Bin" view (bin-indexed log-ratio plot). */
export function getBinSpec() {
  const data = requireData();
  const { thresholds } = state;
  return {
    config: {
      legend: { disable: true },
    },
    vconcat: [
      logratioBinTrack(data.hrd_logratio, data.tso500_logratio, data.segments, {
        height: 300,
        gainThreshold: thresholds.gain,
        lossThreshold: thresholds.loss,
        deepLossThreshold: thresholds.deeploss,
      }),
    ],
  };
}

/** Whether the red min-logratio guide line should be shown for the visible datasets. */
export function showMinLogratio(showHrd: boolean, showTso500: boolean): boolean {
  const data = state.data;
  if (!data) return false;
  const minHrdLog = data.hrd_logratio ? Math.min(...data.hrd_logratio.map(r => r.value)) : 0;
  const minTsoLog = data.tso500_logratio ? Math.min(...data.tso500_logratio.map(r => r.value)) : 0;
  return (showHrd && minHrdLog <= MIN_LOGRATIO) || (showTso500 && minTsoLog <= MIN_LOGRATIO);
}
