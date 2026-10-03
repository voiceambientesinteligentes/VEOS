import assert from "node:assert/strict";
import { test } from "node:test";

import { condicaoSugerida } from "../../apps/web/js/domain/condicao.js";
import { funilNecessario, itensReferencia, margemPorReal, mixPraticado, oQueFalta, pontoEquilibrio, saidasMensais, showroom, simularObra } from "../../apps/web/js/domain/equilibrio.js";
import { variacaoDolar } from "../../apps/web/js/domain/formacao_preco.js";
import { canaisDe, parametros, produtividadeDe } from "../../apps/web/js/domain/formulario_cfo.js";

const RESP = {
  equipe: { dados: { pessoas: [
    { nome: "Técnico", vinculo: "pj", valor: "3000 MÊS", beneficios: "200", horas_mes: "160", campo_pct: "90" },
    { nome: "Diarista", vinculo: "diarista", valor: "150 DIA", dias_mes: "10", horas_mes: "85", campo_pct: "90" },
    { nome: "Sócio", vinculo: "socio", valor: "5000", horas_mes: "200", campo_pct: "70" }], veiculo_mes: "3000", ferramentas_mes: "200", jornada_horas_dia: "9", deslocamento_horas_dia: "1,5", preparacao_horas_dia: "1", espera_horas_dia: "0,5", retrabalho_pct: "5" } },
  fixos: { dados: { itens: [{ descricao: "Aluguel", valor: "6000" }, { descricao: "Outros", valor: "4000" }] } },
  voce: { dados: { retirada_media_real: "12000" } },
  vendas: { dados: { comissao_vendedor_pct: "5", paga_indicacao: "sim", indicacao_pct: "10" } },
  dividas: { dados: { lista: [{ credor: "Receita", parcela: "1500", saldo: "50000" }] } },
};

test("produtividade a partir do dia de obra", () => {
  // (9 - 1,5 - 1 - 0,5) / 9 x 0,95 = 63,3%
  assert.equal(produtividadeDe(RESP.equipe.dados), 63.3);
  assert.equal(produtividadeDe({ produtividade_pct: "70" }), 70);
});

test("canais: RT/indicação, direto e turn key", () => {
  const c = canaisDe(RESP.vendas.dados);
  assert.deepEqual(c.map((x) => [x.nome, x.comissao + x.rt]), [["Com RT/indicação", 15], ["Direto (sem indicação)", 5], ["Turn key", 5]]);
  const lista = canaisDe({ canais: [{ nome: "Turn key", comissao_pct: "3", rt_pct: "0", padrao: "sim" }] });
  assert.equal(lista[0].padrao, true);
  const p = parametros({ ...RESP, vendas: { dados: { canais: [{ nome: "Direto", comissao_pct: "5", padrao: "sim" }, { nome: "RT", comissao_pct: "5", rt_pct: "10" }] } } });
  assert.equal(p.v, 5);
  assert.equal(p.canais[1].v, 15);
});

test("saídas do mês e ponto de equilíbrio (passo a passo)", () => {
  const p = parametros(RESP);
  const s = saidasMensais(p, RESP);
  // valores ficticios: fixos 10.000 + retirada 12.000 + equipe sem o sócio (3.200 + 1.500) + veículo/ferramentas 3.200 + dívida 1.500
  assert.equal(s.total, 31400);
  const mc = margemPorReal({ tProduto: 6, tServico: 8, v: 15, multiplicador: 2, mixProduto: 0.6 });
  assert.equal(mc.produto, 27.1); // (1 - 6%)(1 - 2%) - 15% - 1/2
  assert.equal(mc.servico, 75.2); // (1 - 8%)(1 - 2%) - 15%
  assert.equal(mc.media, 46.3);
  const eq = pontoEquilibrio(s, mc);
  assert.equal(eq.meta, 67900); // 31.400 / 46,3%, arredondado para cima a R$ 100
  assert.ok(eq.cadaMil > 2000 && eq.cadaMil < 2300);
  assert.equal(pontoEquilibrio(s, { media: 0 }), null);
});

const PROJ = [{ numero: "E1", linhas: [
  { nome: "Interruptor Touch SEM FIO", qtd: 10, preco: 286.8, total: 2868, tipo: "goods", custo: 143.4 },
  { nome: "ACCESS POINT U7 - LITE", qtd: 2, preco: 1798, total: 3596, tipo: "goods", custo: 899 },
  { nome: "Cabo de Rede CAT. 6 U/UTP", qtd: 100, preco: 7.86, total: 786, tipo: "goods", custo: 3.2 },
  { nome: "INSTALAÇÃO DA AUTOMAÇÃO", qtd: 10, preco: 330, total: 3300, tipo: "service", custo: 50, unidade: "Hr" }] }];

test("mix praticado, itens de referência e simulação de obra", () => {
  const mix = mixPraticado(PROJ);
  assert.equal(mix.precoHora, 330);
  assert.equal(mix.mixProduto, 0.69);
  const ref = itensReferencia(PROJ);
  assert.equal(ref.interruptor.custo, 143.4);
  assert.equal(ref.cabo_rede.custo, 3.2);
  const o = simularObra({ nome: "TESTE", itens: { interruptor: 5, ap: 1, cabo_rede: 50, receiver: 1 } }, ref, { tProduto: 6, tServico: 8, v: 5, catalogo: [], precoHora: 330 });
  assert.deepEqual(o.faltam, ["receiver"]);
  assert.equal(o.linhas.length, 3);
  assert.ok(o.sobra > 0 && o.total === o.produtos + o.maoDeObra);
});

test("funil necessário e showroom", () => {
  const f = funilNecessario({ meta: 106000, ticket: 26700, conversao: 35 });
  assert.equal(f.mes.orcamentos, 12);
  assert.equal(f.mes.leads, 35);
  assert.equal(funilNecessario({ meta: 0, ticket: 1 }), null);
  const s = showroom({ custoMensal: 11000, investimento: 100000, meses: 12, ticket: 27000, mcPct: 35 });
  assert.equal(s.porVenda, 9450);
  assert.equal(s.vendasMesParaPagarCusto, 1.2);
  assert.equal(s.vendasParaRecuperar, 10.6);
  assert.ok(showroom({ ticket: 27000, mcPct: 10, indicacaoPct: 15 }).impossivel);
});

test("condição de pagamento sugerida", () => {
  const c = condicaoSugerida({ custoProdutos: 20000, total: 50000, ptax: { data: "2026-10-01", venda: 5.2079 }, hoje: new Date("2026-10-02T12:00:00Z") });
  assert.equal(c.sinal, 45); // 20.000 x 1,1 / 50.000 = 44% -> 45%
  assert.equal(c.instalacao + c.entrega, 55);
  assert.match(c.texto, /válida até 09\/10\/2026/);
  assert.match(c.texto, /R\$ 5,2079/);
  assert.doesNotMatch(c.texto, /reajust/);
  assert.equal(condicaoSugerida({ custoProdutos: 1000, total: 50000 }).sinal, 40); // minimo de entrada
});

test("variação do dólar desde a compra", () => {
  const serie = [{ data: "2026-01-02", venda: 5.5 }, { data: "2026-01-05", venda: 5.6 }, { data: "2026-10-01", venda: 5.2 }];
  const v = variacaoDolar("2026-01-04", serie); // fim de semana: usa o ultimo dia util antes
  assert.equal(v.de.data, "2026-01-02");
  assert.equal(v.fator, 0.9455);
  assert.equal(variacaoDolar("2025-12-01", serie), null);
});

test("o que falta: checklist", () => {
  const p = parametros(RESP);
  const f = oQueFalta(p, RESP, { desfechoPct: 0 });
  assert.ok(f.find((x) => /Equipe/.test(x.texto)).ok);
  assert.ok(f.find((x) => /Dia de obra/.test(x.texto)).ok);
  assert.ok(!f.find((x) => /Alíquotas reais/.test(x.texto)).ok);
  assert.ok(!f.find((x) => /Desfecho/.test(x.texto)).ok);
});
