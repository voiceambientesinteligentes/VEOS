import assert from "node:assert/strict";
import { test } from "node:test";

import { confirmacaoDeEnvio, interpretar, pedidoDeAcao } from "../../apps/web/js/domain/comandos.js";

test("navegacao por voz", () => {
  assert.equal(interpretar("Abrir a órbita").rota, "#/orbita");
  assert.equal(interpretar("mostre os avisos do CFO").rota, "#/cfo");
  assert.equal(interpretar("Histórico").rota, "#/historico");
  assert.equal(interpretar("ir para a visão geral").rota, "#/visao");
  assert.equal(interpretar("VEOS, abre o histórico de orçamentos!").rota, "#/historico");
});

test("pedido de negocio indica o diretor, sem navegar", () => {
  const r = interpretar("Qual é a margem do projeto da cobertura e o custo dos equipamentos?");
  assert.equal(r.rota, undefined);
  assert.equal(r.diretor.sigla, "CFO");
  assert.equal(interpretar("prepare uma campanha para arquitetos no instagram").diretor.sigla, "CMO");
  assert.equal(interpretar("como está o cronograma da instalação").diretor.sigla, "COO");
  assert.equal(interpretar("quero ver a proposta do cliente").diretor.sigla, "CSO");
});

test("pedido para FAZER vai ao diretor certo em modo execucao; pedido curto de tela continua abrindo a tela", () => {
  const casos = [
    ["Ache 5 escritórios de arquitetura em Itajaí, pegue os e-mails e mande uma apresentação", "CSO"],
    ["abra um chamado para o cliente João, wi-fi lento", "CXO"],
    ["registre as férias do Pedro de 10 a 20/01", "CHRO"],
    ["ache distribuidores de cabo de rede em SC e peça cotação", "COO"],
    ["pode me mandar o resumo por e-mail?", "SEC"],
  ];
  for (const [t, sigla] of casos) {
    const r = interpretar(t);
    assert.equal(r.rota, undefined, t);
    assert.equal(r.acao, true, t);
    assert.equal(r.diretor.sigla, sigla, t);
  }
  assert.equal(interpretar("abrir o radar").rota, "#/radar");
  assert.equal(pedidoDeAcao("Qual é a margem do projeto?"), false);
  assert.equal(pedidoDeAcao("VEOS, cadastre o lead Maria"), true);
});

test("confirmacao de envio: so palavras de confirmar; 'ok', negacao e pergunta nao enviam", () => {
  for (const s of ["confirmo", "pode enviar", "sim, pode mandar", "manda todos", "envia agora", "sim"]) assert.equal(confirmacaoDeEnvio(s), true, s);
  for (const s of ["ok", "isso", "não envie", "pode enviar amanhã?", "envie só o primeiro", ""]) assert.equal(confirmacaoDeEnvio(s), false, s);
});

test("sem termo conhecido vai para a Secretaria; vazio pede repeticao", () => {
  assert.equal(interpretar("bom dia").diretor, null);
  assert.match(interpretar("   ").fala, /Não entendi/);
});
