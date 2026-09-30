"""Camada de controles CFO: limites financeiros, alocacao, ausencias e indicadores.
Usa SOMENTE a base TESTE engine/fixtures/cfo-controles-TESTE.json."""
import copy
import hashlib
import json
import unittest
from decimal import Decimal

from support import PORTAL

from veosportal import cfo_controls as cc
from veosportal import cfo_indicadores as ci

D = Decimal
FX_PATH = PORTAL / "engine" / "fixtures" / "cfo-controles-TESTE.json"
CFG = dict(cc.METODO_BASE)


def raw():
    return json.loads(FX_PATH.read_text(encoding="utf-8"))


def load(d=None):
    return cc.validar(raw() if d is None else d)


def ind(fx, pid=None, **cfg):
    res = ci.calcular_indicadores(fx, {**CFG, **cfg}, pid)
    return {i["id"]: i for i in res["indicadores"]}, res


def periodo_raw(d, pid):
    return next(p for p in d["periodos"] if p["id"] == pid)


def projeto_raw(p, pid):
    return next(x for x in p["projetos"] if x["id"] == pid)


class FixtureTests(unittest.TestCase):
    def test_original_engine_and_fixture_untouched(self):
        esperado = {"cfo.py": "f29ff096133dbbb14e214eb9758b530454484f629e06af03b9ec0931bcdc5017",
                    "fixtures/cfo-demo.json": "729ef890722364ec2e2f0d92b5b1ae48e830f8b8b87db8c5412f612f8d784b20"}
        for rel, sha in esperado.items():
            raw = (PORTAL / "engine").joinpath(*rel.split("/")).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), sha, rel)

    def test_loads_synthetic_months_in_order(self):
        fx, sha = cc.carregar_arquivo(str(FX_PATH))
        self.assertEqual([p["id"] for p in fx["periodos"]], ["2026-08", "2026-09"])
        self.assertEqual(len(sha), 64)

    def test_rejects_non_test_entity(self):
        d = raw()
        projeto_raw(periodo_raw(d, "2026-09"), "PRJ-TESTE-12")["cliente"] = "Cliente Real"
        with self.assertRaises(cc.ControlError):
            load(d)

    def test_missing_field_is_error_not_zero(self):
        d = raw()
        del projeto_raw(periodo_raw(d, "2026-09"), "PRJ-TESTE-12")["compromissos"]
        with self.assertRaisesRegex(cc.ControlError, "ausente"):
            load(d)

    def test_rejects_float_money_and_sintetico_false(self):
        d = raw()
        periodo_raw(d, "2026-09")["caixa_livre"] = 55000.0
        with self.assertRaises(cc.ControlError):
            load(d)
        d = raw()
        d["sintetico"] = False
        with self.assertRaises(cc.ControlError):
            load(d)

    def test_rejects_duplicate_key_and_nan(self):
        with self.assertRaises(cc.ControlError):
            cc.carregar_bytes(b'{"formato": 1, "formato": 2}')
        with self.assertRaises(cc.ControlError):
            cc.carregar_bytes(b'{"x": NaN}')

    def test_rejects_overpayment_and_receipt_after_period(self):
        d = raw()
        f = periodo_raw(d, "2026-09")["faturas"][4]
        f["recebimentos"] = [{"id": "RC-X", "data": "2026-09-21", "valor": "20000.01"}]
        with self.assertRaisesRegex(cc.ControlError, "excedem"):
            load(d)
        d = raw()
        f = periodo_raw(d, "2026-09")["faturas"][4]
        f["recebimentos"] = [{"id": "RC-X", "data": "2026-10-01", "valor": "100.00"}]
        with self.assertRaisesRegex(cc.ControlError, "posterior"):
            load(d)


class TicketTests(unittest.TestCase):
    def test_below_desired_is_not_a_block(self):
        r = cc.avaliar_ticket({"valor_contrato": "99999.99"})
        self.assertTrue(r["abaixo_do_desejado"])
        self.assertFalse(r["bloqueio"])
        self.assertTrue(r["registro_exigido"])
        self.assertIn("SEM JUSTIFICATIVA", r["situacao"])
        self.assertEqual(cc.avaliar_ticket({"valor_contrato": "100000.00"})["situacao"],
                         "ATINGE O TICKET DESEJADO")

    def test_justified_exception_does_not_reduce_margin(self):
        r = cc.avaliar_ticket({"valor_contrato": "60000.00", "justificativas": ["cliente_recorrente"],
                               "margem_pct": "28"})
        self.assertIn("EXCECAO JUSTIFICADA", r["situacao"])
        self.assertFalse(r["margem_exigida"]["reduzida_pela_excecao"])
        self.assertEqual(r["margem_exigida"]["normal_pct"], D("30"))
        self.assertEqual(r["faixa_margem"], "ATENCAO")

    def test_margin_above_target_justification_must_be_consistent(self):
        r = cc.avaliar_ticket({"valor_contrato": "60000.00", "justificativas": ["margem_superior_meta"],
                               "margem_pct": "30"})
        self.assertIn("INCONSISTENTE", r["situacao"])
        ok = cc.avaliar_ticket({"valor_contrato": "60000.00",
                                "justificativas": ["margem_superior_meta"], "margem_pct": "38"})
        self.assertIn("EXCECAO JUSTIFICADA", ok["situacao"])

    def test_invalid_inputs(self):
        for bad in ({"valor_contrato": "0.00"}, {"valor_contrato": 1000},
                    {"valor_contrato": "1000.00", "justificativas": ["amizade"]},
                    {"valor_contrato": "1000.00", "justificativas": ["cliente_recorrente"] * 2},
                    {"valor_contrato": "1000.00", "extra": 1}):
            with self.assertRaises(cc.ControlError, msg=bad):
                cc.avaliar_ticket(bad)


def desc(custos, desconto_valor=None, desconto_pct=None, imp_com="9800.00", imp_sem="10000.00",
         bruto="100000.00"):
    e = {"valor_bruto": bruto, "impostos_sem_desconto": imp_sem, "impostos_com_desconto": imp_com,
         "custos_diretos": custos}
    if desconto_valor is not None:
        e["desconto_valor"] = desconto_valor
    if desconto_pct is not None:
        e["desconto_pct"] = desconto_pct
    return cc.simular_desconto(e)


class DescontoTests(unittest.TestCase):
    def test_recalculates_rl_mc_and_provision_once(self):
        r = desc("50000.00", desconto_pct="2")
        self.assertEqual(r["desconto_valor"], D("2000.00"))
        self.assertEqual(r["antes"]["rl"], D("90000.00"))
        self.assertEqual(r["antes"]["risco"], D("1800.00"))
        self.assertEqual(r["depois"]["rl"], D("88200.00"))   # imposto informado, nao proporcional
        self.assertEqual(r["depois"]["risco"], D("1764.00"))  # 2% da nova RL, uma vez
        self.assertEqual(r["depois"]["mc"], D("36436.00"))
        self.assertEqual(r["delta_mc"], D("-1764.00"))
        self.assertEqual(r["alcada"]["nivel"], "AUTONOMIA COMERCIAL")
        self.assertTrue(any("CONVENCAO DE SIMULACAO" in c for c in r["convencoes"]))

    def test_boundary_two_percent_and_mc_exactly_32(self):
        r = desc("59268.00", desconto_valor="2000.00", imp_com="8200.00")
        self.assertEqual(r["desconto_pct"], D("2"))
        self.assertEqual(r["depois"]["pct"], D("32"))
        self.assertEqual(r["alcada"]["nivel"], "AUTONOMIA COMERCIAL")
        self.assertTrue(r["alcada"]["autonomia_comercial"])

    def test_mc_30_to_31_99_with_small_discount_is_unresolved(self):
        r = desc("59500.00", desconto_valor="1000.00", imp_com="9900.00")
        self.assertTrue(D("30") <= r["depois"]["pct"] < D("32"))
        self.assertEqual(r["alcada"]["nivel"], "NAO RESOLVIDO")
        self.assertFalse(r["alcada"]["autonomia_comercial"])

    def test_above_two_up_to_five_needs_direction(self):
        self.assertEqual(desc("40000.00", desconto_valor="2010.00", imp_com="9799.00")["alcada"]["nivel"],
                         "DIRECAO")
        self.assertEqual(desc("40000.00", desconto_pct="5", imp_com="9500.00")["alcada"]["nivel"], "DIRECAO")

    def test_above_five_is_exceptional(self):
        r = desc("40000.00", desconto_pct="5.01", imp_com="9499.00")
        self.assertEqual(r["alcada"]["nivel"], "EXCEPCIONAL - NOVA ANALISE INTEGRAL")

    def test_any_mc_below_30_needs_direction_and_below_25_is_extraordinary(self):
        r = desc("62400.00", desconto_valor="1000.00", imp_com="9900.00")
        self.assertLess(r["depois"]["pct"], D("30"))
        self.assertEqual(r["alcada"]["nivel"], "DIRECAO")
        r = desc("66000.00", desconto_valor="1000.00", imp_com="9900.00")
        self.assertLess(r["depois"]["pct"], D("25"))
        self.assertEqual(r["alcada"]["nivel"], "EXTRAORDINARIA")
        r = desc("66000.00", desconto_pct="6", imp_com="9400.00")
        self.assertEqual(r["alcada"]["nivel"], "EXTRAORDINARIA")
        self.assertEqual(len(r["alcada"]["exigencias"]), 3)

    def test_pct_mode_keeps_entered_percentage(self):
        r = desc("10000.00", desconto_pct="2", bruto="33333.33", imp_sem="3333.33", imp_com="3266.66")
        self.assertEqual(r["desconto_valor"], D("666.67"))
        self.assertEqual(r["desconto_pct"], D("2"))

    def test_validation(self):
        with self.assertRaises(cc.ControlError):
            desc("1.00")  # nenhum desconto informado
        with self.assertRaises(cc.ControlError):
            desc("1.00", desconto_valor="1.00", desconto_pct="1")
        with self.assertRaises(cc.ControlError):
            desc("1.00", desconto_valor="100000.01")
        with self.assertRaises(cc.ControlError):
            desc("1.00", desconto_pct="101")

    def test_zero_revenue_fails_closed(self):
        r = desc("1.00", desconto_valor="0.00", imp_sem="100000.00", imp_com="100000.00")
        self.assertIsNone(r["depois"]["pct"])
        self.assertEqual(r["alcada"]["nivel"], "NAO RESOLVIDO")


class FasesTests(unittest.TestCase):
    def setUp(self):
        self.fx = load()
        self.ex = copy.deepcopy(self.fx["fases_exemplo"])

    def test_example_coverage_uses_only_effective_receipts(self):
        r = cc.avaliar_fases(self.ex, self.fx)
        f = {x["id"]: x for x in r["fases"]}
        self.assertTrue(f["F1"]["atual"]["cobre"])
        self.assertEqual(f["F2"]["coberto_recebido_efetivo"], D("74000.00"))
        self.assertTrue(f["F2"]["atual"]["cobre"])
        self.assertFalse(f["F2"]["proposta"]["cobre"])
        self.assertEqual(f["F2"]["proposta"]["deficit"], D("24500.00"))
        self.assertEqual(f["F3"]["atual"]["deficit"], D("8000.00"))
        self.assertIsNone(f["F3"]["proposta"])
        self.assertEqual(r["a_receber_nao_conta"], D("25000.00"))
        self.assertEqual(r["nao_alocado"], D("0.00"))
        self.assertFalse(r["compra_aprovada"])
        self.assertEqual([x["referencia_valor"] for x in r["fases"]],
                         [D("75000.00"), D("60000.00"), D("15000.00")])
        self.assertEqual([x["referencia_cobre_necessidade"] for x in r["fases"]], [True, False, True])

    def test_same_receipt_cannot_be_reused_across_phases(self):
        self.ex["alocacoes"] = [{"fase": "F1", "recebimento": "RC-TESTE-10-1-1", "valor": "60000.00"},
                                {"fase": "F2", "recebimento": "RC-TESTE-10-1-1", "valor": "20000.00"}]
        with self.assertRaisesRegex(cc.ControlError, "reutilizacao"):
            cc.avaliar_fases(self.ex, self.fx)

    def test_future_receivable_does_not_count(self):
        self.ex["alocacoes"] = [{"fase": "F1", "recebimento": "F-TESTE-10-2", "valor": "1000.00"}]
        with self.assertRaisesRegex(cc.ControlError, "a receber futuro"):
            cc.avaliar_fases(self.ex, self.fx)

    def test_duplicate_pair_unknown_phase_and_other_project_receipt(self):
        self.ex["alocacoes"] = [{"fase": "F1", "recebimento": "RC-TESTE-10-1-1", "valor": "1.00"}] * 2
        with self.assertRaises(cc.ControlError):
            cc.avaliar_fases(self.ex, self.fx)
        self.ex["alocacoes"] = [{"fase": "F9", "recebimento": "RC-TESTE-10-1-1", "valor": "1.00"}]
        with self.assertRaises(cc.ControlError):
            cc.avaliar_fases(self.ex, self.fx)
        self.ex["alocacoes"] = [{"fase": "F1", "recebimento": "RC-TESTE-12-1-1", "valor": "1.00"}]
        with self.assertRaises(cc.ControlError):
            cc.avaliar_fases(self.ex, self.fx)

    def test_reference_is_editable_but_must_sum_100(self):
        self.ex["referencia_pct"] = ["40", "40", "20"]
        r = cc.avaliar_fases(self.ex, self.fx)
        self.assertEqual(r["fases"][0]["referencia_valor"], D("60000.00"))
        self.ex["referencia_pct"] = ["50", "40", "5"]
        with self.assertRaisesRegex(cc.ControlError, "100"):
            cc.avaliar_fases(self.ex, self.fx)

    def test_contract_absent_reference_is_null(self):
        e = {"projeto": "PRJ-TESTE-14", "fases": [{"id": "A", "nome": "x", "custos": "0.00",
                                                     "encargos": "0.00"}], "alocacoes": []}
        r = cc.avaliar_fases(e, self.fx)
        self.assertIsNone(r["fases"][0]["referencia_valor"])
        self.assertTrue(r["fases"][0]["atual"]["cobre"])  # necessidade zero


class ReservaTests(unittest.TestCase):
    def setUp(self):
        self.fx = load()

    def res(self, pid=None, livre=None, **cfg):
        return cc.avaliar_reserva(self.fx, cc.validar_metodologia(cfg), pid, livre)

    def test_default_draft_three_complete_months(self):
        r = self.res()
        self.assertEqual([m["mes"] for m in r["meses"]], ["2026-06", "2026-07", "2026-08"])
        self.assertEqual(r["base_mensal"], D("21000"))
        self.assertEqual(r["meta_valor"], D("63000"))
        self.assertEqual(r["situacao"], "ABAIXO DA META")
        self.assertEqual(r["deficit"], D("8000"))
        self.assertFalse(r["restrito_conta_na_reserva"])
        self.assertEqual(r["origem"]["janela"], cc.RASCUNHO)

    def test_window_and_method_are_configurable(self):
        r = self.res(reserva_janela_meses=4)
        self.assertEqual((r["base_mensal"], r["meta_valor"]), (D("20750"), D("62250")))
        r = self.res(reserva_janela_meses=4, reserva_metodo="mediana")
        self.assertEqual((r["base_mensal"], r["meta_valor"]), (D("20500"), D("61500")))

    def test_absent_history_is_unknown_not_zero(self):
        r = self.res(reserva_janela_meses=5)
        self.assertEqual(r["situacao"], "DESCONHECIDA")
        self.assertIsNone(r["base_mensal"])
        self.assertIsNone(r["meta_valor"])
        self.assertIn("2026-04", r["lacuna"])
        r = self.res(reserva_janela_meses=7)
        self.assertEqual(r["meses"][0]["situacao"], "SEM REGISTRO")

    def test_other_period_and_free_cash_override(self):
        self.assertEqual(self.res("2026-08")["situacao"], "ATINGIDA")
        self.assertEqual(self.res(livre="63000.00")["situacao"], "ATINGIDA")
        with self.assertRaises(cc.ControlError):
            self.res(livre="-1")

    def test_methodology_validation(self):
        for bad in ({"reserva_janela_meses": 0}, {"reserva_janela_meses": 25},
                    {"reserva_janela_meses": True}, {"reserva_metodo": "moda"},
                    {"inadimplencia_base": "caixa"}, {"desconhecido": 1}):
            with self.assertRaises(cc.ControlError, msg=bad):
                cc.validar_metodologia(bad)
        self.assertEqual(cc.validar_metodologia({"reserva_janela_meses": "6"})["reserva_janela_meses"], 6)


class IndicadoresTests(unittest.TestCase):
    def setUp(self):
        self.fx = load()

    def test_fifteen_indicators_with_full_metadata(self):
        by, res = ind(self.fx)
        self.assertEqual(len(by), 15)
        for i in by.values():
            for k in ("valor", "metodologia", "data", "fonte", "status", "origem", "comparacao"):
                self.assertIn(k, i, i["id"])
            self.assertIn(i["origem"], (cc.POLITICA, cc.CONVENCAO, cc.RASCUNHO))
            if i["valor"] is None and i["unidade"] != "lista":
                self.assertEqual(i["status"], "INDISPONIVEL")
                self.assertTrue(i["lacuna"], i["id"])
        self.assertEqual(res["anterior"], "2026-08")

    def test_values_september(self):
        by, _ = ind(self.fx)
        v = lambda k: by[k]["valor"]  # noqa: E731
        self.assertEqual(v("faturamento"), D("131000.00"))
        self.assertEqual(v("receita_liquida"), D("144000.00"))
        self.assertEqual(v("mc_consolidada"), D("54120.00") * 100 / D("144000.00"))
        self.assertEqual(v("margem_operacional"), D("23"))
        self.assertIsNone(v("ticket_medio"))
        self.assertIn("PRJ-TESTE-14", by["ticket_medio"]["lacuna"])
        self.assertEqual(v("pmr"), D("865000") / D("65000"))
        self.assertEqual(v("inadimplencia"), D("45000.00") * 100 / D("131000.00"))
        self.assertEqual(by["inadimplencia"]["meta"]["situacao"], "ACIMA DA META")
        self.assertEqual(v("contas_receber"), D("111000.00"))
        self.assertEqual(v("contas_pagar"), D("130000.00"))
        self.assertEqual(v("exposicao_projeto"), D("59000.00"))
        self.assertEqual(by["exposicao_projeto"]["extra"], {"acionados": 2, "nao_resolvidos": 1})
        self.assertEqual(v("necessidade_caixa"), D("9000.00"))
        self.assertEqual([x["necessidade"] for x in by["necessidade_caixa"]["itens"]],
                         [D("0"), D("9000.00"), D("9000.00")])
        self.assertEqual(by["necessidade_caixa"]["extra"]["receber_vencido_nao_projetado"], D("45000.00"))
        self.assertEqual(v("concentracao_cliente"), D("81000.00") * 100 / D("131000.00"))
        self.assertEqual(v("concentracao_parceiro"), D("81000.00") * 100 / D("131000.00"))
        self.assertEqual(v("carteira_abaixo_30"), D("50000.00") * 100 / D("131000.00"))
        self.assertEqual(by["carteira_abaixo_30"]["meta"]["situacao"], "ACIMA DO LIMITE")

    def test_exposure_exactly_ten_percent_does_not_trigger(self):
        by, _ = ind(self.fx, "2026-08")
        p1 = next(x for x in by["exposicao_projeto"]["itens"] if x["projeto"] == "PRJ-TESTE-10")
        self.assertEqual(p1["pct"], D("10"))
        self.assertEqual(p1["gatilho"], "NAO ACIONADO")
        by, _ = ind(self.fx)
        p5 = next(x for x in by["exposicao_projeto"]["itens"] if x["projeto"] == "PRJ-TESTE-14")
        self.assertTrue(p5["gatilho"].startswith("NAO RESOLVIDO"))
        self.assertIsNone(p5["pct"])

    def test_period_comparison(self):
        by, _ = ind(self.fx)
        c = by["faturamento"]["comparacao"]
        self.assertEqual(c["delta"], D("-19000.00"))
        self.assertEqual(c["variacao_pct"], D("-19000.00") * 100 / D("150000.00"))
        c = by["mc_consolidada"]["comparacao"]
        self.assertEqual(c["delta_pp"], D("54120.00") * 100 / D("144000.00")
                         - D("72220.00") * 100 / D("189000.00"))
        self.assertNotIn("variacao_pct", c)  # margem compara em p.p.
        c = by["necessidade_caixa"]["comparacao"]
        self.assertIsNone(c["variacao_pct"])
        self.assertIn("anterior zero", c["motivo_variacao"])
        self.assertEqual(by["ticket_medio"]["comparacao"]["status"], "INDISPONIVEL")
        itens = {x["projeto"]: x for x in by["mc_projeto"]["itens"]}
        self.assertEqual(itens["PRJ-TESTE-10"]["delta_pp"], D("0"))
        self.assertIsNone(itens["PRJ-TESTE-12"]["delta_pp"])

    def test_without_baseline_comparison_is_unavailable(self):
        by, res = ind(self.fx, "2026-08")
        self.assertIsNone(res["anterior"])
        self.assertTrue(all(i["comparacao"]["status"] == "INDISPONIVEL" for i in by.values()))
        self.assertEqual(by["ticket_medio"]["valor"], D("105000.00"))

    def test_zero_denominators_become_null(self):
        d = raw()
        periodo_raw(d, "2026-08")["faturas"] = []
        by, _ = ind(load(d), "2026-08")
        self.assertEqual(by["faturamento"]["valor"], D("0"))
        for k in ("concentracao_cliente", "concentracao_parceiro", "carteira_abaixo_30",
                  "inadimplencia", "pmr"):
            self.assertIsNone(by[k]["valor"], k)
            self.assertTrue(by[k]["lacuna"], k)

    def test_missing_partner_and_fixed_cost_are_gaps(self):
        d = raw()
        del projeto_raw(periodo_raw(d, "2026-09"), "PRJ-TESTE-13")["parceiro"]
        next(c for c in d["custos_fixos_mensais"] if c["mes"] == "2026-09")["valor"] = None
        by, _ = ind(load(d))
        self.assertIsNone(by["concentracao_parceiro"]["valor"])
        self.assertIn("PRJ-TESTE-13", by["concentracao_parceiro"]["lacuna"])
        self.assertIsNone(by["margem_operacional"]["valor"])
        self.assertIn("ausente", by["margem_operacional"]["lacuna"])

    def test_configurable_methodologies(self):
        by, _ = ind(self.fx, inadimplencia_atraso_min_dias=7)
        self.assertEqual(by["inadimplencia"]["valor"], D("20000.00") * 100 / D("131000.00"))
        by, _ = ind(self.fx, inadimplencia_base="receita_liquida")
        self.assertEqual(by["inadimplencia"]["valor"], D("45000.00") * 100 / D("144000.00"))
        by, _ = ind(self.fx, pmr_ponderacao="simples")
        self.assertEqual(by["pmr"]["valor"], D("18.5"))


class BriefingTests(unittest.TestCase):
    def setUp(self):
        self.fx = load()

    def test_priority_evidence_and_gaps(self):
        b = ci.montar_briefing(self.fx, CFG, None, "base TESTE", "a" * 64)
        self.assertEqual(b["status_geral"], "CRITICO")
        self.assertTrue(b["prioridade"]["titulo"].startswith("PRJ-TESTE-10"))
        self.assertTrue(b["prioridade"]["evidencias"])
        self.assertEqual(len(b["tldr"]), 3)
        titulos = " | ".join(r["titulo"] for r in b["riscos"])
        for trecho in ("PRJ-TESTE-13", "Inadimplencia", "Reserva", "abaixo de 30%",
                       "Necessidade de caixa", "PRJ-TESTE-14"):
            self.assertIn(trecho, titulos)
        sev = [r["severidade"] for r in b["riscos"]]
        self.assertEqual(sev, sorted(sev, key=lambda s: 0 if s == "critico" else 1))
        self.assertTrue(any("Ticket" in x for x in b["lacunas"]))
        self.assertTrue(any("Zoho" in x for x in b["apendice"]["fontes_indisponiveis"]))

    def test_previous_month_without_baseline(self):
        b = ci.montar_briefing(self.fx, CFG, "2026-08")
        self.assertEqual(b["status_geral"], "ATENCAO")
        self.assertIn("abaixo de 30%", b["prioridade"]["titulo"])
        self.assertIn("Faturamento", b["comparacao_indisponivel"])
        self.assertIn("sem baseline", b["tldr"][0])

    def test_unknown_period(self):
        with self.assertRaises(cc.ControlError):
            ci.montar_briefing(self.fx, CFG, "2026-07")


if __name__ == "__main__":
    unittest.main()
