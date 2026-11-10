import { test } from "node:test";
import assert from "node:assert/strict";
import { criarMcp, manualDiretorCom, tiposDeRegistro } from "../../apps/web/js/domain/mcp.js";

const semManual = () => ({});
test("escopo consulta não expõe nenhuma ferramenta de escrita; completo expõe", () => {
  const c = criarMcp({ manualDiretor: semManual, escopo: "consulta" }).FERRAMENTAS.map((f) => f.name);
  const t = criarMcp({ manualDiretor: semManual, escopo: "completo" }).FERRAMENTAS.map((f) => f.name);
  assert.ok(!c.some((n) => /^veos_(criar_|registrar_|responder_|rascunho_|preparar_|enviar_|atualizar_|concluir_)/.test(n)));
  assert.ok(c.includes("veos_ler") && c.includes("veos_consultar_precedentes"));
  assert.ok(c.includes("veos_pesquisar_web") && c.includes("veos_registros") && c.includes("veos_emails_recebidos"), "leitura continua no escopo consulta");
  assert.ok(t.includes("veos_criar_tarefa") && t.includes("veos_enviar_email") && t.includes("veos_criar_registro") && t.length > c.length);
});
test("tiposDeRegistro: resumo sem setor; detalhe com setor; setor inválido recusado", () => {
  const catalogo = [{ id: "vendas", sigla: "CSO", nome: "Comercial", registros: [{ tipo: "lead", nome: "Lead", estados: ["novo"], estado_inicial: "novo", campos: [{ id: "nome_contato", rotulo: "Nome", tipo: "texto", obrigatorio: true }, { id: "origem", tipo: "opcao", opcoes: ["site"] }] }] }];
  const resumo = tiposDeRegistro(catalogo);
  assert.deepEqual(resumo.setores[0].tipos[0].obrigatorios, ["nome_contato"]);
  const det = tiposDeRegistro(catalogo, { setor: "vendas" });
  assert.deepEqual(det.setores[0].tipos[0].campos[1].opcoes, ["site"]);
  assert.throws(() => tiposDeRegistro(catalogo, { setor: "xx" }), /setor invalido/);
});
test("veos_ler só aceita GET de grupos permitidos", async () => {
  const { responder } = criarMcp({ manualDiretor: semManual });
  const chamadas = [];
  const chamar = async (m, r) => { chamadas.push([m, r]); return { ok: 1 }; };
  const ler = (rota) => responder({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "veos_ler", arguments: { rota } } }, chamar);
  assert.equal((await ler("caixa/dre?mes=2026-10")).result.isError, undefined);
  assert.deepEqual(chamadas, [["GET", "caixa/dre?mes=2026-10"]]);
  for (const ruim of ["conta/mcp", "sistema/usuarios", "mcp-remoto", "entrevista", "../x", "cfo//x", "radarx"]) assert.equal((await ler(ruim)).result.isError, true, ruim);
  assert.equal(chamadas.length, 1);
});
test("manualDiretorCom usa os carregadores recebidos", () => {
  const r = manualDiretorCom({ setor: "vendas" }, () => ({ diretor: { titulo: "T", nome: "N", perfil: "P", principios: [], limites: [] } }), () => null);
  assert.match(r.aviso, /manual ainda nao pesquisado/);
  assert.throws(() => manualDiretorCom({ setor: "xx" }, () => ({}), () => null), /setor invalido/);
});
