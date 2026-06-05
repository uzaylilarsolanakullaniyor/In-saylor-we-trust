"""Tiny static server for the UI preview (no Node needed).
Serves the frontend/ directory on port 5174 using an absolute path,
avoiding os.getcwd() so it works under a restricted launch cwd."""
import functools
import http.server
import socketserver

DIRECTORY = "/Users/mustafakavalci/Desktop/Claude/Treasuries prediction/frontend"
PORT = 5174

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)

with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Serving {DIRECTORY} at http://127.0.0.1:{PORT}/preview-demo.html")
    httpd.serve_forever()
