"""Servidor HTTP local do portal (http.server, somente 127.0.0.1).

Seguranca:
- Host obrigatorio em {127.0.0.1,localhost}:<porta> (bloqueia DNS rebinding);
- escritas (POST/PUT/DELETE) exigem Origin local, Content-Type JSON e o token
  CSRF desta execucao no cabecalho X-VEOS-CSRF;
- arquivos estaticos somente pela lista STATIC (nenhum caminho do disco e
  derivado da URL);
- CSP restritiva, nosniff, no-referrer, frame-ancestors none."""
import hmac
import json
import re
import secrets
import traceback
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from . import ENGINE_LABEL, VERSION, voice360
from .cfo_bridge import CFOUnavailable
from .cfo_sim import SettingsError
from .orchestration import BusyError, RequestError
from .rooms import EXECUTIVES, REUNIAO, SECRETARIA, public_rooms, route

STATIC = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/favicon.svg": ("favicon.svg", "image/svg+xml"),
}
for _css in ("tokens", "base", "layout", "components", "views", "motion"):
    STATIC[f"/css/{_css}.css"] = (f"css/{_css}.css", "text/css; charset=utf-8")
for _js in ("main", "data/api", "domain/format", "domain/params", "domain/chart",
            "domain/rooms", "domain/controls", "service/jobs", "service/store", "ui/dom",
            "ui/shell", "ui/chart", "ui/chat", "ui/motion", "ui/views/overview", "ui/views/room",
            "ui/views/secretaria", "ui/views/meeting", "ui/views/cfo", "ui/views/params",
            "ui/views/cfo_briefing", "ui/views/cfo_controls", "ui/views/cfo_indicators",
            "ui/views/cfo_decisions", "ui/views/integrations", "ui/views/voice360"):
    STATIC[f"/js/{_js}.js"] = (f"js/{_js}.js", "text/javascript; charset=utf-8")

CSP = ("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
       "connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; "
       "frame-ancestors 'none'")
ROOM_RE = re.compile(r"^/api/rooms/([a-z]+)/messages$")
JOB_RE = re.compile(r"^/api/jobs/([0-9a-f]{32})$")
CONTROL_RE = re.compile(r"^/api/cfo/controles/([a-z]+)$")
WRITE_ROOMS = set(EXECUTIVES)
READ_ROOMS = set(EXECUTIVES) | {SECRETARIA, REUNIAO}


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


class PortalServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False  # no Windows, SO_REUSEADDR permitiria duas instancias na porta

    def __init__(self, config, store, orchestrator, cfo, provider):
        self.config = config
        self.store = store
        self.orch = orchestrator
        self.cfo = cfo
        self.provider = provider
        self.csrf_token = secrets.token_urlsafe(32)
        super().__init__((config.host, config.port), Handler)
        if config.port == 0:  # testes: porta efemera
            config.port = self.server_address[1]


class Handler(BaseHTTPRequestHandler):
    server_version = "VEOSPortal"
    sys_version = ""
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # console apenas; sem arquivo de log
        if self.path.startswith("/api/jobs/"):
            return
        super().log_message(fmt, *args)

    # ------------------------------------------------------------ resposta
    def _headers(self, status, ctype, length, cache="no-store"):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Content-Security-Policy", CSP)
        self.end_headers()

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._headers(status, "application/json; charset=utf-8", len(body))
        if self.command != "HEAD":
            self.wfile.write(body)

    def _error(self, status, message):
        self.close_connection = True  # corpo possivelmente nao lido: nao reutiliza conexao
        self._json(status, {"erro": message})

    # ------------------------------------------------------------ verificacoes
    def _check_host(self):
        host = (self.headers.get("Host") or "").strip().lower()
        if host not in self.server.config.allowed_hosts():
            raise ApiError(HTTPStatus.MISDIRECTED_REQUEST, "Host nao permitido")

    def _check_write(self):
        origin = self.headers.get("Origin")
        if origin not in self.server.config.allowed_origins():
            raise ApiError(HTTPStatus.FORBIDDEN, "Origin ausente ou nao permitida")
        if self.headers.get("Sec-Fetch-Site", "same-origin") not in ("same-origin", "none"):
            raise ApiError(HTTPStatus.FORBIDDEN, "requisicao entre sites recusada")
        token = self.headers.get("X-VEOS-CSRF", "")
        if not hmac.compare_digest(token.encode(), self.server.csrf_token.encode()):
            raise ApiError(HTTPStatus.FORBIDDEN, "token CSRF invalido")
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype != "application/json":
            raise ApiError(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "use application/json")

    def _read_raw(self):
        """Le o corpo antes de qualquer recusa: fechar o socket com dados nao
        lidos gera RST no Windows e o cliente perde a resposta de erro."""
        try:
            n = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Content-Length invalido")
        limite = self.server.config.max_body_bytes
        if n < 0:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Content-Length invalido")
        if n > limite:
            restante = min(n, 1024 * 1024)  # descarta no maximo 1 MB
            while restante > 0:
                bloco = self.rfile.read(min(65536, restante))
                if not bloco:
                    break
                restante -= len(bloco)
            raise ApiError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "corpo grande demais")
        self._raw = self.rfile.read(n) if n else b""

    def _body(self):
        raw = self._raw or b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ApiError(HTTPStatus.BAD_REQUEST, "JSON invalido")
        if not isinstance(data, dict):
            raise ApiError(HTTPStatus.BAD_REQUEST, "corpo deve ser objeto JSON")
        return data

    # ------------------------------------------------------------ despacho
    def _dispatch(self, write):
        try:
            if write:
                self._read_raw()
            self._check_host()
            url = urlsplit(self.path)
            if write:
                self._check_write()
                handler = self._post_routes(url.path)
                if handler is None:
                    raise ApiError(HTTPStatus.NOT_FOUND, "rota inexistente")
                status, obj = handler(self._body())
                return self._json(status, obj)
            if url.path.startswith("/api/"):
                obj = self._get_api(url.path, parse_qs(url.query))
                return self._json(HTTPStatus.OK, obj)
            return self._static(url.path)
        except ApiError as e:
            self._error(e.status, e.message)
        except (RequestError, SettingsError, ValueError) as e:
            self._error(HTTPStatus.BAD_REQUEST, str(e))
        except BusyError as e:
            self._error(HTTPStatus.TOO_MANY_REQUESTS, str(e))
        except CFOUnavailable as e:
            self._error(HTTPStatus.SERVICE_UNAVAILABLE, str(e))
        except Exception:
            self.log_error("erro interno:\n%s", traceback.format_exc())
            self._error(HTTPStatus.INTERNAL_SERVER_ERROR, "erro interno")

    def do_GET(self):
        self._dispatch(write=False)

    def do_HEAD(self):
        self._dispatch(write=False)

    def do_POST(self):
        self._dispatch(write=True)

    def do_PUT(self):
        self._dispatch(write=True)

    def do_DELETE(self):
        self._dispatch(write=True)

    # ------------------------------------------------------------ estaticos
    def _static(self, path):
        item = STATIC.get(path)
        if not item:
            raise ApiError(HTTPStatus.NOT_FOUND, "nao encontrado")
        rel, ctype = item
        full = self.server.config.web_dir.joinpath(*rel.split("/"))
        try:
            body = full.read_bytes()
        except OSError:
            raise ApiError(HTTPStatus.NOT_FOUND, "nao encontrado")
        self._headers(HTTPStatus.OK, ctype, len(body), cache="no-cache")
        if self.command != "HEAD":
            self.wfile.write(body)

    # ------------------------------------------------------------ API leitura
    def _get_api(self, path, q):
        s = self.server
        one = lambda k, d=None: (q.get(k) or [d])[0]  # noqa: E731
        if path == "/api/session":
            return {"csrf": s.csrf_token, "versao": VERSION, "motor": ENGINE_LABEL}
        if path == "/api/status":
            return {"servidor": {"endereco": f"{s.config.host}:{s.config.port}",
                                 "versao": VERSION},
                    "provedor": {**s.provider.status(), "rotulo": ENGINE_LABEL},
                    "jobs": {"em_fila_ou_execucao": s.orch.pending(),
                             "limite_concorrencia": s.config.max_concurrency,
                             "limite_fila": s.config.max_pending_jobs,
                             "historico": s.store.job_counts()},
                    "cfo": s.cfo.status(),
                    "cfo_controles": s.controls.status()}
        if path == "/api/rooms":
            counts, last = s.store.room_counts(), s.store.last_message_at()
            return {"salas": [{**r, "mensagens": counts.get(r["id"], 0),
                               "ultima": last.get(r["id"])} for r in public_rooms()],
                    "reuniao": {"mensagens": counts.get(REUNIAO, 0),
                                "ultima": last.get(REUNIAO)}}
        m = ROOM_RE.match(path)
        if m:
            room = m.group(1)
            if room not in READ_ROOMS:
                raise ApiError(HTTPStatus.NOT_FOUND, "sala inexistente")
            after = one("after", "0")
            if not after.isdigit():
                raise ApiError(HTTPStatus.BAD_REQUEST, "parametro after invalido")
            return {"sala": room, "mensagens": s.store.messages(room, int(after))}
        m = JOB_RE.match(path)
        if m:
            job = s.store.job(m.group(1))
            if not job:
                raise ApiError(HTTPStatus.NOT_FOUND, "job inexistente")
            return {k: job[k] for k in ("id", "kind", "room", "status", "progress", "error",
                                        "created_at", "updated_at")}
        if path == "/api/route":
            text = one("text", "")
            if len(text) > s.config.max_message_chars:
                raise ApiError(HTTPStatus.BAD_REQUEST, "texto longo demais")
            return route(text)
        if path == "/api/meetings":
            return {"reunioes": s.store.meetings()}
        if path == "/api/cfo/analysis":
            return s.cfo.analyze(one("as_of"), one("atraso", "0"), one("propostas", ""))
        if path == "/api/settings":
            return s.cfo.params_payload()
        if path == "/api/cfo/briefing":
            return s.controls.briefing(one("periodo"))
        if path == "/api/cfo/indicadores":
            return s.controls.indicadores(one("periodo"))
        if path == "/api/cfo/formularios":
            return s.controls.formularios()
        if path == "/api/cfo/metodologias":
            return s.controls.metodologia_payload()
        if path == "/api/cfo/decisoes":
            return s.ledger.listar()
        if path == "/api/integracoes":
            return s.integrations.payload()
        if path == "/api/voice360":
            return voice360.contexto(s.config)
        raise ApiError(HTTPStatus.NOT_FOUND, "rota inexistente")

    # ------------------------------------------------------------ API escrita
    def _post_routes(self, path):
        s = self.server
        m = ROOM_RE.match(path)
        if m and self.command == "POST":
            room = m.group(1)
            if room not in WRITE_ROOMS:
                raise ApiError(HTTPStatus.NOT_FOUND, "sala nao aceita conversa individual")
            return lambda b: (HTTPStatus.ACCEPTED, s.orch.start_chat(room, b.get("text")))
        if path == "/api/secretaria" and self.command == "POST":
            return lambda b: (HTTPStatus.ACCEPTED, s.orch.start_secretaria(
                b.get("text"), b.get("target", "auto"), b.get("mode", "direto")))
        if path == "/api/meetings" and self.command == "POST":
            return lambda b: (HTTPStatus.ACCEPTED, s.orch.start_meeting(
                b.get("topic"), b.get("participants")))
        if path == "/api/settings" and self.command == "PUT":
            return lambda b: (HTTPStatus.OK, s.cfo.save_params(b.get("rascunho")))
        if path == "/api/settings" and self.command == "DELETE":
            return lambda b: (HTTPStatus.OK, s.cfo.reset_params())
        m = CONTROL_RE.match(path)
        if m and self.command == "POST":
            # calculo puro: nada e gravado; POST apenas para receber o corpo JSON
            return lambda b: (HTTPStatus.OK, s.controls.simular(m.group(1), b.get("entrada")))
        if path == "/api/cfo/metodologias" and self.command == "PUT":
            return lambda b: (HTTPStatus.OK, s.controls.save_metodologia(b.get("rascunho")))
        if path == "/api/cfo/metodologias" and self.command == "DELETE":
            return lambda b: (HTTPStatus.OK, s.controls.reset_metodologia())
        if path == "/api/cfo/decisoes" and self.command == "POST":
            return lambda b: (HTTPStatus.CREATED, s.ledger.registrar(b))
        if path == "/api/integracoes/health" and self.command == "POST":
            return lambda b: (HTTPStatus.ACCEPTED, s.integrations.start_health())
        if path == "/api/integracoes/probe" and self.command == "POST":
            return lambda b: (HTTPStatus.ACCEPTED, s.integrations.start_probe(b.get("probe")))
        return None
