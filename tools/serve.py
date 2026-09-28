# Local static server for Linux / cloud sessions (round 58) - same content types as tools/serve.ps1.
# Usage (from the project root): python3 tools/serve.py [port]   -> http://localhost:8765/
# charset=utf-8 matters: index.html has no <meta charset> of its own (the published artifact's wrapper adds it),
# so without it the browser falls back to windows-1252 and shows "Ã—" for "×".
import http.server, sys, os

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css',
        '.json': 'application/json',
        '.md': 'text/plain; charset=utf-8',
        '.png': 'image/png',
        '': 'application/octet-stream',
    }
    def log_message(self, *args):
        pass

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
