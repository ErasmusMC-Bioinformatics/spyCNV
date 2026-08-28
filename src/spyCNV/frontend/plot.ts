import { min_logratio } from "./constants";
import { classifyBinSegments, classifySegments } from "./data";
import { getBinSpec, getSpec, showMinLogratio } from "./spec";
import { state } from "./state";
import { forceTableRender } from "./table";

/**
 * Destroy the current embed and re-create it for the active display mode.
 * All dynamic data is delivered through the namedDataProvider, so the tracks
 * never need to be rebuilt when thresholds or visibility change.
 */
export function renderPlot(): void {
    const container = document.getElementById("visualization");
    if (!container) return;
    container.innerHTML = "";
    const isBin = state.currentDisplayMode === "bin";
    const { data, thresholds, combinedBinData } = state;

    const namedDataProvider = (name: string): unknown => {
        if (isBin) {
            switch (name) {
                case "tso500_logratio_bin":
                    return combinedBinData?.tso500Data ?? [];
                case "hrd_logratio_bin":
                    return combinedBinData?.hrdData ?? [];
                case "chrom_regions":
                    return combinedBinData?.chromRegions ?? [];
                case "chrom_boundaries":
                    return combinedBinData?.chromBoundaries ?? [];
                case "chrom_labels":
                    return combinedBinData?.chromLabels ?? [];
                case "min_logratio":
                    return showMinLogratio(true, true) ? min_logratio : [];
                case "gain_threshold":
                    return [{ _val: thresholds.gain }];
                case "loss_threshold":
                    return [{ _val: thresholds.loss }];
                case "deeploss_threshold":
                    return [{ _val: thresholds.deeploss }];
                case "segments_classified_bin":
                    return classifyBinSegments(data?.segments ?? null, combinedBinData, thresholds);
                default:
                    return [];
            }
        }

        const showHrd = state.currentDisplayMode === "both" || state.currentDisplayMode === "hrd";
        const showTso500 = state.currentDisplayMode === "both" || state.currentDisplayMode === "tso500";
        switch (name) {
            case "hrd_logratio":
                return showHrd ? (data?.hrd_logratio ?? []) : [];
            case "tso500_logratio":
                return showTso500 ? (data?.tso500_logratio ?? []) : [];
            case "hrd_baf":
                return showHrd ? (data?.hrd_baf ?? []) : [];
            case "tso500_baf":
                return showTso500 ? (data?.tso500_baf ?? []) : [];
            case "min_logratio":
                return showMinLogratio(showHrd, showTso500) ? min_logratio : [];
            case "gain_threshold":
                return [{ _val: thresholds.gain }];
            case "loss_threshold":
                return [{ _val: thresholds.loss }];
            case "deeploss_threshold":
                return [{ _val: thresholds.deeploss }];
            case "segments_classified":
                return classifySegments(data?.segments ?? null, thresholds);
            default:
                return [];
        }
    };

    const spec = isBin ? getBinSpec() : getSpec();
    genomeSpyEmbed.embed(container, spec, { namedDataProvider }).then(res => {
        state.embedResult = res;
        if (isBin) {
            state.binScale = res.getScaleResolutionByName("binScale");
            state.genomeScale = null;
        } else {
            state.genomeScale = res.getScaleResolutionByName("genomeScale");
            state.binScale = null;
        }
    });
}

/** Switch between the "both" / "tso500" / "hrd" / "bin" display modes. */
export function updateDisplayMode(value: string): void {
    const prevMode = state.currentDisplayMode;
    state.currentDisplayMode = value;

    // The bin view has a different spec/scale, so a full re-embed is required
    // when entering or leaving it.
    if (value === "bin" || prevMode === "bin") {
        renderPlot();
        return;
    }

    const { embedResult, data } = state;
    if (!embedResult) return;

    const showHrd = value === "both" || value === "hrd";
    const showTso500 = value === "both" || value === "tso500";

    embedResult.updateNamedData("min_logratio", showMinLogratio(showHrd, showTso500) ? min_logratio : []);
    embedResult.updateNamedData("hrd_logratio", showHrd ? data?.hrd_logratio : []);
    embedResult.updateNamedData("tso500_logratio", showTso500 ? data?.tso500_logratio : []);
    embedResult.updateNamedData("hrd_baf", showHrd ? data?.hrd_baf : []);
    embedResult.updateNamedData("tso500_baf", showTso500 ? data?.tso500_baf : []);
}

/** Update a threshold value and refresh every consumer (labels, table, tracks). */
export function onThresholdChange(type: "gain" | "loss" | "deeploss", val: string): void {
    let num = parseFloat(val);
    if (isNaN(num)) return;

    const { thresholds } = state;
    if (type === "gain") {
        num = Math.min(Math.max(num, 0.1), 2.0);
        thresholds.gain = num;
        const slider = document.getElementById("gain-slider") as HTMLInputElement | null;
        if (slider) slider.value = String(num);
        const input = document.getElementById("gain-input") as HTMLInputElement | null;
        if (input) input.value = String(num);
    } else if (type === "loss") {
        num = Math.min(Math.max(num, -2.0), -0.1);
        thresholds.loss = num;
        const slider = document.getElementById("loss-slider") as HTMLInputElement | null;
        if (slider) slider.value = String(num);
        const input = document.getElementById("loss-input") as HTMLInputElement | null;
        if (input) input.value = String(num);
    } else if (type === "deeploss") {
        num = Math.min(Math.max(num, -5.0), -0.6);
        thresholds.deeploss = num;
        const slider = document.getElementById("deeploss-slider") as HTMLInputElement | null;
        if (slider) slider.value = String(num);
        const input = document.getElementById("deeploss-input") as HTMLInputElement | null;
        if (input) input.value = String(num);
    }

    const gainLbl = document.getElementById("lbl-gain-filter");
    if (gainLbl) gainLbl.innerText = `Gain (>${thresholds.gain.toFixed(2)})`;
    const lossLbl = document.getElementById("lbl-loss-filter");
    if (lossLbl) lossLbl.innerText = `Loss (<${thresholds.loss.toFixed(2)})`;
    const deepLossLbl = document.getElementById("lbl-deeploss-filter");
    if (deepLossLbl) deepLossLbl.innerText = `Deep Loss (<${thresholds.deeploss.toFixed(2)})`;

    forceTableRender();
    if (state.embedResult) {
        state.embedResult.updateNamedData("gain_threshold", [{ _val: thresholds.gain }]);
        state.embedResult.updateNamedData("loss_threshold", [{ _val: thresholds.loss }]);
        state.embedResult.updateNamedData("deeploss_threshold", [{ _val: thresholds.deeploss }]);
        state.embedResult.updateNamedData(
            "segments_classified",
            classifySegments(state.data?.segments ?? null, thresholds)
        );
        state.embedResult.updateNamedData(
            "segments_classified_bin",
            classifyBinSegments(state.data?.segments ?? null, state.combinedBinData, thresholds)
        );
    }
}
