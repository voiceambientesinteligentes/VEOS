"""Integracoes Zoho: catalogo, healthcheck real (simulado aqui por runner falso),
probes somente leitura com whitelist exata e validacao de tool_use/tool_result.
Nenhum teste executa o Claude Code nem acessa o Zoho."""
import fnmatch
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from support import HeldExecutor, SyncExecutor

from veosportal import integrations as it
from veosportal.orchestration import BusyError
from veosportal.store import Store

BOOKS = it.PROBES["books"]["tool"]
CRM = it.PROBES["crm"]["tool"]


class FakeProc:
    def __init__(self, out="", err="", code=0, hang=False):
        self.out, self.err, self.returncode, self.hang = out, err, code, hang
        self.input, self.killed = None, False

    def communicate(self, input=None, timeout=None):
        if self.hang and not self.killed:
            self.input = input
            raise subprocess.TimeoutExpired("claude", timeout)
        self.input = self.input if self.input is not None else input
        return self.out, self.err

    def kill(self):
        self.killed = True


class FakeRunner:
    def __init__(self, proc):
        self.proc, self.calls = proc, []

    def __call__(self, args, **kw):
        self.calls.append((args, kw))
        return self.proc


def stream(*events):
    return "\n".join(json.dumps(e) for e in events) + "\n"


def use(uid, name, inp=None):
    return {"type": "assistant", "message": {"content": [
        {"type": "tool_use", "id": uid, "name": name, "input": inp or {}}]}}


def result(uid, content, is_error=False):
    return {"type": "user", "message": {"content": [
        {"type": "tool_result", "tool_use_id": uid, "content": content, "is_error": is_error}]}}


INIT = {"type": "system", "subtype": "init", "mcp_servers": [
    {"name": "claude.ai Zoho Books", "status": "connected"}]}
FINAL = {"type": "result", "subtype": "success", "is_error": False, "result": "CONCLUIDO",
         "permission_denials": []}
ORGS = json.dumps({"code": 0, "message": "success",
                   "organizations": [{"name": "SEGREDO-ORG-123"}, {"name": "SEGREDO-ORG-456"}]})


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.bin = Path(self.tmp.name) / "claude.exe"
        self.bin.write_bytes(b"")
        self.store = Store(":memory:")

    def tearDown(self):
        self.tmp.cleanup()

    def svc(self, proc, executor=None, bin_=True):
        runner = FakeRunner(proc)
        s = it.IntegrationService(self.store, str(self.bin) if bin_ else None, self.tmp.name,
                                  health_timeout_s=5, probe_timeout_s=5, runner=runner,
                                  executor=executor or SyncExecutor())
        return s, runner

    def apps(self, s):
        return {a["nome"]: a for a in s.payload()["apps"]}

    # ------------------------------------------------------------ catalogo e estados
    def test_catalog_complete_and_nothing_hardcoded(self):
        s, _ = self.svc(FakeProc())
        pl = s.payload()
        self.assertEqual(pl["progresso"]["catalogo_total"], 59)
        self.assertEqual(len(pl["apps"]), 61)
        a = self.apps(s)
        for nome in ("Office Integrator", "Sdp On Demand", "Log360 Cloud", "Site24x7 Tools", "Vani"):
            self.assertIn(nome, a)
        self.assertEqual(a["Campaigns"]["estados"]["oferta"], "UPCOMING NO CATALOGO")
        self.assertIn("OAuth", a["Mail"]["nota"])
        for app in pl["apps"]:  # sem verificacao registrada, nada aparece conectado
            self.assertEqual(app["estados"]["servidor"], "NAO VERIFICADO")
            self.assertEqual(app["estados"]["conta"], "NAO VERIFICADA")
            self.assertIn("NAO CONFIAVEIS", app["estados"]["dados"])
            self.assertIn("EXIGE APROVACAO", app["estados"]["acao"])
        self.assertEqual(a["Books"]["estados"]["leitura"], "NAO TESTADA")
        self.assertEqual(a["Desk"]["estados"]["leitura"], "SEM PROBE NESTA VERSAO")
        self.assertEqual(pl["progresso"]["servidor_conectado"], 0)
        self.assertNotIn("percentual", json.dumps(pl["progresso"]))

    # ------------------------------------------------------------ healthcheck
    def test_health_runs_mcp_list_without_shell_and_sanitizes(self):
        out = ("Checking MCP server health...\n\n"
               "claude.ai Zoho Books: https://mcp.zoho.com/x?token=abcdefabcdefabcdefabcdefabcdefabcdef - ✓ Connected\n"
               "claude.ai Zoho CRM: https://mcp.zoho.com/crm - ! Needs authentication\n"
               "claude.ai Zoho Projects: https://mcp.zoho.com/p - ✓ Connected\n"
               "claude.ai Gmail: https://gmail.mcp/x - ✓ Connected\n"
               "local-tool: node C:/segredo/server.js --key=SEGREDO - ✗ Failed to connect\n")
        s, runner = self.svc(FakeProc(out=out))
        ok, err = s.health()
        self.assertTrue(ok)
        args, kw = runner.calls[0]
        self.assertEqual(args, [str(self.bin), "mcp", "list"])
        self.assertIs(kw["shell"], False)
        ev = self.store.latest_integration_checks("health")[0]["evidence"]
        dump = json.dumps(ev)
        for proibido in ("https", "mcp.zoho.com", "token", "SEGREDO", "server.js", "gmail"):
            self.assertNotIn(proibido, dump)
        self.assertEqual(ev["outros_servidores"]["total"], 2)
        a = self.apps(s)
        self.assertEqual(a["Books"]["estados"]["servidor"], "CONECTADO")
        self.assertEqual(a["CRM"]["estados"]["servidor"], "REQUER_AUTENTICACAO")
        self.assertEqual(a["Mail"]["estados"]["servidor"], "NAO LISTADO")
        self.assertIsNone(a["Books"]["autorizacao"])
        self.assertIn("AUTORIZACAO PENDENTE", a["Mail"]["autorizacao"])
        self.assertEqual(s.payload()["progresso"]["servidor_conectado"], 2)

    def test_health_failures_are_errors_not_zero(self):
        s, _ = self.svc(FakeProc(out="", err="boom https://x.y/z", code=1))
        ok, err = s.health()
        self.assertFalse(ok)
        self.assertNotIn("https", err)
        self.assertEqual(self.apps(s)["Books"]["estados"]["servidor"], "VERIFICACAO FALHOU")
        s, runner = self.svc(FakeProc(), bin_=False)
        ok, err = s.health()
        self.assertFalse(ok)
        self.assertIn("nao encontrado", err)
        self.assertEqual(runner.calls, [])
        proc = FakeProc(hang=True)
        s, _ = self.svc(proc)
        ok, err = s.health()
        self.assertFalse(ok)
        self.assertTrue(proc.killed)

    def test_health_job_is_async_and_recorded(self):
        s, _ = self.svc(FakeProc(out="claude.ai Zoho Books: https://a - ✓ Connected\n"))
        r = s.start_health()
        job = self.store.job(r["job"])
        self.assertEqual(job["status"], "done")
        self.assertEqual(job["room"], "integracoes")
        self.assertTrue(job["progress"])

    def test_one_check_at_a_time(self):
        s, _ = self.svc(FakeProc(), executor=HeldExecutor())
        s.start_health()
        with self.assertRaises(BusyError):
            s.start_probe("books")

    # ------------------------------------------------------------ probes
    def test_probe_command_is_exact_whitelist(self):
        cmd = it.build_probe_command("claude.exe", BOOKS)
        i = cmd.index("--allowedTools")
        j = cmd.index("--disallowedTools")
        self.assertEqual(cmd[i + 1:j], ["ToolSearch", BOOKS])
        self.assertEqual(cmd[cmd.index("--setting-sources") + 1], "")
        self.assertEqual(cmd[cmd.index("--settings") + 1], '{"disableAllHooks":true}')
        self.assertEqual(cmd[cmd.index("--permission-mode") + 1], "dontAsk")
        self.assertEqual(cmd[cmd.index("--permission-prompts") + 1], "none")
        self.assertEqual(cmd[cmd.index("--output-format") + 1], "stream-json")
        self.assertEqual(cmd[cmd.index("--tools") + 1], "ToolSearch")
        self.assertIn("--verbose", cmd)
        self.assertNotIn("--dangerously-skip-permissions", cmd)
        deny = cmd[j + 1:]
        for t in ("Bash", "PowerShell", "Read", "Write", "Edit", "Skill", "Agent", "Task",
                  "WebFetch", "WebSearch", "mcp__*__create*", "mcp__*__update*", "mcp__*__delete*",
                  "mcp__*__add*", "mcp__*__send*", "mcp__*__execute*"):
            self.assertIn(t, deny)
        for p in it.PROBES.values():  # nenhuma negacao bloqueia a propria operacao de leitura
            self.assertFalse(any(fnmatch.fnmatchcase(p["tool"], d) for d in deny), p["tool"])

    def test_probe_ids_are_fixed_and_prompt_has_no_user_text(self):
        s, runner = self.svc(FakeProc(out=stream(INIT, FINAL)))
        with self.assertRaises(ValueError):
            s.start_probe("desk")
        with self.assertRaises(ValueError):
            s.start_probe("books; rm -rf /")
        s.probe("books")
        self.assertEqual(runner.proc.input, it.probe_prompt(it.PROBES["books"]))
        self.assertIn(BOOKS, runner.calls[0][0])

    def test_probe_success_keeps_only_metadata(self):
        out = stream(INIT, use("t0", "ToolSearch", {"query": "select:" + BOOKS}),
                     result("t0", "ok"), use("t1", BOOKS), result("t1", [{"type": "text", "text": ORGS}]),
                     FINAL)
        s, _ = self.svc(FakeProc(out=out))
        ok, err = s.probe("books")
        self.assertTrue(ok, err)
        ev = self.store.latest_integration_checks("probe")[0]["evidence"]
        self.assertEqual(ev["itens"], 2)
        self.assertTrue(ev["tool_use_verificado"] and ev["tool_result_verificado"])
        self.assertEqual(ev["servidor_no_init"], "CONECTADO")
        self.assertNotIn("SEGREDO", json.dumps(ev))
        a = self.apps(s)["Books"]["estados"]
        self.assertEqual(a["leitura"], "TESTADA - OK")
        self.assertIn("ACESSO DE LEITURA DEMONSTRADO", a["conta"])
        self.assertIn("NAO CONFIAVEIS", a["dados"])
        self.assertEqual(s.payload()["progresso"]["dados_confiaveis"], 0)

    def test_probe_rejects_narrative_and_incomplete_streams(self):
        casos = {
            "nenhuma chamada real": stream(INIT, FINAL),
            "sem tool_result": stream(use("t1", BOOKS), FINAL),
            "retornou erro": stream(use("t1", BOOKS), result("t1", "falhou", is_error=True), FINAL),
            "fora da whitelist": stream(use("t9", "Bash", {"command": "dir"}), use("t1", BOOKS),
                                        result("t1", ORGS), FINAL),
            "servidor Zoho respondeu com erro": stream(use("t1", BOOKS),
                                                       result("t1", '{"code": 57, "message": "x"}'), FINAL),
            "evento final": stream(use("t1", BOOKS), result("t1", ORGS)),
            "mais de uma vez": stream(use("t1", BOOKS), result("t1", ORGS), use("t2", BOOKS),
                                      result("t2", ORGS), FINAL),
            "vazia": "texto qualquer\n",
        }
        for trecho, out in casos.items():
            s, _ = self.svc(FakeProc(out=out))
            ok, err = s.probe("books")
            self.assertFalse(ok, trecho)
            self.assertIn(trecho, err, trecho)
        self.assertEqual(self.apps(s)["Books"]["estados"]["leitura"], "ERRO")

    def test_crm_probe_is_limited_to_deals_schema(self):
        bad = stream(use("t1", CRM, {"module": "Contacts"}), result("t1", '{"fields": []}'), FINAL)
        s, _ = self.svc(FakeProc(out=bad))
        ok, err = s.probe("crm")
        self.assertFalse(ok)
        self.assertIn("Deals", err)
        good = stream(use("t1", CRM, {"module": "Deals"}),
                      result("t1", '{"fields": [{"api_name": "Stage"}, {"api_name": "Amount"}]}'), FINAL)
        s, _ = self.svc(FakeProc(out=good))
        ok, err = s.probe("crm")
        self.assertTrue(ok, err)

    def test_nonzero_exit_and_timeout_are_errors(self):
        s, _ = self.svc(FakeProc(out=stream(use("t1", BOOKS), result("t1", ORGS), FINAL), code=1))
        self.assertFalse(s.probe("books")[0])
        proc = FakeProc(hang=True)
        s, _ = self.svc(proc)
        ok, err = s.probe("books")
        self.assertFalse(ok)
        self.assertTrue(proc.killed)

    def test_sanitize(self):
        t = it.sanitize("erro em https://a.b/c?x=1 Bearer abc.def token=XYZ " + "k" * 40)
        for proibido in ("https", "abc.def", "XYZ", "k" * 40):
            self.assertNotIn(proibido, t)

    def test_chat_summary_distinguishes_access_from_validated_data(self):
        s, _ = self.svc(FakeProc())
        txt = s.resumo_texto()
        self.assertIn("NAO significa registros validados", txt)
        self.assertIn("Nenhuma escrita autorizada", txt)


if __name__ == "__main__":
    unittest.main()
