"""Reabrir o portal nao pode interromper consultas da instancia existente."""
import unittest
from veosportal.app import build_server
from veosportal.config import Config
from veosportal.store import Store

class StartupTests(unittest.TestCase):
    def test_second_instance_preserves_running_job(self):
        store = Store(":memory:")
        config = Config(port=0)
        server = build_server(config, store=store)
        try:
            jid = store.create_job("chat", "cfo", {"text": "TESTE"})
            store.set_job_status(jid, "running")
            with self.assertRaises(OSError):
                build_server(config, store=store)
            self.assertEqual(store.job(jid)["status"], "running")
        finally:
            server.orch.shutdown()
            server.server_close()
            store.close()
