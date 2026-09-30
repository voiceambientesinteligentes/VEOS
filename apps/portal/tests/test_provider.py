import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from support import PORTAL  # noqa: F401

from veosportal.provider import (ClaudeCodeProvider, ProviderError, build_command,
                                 resolve_claude_bin)


class FakeProc:
    def __init__(self, out="", err="", code=0, hang=False):
        self.out, self.err, self.returncode, self.hang = out, err, code, hang
        self.input = None
        self.killed = False

    def communicate(self, input=None, timeout=None):
        if self.hang and not self.killed:
            self.input = input
            raise subprocess.TimeoutExpired("claude", timeout)
        self.input = self.input or input
        return self.out, self.err

    def kill(self):
        self.killed = True


class FakeRunner:
    def __init__(self, proc):
        self.proc = proc
        self.args = None
        self.kwargs = None

    def __call__(self, args, **kwargs):
        self.args, self.kwargs = args, kwargs
        return self.proc


def envelope(**kw):
    base = {"type": "result", "subtype": "success", "is_error": False, "result": "ok",
            "session_id": "s1", "permission_denials": []}
    base.update(kw)
    return json.dumps(base)


class ProviderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.bin = Path(self.tmp.name) / "claude.exe"
        self.bin.write_bytes(b"")
        self.bin.chmod(0o755)

    def tearDown(self):
        self.tmp.cleanup()

    def provider(self, proc):
        runner = FakeRunner(proc)
        return ClaudeCodeProvider(str(self.bin), self.tmp.name, 5, runner=runner), runner

    def test_command_has_no_tools_and_denies_mcp(self):
        cmd = build_command("claude.exe", "SISTEMA")
        self.assertEqual(cmd[cmd.index("--tools") + 1], "")
        self.assertIn("mcp__*", cmd)
        self.assertEqual(cmd[cmd.index("--permission-mode") + 1], "dontAsk")
        self.assertEqual(cmd[cmd.index("--permission-prompts") + 1], "none")
        self.assertEqual(cmd[cmd.index("--output-format") + 1], "json")
        self.assertNotIn("--allowedTools", cmd)
        self.assertNotIn("--dangerously-skip-permissions", cmd)

    def test_prompt_goes_through_stdin_without_shell(self):
        p, runner = self.provider(FakeProc(out=envelope(result="Resposta")))
        pergunta = 'teste "com aspas" & | > %PATH% $(x)'
        r = p.complete("SISTEMA", pergunta)
        self.assertEqual(r.text, "Resposta")
        self.assertIs(runner.kwargs["shell"], False)
        self.assertEqual(runner.proc.input, pergunta)
        self.assertNotIn(pergunta, runner.args)
        self.assertEqual(runner.kwargs["cwd"], self.tmp.name)
        self.assertEqual(p.status()["ultima_chamada"]["ok"], True)

    def test_error_envelope_raises(self):
        p, _ = self.provider(FakeProc(out=envelope(is_error=True, result="limite atingido")))
        with self.assertRaises(ProviderError) as cm:
            p.complete("s", "q")
        self.assertIn("limite", str(cm.exception))

    def test_non_json_raises(self):
        p, _ = self.provider(FakeProc(out="not json", err="boom", code=1))
        with self.assertRaises(ProviderError):
            p.complete("s", "q")

    def test_empty_result_raises(self):
        p, _ = self.provider(FakeProc(out=envelope(result="   ")))
        with self.assertRaises(ProviderError):
            p.complete("s", "q")

    def test_nonzero_exit_raises(self):
        p, _ = self.provider(FakeProc(out=envelope(result="parcial"), code=2))
        with self.assertRaises(ProviderError):
            p.complete("s", "q")

    def test_timeout_kills(self):
        proc = FakeProc(hang=True)
        p, _ = self.provider(proc)
        with self.assertRaises(ProviderError):
            p.complete("s", "q")
        self.assertTrue(proc.killed)
        self.assertEqual(p.status()["ultima_chamada"]["ok"], False)

    def test_missing_binary_raises_without_spawning(self):
        runner = FakeRunner(FakeProc())
        p = ClaudeCodeProvider(None, self.tmp.name, 5, runner=runner)
        with self.assertRaises(ProviderError):
            p.complete("s", "q")
        self.assertIsNone(runner.args)

    def test_resolver_refuses_batch_wrappers(self):
        cmd = Path(self.tmp.name) / "claude.cmd"
        cmd.write_text("@echo off")
        resolved = resolve_claude_bin(str(cmd))
        self.assertNotEqual(resolved, str(cmd))


if __name__ == "__main__":
    unittest.main()
