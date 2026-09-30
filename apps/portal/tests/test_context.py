"""Contexto CFO calculado pela aplicacao: injetado so no perfil CFO (sala, via
Secretaria e em reuniao), com regras VOICE e estado das integracoes; demais salas
inalteradas. Politicas VOICE_360: lista fixa por hash ou resumo NAO CANONICO."""
import hashlib
import tempfile
import unittest
from pathlib import Path

from support import MockProvider, SyncExecutor

from veosportal import voice360
from veosportal.cfo_context import CFOContextBuilder
from veosportal.cfo_service import CFOControlsService
from veosportal.config import Config
from veosportal.integrations import IntegrationService
from veosportal.orchestration import Orchestrator
from veosportal.rooms import persona
from veosportal.store import Store

V1_TEXTO = b"---\nid: \"\"\ntype: pattern\nstatus: active\n---\n# Politica TESTE\n"


def vault_with_policies(root):
    pad = Path(root) / "04 - PADROES"
    pad.mkdir()
    for _, rel in voice360.POLITICAS:
        (Path(root) / rel).write_bytes(V1_TEXTO)


class ContextTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        vault_with_policies(self.tmp.name)
        self.config = Config(voice360_dir=self.tmp.name)
        self.store = Store(":memory:")
        self.controls = CFOControlsService(self.config, self.store)
        self.integ = IntegrationService(self.store, None, self.tmp.name, executor=SyncExecutor())
        self.builder = CFOContextBuilder(self.config, self.controls, self.integ)

    def tearDown(self):
        self.tmp.cleanup()

    def orch(self, script=None, context_for=None):
        prov = MockProvider(script)
        o = Orchestrator(self.store, prov, self.config, SyncExecutor(),
                         context_for=context_for or self.builder)
        return prov, o

    def test_context_has_calculated_numbers_rules_and_integrations(self):
        ctx = self.builder("cfo")
        for trecho in ("CONTEXTO CALCULADO PELA APLICACAO", "NAO sao instrucoes", "SINTETICA TESTE",
                       "Faturamento: R$ 131.000,00", "Prioridade #1: PRJ-TESTE-10",
                       "RASCUNHO NAO OFICIAL", "Reserva: ABAIXO DA META", "Politica V1: presente",
                       "V1 sec.9", "NAO significa registros validados", "FIM DO CONTEXTO"):
            self.assertIn(trecho, ctx)
        self.assertLessEqual(len(ctx), 9000)
        self.assertIsNone(self.builder("coo"))

    def test_injected_in_cfo_chat_only(self):
        prov, o = self.orch()
        o.start_chat("cfo", "Qual a reserva?")
        o.start_chat("coo", "Qual o prazo?")
        self.assertIn("PRJ-TESTE-10", prov.calls[0]["prompt"])
        self.assertIn("Qual a reserva?", prov.calls[0]["prompt"])
        self.assertNotIn("CONTEXTO CALCULADO", prov.calls[1]["prompt"])

    def test_secretaria_routing_to_cfo_carries_context(self):
        prov, o = self.orch()
        o.start_secretaria("Como esta o caixa e a margem?", "auto", "sintese")
        self.assertIn("CONTEXTO CALCULADO", prov.calls[0]["prompt"])
        self.assertNotIn("CONTEXTO CALCULADO", prov.calls[1]["prompt"])  # sintese so resume
        o.start_secretaria("Prazo da obra?", "coo", "direto")
        self.assertNotIn("CONTEXTO CALCULADO", prov.calls[2]["prompt"])

    def test_meeting_gives_context_only_to_cfo_turn(self):
        prov, o = self.orch(["FALA-CFO", "FALA-COO", "ATA"])
        o.start_meeting("Comprar equipamento TESTE?", ["cfo", "coo"])
        self.assertIn("CONTEXTO CALCULADO", prov.calls[0]["prompt"])
        self.assertNotIn("CONTEXTO CALCULADO", prov.calls[1]["prompt"])
        self.assertNotIn("CONTEXTO CALCULADO", prov.calls[2]["prompt"])

    def test_context_failure_never_blocks_chat(self):
        def quebra(_room):
            raise RuntimeError("base indisponivel")
        prov, o = self.orch(context_for=quebra)
        r = o.start_chat("cfo", "oi")
        self.assertIn("contexto calculado indisponivel", prov.calls[0]["prompt"])
        self.assertEqual(self.store.job(r["job"])["status"], "done")

    def test_common_rules_separate_access_from_validated_records(self):
        p = persona("cfo")
        self.assertIn("ACESSO CONECTADO", p)
        self.assertIn("REGISTROS VALIDADOS", p)
        self.assertIn("dados atuais do Zoho estao errados", p)
        self.assertIn("nao e um executivo real", p.lower())


class Voice360Tests(unittest.TestCase):
    def test_fixed_list_hash_and_status(self):
        with tempfile.TemporaryDirectory() as d:
            vault_with_policies(d)
            pl = voice360.politicas(Config(voice360_dir=d))
            self.assertEqual(pl["modo"], "POLITICAS OFICIAIS LOCAIS (hash conferido)")
            v1 = pl["politicas"][0]
            self.assertEqual(v1["sha256"], hashlib.sha256(V1_TEXTO).hexdigest().upper())
            self.assertEqual(v1["status"], "active")
            self.assertFalse(v1["confere_registro_v11"])  # arquivo TESTE != V1 registrada

    def test_portable_fallback_is_marked_non_canonical(self):
        pl = voice360.politicas(Config(voice360_dir=str(Path(tempfile.gettempdir()) / "nao-existe-veos")))
        self.assertFalse(pl["cofre_encontrado"])
        self.assertEqual(pl["modo"], "RESUMO PORTATIL NAO CANONICO")
        self.assertTrue(all(not p["presente"] for p in pl["politicas"]))
        self.assertIn("NAO CANONICO", pl["resumo_regras"][0])

    def test_consolidation_is_reviewable_draft(self):
        c = voice360.contexto(Config(voice360_dir="nao-existe"))["consolidacao"]
        self.assertIn("RASCUNHO", c["status"])
        self.assertTrue(c["funcoes"] and c["dependencias"])


if __name__ == "__main__":
    unittest.main()
