"""Registro local de decisoes: append-only, cadeia SHA-256, snapshot com hash,
estados sem autoaprovacao e deteccao de adulteracao."""
import sqlite3
import unittest

from support import PORTAL  # noqa: F401

from veosportal.cfo_service import CFOControlsService
from veosportal.config import Config
from veosportal.ledger import (GENESIS, DecisionLedger, LedgerError, canonical, event_hash,
                               sha256_text, verificar)
from veosportal.store import Store


def body(**kw):
    b = {"tipo": "desconto", "estado": "proposto", "assunto": "Desconto TESTE de 3%",
         "motivo": "Cliente TESTE pediu reducao; avaliar alcada.", "autor_declarado": "Usuario TESTE",
         "dependencias": ["autorizacao da direcao"], "confirmacao": True,
         "entrada": {"valor_bruto": "100000.00", "desconto_pct": "3",
                     "impostos_sem_desconto": "10000.00", "impostos_com_desconto": "9700.00",
                     "custos_diretos": "50000.00"}}
    b.update(kw)
    return b


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.store = Store(":memory:")
        self.controls = CFOControlsService(Config(), self.store)
        self.ledger = DecisionLedger(self.store, self.controls.snapshot)

    def test_append_builds_verified_chain_with_server_snapshot(self):
        a = self.ledger.registrar(body())
        b = self.ledger.registrar(body(estado="registrado_pelo_usuario", refere_seq=1,
                                       motivo="Direcao TESTE decidiu seguir."))
        self.assertEqual(a["prev"], GENESIS)
        self.assertEqual(b["prev"], a["hash"])
        self.assertEqual(a["autoria"], "declarada-nao-autenticada")
        # snapshot calculado pelo servidor, nao pelo cliente
        self.assertEqual(a["snapshot"]["resultado"]["alcada"]["nivel"], "DIRECAO")
        rows = self.store.decision_rows()
        self.assertEqual(a["snapshot_sha256"], sha256_text(rows[0]["snapshot"]))
        lst = self.ledger.listar()
        self.assertTrue(lst["integridade"]["ok"])
        self.assertEqual([d["seq"] for d in lst["decisoes"]], [1, 2])

    def test_sql_blocks_update_and_delete(self):
        self.ledger.registrar(body())
        with self.assertRaises(sqlite3.DatabaseError):
            self.store._exec("UPDATE cfo_decisions SET evento = '{}' WHERE seq = 1")
        with self.assertRaises(sqlite3.DatabaseError):
            self.store._exec("DELETE FROM cfo_decisions")
        self.assertEqual(len(self.store.decision_rows()), 1)

    def test_tampering_is_detected_and_blocks_new_appends(self):
        self.ledger.registrar(body())
        self.ledger.registrar(body(assunto="Segunda TESTE"))
        self.store._exec("DROP TRIGGER cfo_decisions_sem_update")
        self.store._exec("UPDATE cfo_decisions SET snapshot = replace(snapshot, 'DIRECAO', 'AUTONOMIA') "
                         "WHERE seq = 1")
        lst = self.ledger.listar()
        self.assertFalse(lst["integridade"]["ok"])
        self.assertIn("snapshot", lst["integridade"]["erro"])
        with self.assertRaises(LedgerError):
            self.ledger.registrar(body(assunto="Terceira TESTE"))
        self.assertEqual(len(self.store.decision_rows()), 2)

    def test_hash_and_prev_mismatch_detected(self):
        self.ledger.registrar(body())
        rows = self.store.decision_rows()
        rows[0]["hash"] = "f" * 64
        with self.assertRaisesRegex(LedgerError, "hash"):
            verificar(rows)
        rows = self.store.decision_rows()
        self.assertEqual(rows[0]["hash"], event_hash(__import__("json").loads(rows[0]["evento"])))
        rows[0]["prev"] = "1" * 64
        with self.assertRaisesRegex(LedgerError, "prev"):
            verificar(rows)

    def test_requires_explicit_confirmation_and_valid_fields(self):
        for kw in ({"confirmacao": False}, {"confirmacao": "sim"}, {"estado": "aprovado"},
                   {"tipo": "transferencia"}, {"motivo": "  "}, {"autor_declarado": ""},
                   {"assunto": "a‮b"}, {"dependencias": ["x"] * 11}, {"extra": 1},
                   {"refere_seq": 1}):  # proposta nova nao refere outra decisao
            with self.assertRaises(LedgerError, msg=kw):
                self.ledger.registrar(body(**kw))
        self.assertEqual(self.store.decision_rows(), [])

    def test_resolution_rules_no_double_resolution(self):
        self.ledger.registrar(body())
        self.ledger.registrar(body(estado="rejeitado", refere_seq=1, motivo="Rejeitado TESTE."))
        with self.assertRaisesRegex(LedgerError, "ja resolvida"):
            self.ledger.registrar(body(estado="registrado_pelo_usuario", refere_seq=1))
        with self.assertRaisesRegex(LedgerError, "nao e proposta"):
            self.ledger.registrar(body(estado="registrado_pelo_usuario", refere_seq=2))
        with self.assertRaisesRegex(LedgerError, "inexistente"):
            self.ledger.registrar(body(estado="rejeitado", refere_seq=99))

    def test_invalid_calculation_context_writes_nothing(self):
        with self.assertRaises(LedgerError):
            self.ledger.registrar(body(entrada={"valor_bruto": "abc"}))
        self.assertEqual(self.store.decision_rows(), [])

    def test_general_decision_snapshots_briefing(self):
        ev = self.ledger.registrar(body(tipo="geral", entrada={"periodo": "2026-09"},
                                        assunto="Leitura TESTE do briefing"))
        self.assertEqual(ev["snapshot"]["resultado"]["periodo"], "2026-09")
        self.assertIn("prioridade", ev["snapshot"]["resultado"])

    def test_canonical_is_stable(self):
        self.assertEqual(canonical({"b": 1, "a": "ç"}), '{"a":"ç","b":1}')


if __name__ == "__main__":
    unittest.main()
