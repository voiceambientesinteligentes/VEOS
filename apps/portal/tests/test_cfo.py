import unittest
from datetime import date
from decimal import Decimal

from support import PORTAL  # noqa: F401  (ajusta sys.path)

from veosportal import cfo_sim
from veosportal.cfo_bridge import CFOBridge, CFOUnavailable
from veosportal.config import Config
from veosportal.store import Store

D = Decimal


class SettingsValidationTests(unittest.TestCase):
    def test_defaults_are_official_base(self):
        self.assertEqual(cfo_sim.validate({}), cfo_sim.BASE)

    def test_accepts_comma_and_string(self):
        p = cfo_sim.validate({"risco_pct": "2,5"})
        self.assertEqual(p["risco_pct"], D("2.5"))

    def test_rejects_float_like_garbage_and_bool(self):
        for bad in ("abc", "1.234", "-1", "", True, 2.5, None):
            with self.assertRaises(cfo_sim.SettingsError, msg=repr(bad)):
                cfo_sim.validate({"risco_pct": bad})

    def test_range(self):
        with self.assertRaises(cfo_sim.SettingsError):
            cfo_sim.validate({"risco_pct": "21"})
        with self.assertRaises(cfo_sim.SettingsError):
            cfo_sim.validate({"limiar_exposicao_pct": "101"})

    def test_target_not_below_minimum(self):
        with self.assertRaises(cfo_sim.SettingsError):
            cfo_sim.validate({"margem_alvo_pct": "20"})  # alvo < minima (25)
        with self.assertRaises(cfo_sim.SettingsError):
            cfo_sim.validate({"margem_aceitavel_pct": "36"})  # aceitavel > alvo (35)
        cfo_sim.validate({"margem_minima_pct": "30", "margem_aceitavel_pct": "30",
                          "margem_alvo_pct": "30"})

    def test_unknown_key(self):
        with self.assertRaises(cfo_sim.SettingsError):
            cfo_sim.validate({"desconto_pct": "1"})


class SimulationMathTests(unittest.TestCase):
    def test_margin_and_band_with_override(self):
        p = cfo_sim.validate({"risco_pct": "5"})
        r = cfo_sim.risco(D("1000.00"), p)
        self.assertEqual(r, D("50.00"))
        m = cfo_sim.margem(D("1000.00"), D("600.00"), r, p)
        self.assertEqual(m["mc"], D("350.00"))
        self.assertEqual(m["pct"], D("35"))
        self.assertEqual(m["faixa"], "VERDE")

    def test_risk_rounding_half_up(self):
        p = cfo_sim.validate({"risco_pct": "2.5"})
        self.assertEqual(cfo_sim.risco(D("0.30"), p), D("0.01"))  # 0.0075 -> 0.01

    def test_exposure_trigger_is_strictly_above(self):
        p = cfo_sim.validate({})
        self.assertEqual(cfo_sim.exposicao(D("-10.00"), D("100.00"), p)["gatilho"], "NAO ACIONADO")
        self.assertEqual(cfo_sim.exposicao(D("-10.01"), D("100.00"), p)["gatilho"], "ACIONADO")
        self.assertTrue(cfo_sim.exposicao(D("-1"), None, p)["gatilho"].startswith("NAO RESOLVIDO"))

    def test_zero_revenue_fails_closed(self):
        p = cfo_sim.validate({})
        self.assertIsNone(cfo_sim.risco(D("0"), p))
        self.assertEqual(cfo_sim.margem(D("0"), D("1"), None, p)["faixa"], "NAO RESOLVIDO")


class BridgeTests(unittest.TestCase):
    """Usa o motor existente (tools/cfo.py) e a fixture sintetica sem altera-los."""

    def setUp(self):
        self.store = Store(":memory:")
        self.bridge = CFOBridge(Config(), self.store)
        try:
            self.eng = self.bridge.engine()
            self.bridge.fixture()
        except CFOUnavailable as e:
            self.skipTest(str(e))

    def test_base_params_reproduce_official(self):
        dados = self.eng.carregar_arquivo(self.bridge.fixture())
        res = self.eng.analisar(dados, date(2026, 9, 28))
        for s in cfo_sim.simulate(res["projetos"], cfo_sim.BASE):
            o, c = s["oficial"], s["cenario"]
            self.assertEqual(o["risco"], c["risco"])
            for k in ("margem_orcada", "margem_realizada"):
                self.assertEqual(o[k]["mc"], c[k]["mc"])
                self.assertEqual(o[k]["pct"], c[k]["pct"])
                self.assertEqual(o[k]["faixa"], c[k]["faixa"])
            self.assertEqual(o["exposicao"]["gatilho"], c["exposicao"]["gatilho"])
            self.assertFalse(s["mudou_classificacao"])

    def test_engine_faixa_matches_base_thresholds(self):
        for v in ("24.99", "25", "29.99", "30", "34.99", "35", "80"):
            self.assertEqual(self.eng.faixa_margem(D(v)), cfo_sim.faixa(D(v), cfo_sim.BASE))

    def test_analysis_payload_is_synthetic_and_separates_official(self):
        self.bridge.save_params({"risco_pct": "10"})
        a = self.bridge.analyze("2026-09-28")
        self.assertTrue(a["sintetico"])
        self.assertIn("TESTE", a["banner"])
        self.assertTrue(a["simulacao"]["difere_da_base"])
        of = {p["id"]: p for p in a["oficial"]["projetos"]}
        for s in a["simulacao"]["projetos"]:
            # oficial continua com provisao de 2%
            rl = D(of[s["id"]]["receita_liquida"])
            self.assertEqual(D(of[s["id"]]["risco"]), (rl * 2 / 100).quantize(D("0.01")))
            self.assertEqual(D(s["cenario"]["risco"]), (rl * 10 / 100).quantize(D("0.01")))
        self.assertTrue(a["pendencias"])
        self.assertTrue(any(e["status"] == "NAO INICIADO" for e in a["escopo"]))

    def test_does_not_read_canonical_sources(self):
        original = self.eng.fontes

        def proibido(*_a, **_k):
            raise AssertionError("fontes canonicas nao devem ser lidas pelo portal")
        self.eng.fontes = proibido
        try:
            self.bridge.analyze("2026-09-28")
        finally:
            self.eng.fontes = original

    def test_invalid_inputs(self):
        for kwargs in ({"as_of": "2026-13-01"}, {"as_of": "2026-09-28", "atraso": "-1"},
                       {"as_of": "2026-09-28", "propostas": "NAO-EXISTE"},
                       {"as_of": "2026-08-01"}):
            with self.assertRaises(ValueError, msg=kwargs):
                self.bridge.analyze(**kwargs)

    def test_params_persist_and_reset(self):
        self.bridge.save_params({"limiar_exposicao_pct": "5"})
        self.assertEqual(self.bridge.params_payload()["rascunho"]["limiar_exposicao_pct"], "5.00")
        self.assertEqual(self.bridge.reset_params()["rascunho"]["limiar_exposicao_pct"], "10.00")

    def test_corrupted_draft_falls_back_to_base(self):
        self.store.put_setting("cfo_simulacao", {"risco_pct": "999"})
        pl = self.bridge.params_payload()
        self.assertEqual(pl["rascunho"]["risco_pct"], "2.00")
        self.assertTrue(pl["rascunho_invalido"])


if __name__ == "__main__":
    unittest.main()
