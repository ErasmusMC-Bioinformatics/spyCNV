#!/usr/bin/env node
/**
 * Bundles the TypeScript frontend into a single IIFE at
 * src/spyCNV/static/app.js, which the Python backend inlines into the
 * standalone HTML report (see core.py render_html()).
 *
 * genome-spy and grid.js are deliberately NOT bundled: they are inlined into
 * the HTML as separate <script>/<style> tags and are referenced through their
 * window globals (see frontend/globals.d.ts).
 *
 * Run from src/spyCNV/frontend via `npm run build`.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// Resolve esbuild from the frontend package's node_modules (the script itself
// lives outside the package directory).
const require = createRequire(path.join(scriptDir, "..", "frontend", "package.json"));
const esbuild = require("esbuild");

const repoRoot = path.resolve(scriptDir, "..", "..", "..");

await esbuild.build({
  entryPoints: [path.join(repoRoot, "src", "spyCNV", "frontend", "main.ts")],
  bundle: true,
  format: "iife",
  globalName: "spyCNVApp",
  target: "es2019",
  outfile: path.join(repoRoot, "src", "spyCNV", "static", "app.js"),
  minify: false,
  sourcemap: false,
  logLevel: "info",
});
