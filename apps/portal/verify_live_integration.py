"""Teste manual com o Claude Code real; nao integra a suite automatica."""
import json
import threading
import time
import urllib.request
from pathlib import Path
from veosportal.app import build_server
from veosportal.config import Config
from veosportal.store import Store

def main():
    server = build_server(Config(port=0), store=Store(":memory:"))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = "http://127.0.0.1:" + str(server.config.port)
    def request(path, body=None):
        headers = {"Origin": base}
        if body is not None:
            headers.update({"Content-Type": "application/json", "X-VEOS-CSRF": token})
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(base + path, data=data, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.load(response)
    token = request("/api/session")["csrf"]
    results = []
    try:
        cases = [
            ("/api/rooms/cfo/messages", {"text": "TESTE SINTETICO: em uma frase, explique margem de contribuicao sem dados reais."}, "cfo", ["CFO"]),
            ("/api/secretaria", {"text": "TESTE SINTETICO: em uma frase, qual a funcao de um backup?", "target": "cio", "mode": "sintese"}, "secretaria", ["CIO", "Secretaria"]),
            ("/api/meetings", {"topic": "TESTE SINTETICO: cada perfil deve sugerir uma verificacao antes de adotar software financeiro. Uma frase por perfil. Sem dados reais.", "participants": ["cfo", "cio"]}, "reuniao", ["CFO", "CIO", "Secretaria"]),
        ]
        for path, payload, room, expected in cases:
            job_id = request(path, payload)["job"]
            deadline = time.monotonic() + 240
            while time.monotonic() < deadline:
                job = request("/api/jobs/" + job_id)
                if job["status"] in ("done", "failed"):
                    break
                time.sleep(1)
            assert job["status"] == "done", job
            messages = request("/api/rooms/" + room + "/messages")["mensagens"]
            replies = [m for m in messages if m["role"] == "assistant" and m["job_id"] == job_id]
            assert [m["author"] for m in replies] == expected, replies
            assert all(m["content"].strip() and m["meta"]["provider"] == "claude-code" for m in replies)
            results.append({"fluxo": room, "autores": expected, "respostas_reais": len(replies), "resultado": "PASS"})
        assert request("/api/rooms/cio/messages")["mensagens"] == [], "vazamento para sala individual"
        analysis = request("/api/cfo/analysis?as_of=2026-09-28")
        assert analysis["sintetico"] is True and len(analysis["oficial"]["projetos"]) == 3
        result = {"resultado": "PASS", "provedor": "Claude Code real", "historicos": "isolados",
                  "dados_financeiros": "somente sinteticos", "fluxos": results}
        out = Path("verification")
        out.mkdir(exist_ok=True)
        (out / "live.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(result, ensure_ascii=True))
    finally:
        server.shutdown()
        server.orch.shutdown()
        server.server_close()
        server.store.close()

if __name__ == "__main__":
    main()
