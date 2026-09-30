"""Vigia (sistema vivo): orcamento salvo -> avisos do CFO. Somente dados TESTE.
Valores esperados calculados a mao a partir da Politica V1 (provisao 2% da RL)."""
import copy
import unittest
from decimal import Decimal

from support import PORTAL  # noqa: F401  (ajusta sys.path)

from veosportal import cfo_controls as cc
from veosportal import vigia

D = Decimal

BASE = {
    "id": "ORC-TESTE-001", "ambiente": "TESTE", "vendedor": "Vendedor TESTE",
    "itens": [
        {"codigo": "CENTRAL", "quantidade": "2", "preco_unitario": "50000.00",
         "custo_unitario": "25000.00"},
        {"codigo": "REDE", "quantidade": "1", "preco_unitario": "20000.00",
         "custo_unitario": "12000.00"},
    ],
    "valor_total_informado": "120000.00", "impostos": "12000.00",
}


def orc(**mud):
    o = copy.deepcopy(BASE)
    o.update(mud)
    return o


def codigos(r):
    return [a["codigo"] for a in r["avisos"]]


class VigiaOrcamentoTests(unittest.TestCase):
    def test_orcamento_saudavel_passa(self):
        r = vigia.avaliar_orcamento(orc())
        # RL 108000; custos 62000; risco 2160; MC 43840 -> 40,59% VERDE
        self.assertEqual(r["resumo"]["margem_pct"], D("40.59"))
        self.assertEqual(r["resumo"]["faixa_margem"], "VERDE")
        self.assertEqual(r["situacao"], "OK")
        self.assertEqual(codigos(r), ["ORC_MARGEM"])
        self.assertEqual(r["lacunas"], [])

    def test_total_que_nao_fecha_bloqueia_envio(self):
        r = vigia.avaliar_orcamento(orc(valor_total_informado="125000.00"))
        self.assertEqual(r["situacao"], "BLOQUEAR_ENVIO")
        self.assertEqual(r["avisos"][0]["codigo"], "ORC_TOTAL_DIVERGENTE")
        self.assertEqual(r["avisos"][0]["diretor"], "CFO")
        self.assertIn("5000.00", r["avisos"][0]["mensagem"])

    def test_margem_abaixo_do_piso_exige_aprovacao_extraordinaria(self):
        o = orc()
        o["itens"][0]["custo_unitario"] = "40000.00"
        r = vigia.avaliar_orcamento(o)
        # custos 92000; MC 13840 -> 12,81% NAO APROVADO
        self.assertEqual(r["resumo"]["margem_pct"], D("12.81"))
        self.assertEqual(r["resumo"]["alcada"], "EXTRAORDINARIA")
        self.assertEqual(r["situacao"], "BLOQUEAR_ENVIO")
        self.assertIn("ORC_ALCADA", codigos(r))

    def test_desconto_acima_de_2_pct_exige_direcao(self):
        r = vigia.avaliar_orcamento(orc(desconto_valor="3600.00"))
        # RL 104400; risco 2088; MC 40312 -> 38,61%; desconto 3% -> DIRECAO
        self.assertEqual(r["resumo"]["desconto_pct"], D("3.00"))
        self.assertEqual(r["resumo"]["alcada"], "DIRECAO")
        self.assertEqual(r["situacao"], "REVISAR")

    def test_custo_ausente_vira_lacuna_nunca_zero(self):
        o = orc()
        o["itens"][1]["custo_unitario"] = None
        r = vigia.avaliar_orcamento(o)
        self.assertIsNone(r["resumo"]["margem_pct"])
        self.assertTrue(any("REDE" in l for l in r["lacunas"]))
        self.assertEqual(r["situacao"], "REVISAR")
        self.assertNotIn("ORC_MARGEM", codigos(r))

    def test_impostos_ausentes_viram_lacuna(self):
        o = orc()
        del o["impostos"]
        r = vigia.avaliar_orcamento(o)
        self.assertIsNone(r["resumo"]["margem_pct"])
        self.assertTrue(any("Impostos" in l for l in r["lacunas"]))

    def test_item_abaixo_do_custo(self):
        o = orc()
        o["itens"][1]["preco_unitario"] = "10000.00"
        o["valor_total_informado"] = "110000.00"
        r = vigia.avaliar_orcamento(o)
        self.assertIn("ORC_ITEM_ABAIXO_CUSTO", codigos(r))

    def test_ticket_abaixo_do_desejado_alerta_sem_bloquear(self):
        o = orc(itens=[{"codigo": "KIT", "quantidade": "1", "preco_unitario": "50000.00",
                        "custo_unitario": "20000.00"}],
                valor_total_informado="50000.00", impostos="5000.00")
        r = vigia.avaliar_orcamento(o)
        self.assertIn("ORC_TICKET", codigos(r))
        self.assertEqual(r["situacao"], "OK")  # ticket e meta, nao bloqueio (V1 sec.2)
        o["justificativas_ticket"] = ["cliente_recorrente"]
        self.assertNotIn("ORC_TICKET", codigos(vigia.avaliar_orcamento(o)))

    def test_somente_teste_habilitado(self):
        with self.assertRaises(cc.ControlError):
            vigia.avaliar_orcamento(orc(ambiente="PRODUCAO"))
        with self.assertRaises(cc.ControlError):
            vigia.avaliar_orcamento(orc(id="ORC-REAL-001"))

    def test_entrada_invalida_e_recusada(self):
        for ruim in (orc(itens=[]), orc(campo_extra="x"),
                     orc(itens=[{"codigo": "X", "quantidade": "0", "preco_unitario": "1.00"}])):
            with self.assertRaises(cc.ControlError):
                vigia.avaliar_orcamento(ruim)


if __name__ == "__main__":
    unittest.main()
