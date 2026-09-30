"""Ponte para o motor CFO TESTE existente (tools/cfo.py), somente leitura.

O motor e carregado por caminho, sem copia e sem alteracao. So a fixture
sintetica e analisada; nada consulta Zoho, credenciais ou politicas canonicas
(a funcao cfo.fontes, que le o cofre, nao e chamada)."""
import hashlib
import importlib.util
import threading
from datetime import date
from decimal import Decimal
from pathlib import Path

from . import cfo_sim

SETTINGS_KEY = "cfo_simulacao"
MAX_PROPOSTAS = 10


class CFOUnavailable(Exception):
    pass


def jsonable(v):
    if isinstance(v, Decimal):
        if v.as_tuple().exponent < -4:
            v = v.quantize(Decimal("0.0001"))
        return format(v, "f")
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: jsonable(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [jsonable(x) for x in v]
    return v


def _sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


class CFOBridge:
    def __init__(self, config, store):
        self.config = config
        self.store = store
        self._lock = threading.Lock()
        self._engine = None
        self._engine_path = None
        self._error = None

    def _first(self, candidates):
        for c in candidates:
            if c and Path(c).is_file():
                return str(Path(c).resolve())
        return None

    def engine(self):
        with self._lock:
            if self._engine is not None:
                return self._engine
            path = self._first(self.config.cfo_engine_candidates)
            if not path:
                self._error = "motor CFO nao encontrado (tools/cfo.py ou engine/cfo.py)"
                raise CFOUnavailable(self._error)
            spec = importlib.util.spec_from_file_location("veos_cfo_engine", path)
            mod = importlib.util.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
            except Exception as e:
                self._error = f"motor CFO nao carregou: {e}"
                raise CFOUnavailable(self._error)
            for nome in ("carregar_arquivo", "analisar", "CFOError", "BANNER", "data_iso"):
                if not hasattr(mod, nome):
                    self._error = f"motor CFO incompativel: falta {nome}"
                    raise CFOUnavailable(self._error)
            self._engine, self._engine_path, self._error = mod, path, None
            return mod

    def fixture(self):
        path = self._first(self.config.cfo_fixture_candidates)
        if not path:
            raise CFOUnavailable("fixture sintetica cfo-demo.json nao encontrada")
        return path

    def status(self):
        try:
            self.engine()
            fx = self.fixture()
            return {"disponivel": True, "motor": self._engine_path,
                    "motor_sha256": _sha256(self._engine_path), "fixture": fx,
                    "fixture_sha256": _sha256(fx)}
        except CFOUnavailable as e:
            return {"disponivel": False, "erro": str(e)}

    # ------------------------------------------------------------ parametros
    def params(self):
        saved, updated = self.store.get_setting(SETTINGS_KEY)
        try:
            p = cfo_sim.validate(saved or {})
            invalid = None
        except cfo_sim.SettingsError as e:  # rascunho corrompido: volta a base, avisa
            p, invalid = dict(cfo_sim.BASE), str(e)
        return p, updated, invalid

    def params_payload(self):
        p, updated, invalid = self.params()
        return {"simulacao_somente": True,
                "aviso": "Rascunho de simulacao. Nao altera as regras oficiais nem politicas "
                         "canonicas; o resultado oficial continua calculado com a base.",
                "base_oficial": cfo_sim.to_strings(cfo_sim.BASE),
                "rascunho": cfo_sim.to_strings(p), "rotulos": cfo_sim.LABELS,
                "limites": {k: [str(a), str(b)] for k, (a, b) in cfo_sim.LIMITS.items()},
                "atualizado_em": updated, "rascunho_invalido": invalid,
                "difere_da_base": p != cfo_sim.BASE}

    def save_params(self, raw):
        p = cfo_sim.validate(raw)
        self.store.put_setting(SETTINGS_KEY, cfo_sim.to_strings(p))
        return self.params_payload()

    def reset_params(self):
        self.store.delete_setting(SETTINGS_KEY)
        return self.params_payload()

    # ------------------------------------------------------------ analise
    def analyze(self, as_of=None, atraso="0", propostas=""):
        eng = self.engine()
        fx = self.fixture()
        try:
            data_base = eng.data_iso(as_of, "as_of") if as_of else date.today()
            if not str(atraso).isdigit():
                raise eng.CFOError("atraso deve ser inteiro nao negativo")
            props = [x for x in (propostas or "").split(",") if x]
            if len(props) > MAX_PROPOSTAS:
                raise eng.CFOError("propostas demais")
            dados = eng.carregar_arquivo(fx)
            res = eng.analisar(dados, data_base, int(atraso), props)
        except eng.CFOError as e:
            raise ValueError(str(e))
        p, updated, invalid = self.params()
        sim = cfo_sim.simulate(res["projetos"], p)
        return jsonable({
            "sintetico": True, "banner": eng.BANNER,
            "descricao": dados["meta"]["descricao"],
            "fixture_sha256": _sha256(fx),
            "as_of": res["as_of"], "atraso_dias": res["atraso_dias"],
            "propostas_disponiveis": dados["propostas"],
            "oficial": {k: res[k] for k in (
                "propostas_sel", "caixa_saldo_informado", "caixa_data", "saldo", "corrente",
                "cenario", "receber_vencido_nao_projetado", "titulos_futuros_ignorados",
                "liquidacoes_futuras_ignoradas", "aging", "abertos", "projetos", "consolidado",
                "recomendacoes")},
            "simulacao": {"parametros": cfo_sim.to_strings(p),
                          "difere_da_base": p != cfo_sim.BASE,
                          "rascunho_invalido": invalid, "atualizado_em": updated,
                          "projetos": sim},
            "escopo": [{"etapa": n, "descricao": d, "status": s}
                       for n, d, s in getattr(eng, "ESCOPO", ())],
            "pendencias": list(getattr(eng, "PENDENCIAS", ())),
            "convencoes": list(getattr(eng, "CONVENCOES", ())),
        })
