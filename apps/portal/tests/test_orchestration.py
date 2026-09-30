import unittest

from support import HeldExecutor, MockProvider, SyncExecutor

from veosportal.config import Config
from veosportal.orchestration import BusyError, Orchestrator, RequestError
from veosportal.rooms import route
from veosportal.store import Store


def make(script=None, executor=None, **cfg):
    store = Store(":memory:")
    prov = MockProvider(script)
    config = Config(**cfg)
    return store, prov, Orchestrator(store, prov, config, executor or SyncExecutor())


class RoutingTests(unittest.TestCase):
    def test_explicit_choice_wins(self):
        r = route("fluxo de caixa e margem", "cmo")
        self.assertEqual(r["room"], "cmo")
        self.assertIn("explicita", r["reason"])

    def test_keywords_are_transparent(self):
        r = route("Como está o fluxo de caixa e a margem do projeto?")
        self.assertEqual(r["room"], "cfo")
        self.assertIn("caixa", r["reason"])
        self.assertIn("margem", r["reason"])

    def test_accents_normalized(self):
        self.assertEqual(route("Qual a situação da instalação e do cronograma?")["room"], "coo")

    def test_no_keyword_defaults_to_ceo_with_reason(self):
        r = route("bom dia")
        self.assertEqual(r["room"], "ceo")
        self.assertIn("padrao", r["reason"])

    def test_unknown_explicit_rejected(self):
        with self.assertRaises(ValueError):
            route("x", "cto")


class ChatTests(unittest.TestCase):
    def test_reply_recorded_with_engine_label(self):
        store, prov, orch = make(["Resposta real do CFO"])
        r = orch.start_chat("cfo", "Qual a margem minima?")
        msgs = store.messages("cfo")
        self.assertEqual([m["role"] for m in msgs], ["user", "assistant"])
        self.assertEqual(msgs[1]["content"], "Resposta real do CFO")
        self.assertIn("perfil consultivo", msgs[1]["meta"]["engine"])
        self.assertEqual(store.job(r["job"])["status"], "done")
        self.assertIn("CFO", prov.calls[0]["system"])
        self.assertIn("nao e um executivo real", prov.calls[0]["system"].lower())

    def test_rooms_do_not_leak(self):
        store, prov, orch = make()
        orch.start_chat("cfo", "SEGREDO-CFO-123")
        orch.start_chat("coo", "pergunta de operacao")
        self.assertNotIn("SEGREDO-CFO-123", prov.calls[1]["prompt"])
        self.assertEqual(len(store.messages("coo")), 2)

    def test_same_room_history_is_used(self):
        store, prov, orch = make()
        orch.start_chat("cfo", "primeira pergunta")
        orch.start_chat("cfo", "segunda pergunta")
        self.assertIn("primeira pergunta", prov.calls[1]["prompt"])
        self.assertIn("resposta #1", prov.calls[1]["prompt"])

    def test_provider_failure_has_no_fake_reply(self):
        store, prov, orch = make([RuntimeError("indisponivel")])
        r = orch.start_chat("cfo", "oi")
        msgs = store.messages("cfo")
        self.assertFalse([m for m in msgs if m["role"] == "assistant"])
        self.assertEqual(msgs[-1]["role"], "system")
        self.assertEqual(msgs[-1]["meta"]["kind"], "error")
        job = store.job(r["job"])
        self.assertEqual(job["status"], "failed")
        self.assertIn("indisponivel", job["error"])

    def test_error_notes_are_not_sent_back_as_history(self):
        store, prov, orch = make([RuntimeError("falhou-xyz")])
        orch.start_chat("cfo", "a")
        orch.start_chat("cfo", "b")
        self.assertNotIn("falhou-xyz", prov.calls[1]["prompt"])

    def test_validation(self):
        _, _, orch = make()
        with self.assertRaises(RequestError):
            orch.start_chat("cfo", "   ")
        with self.assertRaises(RequestError):
            orch.start_chat("secretaria", "oi")
        with self.assertRaises(RequestError):
            orch.start_chat("cfo", "x" * 5000)

    def test_queue_limit(self):
        store, _, orch = make(executor=HeldExecutor(), max_pending_jobs=2)
        orch.start_chat("cfo", "1")
        orch.start_chat("cfo", "2")
        with self.assertRaises(BusyError):
            orch.start_chat("cfo", "3")


class SecretariaTests(unittest.TestCase):
    def test_direct_answer_attributed_and_isolated(self):
        store, prov, orch = make(["Resposta do CFO"])
        store.add_message("cfo", "user", "Voce", "PRIVADO-DA-SALA-CFO")
        r = orch.start_secretaria("Como está o caixa?", "auto", "direto")
        self.assertEqual(r["routing"]["room"], "cfo")
        self.assertEqual(len(prov.calls), 1)
        self.assertNotIn("PRIVADO-DA-SALA-CFO", prov.calls[0]["prompt"])
        sec = store.messages("secretaria")
        self.assertEqual([m["role"] for m in sec], ["user", "system", "assistant"])
        self.assertEqual(sec[2]["author"], "CFO")
        self.assertEqual(sec[2]["meta"]["via"], "secretaria")
        self.assertEqual(len(store.messages("cfo")), 1)  # sala privada intacta

    def test_synthesis_uses_actual_answer(self):
        store, prov, orch = make(["RESPOSTA-REAL-COO", "Segundo o COO, ..."])
        r = orch.start_secretaria("prazo da obra", "coo", "sintese")
        self.assertEqual(len(prov.calls), 2)
        self.assertIn("RESPOSTA-REAL-COO", prov.calls[1]["prompt"])
        self.assertIn("Secretaria", prov.calls[1]["system"])
        last = store.messages("secretaria")[-1]
        self.assertEqual(last["meta"]["kind"], "synthesis")
        self.assertEqual(last["meta"]["attribution"], ["COO"])
        self.assertEqual(store.job(r["job"])["status"], "done")

    def test_no_synthesis_when_manager_fails(self):
        store, prov, orch = make([RuntimeError("fora")])
        r = orch.start_secretaria("caixa", "auto", "sintese")
        self.assertEqual(len(prov.calls), 1)
        self.assertEqual(store.job(r["job"])["status"], "failed")
        self.assertFalse([m for m in store.messages("secretaria") if m["role"] == "assistant"])

    def test_invalid_mode(self):
        _, _, orch = make()
        with self.assertRaises(RequestError):
            orch.start_secretaria("x", "auto", "outro")


class MeetingTests(unittest.TestCase):
    def test_serial_consultation_and_summary(self):
        store, prov, orch = make(["FALA-CFO", "FALA-COO", "FALA-CSO", "ATA"])
        r = orch.start_meeting("Lancar novo servico", ["cfo", "coo", "cso"])
        self.assertEqual(len(prov.calls), 4)
        self.assertNotIn("FALA-CFO", prov.calls[0]["prompt"])
        self.assertIn("FALA-CFO", prov.calls[1]["prompt"])
        self.assertIn("FALA-COO", prov.calls[2]["prompt"])
        for fala in ("FALA-CFO", "FALA-COO", "FALA-CSO"):
            self.assertIn(fala, prov.calls[3]["prompt"])
        msgs = store.messages("reuniao")
        self.assertTrue(all(m["meta"].get("meeting_id") == r["meeting_id"] for m in msgs))
        self.assertEqual(msgs[-1]["meta"]["kind"], "summary")
        self.assertEqual(msgs[-1]["meta"]["attribution"], ["CFO", "COO", "CSO"])
        self.assertEqual(store.meetings()[0]["status"], "concluida")

    def test_failed_participant_not_invented(self):
        store, prov, orch = make(["FALA-CFO", RuntimeError("timeout"), "ATA"])
        orch.start_meeting("topico", ["cfo", "coo"])
        summary_prompt = prov.calls[-1]["prompt"]
        self.assertIn("FALA-CFO", summary_prompt)
        self.assertNotIn("[COO]", summary_prompt)
        self.assertEqual(store.messages("reuniao")[-1]["meta"]["attribution"], ["CFO"])
        self.assertEqual(store.meetings()[0]["status"], "concluida parcial")

    def test_all_fail_no_summary(self):
        store, prov, orch = make([RuntimeError("a"), RuntimeError("b")])
        r = orch.start_meeting("topico", ["cfo", "coo"])
        self.assertEqual(len(prov.calls), 2)
        self.assertEqual(store.job(r["job"])["status"], "failed")
        self.assertEqual(store.meetings()[0]["status"], "sem respostas")

    def test_bounds(self):
        _, _, orch = make()
        for bad in ([], ["cfo", "coo", "cso", "ceo"], ["cfo", "cfo"], ["secretaria"], "cfo"):
            with self.assertRaises(RequestError):
                orch.start_meeting("t", bad)

    def test_meeting_does_not_read_private_rooms(self):
        store, prov, orch = make()
        store.add_message("cfo", "user", "Voce", "PRIVADO-CFO")
        orch.start_meeting("topico", ["cfo"])
        self.assertFalse(any("PRIVADO-CFO" in c["prompt"] for c in prov.calls))


class StoreTests(unittest.TestCase):
    def test_interrupted_jobs_marked_failed(self):
        store = Store(":memory:")
        jid = store.create_job("chat", "cfo", {})
        self.assertEqual(store.fail_interrupted_jobs(), 1)
        self.assertEqual(store.job(jid)["status"], "failed")


if __name__ == "__main__":
    unittest.main()
