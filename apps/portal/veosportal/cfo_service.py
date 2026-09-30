"""Servico da camada de controles CFO: base TESTE, metodologias em rascunho e
snapshots calculados pelo servidor (usados pelo registro de decisoes).

Somente dados sinteticos. Nenhum provedor externo e consultado; o Zoho nunca e
usado para indicador ou diagnostico."""
import threading
from pathlib import Path

from . import cfo_controls as cc
from . import cfo_indicadores as ci
from .cfo_bridge import CFOUnavailable, jsonable

SETTINGS_KEY = "cfo_metodologias"
TIPOS = ("ticket", "desconto", "fases", "reserva")

ESCOPO = (
    ("Ticket desejado R$ 100.000 (V1 sec.2)", "IMPLEMENTADO - simulacao TESTE; nao bloqueia"),
    ("Desconto e alcada (V1 sec.9)", "IMPLEMENTADO - simulacao TESTE; MC 30-31,99% com desconto "
                                     "<= 2% permanece NAO RESOLVIDO pela fonte"),
    ("Cobertura de recebimento por fase (V1 sec.10)", "IMPLEMENTADO - simulacao TESTE; nao aprova "
                                                      "compra"),
    ("Reserva de caixa (V1 sec.12)", "IMPLEMENTADO PARCIAL - janela e metodo em RASCUNHO NAO OFICIAL"),
    ("Quinze indicadores com comparacao (V1 sec.13)", "IMPLEMENTADO - dados sinteticos; convencoes "
                                                      "declaradas por indicador"),
    ("Registro local de decisoes auditavel", "IMPLEMENTADO - local; autoria declarada, nao autenticada"),
    ("Dados reais e reconciliacao", "NAO INICIADO - Zoho declarado incorreto; exige base validada"),
    ("Aprovacao autenticada da direcao", "NAO INICIADO"),
    ("Consolidacao canonica no VOICE_360", "NAO REALIZADA - somente rascunho revisavel"),
)


class CFOControlsService:
    def __init__(self, config, store):
        self.config = config
        self.store = store
        self._lock = threading.Lock()
        self._cache = None  # (mtime_ns, size, path, fx, sha)

    # ------------------------------------------------------------ base TESTE
    def fixture_path(self):
        for c in self.config.cfo_controles_fixture_candidates:
            if c and Path(c).is_file():
                return str(Path(c).resolve())
        raise CFOUnavailable("base TESTE de controles (cfo-controles-TESTE.json) nao encontrada")

    def load(self):
        path = self.fixture_path()
        st = Path(path).stat()
        with self._lock:
            if self._cache and self._cache[:3] == (st.st_mtime_ns, st.st_size, path):
                return self._cache[3], self._cache[4], path
        try:
            fx, sha = cc.carregar_arquivo(path)
        except cc.ControlError as e:
            raise CFOUnavailable(f"base TESTE de controles invalida: {e}")
        with self._lock:
            self._cache = (st.st_mtime_ns, st.st_size, path, fx, sha)
        return fx, sha, path

    def fonte(self, path, sha):
        return f"Base TESTE {Path(path).name} (sha256 {sha[:12]}...)"

    def status(self):
        try:
            fx, sha, path = self.load()
            return {"disponivel": True, "fixture": Path(path).name, "fixture_sha256": sha,
                    "periodos": [p["id"] for p in fx["periodos"]]}
        except CFOUnavailable as e:
            return {"disponivel": False, "erro": str(e)}

    # ------------------------------------------------------------ metodologias (rascunho)
    def metodologia(self):
        saved, updated = self.store.get_setting(SETTINGS_KEY)
        try:
            return cc.validar_metodologia(saved or {}), updated, None
        except cc.ControlError as e:
            return dict(cc.METODO_BASE), updated, str(e)

    def metodologia_payload(self):
        cfg, updated, invalid = self.metodologia()
        return {"status": cc.RASCUNHO,
                "aviso": "Metodologias que a Politica V1 nao define. Valores configuraveis de "
                         "simulacao; nao sao regra oficial.",
                "rascunho": cfg, "padrao_simulacao": cc.METODO_BASE, "opcoes": cc.METODO_OPCOES,
                "rotulos": cc.METODO_ROTULOS, "atualizado_em": updated, "rascunho_invalido": invalid}

    def save_metodologia(self, raw):
        cfg = cc.validar_metodologia(raw)
        self.store.put_setting(SETTINGS_KEY, cfg)
        return self.metodologia_payload()

    def reset_metodologia(self):
        self.store.delete_setting(SETTINGS_KEY)
        return self.metodologia_payload()

    # ------------------------------------------------------------ calculos
    def indicadores(self, periodo=None):
        fx, sha, path = self.load()
        cfg = self.metodologia()[0]
        try:
            out = ci.calcular_indicadores(fx, cfg, periodo, self.fonte(path, sha))
        except cc.ControlError as e:
            raise ValueError(str(e))
        return jsonable({"sintetico": True, "fixture_sha256": sha, **out})

    def briefing_raw(self, periodo=None):
        fx, sha, path = self.load()
        cfg = self.metodologia()[0]
        try:
            return ci.montar_briefing(fx, cfg, periodo, self.fonte(path, sha), sha), sha
        except cc.ControlError as e:
            raise ValueError(str(e))

    def briefing(self, periodo=None):
        b, sha = self.briefing_raw(periodo)
        return jsonable({**b, "fixture_sha256": sha})

    def _calcular(self, tipo, entrada):
        if tipo not in TIPOS:
            raise ValueError(f"controle desconhecido: {tipo!r}")
        if not isinstance(entrada, dict):
            raise ValueError("entrada deve ser objeto")
        try:
            if tipo == "ticket":
                return cc.avaliar_ticket(entrada), None
            if tipo == "desconto":
                return cc.simular_desconto(entrada), None
            fx, sha, _ = self.load()
            if tipo == "fases":
                return cc.avaliar_fases(entrada, fx), sha
            cc._keys(entrada, "reserva", (), ("periodo", "caixa_livre", "janela_meses", "metodo"))
            cfg = dict(self.metodologia()[0])
            over = {}
            if entrada.get("janela_meses") not in (None, ""):
                over["reserva_janela_meses"] = entrada["janela_meses"]
            if entrada.get("metodo") not in (None, ""):
                over["reserva_metodo"] = entrada["metodo"]
            cfg = cc.validar_metodologia({**{k: cfg[k] for k in cfg}, **over})
            return cc.avaliar_reserva(fx, cfg, entrada.get("periodo"), entrada.get("caixa_livre")), sha
        except cc.ControlError as e:
            raise ValueError(str(e))

    def simular(self, tipo, entrada):
        res, sha = self._calcular(tipo, entrada)
        return jsonable({"sintetico": tipo in ("fases", "reserva"), "tipo": tipo,
                         "fixture_sha256": sha, "resultado": res})

    def snapshot(self, tipo, entrada):
        """Contexto calculado PELO SERVIDOR que uma decisao referencia."""
        if tipo in TIPOS:
            res, sha = self._calcular(tipo, entrada)
            snap = {"tipo": tipo, "entrada": entrada, "resultado": res, "fixture_sha256": sha}
        elif tipo in ("indicadores", "geral"):
            periodo = (entrada or {}).get("periodo") if isinstance(entrada, dict) else None
            b, sha = self.briefing_raw(periodo)
            snap = {"tipo": tipo, "entrada": {"periodo": b["periodo"]}, "fixture_sha256": sha,
                    "resultado": {k: b[k] for k in ("periodo", "status_geral", "linha", "tldr",
                                                    "prioridade", "lacunas")}}
        else:
            raise ValueError(f"tipo de decisao desconhecido: {tipo!r}")
        snap["metodologia"] = self.metodologia()[0]
        return jsonable(snap)

    def formularios(self):
        fx, sha, _ = self.load()
        ult = fx["periodos"][-1]
        projetos = []
        for x in ult["projetos"]:
            fats = [f for f in ult["faturas"] if f["projeto"] == x["id"]]
            projetos.append({
                "id": x["id"], "nome": x["nome"], "valor_contrato": x["valor_contrato"],
                "recebimentos_efetivos": [{"id": r["id"], "fatura": f["id"], "data": r["data"],
                                           "valor": r["valor"]} for f in fats for r in f["recebimentos"]],
                "a_receber": [{"fatura": f["id"], "vencimento": f["vencimento"],
                               "aberto": f["valor"] - sum((r["valor"] for r in f["recebimentos"]), cc.ZERO)}
                              for f in fats]})
        return jsonable({"sintetico": True, "fixture_sha256": sha,
                         "periodos": [p["id"] for p in fx["periodos"]], "periodo_atual": ult["id"],
                         "projetos": projetos, "fases_exemplo": fx["fases_exemplo"],
                         "excecoes_ticket": cc.EXCECOES_TICKET,
                         "referencia_fases": list(cc.REFERENCIA_FASES),
                         "ticket_desejado": cc.TICKET_DESEJADO,
                         "escopo": [{"item": a, "status": b} for a, b in ESCOPO]})
