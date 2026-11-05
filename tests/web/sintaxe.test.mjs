// Todo arquivo JavaScript do site precisa ser um módulo válido (pega, por exemplo, nomes importados em duplicidade
// no main.js, que derrubam o site inteiro sem que os testes de tela individuais percebam).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const lista = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? lista(p) : p.endsWith(".js") ? [p] : []; });

test("todos os módulos de apps/web/js e o service worker têm sintaxe válida", () => {
  const ruins = [];
  for (const f of [...lista("apps/web/js"), "apps/web/sw.js"]) {
    const r = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: readFileSync(f, "utf8"), encoding: "utf8" });
    if (r.status !== 0) ruins.push(`${f}: ${String(r.stderr).split("\n").find((l) => /Error/.test(l)) ?? "erro"}`);
  }
  assert.deepEqual(ruins, []);
});
