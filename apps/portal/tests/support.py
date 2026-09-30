"""Utilitarios de teste: provedor simulado e executor sincrono."""
import sys
from pathlib import Path

PORTAL = Path(__file__).resolve().parents[1]
if str(PORTAL) not in sys.path:
    sys.path.insert(0, str(PORTAL))

from veosportal.provider import ProviderError, ProviderReply  # noqa: E402


class MockProvider:
    """Responde de forma deterministica e registra cada chamada. Um item de
    'script' que seja Exception e levantado como ProviderError."""
    name = "mock"

    def __init__(self, script=None):
        self.calls = []
        self.script = list(script or [])

    def complete(self, system, prompt):
        self.calls.append({"system": system, "prompt": prompt})
        item = self.script.pop(0) if self.script else f"resposta #{len(self.calls)}"
        if isinstance(item, Exception):
            raise ProviderError(str(item))
        return ProviderReply(text=item, meta={"provider": "mock"})

    def status(self):
        return {"name": "mock", "executavel_encontrado": True, "executavel": None, "cwd": "",
                "timeout_s": 1, "ultima_chamada": {"ok": None, "at": None, "detail": "-"}}


class SyncExecutor:
    def submit(self, fn):
        fn()

    def shutdown(self, **_):
        pass


class HeldExecutor:
    """Guarda as tarefas sem executar (para testar limite de fila)."""
    def __init__(self):
        self.tasks = []

    def submit(self, fn):
        self.tasks.append(fn)

    def shutdown(self, **_):
        pass
