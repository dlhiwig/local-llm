"""
Local LLM Web Server & Ollama Proxy
Zero-dependency Python 3 HTTP Server with streaming support
"""

import http.server
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

PORT = 5050
OLLAMA_HOST = "http://127.0.0.1:11434"
WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")


def is_ollama_running():
    try:
        with urllib.request.urlopen(f"{OLLAMA_HOST}/api/tags", timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def ensure_ollama():
    if not is_ollama_running():
        print("[*] Starting local Ollama server in background...")
        try:
            # Launch ollama serve in background
            creationflags = 0
            if sys.platform == "win32":
                creationflags = subprocess.CREATE_NO_WINDOW
            subprocess.Popen(["ollama", "serve"], creationflags=creationflags)
            for _ in range(15):
                time.sleep(0.5)
                if is_ollama_running():
                    print("[OK] Ollama server is up and running.")
                    return True
        except Exception as e:
            print(f"[!] Warning: Could not auto-start Ollama: {e}")
            return False
    else:
        print("[OK] Ollama server is already running.")
        return True


class LocalLLMHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def log_message(self, format, *args):
        # Quiet down static file logs, keep API logs clean
        msg = format % args
        if "/api/" in msg:
            print(f"[API] {msg}")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_request("GET")
        else:
            if self.path == "/" or not os.path.exists(os.path.join(WEB_DIR, self.path.lstrip("/"))):
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self.proxy_request("POST")
        else:
            self.send_error(404, "Not Found")

    def proxy_request(self, method):
        target_url = f"{OLLAMA_HOST}{self.path}"
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        req = urllib.request.Request(target_url, data=body, method=method)
        req.add_header("Content-Type", self.headers.get("Content-Type", "application/json"))

        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                self.send_response(resp.status)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()

                # Stream response chunk by chunk to browser
                while True:
                    chunk = resp.read(1024)
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        break
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            err_msg = json.dumps({"error": f"Failed to connect to local Ollama server: {str(e)}"})
            self.wfile.write(err_msg.encode("utf-8"))


def find_available_port(start_port=5050):
    port = start_port
    while port < start_port + 20:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
            port += 1
    return start_port


def main():
    os.makedirs(WEB_DIR, exist_ok=True)
    ensure_ollama()
    port = find_available_port(PORT)
    server_address = ("127.0.0.1", port)

    print(f"\n========================================================")
    print(f"  Mistral 7B & Local LLM Web Chat")
    print(f"  URL: http://localhost:{port}")
    print(f"  Ollama Target: {OLLAMA_HOST}")
    print(f"========================================================\n")

    httpd = http.server.ThreadingHTTPServer(server_address, LocalLLMHandler)
    webbrowser.open(f"http://localhost:{port}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Stopping server. Goodbye!")
        httpd.server_close()


if __name__ == "__main__":
    main()
