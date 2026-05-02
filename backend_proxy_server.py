import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import error, request


OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1").rstrip("/")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-1e2d0b2b13e54d48b93dc1daccf8efb3")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")
ALLOW_ORIGIN = os.getenv("ALLOW_ORIGIN", "*")


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.end_headers()
    handler.wfile.write(body)


class ProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return

    def do_OPTIONS(self) -> None:
        _json_response(self, 200, {"ok": True})

    def do_GET(self) -> None:
        if self.path == "/api/health":
            _json_response(self, 200, {"ok": True, "mode": "backend-proxy"})
            return
        _json_response(self, 404, {"error": "Not Found"})

    def do_POST(self) -> None:
        if self.path != "/api/chat":
            _json_response(self, 404, {"error": "Not Found"})
            return

        if not OPENAI_API_KEY:
            _json_response(self, 500, {"error": "OPENAI_API_KEY is not set on server"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            _json_response(self, 400, {"error": "Invalid JSON body"})
            return

        messages = body.get("messages")
        if not isinstance(messages, list) or not messages:
            _json_response(self, 400, {"error": "messages must be a non-empty array"})
            return

        model = body.get("model") or OPENAI_MODEL
        temperature = body.get("temperature", 0.7)

        upstream_payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }

        req = request.Request(
            f"{OPENAI_BASE_URL}/chat/completions",
            data=json.dumps(upstream_payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=60) as resp:
                resp_body = resp.read().decode("utf-8")
                data = json.loads(resp_body)
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            _json_response(self, exc.code, {"error": detail})
            return
        except Exception as exc:
            _json_response(self, 502, {"error": str(exc)})
            return

        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content")
        )
        if not reply:
            _json_response(self, 502, {"error": "Model returned empty reply"})
            return

        _json_response(self, 200, {"reply": reply})


def main() -> None:
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8787"))
    server = ThreadingHTTPServer((host, port), ProxyHandler)
    print(f"Backend proxy started: http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
