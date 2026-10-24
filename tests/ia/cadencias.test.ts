// Motor das cadencias do Comercial com banco simulado (fetch falso): toque do dia vira tarefa e
// rascunho, contato bloqueado nao recebe rascunho, toque muito atrasado nao e gerado e registro que
// mudou de etapa tem os toques pendentes cancelados.
import { test } from "node:test";
import assert from "node:assert/strict";

(globalThis as Record<string, unknown>).Deno = { env: { get: (k: string) => (k === "SUPABASE_URL" ? "https://teste.invalid" : "k-teste") } };
const { vigiarCadencias, contatoDoRegistro } = await import("../../supabase/functions/_shared/comercial_vigia.ts");

type Chamada = { metodo: string; caminho: string; corpo: unknown };
function banco(candidatos: unknown[], bloqueio: unknown[] = [], abertas: unknown[] = []) {
  const chamadas: Chamada[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const caminho = String(url).replace("https://teste.invalid", "");
    const metodo = init.method ?? "GET";
    chamadas.push({ metodo, caminho, corpo: init.body ? JSON.parse(String(init.body)) : null });
    let dados: unknown = [];
    if (caminho.startsWith("/rest/v1/rpc/cadencia_candidatos")) dados = candidatos;
    else if (caminho.startsWith("/rest/v1/contatos_bloqueio")) dados = bloqueio;
    else if (caminho.startsWith("/rest/v1/tarefas?origem=like.cadencia")) dados = abertas;
    return new Response(JSON.stringify(dados), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return chamadas;
}
const AUTOR = "00000000-0000-0000-0000-00000000c0de";
const hoje = Date.parse("2026-10-09T15:00:00Z"); // sexta

test("lead novo: o toque do dia vira tarefa para o SDR e rascunho de WhatsApp com o nome", async () => {
  const ch = banco([{ id: "r1", tipo: "lead", estado: "novo", titulo: "Lead Ana TESTE", dados: { nome_contato: "Ana TESTE", telefone: "(47) 99999-0000", origem: "site" }, criado_por: AUTOR, autor: "Bia TESTE", desde: "2026-10-09T14:00:00Z" }]);
  const r = await vigiarCadencias(hoje);
  assert.deepEqual([r.registros_em_cadencia, r.toques_gerados, r.rascunhos], [1, 1, 1]);
  const t = ch.find((c) => c.metodo === "POST" && c.caminho.startsWith("/rest/v1/tarefas"))!.corpo as Record<string, unknown>[];
  assert.equal(t[0].chave, "CAD:r1:lead_novo:1");
  assert.equal(t[0].papel, "sdr");
  assert.equal(t[0].prazo, "2026-10-09");
  assert.match(String(t[0].titulo), /^Toque 1\/6 \(whatsapp\) · Lead Ana TESTE: Responder em até 1 hora/);
  const m = ch.find((c) => c.metodo === "POST" && c.caminho.startsWith("/rest/v1/mensagens_saida"))!.corpo as Record<string, unknown>[];
  assert.equal(m[0].canal, "whatsapp");
  assert.equal(m[0].destinatario, "47999990000");
  assert.equal(m[0].estado, "rascunho");
  assert.match(String(m[0].corpo), /^Olá, Ana TESTE! Aqui é Bia TESTE, da VOICE/);
});

test("contato bloqueado: tarefa sim, rascunho não; toque com mais de 7 dias de atraso não é gerado", async () => {
  const ch = banco([{ id: "r2", tipo: "parceiro", estado: "prospectado", titulo: "Escritório TESTE", dados: { contato: "Carla TESTE", escritorio: "Arq TESTE", email: "Carla@Teste.invalid" }, criado_por: AUTOR, autor: null, desde: "2026-09-25T12:00:00Z" }],
    [{ contato: "carla@teste.invalid" }]);
  const r = await vigiarCadencias(hoje);
  // dias 0 (25/09) e 4 (29/09) ficaram para tras ha mais de 7 dias; o dia 10 (05/10) entra
  const t = ch.find((c) => c.metodo === "POST" && c.caminho.startsWith("/rest/v1/tarefas"))!.corpo as Record<string, unknown>[];
  assert.deepEqual(t.map((x) => x.chave), ["CAD:r2:parceiro_prospeccao:3"]);
  assert.equal(r.rascunhos, 0);
  assert.equal(ch.some((c) => c.caminho.startsWith("/rest/v1/mensagens_saida")), false);
});

test("registro que mudou de etapa: toques pendentes cancelados e rascunhos descartados", async () => {
  const ch = banco([{ id: "r3", tipo: "lead", estado: "em_contato", titulo: "Lead TESTE", dados: {}, criado_por: AUTOR, autor: null, desde: "2026-10-08T12:00:00Z" }], [],
    [{ id: "t1", registro_id: "r3", origem: "cadencia:lead_novo", chave: "CAD:r3:lead_novo:1" }]);
  const r = await vigiarCadencias(hoje);
  assert.equal(r.encerrados, 1);
  const patchT = ch.find((c) => c.metodo === "PATCH" && c.caminho.startsWith("/rest/v1/tarefas?id=in.(t1)"))!;
  assert.equal((patchT.corpo as Record<string, unknown>).estado, "cancelada");
  const patchM = ch.find((c) => c.metodo === "PATCH" && c.caminho.startsWith("/rest/v1/mensagens_saida"))!;
  assert.match(patchM.caminho, /chave=in\.\("CAD:r3:lead_novo:1"\)/);
  assert.equal((patchM.corpo as Record<string, unknown>).estado, "descartada");
});

test("contato do registro conforme o tipo", () => {
  assert.deepEqual(contatoDoRegistro({ tipo: "parceiro", titulo: "X", dados: { contato: "Carla", escritorio: "Arq TESTE", email: " A@B.invalid ", telefone: "(47) 3000-0000" } }),
    { nome: "Carla", empresa: "Arq TESTE", email: "a@b.invalid", telefone: "4730000000" });
  assert.equal(contatoDoRegistro({ tipo: "proposta", titulo: "Proposta TESTE", dados: {} }).nome, "Proposta TESTE");
});
