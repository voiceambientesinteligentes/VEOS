"""Conversas, Secretaria e reunioes executadas como jobs assincronos.

Regras:
- cada sala usa SOMENTE o proprio historico como contexto;
- pergunta encaminhada pela Secretaria usa o historico da Secretaria, nunca o da
  sala privada do perfil consultado;
- reuniao usa somente o proprio transcrito (topico + respostas reais anteriores);
- falha do provedor vira nota de sistema e job 'failed'; nenhuma resposta e
  inventada, e a sintese so considera respostas reais registradas."""
import threading
from concurrent.futures import ThreadPoolExecutor

from . import ENGINE_LABEL
from .provider import ProviderError
from .rooms import (EXECUTIVES, MAX_MEETING_PARTICIPANTS, REUNIAO, ROOMS, SECRETARIA,
                    persona, route)

USER_AUTHOR = "Voce"


class BusyError(Exception):
    pass


class RequestError(ValueError):
    pass


def clean_text(text, max_chars):
    if not isinstance(text, str):
        raise RequestError("mensagem deve ser texto")
    t = text.replace("\x00", "").strip()
    if not t:
        raise RequestError("mensagem vazia")
    if len(t) > max_chars:
        raise RequestError(f"mensagem acima de {max_chars} caracteres")
    return t


def format_history(messages, max_chars):
    """Somente mensagens de usuario e respostas reais; notas de sistema ficam fora."""
    linhas = [f"[{m['author']}] {m['content']}" for m in messages
              if m["role"] in ("user", "assistant")]
    out, total = [], 0
    for linha in reversed(linhas):
        total += len(linha) + 1
        if total > max_chars:
            break
        out.append(linha)
    out.reverse()
    return "\n".join(out)


def chat_prompt(history, question):
    partes = []
    if history:
        partes += ["Historico recente DESTA sala (mais antigo primeiro):", history, "---"]
    partes += ["Nova mensagem do usuario:", question]
    return "\n".join(partes)


def routed_prompt(history, question, target):
    partes = [f"A Secretaria do portal encaminhou esta pergunta ao perfil {ROOMS[target]['sigla']}. "
              "Responda diretamente ao usuario."]
    if history:
        partes += ["Historico recente da Secretaria (mais antigo primeiro):", history, "---"]
    partes += ["Pergunta:", question]
    return "\n".join(partes)


def synthesis_prompt(question, sigla, answer):
    return "\n".join([
        f"Sintetize para o usuario a resposta abaixo, dada pelo perfil consultivo {sigla}.",
        f"Atribua explicitamente o conteudo ao {sigla} (ex.: 'Segundo o {sigla}, ...').",
        "Nao acrescente fatos, numeros ou recomendacoes que nao estejam na resposta. "
        "Termine com os proximos passos que dependem de decisao humana, se houver.",
        "Pergunta original:", question, "---", f"Resposta do {sigla}:", answer])


def meeting_prompt(topic, sigla, contributions):
    partes = [f"Reuniao mediada pela Secretaria. Voce participa como {sigla}.",
              "Topico proposto pelo usuario:", topic]
    if contributions:
        partes += ["---", "Contribuicoes ja registradas nesta reuniao:"]
        partes += [f"[{c['sigla']}] {c['text']}" for c in contributions]
        partes += ["---", "Contribua com a sua perspectiva; concorde ou discorde de forma "
                          "explicita quando fizer sentido. Seja conciso."]
    else:
        partes += ["Voce e o primeiro a falar. Seja conciso."]
    return "\n".join(partes)


def meeting_summary_prompt(topic, contributions):
    partes = ["Voce e a Secretaria e mediou a reuniao abaixo. Produza uma ata curta:",
              "1) pontos de cada participante com atribuicao (sigla); 2) convergencias; "
              "3) divergencias; 4) decisoes que dependem do usuario.",
              "Use SOMENTE as contribuicoes registradas; nao invente falas, numeros nem "
              "participantes.", "Topico:", topic, "---", "Contribuicoes registradas:"]
    partes += [f"[{c['sigla']}] {c['text']}" for c in contributions]
    return "\n".join(partes)


def validate_participants(raw):
    if not isinstance(raw, list) or not raw:
        raise RequestError("selecione ao menos um participante")
    vistos = []
    for p in raw:
        if p not in EXECUTIVES:
            raise RequestError(f"participante invalido: {p!r}")
        if p in vistos:
            raise RequestError(f"participante repetido: {p}")
        vistos.append(p)
    if len(vistos) > MAX_MEETING_PARTICIPANTS:
        raise RequestError(f"no maximo {MAX_MEETING_PARTICIPANTS} participantes por reuniao")
    return vistos


class Orchestrator:
    def __init__(self, store, provider, config, executor=None, context_for=None):
        self.store = store
        self.provider = provider
        self.config = config
        self._executor = executor or ThreadPoolExecutor(
            max_workers=config.max_concurrency, thread_name_prefix="veos-job")
        self._pending = 0
        self._lock = threading.Lock()
        # context_for(sala) -> texto calculado pela aplicacao ou None (so o CFO recebe hoje)
        self.context_for = context_for

    def _with_context(self, room, prompt):
        if not self.context_for:
            return prompt
        try:
            ctx = self.context_for(room)
        except Exception as e:  # contexto nunca impede a conversa
            ctx = f"[contexto calculado indisponivel: {str(e)[:200]}]"
        return f"{ctx}\n---\n{prompt}" if ctx else prompt

    # ------------------------------------------------------------ infraestrutura
    def _submit(self, jid, fn, *args):
        """Chamar somente apos _reserve(); a vaga reservada e liberada ao final."""
        def run():
            try:
                self.store.set_job_status(jid, "running")
                fn(jid, *args)
            except Exception as e:  # nunca deixa job preso em 'running'
                self.store.set_job_status(jid, "failed", f"erro interno: {e}")
            finally:
                self._release()
        self._executor.submit(run)

    def _reserve(self):
        with self._lock:
            if self._pending >= self.config.max_pending_jobs:
                raise BusyError("fila cheia; aguarde as respostas em andamento")
            self._pending += 1

    def _release(self):
        with self._lock:
            self._pending -= 1

    def _start(self, create, fn):
        """Reserva vaga, cria registros e agenda o job; libera a vaga se falhar."""
        self._reserve()
        try:
            jid, args, result = create()
        except Exception:
            self._release()
            raise
        self._submit(jid, fn, *args)
        return result

    def pending(self):
        with self._lock:
            return self._pending

    def shutdown(self):
        self._executor.shutdown(wait=False, cancel_futures=True)

    def _ask(self, jid, room_for_errors, sigla, system, prompt, meta_extra=None, record_room=None):
        """Chama o provedor. Sucesso: grava resposta real. Falha: grava nota de
        sistema (nao e resposta) e devolve None."""
        self.store.add_job_progress(jid, {"step": f"consultando {sigla}", "state": "running"})
        try:
            reply = self.provider.complete(system, prompt)
        except ProviderError as e:
            ctx = {k: v for k, v in (meta_extra or {}).items() if k == "meeting_id"}
            self.store.add_message(room_for_errors, "system", "Sistema",
                                   f"{sigla} sem resposta: {e}", jid,
                                   {**ctx, "kind": "error", "sigla": sigla})
            self.store.add_job_progress(jid, {"step": f"{sigla} sem resposta", "state": "failed"})
            return None, str(e)
        meta = {"engine": ENGINE_LABEL, "sigla": sigla, **reply.meta, **(meta_extra or {})}
        mid = self.store.add_message(record_room or room_for_errors, "assistant", sigla,
                                     reply.text, jid, meta)
        self.store.add_job_progress(jid, {"step": f"{sigla} respondeu", "state": "done"})
        return {"id": mid, "text": reply.text, "sigla": sigla}, None

    def _history(self, room, before_id):
        msgs = [m for m in self.store.recent_messages(room, self.config.history_messages + 1)
                if m["id"] < before_id]
        return format_history(msgs[-self.config.history_messages:], self.config.history_chars)

    # ------------------------------------------------------------ sala individual
    def start_chat(self, room, text):
        if room not in EXECUTIVES:
            raise RequestError("sala invalida para conversa individual")
        text = clean_text(text, self.config.max_message_chars)

        def create():
            jid = self.store.create_job("chat", room, {"text": text})
            mid = self.store.add_message(room, "user", USER_AUTHOR, text, jid)
            return jid, (room, text, mid), {"job": jid, "message_id": mid}
        return self._start(create, self._run_chat)

    def _run_chat(self, jid, room, text, mid):
        prompt = self._with_context(room, chat_prompt(self._history(room, mid), text))
        ok, err = self._ask(jid, room, ROOMS[room]["sigla"], persona(room), prompt)
        self.store.set_job_status(jid, "done" if ok else "failed", err)

    # ------------------------------------------------------------ secretaria
    def start_secretaria(self, text, target="auto", mode="direto"):
        text = clean_text(text, self.config.max_message_chars)
        if mode not in ("direto", "sintese"):
            raise RequestError("modo deve ser 'direto' ou 'sintese'")
        try:
            decisao = route(text, target)
        except ValueError as e:
            raise RequestError(str(e))
        sigla = ROOMS[decisao["room"]]["sigla"]

        def create():
            jid = self.store.create_job("secretaria", SECRETARIA,
                                        {"text": text, "target": target, "mode": mode,
                                         "routing": decisao})
            mid = self.store.add_message(SECRETARIA, "user", USER_AUTHOR, text, jid,
                                         {"target": target, "mode": mode})
            self.store.add_message(SECRETARIA, "system", "Secretaria",
                                   f"Encaminhado para {sigla} - {decisao['reason']}. Modo: "
                                   + ("resposta direta do perfil" if mode == "direto"
                                      else "sintese da Secretaria com atribuicao"),
                                   jid, {"kind": "routing", "routing": decisao})
            return (jid, (text, decisao["room"], mode, mid),
                    {"job": jid, "message_id": mid, "routing": decisao})
        return self._start(create, self._run_secretaria)

    def _run_secretaria(self, jid, text, target, mode, mid):
        sigla = ROOMS[target]["sigla"]
        prompt = self._with_context(target, routed_prompt(self._history(SECRETARIA, mid), text, target))
        ans, err = self._ask(jid, SECRETARIA, sigla, persona(target), prompt,
                             {"via": "secretaria", "internal": mode == "sintese"})
        if not ans:
            self.store.set_job_status(jid, "failed", err)
            return
        if mode == "sintese":
            syn, err = self._ask(jid, SECRETARIA, "Secretaria", persona(SECRETARIA),
                                 synthesis_prompt(text, sigla, ans["text"]),
                                 {"kind": "synthesis", "attribution": [sigla],
                                  "based_on": [ans["id"]]})
            if not syn:
                self.store.set_job_status(jid, "failed", err)
                return
        self.store.set_job_status(jid, "done")

    # ------------------------------------------------------------ reuniao
    def start_meeting(self, topic, participants):
        topic = clean_text(topic, self.config.max_message_chars)
        parts = validate_participants(participants)

        def create():
            jid = self.store.create_job("reuniao", REUNIAO,
                                        {"topic": topic, "participants": parts})
            meeting_id = self.store.create_meeting(topic, parts, jid)
            base = {"meeting_id": meeting_id}
            self.store.add_message(REUNIAO, "user", USER_AUTHOR, topic, jid, base)
            self.store.add_message(REUNIAO, "system", "Secretaria",
                                   "Reuniao aberta pela Secretaria. Participantes, em ordem: "
                                   + ", ".join(ROOMS[p]["sigla"] for p in parts)
                                   + ". Cada perfil e consultado em serie; a ata usa somente "
                                     "respostas registradas.", jid,
                                   {**base, "kind": "meeting-open"})
            return (jid, (meeting_id, topic, parts),
                    {"job": jid, "meeting_id": meeting_id, "participants": parts})
        return self._start(create, self._run_meeting)

    def _run_meeting(self, jid, meeting_id, topic, parts):
        base = {"meeting_id": meeting_id}
        contribs = []
        for p in parts:
            sigla = ROOMS[p]["sigla"]
            ans, _ = self._ask(jid, REUNIAO, sigla, persona(p),
                               self._with_context(p, meeting_prompt(topic, sigla, contribs)), base)
            if ans:
                contribs.append(ans)
        if not contribs:
            self.store.set_meeting_status(meeting_id, "sem respostas")
            self.store.set_job_status(jid, "failed", "nenhum participante respondeu")
            return
        ata, err = self._ask(jid, REUNIAO, "Secretaria", persona(SECRETARIA),
                             meeting_summary_prompt(topic, contribs),
                             {**base, "kind": "summary",
                              "attribution": [c["sigla"] for c in contribs],
                              "based_on": [c["id"] for c in contribs]})
        completa = len(contribs) == len(parts)
        self.store.set_meeting_status(
            meeting_id, ("concluida" if completa else "concluida parcial")
            + ("" if ata else " sem ata"))
        self.store.set_job_status(jid, "done" if ata else "failed", err)
