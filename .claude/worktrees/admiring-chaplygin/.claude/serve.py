import http.server, socketserver, os

PORT = 8080
DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    def log_message(self, fmt, *args):
        pass  # suppress logs

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving {DIR} on port {PORT}")
    httpd.serve_forever()
