#!/usr/bin/env python3
"""Static dev server with live reload for the spyCNV report.

Serves the directory that `spy generate` writes to and injects a small
live-reload snippet into the standalone report on the fly (the file on disk
stays pristine). The snippet polls the page's Last-Modified header and
reloads the tab whenever the report is regenerated, so editing frontend
sources shows up in the browser automatically.

Orchestrated by devenv's `dev-html` script:

    python3 src/spyCNV/scripts/dev_server.py --port 8000 --directory /tmp/spycnv-dev
"""
import argparse
import functools
import http.server
import os
import socketserver
import urllib.parse

MARKER = b"spycnv-live-reload"

RELOAD_SNIPPET = (
    '<script id="spycnv-live-reload">\n'
    "(function () {\n"
    "  var last = document.lastModified;\n"
    "  var check = function () {\n"
    '    fetch(location.pathname, { cache: "no-store" })\n'
    "      .then(function (r) {\n"
    '        var h = r.headers.get("last-modified");\n'
    "        if (h && new Date(h).getTime() !== new Date(last).getTime()) {\n"
    "          location.reload();\n"
    "        }\n"
    "      })\n"
    "      .catch(function () {});\n"
    "  };\n"
    "  setInterval(check, 700);\n"
    "})();\n"
    "</script>\n"
).encode()


def inject_reload(content: bytes) -> bytes:
    """Return `content` with the live-reload snippet injected before </body>."""
    if MARKER in content or b"</body>" not in content:
        return content
    return content.replace(b"</body>", RELOAD_SNIPPET + b"</body>", 1)


class LiveReloadHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler that injects the reload snippet into reports."""

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path.endswith(".spyCNV.html"):
            self._serve_report(path)
            return
        super().do_GET()

    def _serve_report(self, path: str):
        file_path = self.translate_path(path)
        try:
            with open(file_path, "rb") as f:
                content = f.read()
        except OSError:
            self.send_error(404, "Not found")
            return

        content = inject_reload(content)

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        try:
            mtime = os.path.getmtime(file_path)
        except OSError:
            mtime = 0
        # Needed by the live-reload snippet to detect regeneration.
        self.send_header("Last-Modified", self.date_time_string(mtime))
        self.end_headers()
        self.wfile.write(content)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000, help="port to listen on")
    parser.add_argument(
        "--directory",
        default="/tmp/spycnv-dev",
        help="directory to serve (where the report is generated)",
    )
    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        parser.error(f"directory does not exist: {args.directory}")

    handler = functools.partial(LiveReloadHandler, directory=args.directory)
    with socketserver.ThreadingTCPServer(("", args.port), handler) as httpd:
        print(f"Live-reload dev server: http://localhost:{args.port}/  (Ctrl-C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
