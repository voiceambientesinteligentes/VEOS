import http.client
import json
import threading
import time
import unittest

from support import MockProvider

from veosportal.app import build_server
from veosportal.config import Config
from veosportal.http_app import STATIC
from veosportal.store import Store


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.provider = MockProvider()
        cls.server = build_server(Config(port=0, max_body_bytes=8192), provider=cls.provider,
                                  store=Store(":memory:"))
        cls.port = cls.server.server_address[1]
        cls.host = f"127.0.0.1:{cls.port}"
        cls.origin = f"http://{cls.host}"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.csrf = cls.get("/api/session")[1]["csrf"]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.orch.shutdown()
        cls.server.server_close()

    @classmethod
    def request(cls, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=10)
        h = {"Host": cls.host}
        h.update(headers or {})
        data = json.dumps(body).encode() if body is not None else None
        conn.request(method, path, body=data, headers=h)
        resp = conn.getresponse()
        raw = resp.read()
        conn.close()
        try:
            payload = json.loads(raw)
        except ValueError:
            payload = raw
        return resp, payload

    @classmethod
    def get(cls, path, **kw):
        resp, payload = cls.request("GET", path, **kw)
        return resp.status, payload

    def write(self, method, path, body, **over):
        headers = {"Origin": self.origin, "Content-Type": "application/json",
                   "X-VEOS-CSRF": self.csrf}
        headers.update(over)
        headers = {k: v for k, v in headers.items() if v is not None}
        resp, payload = self.request(method, path, body, headers)
        return resp.status, payload

    def wait_job(self, jid):
        for _ in range(100):
            st, job = self.get(f"/api/jobs/{jid}")
            if job["status"] in ("done", "failed"):
                return job
            time.sleep(0.05)
        self.fail("job nao terminou")

    # ------------------------------------------------------------ estaticos
    def test_index_served_with_security_headers(self):
        resp, body = self.request("GET", "/")
        self.assertEqual(resp.status, 200)
        self.assertIn(b"VEOS", body)
        csp = resp.getheader("Content-Security-Policy")
        self.assertIn("default-src 'none'", csp)
        self.assertIn("frame-ancestors 'none'", csp)
        self.assertEqual(resp.getheader("X-Content-Type-Options"), "nosniff")

    def test_all_allowlisted_files_exist(self):
        for path, (rel, _) in STATIC.items():
            self.assertTrue(self.server.config.web_dir.joinpath(*rel.split("/")).is_file(), path)

    def test_filesystem_not_exposed(self):
        for p in ("/run.py", "/../run.py", "/js/../../run.py", "/%2e%2e/run.py",
                  "/veosportal/http_app.py", "/css/", "/js/main.js/../../run.py",
                  "/runtime/veos-portal.sqlite3", "/web/index.html"):
            st, _ = self.get(p)
            self.assertEqual(st, 404, p)

    # ------------------------------------------------------------ host / origem / csrf
    def test_bad_host_rejected(self):
        st, _ = self.get("/api/status", headers={"Host": "evil.example:8877"})
        self.assertEqual(st, 421)
        st, _ = self.get("/", headers={"Host": "127.0.0.1.nip.io"})
        self.assertEqual(st, 421)

    def test_write_requires_origin(self):
        st, _ = self.write("POST", "/api/rooms/cfo/messages", {"text": "oi"}, Origin=None)
        self.assertEqual(st, 403)
        st, _ = self.write("POST", "/api/rooms/cfo/messages", {"text": "oi"},
                           Origin="http://evil.example")
        self.assertEqual(st, 403)

    def test_write_requires_csrf(self):
        st, _ = self.write("POST", "/api/rooms/cfo/messages", {"text": "oi"},
                           **{"X-VEOS-CSRF": "errado"})
        self.assertEqual(st, 403)
        st, _ = self.write("POST", "/api/rooms/cfo/messages", {"text": "oi"},
                           **{"X-VEOS-CSRF": None})
        self.assertEqual(st, 403)

    def test_write_requires_json(self):
        st, _ = self.write("POST", "/api/rooms/cfo/messages", {"text": "oi"},
                           **{"Content-Type": "text/plain"})
        self.assertEqual(st, 415)

    def test_cross_site_fetch_rejected(self):
        st, _ = self.write("POST", "/api/rooms/cfo/messages", {"text": "oi"},
                           **{"Sec-Fetch-Site": "cross-site"})
        self.assertEqual(st, 403)

    # ------------------------------------------------------------ fluxos
    def test_chat_roundtrip(self):
        st, r = self.write("POST", "/api/rooms/cmo/messages", {"text": "posicionamento"})
        self.assertEqual(st, 202)
        job = self.wait_job(r["job"])
        self.assertEqual(job["status"], "done")
        st, msgs = self.get("/api/rooms/cmo/messages")
        self.assertEqual([m["role"] for m in msgs["mensagens"]][-2:], ["user", "assistant"])
        st, other = self.get("/api/rooms/cio/messages")
        self.assertEqual(other["mensagens"], [])

    def test_secretaria_and_route_preview(self):
        st, prev = self.get("/api/route?text=margem%20e%20caixa")
        self.assertEqual(prev["room"], "cfo")
        st, r = self.write("POST", "/api/secretaria", {"text": "margem e caixa", "mode": "sintese"})
        self.assertEqual(st, 202)
        self.assertEqual(self.wait_job(r["job"])["status"], "done")

    def test_meeting_bounds_over_http(self):
        st, _ = self.write("POST", "/api/meetings",
                           {"topic": "t", "participants": ["cfo", "coo", "cso", "ceo"]})
        self.assertEqual(st, 400)
        st, r = self.write("POST", "/api/meetings", {"topic": "t", "participants": ["cfo"]})
        self.assertEqual(st, 202)
        self.assertEqual(self.wait_job(r["job"])["status"], "done")

    def test_unknown_room_and_job(self):
        self.assertEqual(self.get("/api/rooms/cto/messages")[0], 404)
        self.assertEqual(self.get("/api/jobs/" + "0" * 32)[0], 404)
        st, _ = self.write("POST", "/api/rooms/secretaria/messages", {"text": "x"})
        self.assertEqual(st, 404)

    def test_body_limit(self):
        st, _ = self.write("POST", "/api/rooms/cfo/messages", {"text": "x" * 9000})
        self.assertEqual(st, 413)

    def test_settings_validation_over_http(self):
        st, _ = self.write("PUT", "/api/settings",
                           {"rascunho": {"margem_alvo_pct": "10"}})
        self.assertEqual(st, 400)
        st, pl = self.write("PUT", "/api/settings", {"rascunho": {"risco_pct": "3"}})
        self.assertEqual(st, 200)
        self.assertEqual(pl["rascunho"]["risco_pct"], "3.00")
        self.assertEqual(pl["base_oficial"]["risco_pct"], "2.00")
        st, pl = self.write("DELETE", "/api/settings", {})
        self.assertEqual(pl["rascunho"]["risco_pct"], "2.00")

    def test_cfo_analysis_endpoint(self):
        st, a = self.get("/api/cfo/analysis?as_of=2026-09-28")
        if st == 503:
            self.skipTest(a.get("erro"))
        self.assertEqual(st, 200)
        self.assertTrue(a["sintetico"])
        self.assertIn("TESTE", a["banner"])
        st, _ = self.get("/api/cfo/analysis?as_of=2026-02-30")
        self.assertEqual(st, 400)

    def test_status_is_factual(self):
        st, s = self.get("/api/status")
        self.assertEqual(st, 200)
        self.assertIn("perfil consultivo", s["provedor"]["rotulo"])
        self.assertNotIn("operational", json.dumps(s).lower())


if __name__ == "__main__":
    unittest.main()
