"""Integracoes Zoho: catalogo oficial, healthcheck real e probes SOMENTE LEITURA.

- Catalogo: servicos listados em https://www.zoho.com/mcp/services/zoho-services.html
  (consultado em 2026-09-28). Estar no catalogo NAO significa contratado nem conectado.
- Estados separados por app: oferta no catalogo / conta (nao verificada) / servidor
  conectado / leitura testada / dados (nao confiaveis) / acao (exige aprovacao).
  Nenhum estado e fixado no codigo: tudo vem das verificacoes registradas.
- Healthcheck: subprocess `claude mcp list`, sem shell, com timeout, em job
  assincrono. Guarda somente nome do servidor Zoho e estado normalizado; nunca
  endpoint, token ou saida bruta.
- Probes: um de tres, escolhido de uma whitelist fixa (sem prompt livre). Claude
  CLI em dontAsk, sem hooks, --setting-sources vazio, --allowedTools apenas
  ToolSearch + a operacao exata, negacao de built-ins e de verbos de escrita.
  A saida stream-json e validada: exige tool_use da operacao E tool_result
  correspondente sem erro; resposta narrativa do modelo nao conta. Persistem
  apenas metadados (tamanho, contagem), nunca conteudo.

Referencia de padrao (nao alterada): ../tools/atualizar.py."""
import hashlib
import json
import re
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from .orchestration import BusyError
from .store import now_iso

CATALOGO_URL = "https://www.zoho.com/mcp/services/zoho-services.html"
CATALOGO_CONSULTA = "2026-09-28"
GUIA_MCP = "https://www.zoho.com/mcp/"
SERVICOS = (
    "CRM", "WorkDrive", "Cliq", "Qntrl", "Projects", "Mail", "Bigin", "Desk", "Books", "Billing",
    "Inventory", "Invoice", "Expense", "Payroll", "Sdp On Demand", "Apptics", "Notebook",
    "Endpoint Central", "Dataprep", "MDM", "Calendar", "Creator", "Site24x7", "Sprints",
    "Commerce", "CloudSpend", "Learn", "Analytics", "Assist", "Lens", "Bookings", "Recruit",
    "Writer", "Verticals", "Payments", "Catalyst", "Log360 Cloud", "Survey", "People", "SalesIQ",
    "POS", "Sheet", "Site24x7 Tools", "Backstage", "Sign", "IOT", "One", "Directory", "Vani",
    "ERP", "Procurement", "Meeting", "Webinar", "Tables", "Connect", "Command Center", "Show",
    "PageSense", "Office Integrator")
UPCOMING = ("Voice", "Campaigns")
NOTAS = {
    "Mail": "Sem conector builtin do claude.ai: exige servidor Zoho MCP custom com OAuth "
            "(guia oficial). Nenhuma conta foi configurada pelo portal.",
}
PROBES = {
    "books": {"app": "Books", "servidor": "claude.ai Zoho Books",
              "tool": "mcp__claude_ai_Zoho_Books__list_organizations",
              "instrucao": "sem argumentos", "exige_argumento": None},
    "crm": {"app": "CRM", "servidor": "claude.ai Zoho CRM",
            "tool": "mcp__claude_ai_Zoho_CRM__getFields",
            "instrucao": "uma unica vez, somente para o modulo Deals (module: \"Deals\")",
            "exige_argumento": "Deals"},
    "projects": {"app": "Projects", "servidor": "claude.ai Zoho Projects",
                 "tool": "mcp__claude_ai_Zoho_Projects__get_portals",
                 "instrucao": "sem argumentos", "exige_argumento": None},
}
DENY_BUILTIN = ["Bash", "PowerShell", "Read", "Write", "Edit", "MultiEdit", "NotebookEdit", "Glob",
                "Grep", "WebFetch", "WebSearch", "Agent", "Task", "TodoWrite", "Skill",
                "SlashCommand", "mcp__claude_ai_Claude_Docs__*"]
DENY_VERBS = ("create", "update", "delete", "remove", "send", "add", "post", "put", "patch",
              "upsert", "convert", "delink", "associate", "upload", "insert", "execute", "import",
              "approve", "void", "mark", "email", "submit", "apply", "assign", "move", "merge",
              "transfer", "pay", "write", "enable", "disable", "cancel", "clone", "reset")
DENY_TOOLS = DENY_BUILTIN + [f"mcp__*__{v}*" for v in DENY_VERBS]
HEALTH_TARGET = "claude-mcp-list"
URL_RE = re.compile(r"(?i)\b(?:https?|wss?)://\S+")
SECRET_RE = re.compile(r"(?i)\b(bearer|token|authorization|api[_-]?key|secret|password)\b\s*[:=]?\s*\S+")
LONG_RE = re.compile(r"[A-Za-z0-9_\-.=+/]{32,}")


class ProbeError(Exception):
    pass


def slug(nome):
    return re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-")


def sanitize(texto, limite=200):
    s = URL_RE.sub("[endpoint removido]", str(texto or ""))
    s = SECRET_RE.sub(lambda m: m.group(1) + " [removido]", s)
    s = LONG_RE.sub("[removido]", s)
    return " ".join(s.split())[:limite]


def normalize_status(raw):
    s = (raw or "").lower()
    if "fail" in s or "error" in s or "disconnected" in s or "not connected" in s:
        return "FALHA"
    if "auth" in s:
        return "REQUER_AUTENTICACAO"
    if "pending" in s:
        return "PENDENTE"
    if "disabled" in s:
        return "DESATIVADO"
    if "connected" in s:
        return "CONECTADO"
    return "DESCONHECIDO"


def app_de_servidor(nome):
    m = re.match(r"(?i)^(?:claude\.ai\s+)?zoho[\s_-]*(.+)$", nome.strip())
    if not m:
        return None
    alvo = re.sub(r"[^a-z0-9]", "", m.group(1).lower())
    for s in SERVICOS + UPCOMING:
        if re.sub(r"[^a-z0-9]", "", s.lower()) == alvo:
            return s
    return None


def parse_mcp_list(out):
    """Somente linhas 'nome: <alvo> - <estado>'. Alvo (endpoint/comando) e descartado."""
    zoho, outros = [], {}
    for line in (out or "").splitlines():
        line = line.strip()
        if ": " not in line or " - " not in line:
            continue
        nome, resto = line.split(": ", 1)
        estado = normalize_status(resto.rsplit(" - ", 1)[1])
        app = app_de_servidor(nome)
        if app:
            zoho.append({"servidor": sanitize(nome, 80), "app": app, "status": estado})
        else:
            outros[estado] = outros.get(estado, 0) + 1
    return {"servidores_zoho": zoho,
            "outros_servidores": {"total": sum(outros.values()), "por_status": outros}}


def build_health_command(claude_bin):
    return [claude_bin, "mcp", "list"]


def probe_prompt(p):
    return (f"Verificacao fixa SOMENTE LEITURA do portal VEOS. Use ToolSearch com a consulta "
            f"\"select:{p['tool']}\" para carregar exatamente essa ferramenta e chame-a {p['instrucao']}. "
            "Nao chame nenhuma outra ferramenta. Nao repita, resuma nem interprete os dados "
            "retornados. Responda apenas CONCLUIDO.")


def build_probe_command(claude_bin, tool):
    return [claude_bin, "-p",
            "--output-format", "stream-json", "--verbose",
            "--permission-mode", "dontAsk",
            "--permission-prompts", "none",
            "--setting-sources", "",
            "--settings", '{"disableAllHooks":true}',
            "--disable-slash-commands",
            "--no-session-persistence",
            "--tools", "ToolSearch",
            "--allowedTools", "ToolSearch", tool,
            "--disallowedTools", *DENY_TOOLS]


def _contains(obj, valor):
    if isinstance(obj, str):
        return obj == valor
    if isinstance(obj, dict):
        return any(_contains(v, valor) for v in obj.values())
    if isinstance(obj, list):
        return any(_contains(v, valor) for v in obj)
    return False


def _result_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(c.get("text", "") for c in content if isinstance(c, dict))
    return ""


def result_meta(text):
    """Metadados sem conteudo: tamanho, se e JSON, maior contagem de itens."""
    meta = {"resultado_bytes": len(text.encode("utf-8")), "json": False, "itens": None}
    try:
        obj = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return meta
    meta["json"] = True
    if isinstance(obj, list):
        meta["itens"] = len(obj)
    elif isinstance(obj, dict):
        code = obj.get("code")
        if (isinstance(code, int) and not isinstance(code, bool) and code != 0) \
                or obj.get("error") or obj.get("errors"):
            meta["erro_servidor"] = True
        listas = [len(v) for v in obj.values() if isinstance(v, list)]
        listas += [len(x) for v in obj.values() if isinstance(v, dict)
                   for x in v.values() if isinstance(x, list)]
        meta["itens"] = max(listas) if listas else None
    return meta


def validate_stream(out, probe):
    tool = probe["tool"]
    events = []
    for line in (out or "").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(ev, dict):
            events.append(ev)
    if not events:
        raise ProbeError("saida stream-json vazia ou invalida")
    uses, results, fora, init, final = {}, {}, [], None, None
    for ev in events:
        t = ev.get("type")
        content = (ev.get("message") or {}).get("content") if isinstance(ev.get("message"), dict) else None
        if t == "system" and ev.get("subtype") == "init":
            for s in ev.get("mcp_servers") or []:
                if isinstance(s, dict) and s.get("name") == probe["servidor"]:
                    init = normalize_status(str(s.get("status")))
        elif t == "assistant" and isinstance(content, list):
            for c in content:
                if isinstance(c, dict) and c.get("type") == "tool_use":
                    if c.get("name") not in ("ToolSearch", tool):
                        fora.append(sanitize(c.get("name"), 80))
                    uses.setdefault(c.get("id"), c)
        elif t == "user" and isinstance(content, list):
            for c in content:
                if isinstance(c, dict) and c.get("type") == "tool_result":
                    results[c.get("tool_use_id")] = c
        elif t == "result":
            final = ev
    if fora:
        raise ProbeError("ferramenta fora da whitelist solicitada: " + ", ".join(fora))
    alvo = [u for u in uses.values() if u.get("name") == tool]
    if not alvo:
        raise ProbeError("nenhuma chamada real (tool_use) da operacao; texto narrativo nao conta")
    if len(alvo) > 1:
        raise ProbeError("a operacao foi chamada mais de uma vez")
    use = alvo[0]
    if probe["exige_argumento"] and not _contains(use.get("input"), probe["exige_argumento"]):
        raise ProbeError(f"argumento fora do escopo: exige {probe['exige_argumento']}")
    res = results.get(use.get("id"))
    if res is None:
        raise ProbeError("tool_use sem tool_result correspondente")
    if res.get("is_error"):
        raise ProbeError("a operacao retornou erro (tool_result is_error)")
    meta = result_meta(_result_text(res.get("content")))
    if meta.pop("erro_servidor", False):
        raise ProbeError("o servidor Zoho respondeu com erro")
    if final is None:
        raise ProbeError("execucao sem evento final 'result'")
    if final.get("is_error"):
        raise ProbeError("Claude Code reportou erro no evento final")
    return {**meta, "ferramenta": tool, "tool_use_verificado": True, "tool_result_verificado": True,
            "tool_use_ref": hashlib.sha256(str(use.get("id")).encode()).hexdigest()[:12],
            "servidor_no_init": init,
            "permission_denials": len(final.get("permission_denials") or [])}


class IntegrationService:
    def __init__(self, store, claude_bin, cwd, health_timeout_s=60, probe_timeout_s=180,
                 runner=subprocess.Popen, executor=None):
        self.store = store
        self.claude_bin = claude_bin
        self.cwd = str(cwd)
        self.health_timeout_s = health_timeout_s
        self.probe_timeout_s = probe_timeout_s
        self._runner = runner
        self._executor = executor or ThreadPoolExecutor(max_workers=1, thread_name_prefix="veos-integ")
        self._busy = threading.Lock()

    def shutdown(self):
        self._executor.shutdown(wait=False, cancel_futures=True)

    # ------------------------------------------------------------ execucao
    def _run(self, cmd, stdin_text, timeout):
        if not self.claude_bin or not Path(self.claude_bin).is_file():
            raise ProbeError("Claude Code nao encontrado neste computador")
        if not Path(self.cwd).is_dir():
            raise ProbeError("pasta de trabalho inexistente")
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        try:
            proc = self._runner(cmd, cwd=self.cwd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, text=True, encoding="utf-8",
                                errors="replace", shell=False, creationflags=flags)
        except OSError as e:
            raise ProbeError(f"nao foi possivel iniciar o Claude Code ({sanitize(e)})")
        try:
            out, err = proc.communicate(input=stdin_text, timeout=timeout)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            raise ProbeError(f"tempo limite de {timeout}s excedido; processo encerrado")
        return proc.returncode, out or "", err or ""

    def _start(self, kind, request, fn):
        if not self._busy.acquire(blocking=False):
            raise BusyError("ja existe uma verificacao de integracao em andamento")
        try:
            jid = self.store.create_job(kind, "integracoes", request)
        except Exception:
            self._busy.release()
            raise

        def run():
            try:
                self.store.set_job_status(jid, "running")
                ok, err = fn(jid)
                self.store.set_job_status(jid, "done" if ok else "failed", err)
            except Exception as e:  # nunca deixa job preso
                self.store.set_job_status(jid, "failed", f"erro interno: {sanitize(e)}")
            finally:
                self._busy.release()
        self._executor.submit(run)
        return {"job": jid}

    # ------------------------------------------------------------ healthcheck
    def start_health(self):
        return self._start("mcp-health", {"comando": "claude mcp list"}, self.health)

    def health(self, jid=None):
        t0 = time.monotonic()
        if jid:
            self.store.add_job_progress(jid, {"step": "executando claude mcp list", "state": "running"})
        try:
            code, out, err = self._run(build_health_command(self.claude_bin), "", self.health_timeout_s)
        except ProbeError as e:
            ev = {"comando": "claude mcp list", "erro": sanitize(e)}
            self.store.add_integration_check("health", HEALTH_TARGET, False, ev)
            if jid:
                self.store.add_job_progress(jid, {"step": "healthcheck falhou", "state": "failed"})
            return False, ev["erro"]
        ev = {"comando": "claude mcp list", "codigo_saida": code,
              "duracao_ms": int((time.monotonic() - t0) * 1000), **parse_mcp_list(out)}
        ok = code == 0
        if not ok:
            linhas = (err or out).strip().splitlines()
            ev["erro"] = sanitize(linhas[-1] if linhas else f"codigo de saida {code}, sem saida")
        self.store.add_integration_check("health", HEALTH_TARGET, ok, ev)
        if jid:
            self.store.add_job_progress(jid, {"step": f"{len(ev['servidores_zoho'])} servidor(es) Zoho "
                                                      "listado(s)" if ok else "healthcheck falhou",
                                              "state": "done" if ok else "failed"})
        return ok, None if ok else ev["erro"]

    # ------------------------------------------------------------ probes
    def start_probe(self, probe_id):
        if probe_id not in PROBES:
            raise ValueError(f"probe desconhecido: {probe_id!r} (use {', '.join(PROBES)})")
        return self._start("mcp-probe", {"probe": probe_id, "ferramenta": PROBES[probe_id]["tool"]},
                           lambda jid: self.probe(probe_id, jid))

    def probe(self, probe_id, jid=None):
        p = PROBES[probe_id]
        t0 = time.monotonic()
        if jid:
            self.store.add_job_progress(jid, {"step": f"lendo {p['app']} (somente leitura)",
                                              "state": "running"})
        try:
            code, out, err = self._run(build_probe_command(self.claude_bin, p["tool"]),
                                       probe_prompt(p), self.probe_timeout_s)
            if code != 0:
                raise ProbeError(f"Claude Code terminou com codigo {code}")
            meta = validate_stream(out, p)
            ok, ev = True, {**meta, "duracao_ms": int((time.monotonic() - t0) * 1000)}
        except ProbeError as e:
            ok, ev = False, {"ferramenta": p["tool"], "erro": sanitize(e),
                             "duracao_ms": int((time.monotonic() - t0) * 1000)}
        self.store.add_integration_check("probe", probe_id, ok, ev)
        if jid:
            self.store.add_job_progress(jid, {"step": f"leitura {p['app']} verificada" if ok
                                              else f"leitura {p['app']} falhou",
                                              "state": "done" if ok else "failed"})
        return ok, None if ok else ev["erro"]

    # ------------------------------------------------------------ estado agregado
    def payload(self):
        hs = self.store.latest_integration_checks("health")
        health = next((h for h in hs if h["target"] == HEALTH_TARGET), None)
        probes = {r["target"]: r for r in self.store.latest_integration_checks("probe")}
        listados = {}
        if health and health["ok"]:
            for s in health["evidence"].get("servidores_zoho", []):
                listados[s["app"]] = s["status"]
        por_app = {v["app"]: k for k, v in PROBES.items()}
        apps = []
        for nome in SERVICOS + UPCOMING:
            upcoming = nome in UPCOMING
            if not health:
                servidor = "NAO VERIFICADO"
            elif not health["ok"]:
                servidor = "VERIFICACAO FALHOU"
            else:
                servidor = listados.get(nome, "NAO LISTADO")
            pid = por_app.get(nome)
            pr = probes.get(pid) if pid else None
            leitura = ("SEM PROBE NESTA VERSAO" if not pid else
                       "NAO TESTADA" if not pr else "TESTADA - OK" if pr["ok"] else "ERRO")
            apps.append({
                "id": slug(nome), "nome": nome,
                "estados": {
                    "oferta": "UPCOMING NO CATALOGO" if upcoming else "NO CATALOGO OFICIAL",
                    "conta": ("ACESSO DE LEITURA DEMONSTRADO (contrato nao verificado)"
                              if pr and pr["ok"] else "NAO VERIFICADA"),
                    "servidor": servidor,
                    "leitura": leitura,
                    "dados": "NAO CONFIAVEIS - nao usados em indicador ou diagnostico",
                    "acao": "EXIGE APROVACAO - nenhuma escrita autorizada",
                },
                "probe": pid,
                "probe_ferramenta": PROBES[pid]["tool"] if pid else None,
                "evidencia_probe": ({"em": pr["created_at"], **pr["evidence"]} if pr else None),
                "autorizacao": (None if servidor == "CONECTADO" else
                                "AUTORIZACAO PENDENTE - seguir o guia MCP oficial (OAuth); o portal "
                                "nao configura contas nem permissoes"),
                "nota": NOTAS.get(nome),
            })
        cat = [a for a in apps if a["nome"] in SERVICOS]
        return {
            "catalogo": {"url": CATALOGO_URL, "consultado_em": CATALOGO_CONSULTA, "guia": GUIA_MCP,
                         "aviso": "Catalogo prova oferta publica; nao prova contratacao nem conexao."},
            "healthcheck": ({"em": health["created_at"], "ok": health["ok"], **health["evidence"]}
                            if health else None),
            "progresso": {
                "catalogo_total": len(SERVICOS), "upcoming": len(UPCOMING),
                "servidor_conectado": sum(1 for a in cat if a["estados"]["servidor"] == "CONECTADO"),
                "leitura_testada_ok": sum(1 for a in cat if a["estados"]["leitura"] == "TESTADA - OK"),
                "leitura_com_erro": sum(1 for a in cat if a["estados"]["leitura"] == "ERRO"),
                "com_probe_disponivel": len(PROBES),
                "dados_confiaveis": 0, "acoes_autorizadas": 0,
            },
            "probes": [{"id": k, "app": v["app"], "ferramenta": v["tool"]} for k, v in PROBES.items()],
            "apps": apps,
            "verificado_em": now_iso(),
        }

    def resumo_texto(self):
        """Linha curta para o contexto do chat (sem endpoint, sem dados)."""
        pl = self.payload()
        pg = pl["progresso"]
        hc = pl["healthcheck"]
        conect = [a["nome"] for a in pl["apps"] if a["estados"]["servidor"] == "CONECTADO"]
        lidos = [a["nome"] for a in pl["apps"] if a["estados"]["leitura"] == "TESTADA - OK"]
        return (f"Catalogo Zoho MCP: {pg['catalogo_total']} servicos (+{pg['upcoming']} upcoming). "
                + (f"Ultimo healthcheck {hc['em']}: servidor conectado em {', '.join(conect) or 'nenhum'}. "
                   if hc and hc["ok"] else "Healthcheck ainda nao executado ou falhou. ")
                + f"Leitura testada com sucesso: {', '.join(lidos) or 'nenhuma'}. "
                "Acesso conectado NAO significa registros validados: o usuario declarou os dados "
                "atuais do Zoho incorretos; nenhum dado Zoho entra em indicador ou diagnostico. "
                "Nenhuma escrita autorizada.")
