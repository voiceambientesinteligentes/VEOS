"""Decisoes financeiras locais auditaveis (append-only, cadeia SHA-256).

Padrao reaproveitado de tools/decisoes_v2.py (referencia, nao alterado):
evento canonico, prev + hash encadeados, verificacao integral antes de cada
append (registro adulterado bloqueia tudo), autoria DECLARADA e nao autenticada.
Diferencas: persistencia em SQLite (runtime/, ignorado pelo Git) dentro de uma
transacao BEGIN IMMEDIATE, triggers que recusam UPDATE/DELETE e snapshot do
calculo feito PELO SERVIDOR com o proprio sha256.

Estados: proposto, registrado_pelo_usuario, rejeitado. Nada aqui aprova,
executa, transfere, fatura, envia e-mail ou paga; o sistema nunca grava sozinho:
toda entrada exige acao explicita do usuario na interface (confirmacao=true)."""
import getpass
import hashlib
import json
import unicodedata

from .store import now_iso

SCHEMA = "veos-cfo-decisao-v1"
GENESIS = "0" * 64
ESTADOS = ("proposto", "registrado_pelo_usuario", "rejeitado")
TIPOS = ("ticket", "desconto", "fases", "reserva", "indicadores", "geral")
AUTORIA = "declarada-nao-autenticada"
AVISO_AUTORIA = ("O autor e uma DECLARACAO de quem usa este computador; o portal nao autentica "
                 "identidade. O registro e local e nao executa nada em sistema algum.")
MAX_TEXTO, MAX_ASSUNTO, MAX_AUTOR, MAX_DEP = 2000, 200, 80, 10
CHAVES = frozenset({"seq", "ts", "schema", "tipo", "estado", "assunto", "motivo", "autor_declarado",
                    "autoria", "registrado_por_so", "canal", "dependencias", "refere_seq",
                    "snapshot_sha256", "confirmacao_explicita", "prev"})
PROIBIDOS = {chr(c) for c in range(0x202A, 0x202F)} | {chr(c) for c in range(0x2066, 0x206A)}


class LedgerError(ValueError):
    pass


def canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def event_hash(evento):
    return sha256_text(canonical(evento))


def limpar(v, campo, maximo, linhas=True):
    if not isinstance(v, str):
        raise LedgerError(f"{campo}: deve ser texto")
    t = v.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not t:
        raise LedgerError(f"{campo}: vazio")
    if len(t) > maximo:
        raise LedgerError(f"{campo}: {len(t)} caracteres, maximo {maximo}")
    for ch in t:
        if ch == "\t" or (ch == "\n" and linhas):
            continue
        if unicodedata.category(ch) in ("Cc", "Cs") or ch in PROIBIDOS:
            raise LedgerError(f"{campo}: caractere nao permitido (U+{ord(ch):04X})")
    return t


def _usuario_so():
    try:
        return getpass.getuser()
    except Exception:
        return "desconhecido"


def verificar(rows):
    """Confere o registro inteiro. Devolve a lista de eventos; qualquer divergencia
    levanta LedgerError (falha fechada)."""
    prev, evs = GENESIS, []
    for i, r in enumerate(rows, 1):
        onde = f"decisao {i}"
        if r["seq"] != i:
            raise LedgerError(f"{onde}: sequencia {r['seq']}, esperada {i}")
        try:
            ev = json.loads(r["evento"])
            snap = json.loads(r["snapshot"])
        except (TypeError, json.JSONDecodeError):
            raise LedgerError(f"{onde}: JSON invalido")
        if not isinstance(ev, dict) or set(ev) != CHAVES:
            raise LedgerError(f"{onde}: campos do evento nao conferem")
        if canonical(ev) != r["evento"] or canonical(snap) != r["snapshot"]:
            raise LedgerError(f"{onde}: formatacao alterada apos a gravacao")
        if ev["seq"] != i or ev["schema"] != SCHEMA:
            raise LedgerError(f"{onde}: seq/schema invalido")
        if ev["prev"] != prev or r["prev"] != prev:
            raise LedgerError(f"{onde}: encadeamento quebrado (prev nao confere)")
        if r["hash"] != event_hash(ev):
            raise LedgerError(f"{onde}: hash nao confere (conteudo alterado)")
        if ev["snapshot_sha256"] != sha256_text(r["snapshot"]):
            raise LedgerError(f"{onde}: snapshot alterado (sha256 nao confere)")
        if ev["estado"] not in ESTADOS or ev["tipo"] not in TIPOS or ev["autoria"] != AUTORIA \
                or ev["confirmacao_explicita"] is not True:
            raise LedgerError(f"{onde}: estado/tipo/autoria invalido")
        prev = r["hash"]
        evs.append({**ev, "hash": r["hash"], "snapshot": snap})
    return evs


def _resolvidas(evs):
    return {e["refere_seq"]: e["seq"] for e in evs if e["refere_seq"] is not None}


class DecisionLedger:
    def __init__(self, store, snapshot_fn):
        self.store = store
        self.snapshot_fn = snapshot_fn  # (tipo, entrada) -> snapshot calculado pelo servidor

    def listar(self):
        try:
            evs = verificar(self.store.decision_rows())
            return {"integridade": {"ok": True, "eventos": len(evs)}, "decisoes": evs,
                    "aviso_autoria": AVISO_AUTORIA, "estados": list(ESTADOS)}
        except LedgerError as e:
            return {"integridade": {"ok": False, "erro": str(e)}, "decisoes": [],
                    "aviso_autoria": AVISO_AUTORIA, "estados": list(ESTADOS)}

    def registrar(self, body, canal="portal"):
        if not isinstance(body, dict):
            raise LedgerError("corpo deve ser objeto")
        permitidas = {"tipo", "entrada", "estado", "assunto", "motivo", "autor_declarado",
                      "dependencias", "refere_seq", "confirmacao"}
        extra = sorted(set(body) - permitidas)
        if extra:
            raise LedgerError(f"campo(s) desconhecido(s): {', '.join(extra)}")
        if body.get("confirmacao") is not True:
            raise LedgerError("confirmacao explicita do usuario ausente: nada foi gravado")
        tipo, estado = body.get("tipo"), body.get("estado")
        if tipo not in TIPOS:
            raise LedgerError(f"tipo invalido: {tipo!r}")
        if estado not in ESTADOS:
            raise LedgerError(f"estado invalido: {estado!r} (use {', '.join(ESTADOS)})")
        assunto = limpar(body.get("assunto"), "assunto", MAX_ASSUNTO, linhas=False)
        motivo = limpar(body.get("motivo"), "motivo", MAX_TEXTO)
        autor = limpar(body.get("autor_declarado"), "autor_declarado", MAX_AUTOR, linhas=False)
        deps_raw = body.get("dependencias") or []
        if not isinstance(deps_raw, list) or len(deps_raw) > MAX_DEP:
            raise LedgerError(f"dependencias: lista com no maximo {MAX_DEP} itens")
        deps = [limpar(d, f"dependencias[{i}]", 160, linhas=False) for i, d in enumerate(deps_raw)]
        ref = body.get("refere_seq")
        if ref is not None and (isinstance(ref, bool) or not isinstance(ref, int) or ref < 1):
            raise LedgerError("refere_seq deve ser inteiro positivo ou null")
        if estado == "proposto" and ref is not None:
            raise LedgerError("uma proposta nova nao refere outra decisao; use dependencias")
        try:
            snap = self.snapshot_fn(tipo, body.get("entrada") or {})
        except (ValueError, LookupError) as e:
            raise LedgerError(f"contexto da decisao nao pode ser calculado: {e}")
        snap_txt = canonical(snap)
        usuario = _usuario_so()

        def build(rows):
            evs = verificar(rows)  # adulterado: recusa antes do append
            if ref is not None:
                alvo = next((e for e in evs if e["seq"] == ref), None)
                if alvo is None:
                    raise LedgerError(f"decisao {ref} inexistente")
                if alvo["estado"] != "proposto":
                    raise LedgerError(f"decisao {ref} nao e proposta; so propostas sao resolvidas")
                if ref in _resolvidas(evs):
                    raise LedgerError(f"proposta {ref} ja resolvida pela decisao {_resolvidas(evs)[ref]}")
            prev = rows[-1]["hash"] if rows else GENESIS
            ev = {"seq": len(rows) + 1, "ts": now_iso(), "schema": SCHEMA, "tipo": tipo,
                  "estado": estado, "assunto": assunto, "motivo": motivo,
                  "autor_declarado": autor, "autoria": AUTORIA, "registrado_por_so": usuario,
                  "canal": canal, "dependencias": deps, "refere_seq": ref,
                  "snapshot_sha256": sha256_text(snap_txt), "confirmacao_explicita": True,
                  "prev": prev}
            return (ev["seq"], canonical(ev), snap_txt, prev, event_hash(ev))

        row = self.store.append_decision(build)
        ev = json.loads(row[1])
        return {**ev, "hash": row[4], "snapshot": snap, "aviso_autoria": AVISO_AUTORIA}
