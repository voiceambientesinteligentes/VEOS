"""Configuracao do portal. Tudo local; valores sobrescreviveis por variavel de
ambiente apenas para caminhos e limites (nunca para host de escuta)."""
import os
from dataclasses import dataclass, field
from pathlib import Path

PORTAL_DIR = Path(__file__).resolve().parent.parent
VEOS_LOCAL_DIR = PORTAL_DIR.parent
# Na instalacao existente, reutiliza a pasta do projeto. Em uma copia portatil,
# usa a propria pasta do portal; nunca presume a estrutura de diretorios do PC.
_DEFAULT_PROJECT = (VEOS_LOCAL_DIR.parent.parent
                    if (VEOS_LOCAL_DIR / "tools" / "cfo.py").is_file() else PORTAL_DIR)
PROJECT_DIR = Path(os.environ.get("VEOS_PROJECT_DIR", str(_DEFAULT_PROJECT))).resolve()

HOST = "127.0.0.1"
PORT = 8877


def _int_env(nome, padrao, minimo, maximo):
    try:
        v = int(os.environ.get(nome, padrao))
    except ValueError:
        return padrao
    return max(minimo, min(maximo, v))


@dataclass
class Config:
    host: str = HOST
    port: int = PORT
    web_dir: Path = PORTAL_DIR / "web"
    runtime_dir: Path = PORTAL_DIR / "runtime"
    db_path: Path = PORTAL_DIR / "runtime" / "veos-portal.sqlite3"
    project_dir: Path = PROJECT_DIR
    claude_bin: str = os.environ.get("VEOS_CLAUDE_BIN", "")
    provider_timeout_s: int = _int_env("VEOS_PROVIDER_TIMEOUT", 180, 20, 900)
    max_concurrency: int = _int_env("VEOS_MAX_CONCURRENCY", 2, 1, 4)
    max_pending_jobs: int = _int_env("VEOS_MAX_PENDING", 6, 1, 20)
    history_messages: int = 12
    history_chars: int = 12000
    max_message_chars: int = 4000
    max_body_bytes: int = 64 * 1024
    cfo_engine_candidates: list = field(default_factory=lambda: [
        p for p in (os.environ.get("VEOS_CFO_ENGINE"),) if p] + [
        str(PORTAL_DIR / "engine" / "cfo.py"),
        str(VEOS_LOCAL_DIR / "tools" / "cfo.py")])
    cfo_fixture_candidates: list = field(default_factory=lambda: [
        p for p in (os.environ.get("VEOS_CFO_FIXTURE"),) if p] + [
        str(PORTAL_DIR / "engine" / "fixtures" / "cfo-demo.json"),
        str(VEOS_LOCAL_DIR / "data" / "cfo-demo.json")])
    # Base TESTE da camada de controles (somente sintetica; nunca dados reais).
    cfo_controles_fixture_candidates: list = field(default_factory=lambda: [
        p for p in (os.environ.get("VEOS_CFO_CONTROLES_FIXTURE"),) if p] + [
        str(PORTAL_DIR / "engine" / "fixtures" / "cfo-controles-TESTE.json")])
    # Cofre VOICE_360: so a lista fixa de politicas oficiais e lida (hash/status).
    voice360_dir: str = os.environ.get("VEOS_VOICE360_DIR", str(VEOS_LOCAL_DIR.parent.parent.parent))
    integration_health_timeout_s: int = _int_env("VEOS_MCP_HEALTH_TIMEOUT", 60, 10, 300)
    integration_probe_timeout_s: int = _int_env("VEOS_MCP_PROBE_TIMEOUT", 180, 30, 600)

    def allowed_hosts(self):
        return {f"127.0.0.1:{self.port}", f"localhost:{self.port}"}

    def allowed_origins(self):
        return {f"http://{h}" for h in self.allowed_hosts()}
