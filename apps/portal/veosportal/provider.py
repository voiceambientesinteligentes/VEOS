"""Provedor de respostas: Claude Code instalado, modo nao interativo (-p).

Restricoes aplicadas em toda chamada:
- nenhuma ferramenta (--tools "") e negacao explicita de built-ins e mcp__*;
- --permission-mode dontAsk e --permission-prompts none (nada e aprovado sozinho);
- saida --output-format json, lida do envelope 'result';
- pergunta enviada por stdin (nunca interpolada em linha de comando), sem shell;
- timeout por chamada; o limite de concorrencia fica no executor de jobs.

Nao ha resposta substituta: se o provedor falhar, ProviderError sobe e o job
e registrado como falha."""
import json
import os
import shutil
import subprocess
import threading
from dataclasses import dataclass
from pathlib import Path

DENY_TOOLS = ["mcp__*", "Bash", "PowerShell", "Read", "Write", "Edit", "MultiEdit",
              "NotebookEdit", "Glob", "Grep", "WebFetch", "WebSearch", "Agent", "Task",
              "TodoWrite", "ToolSearch", "Skill", "SlashCommand"]
MAX_OUTPUT_CHARS = 20000


class ProviderError(Exception):
    pass


@dataclass
class ProviderReply:
    text: str
    meta: dict


def resolve_claude_bin(explicit=""):
    """Somente executavel .exe/binario; .cmd/.bat sao recusados porque o Windows
    os executa via cmd.exe (interpretacao de argumentos por shell)."""
    candidatos = [explicit] if explicit else []
    candidatos.append(str(Path.home() / ".local" / "bin" / "claude.exe"))
    achado = shutil.which("claude")
    if achado:
        candidatos.append(achado)
    for c in candidatos:
        if not c:
            continue
        p = Path(c)
        if p.suffix.lower() in (".cmd", ".bat", ".ps1"):
            continue
        if p.is_file() and os.access(str(p), os.X_OK):
            return str(p)
    return None


def build_command(claude_bin, system_prompt):
    return [claude_bin, "-p",
            "--strict-mcp-config",
            "--disable-slash-commands",
            "--no-session-persistence",
            "--settings", '{"disableAllHooks":true}',
            "--output-format", "json",
            "--permission-mode", "dontAsk",
            "--permission-prompts", "none",
            "--tools", "",
            "--disallowedTools", *DENY_TOOLS,
            "--append-system-prompt", system_prompt]


class ClaudeCodeProvider:
    name = "claude-code"

    def __init__(self, claude_bin, cwd, timeout_s, runner=subprocess.Popen):
        self.claude_bin = claude_bin
        self.cwd = str(cwd)
        self.timeout_s = timeout_s
        self._runner = runner
        self._state_lock = threading.Lock()
        self.last = {"ok": None, "at": None, "detail": "nenhuma chamada nesta sessao"}

    def available(self):
        return bool(self.claude_bin) and Path(self.claude_bin).is_file()

    def _mark(self, ok, detail):
        from .store import now_iso
        with self._state_lock:
            self.last = {"ok": ok, "at": now_iso(), "detail": detail}

    def complete(self, system_prompt, prompt):
        if not self.available():
            self._mark(False, "executavel do Claude Code nao encontrado")
            raise ProviderError("Claude Code nao encontrado neste computador; nenhuma resposta "
                                "foi gerada.")
        if not Path(self.cwd).is_dir():
            self._mark(False, "pasta do projeto inexistente")
            raise ProviderError(f"pasta do projeto inexistente: {self.cwd}")
        cmd = build_command(self.claude_bin, system_prompt)
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        try:
            proc = self._runner(cmd, cwd=self.cwd, stdin=subprocess.PIPE,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                text=True, encoding="utf-8", errors="replace",
                                shell=False, creationflags=flags)
        except OSError as e:
            self._mark(False, f"falha ao iniciar: {e}")
            raise ProviderError(f"nao foi possivel iniciar o Claude Code ({e})")
        try:
            out, err = proc.communicate(input=prompt, timeout=self.timeout_s)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            self._mark(False, f"tempo limite de {self.timeout_s}s")
            raise ProviderError(f"Claude Code excedeu {self.timeout_s}s; chamada encerrada "
                                "sem resposta.")
        return self._parse(proc.returncode, out, err)

    def _parse(self, returncode, out, err):
        try:
            env = json.loads(out)
        except (json.JSONDecodeError, TypeError):
            resumo = (err or out or "").strip().splitlines()[-1:] or ["sem saida"]
            self._mark(False, "saida nao JSON")
            raise ProviderError(f"Claude Code retornou saida invalida (codigo {returncode}): "
                                f"{resumo[0][:300]}")
        if not isinstance(env, dict):
            self._mark(False, "envelope invalido")
            raise ProviderError("Claude Code retornou envelope inesperado")
        texto = env.get("result")
        if returncode or env.get("is_error") or not isinstance(texto, str) or not texto.strip():
            detalhe = (texto if isinstance(texto, str) and texto.strip()
                       else env.get("subtype") or f"codigo {returncode}")
            self._mark(False, "erro reportado pelo Claude Code")
            raise ProviderError(f"Claude Code nao concluiu: {str(detalhe)[:300]}")
        self._mark(True, "ultima chamada concluida")
        return ProviderReply(text=texto.strip()[:MAX_OUTPUT_CHARS], meta={
            "provider": self.name,
            "session_id": env.get("session_id"),
            "duration_ms": env.get("duration_ms"),
            "permission_denials": len(env.get("permission_denials") or []),
        })

    def status(self):
        with self._state_lock:
            last = dict(self.last)
        return {"name": self.name, "executavel_encontrado": self.available(),
                "executavel": self.claude_bin, "cwd": self.cwd, "timeout_s": self.timeout_s,
                "ultima_chamada": last}
