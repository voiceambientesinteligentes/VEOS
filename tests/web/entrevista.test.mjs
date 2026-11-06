import { test } from "node:test";
import assert from "node:assert/strict";
import { TODAS, ROTEIRO, validarResposta, progresso, proximasPerguntas, montarArquivo } from "../../apps/web/js/domain/entrevista.js";

test("roteiro: ids unicos e cada pergunta diz por que e onde o VEOS usa", () => {
  const ids = TODAS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of TODAS) { assert.ok(p.pergunta.length > 10 && p.por_que && p.destino, p.id); assert.ok(!/senha|chave de api|token/i.test(p.pergunta.replace(/nunca|nada de senha|nem senha|sem senha/gi, "")) || /senha/.test(p.pergunta) === false || /nada de senha|nunca/i.test(p.pergunta), p.id); }
  assert.ok(ROTEIRO.every((s) => s.perguntas.length > 0));
});

test("validarResposta: aceita CNPJ, recusa segredo, exige resposta salvo nao_sei", () => {
  assert.equal(validarResposta({ pergunta_id: "emp-02", resposta: "12345678000190", certeza: "confirmado" }).ok, true);
  assert.equal(validarResposta({ pergunta_id: "emp-02", resposta: "a senha do banco é 1234", certeza: "confirmado" }).ok, false);
  assert.equal(validarResposta({ pergunta_id: "emp-02", resposta: "sk-abcdefghijklmnopqrstuv", certeza: "confirmado" }).ok, false);
  assert.equal(validarResposta({ pergunta_id: "nao-existe", resposta: "x", certeza: "confirmado" }).ok, false);
  assert.equal(validarResposta({ pergunta_id: "emp-01", resposta: "", certeza: "confirmado" }).ok, false);
  assert.equal(validarResposta({ pergunta_id: "emp-01", resposta: "", certeza: "nao_sei" }).ok, true);
  assert.equal(validarResposta({ pergunta_id: "emp-01", resposta: "x".repeat(4001), certeza: "estimado" }).ok, false);
  assert.equal(validarResposta({ pergunta_id: "emp-01", resposta: "x", certeza: "talvez" }).ok, false);
});

test("progresso e proximas perguntas seguem a ordem e pulam as respondidas", () => {
  const rs = [{ pergunta_id: "emp-01", certeza: "confirmado" }, { pergunta_id: "emp-02", certeza: "nao_sei" }];
  const p = progresso(rs);
  assert.equal(p.respondidas, 2); assert.equal(p.nao_sei, 1); assert.equal(p.total, TODAS.length);
  assert.equal(proximasPerguntas(rs)[0].id, "emp-03");
  assert.equal(proximasPerguntas(rs, { secao: "metas", quantidade: 9 }).length, 5);
});

test("arquivo final marca confirmado, estimado, lacuna e pergunta sem resposta", () => {
  const a = montarArquivo([{ pergunta_id: "emp-01", resposta: "VOICE Ambientes Inteligentes", certeza: "confirmado" }, { pergunta_id: "emp-03", resposta: "", certeza: "nao_sei" }, { pergunta_id: "emp-04", resposta: "uns 5 anos", certeza: "estimado" }], { geradoEm: "2026-11-06T12:00:00Z" });
  assert.match(a.markdown, /CONFIRMADO/); assert.match(a.markdown, /ESTIMADO/); assert.match(a.markdown, /NÃO SEI/); assert.match(a.markdown, /Sem resposta/);
  assert.equal(a.json.secoes[0].perguntas[0].respondida, true);
  assert.equal(a.json.resumo.respondidas, 3);
});
