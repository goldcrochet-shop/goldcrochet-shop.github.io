"""
Local HTTP Server for Gold Crochet E2E Tests.
Starts a threaded HTTP server serving the Gold Crochet project root on port 8088.
"""

import http.server
import socketserver
import threading
import os
import sys
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def log_message(self, format, *args):
        # Suppress noisy HTTP request logging during tests
        pass

    def end_headers(self):
        # Add CORS and no-cache headers for predictable test state
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class LocalServer:
    def __init__(self, host="127.0.0.1", port=8088):
        self.host = host
        self.port = port
        self.httpd = None
        self.thread = None

    def start(self):
        if self.httpd is not None:
            return
        self.httpd = ThreadedHTTPServer((self.host, self.port), CustomHandler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        # Brief pause to ensure socket is listening
        time.sleep(0.2)

    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()
            self.httpd = None
            if self.thread and self.thread.is_alive():
                self.thread.join(timeout=2)
            self.thread = None

    @property
    def base_url(self):
        return f"http://{self.host}:{self.port}"

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()

if __name__ == "__main__":
    server = LocalServer()
    server.start()
    print(f"Gold Crochet test server running at {server.base_url}")
    print("Press Ctrl+C to terminate.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        server.stop()
        print("\nServer stopped.")
