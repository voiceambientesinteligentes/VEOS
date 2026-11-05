import { test } from "node:test";
import assert from "node:assert/strict";
import { avaliarSaude } from "../../supabase/functions/_shared/saude_regras.ts";

const agora = Date.parse("2026-11-05T12:00:00Z");
const base = { agora, iaExecucoes: [], perguntasPendentes: [], zohoSync: [] };

test("saude: tudo normal não gera alerta", () => {
  const ia = Array.from({ length: 10 }, () => ({ ok: true, provedor: "mistral", em: "2026-11-05T11:00:00Z" }));
  assert.deepEqual(avaliarSaude({ ...base, iaExecucoes: ia, zohoSync: [{ produto: "books", modulo: "items", estado: "ok", erro: null, ultima_execucao_em: "2026-11-05T11:59:00Z" }] }), []);
});
test("saude: IA falhando em metade ou mais gera alerta; poucas tentativas não", () => {
  const ia = (ok: boolean) => ({ ok, provedor: "gemini", em: "x" });
  assert.equal(avaliarSaude({ ...base, iaExecucoes: [ia(false), ia(false), ia(true)] }).length, 0);
  const a = avaliarSaude({ ...base, iaExecucoes: [...Array(5).fill(ia(false)), ...Array(3).fill(ia(true))] });
  assert.equal(a[0].chave, "SAUDE_IA_FALHANDO");
  assert.match(a[0].mensagem, /gemini \(5\)/);
});
test("saude: pergunta parada > 30 min e Zoho com erro ou parado", () => {
  const a = avaliarSaude({ ...base,
    perguntasPendentes: [{ id: "1", criada_em: "2026-11-05T11:00:00Z" }, { id: "2", criada_em: "2026-11-05T11:55:00Z" }],
    zohoSync: [{ produto: "crm", modulo: "leads", estado: "erro", erro: "token", ultima_execucao_em: "2026-11-05T08:00:00Z" }] });
  assert.deepEqual(a.map((x) => x.chave).sort(), ["SAUDE_PERGUNTAS_PARADAS", "SAUDE_ZOHO_SYNC_ERRO", "SAUDE_ZOHO_SYNC_PARADA"]);
  assert.match(a.find((x) => x.chave === "SAUDE_PERGUNTAS_PARADAS")!.titulo, /^1 pergunta/);
});
