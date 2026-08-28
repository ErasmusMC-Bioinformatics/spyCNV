import { prepareCombinedBinData } from "./data";
import { renderPlot, updateDisplayMode } from "./plot";
import { state } from "./state";
import { forceTableRender, generateTableData } from "./table";
import type { InitConfig } from "./types";

/**
 * Entry point. Called by base.html.jinja2:
 *
 *   window.spyCNV.init({ sampleId: ..., data: ... });
 */
export function init(config: InitConfig): void {
    state.data = config.data;
    state.combinedBinData = prepareCombinedBinData(
        config.data.tso500_logratio,
        config.data.hrd_logratio
    );

    // View mode radios ("All" / "TSO500" / "HRD" / "Bin").
    document.querySelectorAll<HTMLInputElement>('input[name="displayMode"]').forEach(el => {
        el.addEventListener("change", () => updateDisplayMode(el.value));
    });

    // Gene table filter controls (re-evaluate the grid data provider).
    document.querySelectorAll<HTMLInputElement>('input[name="log2Filter"]').forEach(el => {
        el.addEventListener("change", forceTableRender);
    });
    const prioToggle = document.getElementById("prio-toggle") as HTMLInputElement | null;
    if (prioToggle) {
        prioToggle.addEventListener("change", forceTableRender);
    }

    renderPlot();

    // The table needs the segments and refSeq gene annotations; deferring keeps
    // the initial plot render snappy (mirrors the original inline script).
    setTimeout(generateTableData, 500);
}
