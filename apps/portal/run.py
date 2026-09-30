#!/usr/bin/env python3
"""Inicia o VEOS Portal em http://127.0.0.1:8877 e abre o navegador.

Uso: python run.py [--no-browser]"""
import sys
import json
import urllib.request
import threading
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from veosportal.app import build_server  # noqa: E402


def main(argv):
    try:
        server = build_server()
    except OSError as e:
        try:
            with urllib.request.urlopen("http://127.0.0.1:8877/api/status", timeout=2) as response:
                existing = json.load(response)
            if existing.get("provedor", {}).get("name") == "claude-code":
                print("O VEOS Portal ja esta aberto em http://127.0.0.1:8877/")
                if "--no-browser" not in argv:
                    webbrowser.open("http://127.0.0.1:8877/")
                return 0
        except (OSError, ValueError):
            pass
        print(f"Nao foi possivel abrir 127.0.0.1:8877 ({e}). Verifique se a porta esta ocupada.")
        return 1
    url = f"http://127.0.0.1:{server.config.port}/"
    st = server.provider.status()
    print(f"VEOS Portal em {url}  (Ctrl+C encerra)")
    print("Claude Code:", st["executavel"] or "NAO ENCONTRADO - conversas ficarao indisponiveis")
    if server.interrupted_jobs:
        print(f"{server.interrupted_jobs} job(s) de execucao anterior marcados como interrompidos.")
    if "--no-browser" not in argv:
        threading.Timer(0.6, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.orch.shutdown()
        server.integrations.shutdown()
        server.server_close()
        server.store.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
