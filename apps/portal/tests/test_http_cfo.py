"""Rotas HTTP da camada CFO, decisoes, integracoes e contexto VOICE_360.
Provedor simulado; integracoes sem executavel (nenhum Claude Code/Zoho real)."""
import http.client
import json
import threading
import time
import unittest
from decimal import Decimal

from support import MockProvider, SyncExecutor

from veosportal.app import build_server
from veosportal.config import Config
from veosportal.integrations import IntegrationService
from veosportal.store import Store

DESCONTO = {"valor_bruto": "100000.00", "desconto_pct": "3", "impostos_sem_desconto": "10000.00",
            "impostos_com_desconto": "9700.00", "custos_diretos": "50000.00"}


class HttpCfoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        store = Store(":memory:")
        integ = IntegrationService(store, None, ".", executor=SyncExecutor())
        cls.server = build_server(Config(port=0), provider=MockProvider(), store=store,
                                  integrations=integ)
        cls.port = cls.server.server_address[1]
        cls.host = f"127.0.0.1:{cls.port}"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.csrf = cls.call("GET", "/api/session")[1]["csrf"]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.orch.shutdown()
        cls.server.integrations.shutdown()
        cls.server.server_close()

    @classmethod
    def call(cls, method, path, body=None, csrf=True):
        conn = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=10)
        h = {"Host": cls.host}
        if method != "GET":
            h.update({"Origin": f"http://{cls.host}", "Content-Type": "application/json"})
            if csrf:
                h["X-VEOS-CSRF"] = cls.csrf
        conn.request(method, path, body=json.dumps(body).encode() if body is not None else None,
                     headers=h)
        resp = conn.getresponse()
        raw = resp.read()
        conn.close()
        return resp.status, json.loads(raw)

    def wait_job(self, jid):
        for _ in range(100):
            st, job = self.call("GET", f"/api/jobs/{jid}")
            if job["status"] in ("done", "failed"):
                return job
            time.sleep(0.05)
        self.fail("job nao terminou")

    def test_briefing_and_indicators(self):
        st, b = self.call("GET", "/api/cfo/briefing")
        self.assertEqual(st, 200)
        self.assertTrue(b["sintetico"])
        self.assertEqual((b["periodo"], b["status_geral"]), ("2026-09", "CRITICO"))
        self.assertTrue(b["prioridade"]["evidencias"])
        self.assertEqual(self.call("GET", "/api/cfo/briefing?periodo=2026-07")[0], 400)
        st, ind = self.call("GET", "/api/cfo/indicadores?periodo=2026-09")
        self.assertEqual(st, 200)
        by = {i["id"]: i for i in ind["indicadores"]}
        self.assertEqual(len(by), 15)
        self.assertEqual(by["faturamento"]["valor"], "131000.00")
        self.assertIsNone(by["ticket_medio"]["valor"])
        self.assertEqual(by["mc_consolidada"]["comparacao"]["status"], "OK")

    def test_vigia_orcamento_route(self):
        orc = {"id": "ORC-TESTE-HTTP", "ambiente": "TESTE", "impostos": "12000.00",
               "valor_total_informado": "125000.00",
               "itens": [{"codigo": "CENTRAL", "quantidade": "2", "preco_unitario": "50000.00",
                          "custo_unitario": "25000.00"},
                         {"codigo": "REDE", "quantidade": "1", "preco_unitario": "20000.00",
                          "custo_unitario": "12000.00"}]}
        st, r = self.call("POST", "/api/vigia/orcamento", {"entrada": orc})
        self.assertEqual(st, 200)
        self.assertEqual(r["situacao"], "BLOQUEAR_ENVIO")
        self.assertEqual(r["avisos"][0]["codigo"], "ORC_TOTAL_DIVERGENTE")
        self.assertEqual(r["resumo"]["soma_itens"], "120000.00")
        self.assertEqual(self.call("POST", "/api/vigia/orcamento", {"entrada": orc},
                                   csrf=False)[0], 403)
        self.assertEqual(self.call("POST", "/api/vigia/orcamento",
                                   {"entrada": {**orc, "ambiente": "PRODUCAO"}})[0], 400)

    def test_controls_are_pure_calculation_behind_csrf(self):
        st, r = self.call("POST", "/api/cfo/controles/desconto", {"entrada": DESCONTO})
        self.assertEqual(st, 200)
        self.assertEqual(r["resultado"]["alcada"]["nivel"], "DIRECAO")
        self.assertEqual(self.call("POST", "/api/cfo/controles/desconto", {"entrada": DESCONTO},
                                   csrf=False)[0], 403)
        self.assertEqual(self.call("POST", "/api/cfo/controles/pagamento", {"entrada": {}})[0], 400)
        self.assertEqual(self.call("POST", "/api/cfo/controles/ticket", {})[0], 400)
        st, r = self.call("POST", "/api/cfo/controles/reserva", {"entrada": {"janela_meses": 5}})
        self.assertEqual((st, r["resultado"]["situacao"]), (200, "DESCONHECIDA"))
        st, f = self.call("GET", "/api/cfo/formularios")
        st2, r = self.call("POST", "/api/cfo/controles/fases", {"entrada": f["fases_exemplo"]})
        self.assertEqual(st2, 200)
        self.assertFalse(r["resultado"]["compra_aprovada"])
        self.assertEqual(self.call("GET", "/api/cfo/decisoes")[1]["decisoes"], [])  # nada gravado

    def test_methodology_draft_roundtrip(self):
        st, pl = self.call("PUT", "/api/cfo/metodologias", {"rascunho": {"reserva_janela_meses": 4}})
        self.assertEqual((st, pl["status"]), (200, "RASCUNHO NAO OFICIAL"))
        st, b = self.call("GET", "/api/cfo/briefing")
        self.assertEqual(Decimal(b["reserva"]["base_mensal"]), Decimal("20750"))
        self.assertEqual(self.call("PUT", "/api/cfo/metodologias",
                                   {"rascunho": {"reserva_metodo": "moda"}})[0], 400)
        st, pl = self.call("DELETE", "/api/cfo/metodologias", {})
        self.assertEqual(pl["rascunho"]["reserva_janela_meses"], 3)

    def test_decisions_require_explicit_confirmation(self):
        base = {"tipo": "desconto", "entrada": DESCONTO, "estado": "proposto",
                "assunto": "Desconto TESTE", "motivo": "Avaliar TESTE", "autor_declarado": "Usuario TESTE"}
        self.assertEqual(self.call("POST", "/api/cfo/decisoes", base)[0], 400)
        st, ev = self.call("POST", "/api/cfo/decisoes", {**base, "confirmacao": True})
        self.assertEqual(st, 201)
        self.assertEqual(ev["autoria"], "declarada-nao-autenticada")
        st, lst = self.call("GET", "/api/cfo/decisoes")
        self.assertTrue(lst["integridade"]["ok"])
        self.assertGreaterEqual(len(lst["decisoes"]), 1)

    def test_integrations_state_and_failed_checks(self):
        st, pl = self.call("GET", "/api/integracoes")
        self.assertEqual(st, 200)
        self.assertEqual(len(pl["apps"]), 61)
        self.assertEqual(self.call("POST", "/api/integracoes/probe", {"probe": "mail"})[0], 400)
        st, r = self.call("POST", "/api/integracoes/probe", {"probe": "books"})
        self.assertEqual(st, 202)
        job = self.wait_job(r["job"])
        self.assertEqual(job["status"], "failed")  # sem executavel: erro, nunca zero
        self.assertIn("nao encontrado", job["error"])
        st, pl = self.call("GET", "/api/integracoes")
        books = next(a for a in pl["apps"] if a["nome"] == "Books")
        self.assertEqual(books["estados"]["leitura"], "ERRO")
        st, r = self.call("POST", "/api/integracoes/health", {})
        self.assertEqual(self.wait_job(r["job"])["status"], "failed")
        self.assertEqual(self.call("POST", "/api/integracoes/health", {}, csrf=False)[0], 403)

    def test_voice360_context_and_status(self):
        st, c = self.call("GET", "/api/voice360")
        self.assertEqual(st, 200)
        self.assertEqual(len(c["politicas"]), 2)
        self.assertIn("RASCUNHO", c["consolidacao"]["status"])
        st, s = self.call("GET", "/api/status")
        self.assertTrue(s["cfo_controles"]["disponivel"])


if __name__ == "__main__":
    unittest.main()
