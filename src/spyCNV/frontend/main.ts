import { init } from "./app";

// The Python backend inlines this bundle into the standalone HTML report and
// then calls window.spyCNV.init(...) with the sample data (see core.py and
// templates/base.html.jinja2).
window.spyCNV = { init };
