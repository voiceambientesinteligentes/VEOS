// Fluxo de 13 semanas, reserva, DRE pelo caixa e indicadores da Política. Dados fictícios.
import { test } from "node:test";
import assert from "node:assert/strict";
import { necessidadeDeCaixa, projetar, reserva } from "../../apps/web/js/domain/caixa13.js";
import { agrupar, dre, dreMensal } from "../../apps/web/js/domain/dre.js";
import { indicadores } from "../../apps/web/js/domain/indicadores.js";

const PLANO = [
  { codigo: "1.1", nome: "Recebimentos", grupo: "receita" }, { codigo: "2.1", nome: "DAS", grupo: "deducao" }, { codigo: "3.1", nome: "Equipamentos", grupo: "custo_variavel" },
  { codigo: "3.5", nome: "RT", grupo: "custo_variavel" }, { codigo: "4.3", nome: "Contador", grupo: "despesa_fixa" }, { codigo: "4.2", nome: "Aluguel", grupo: "despesa_fixa" },
  { codigo: "5.1", nome: "Retirada", grupo: "retirada" }, { codigo: "6.2", nome: "Empréstimo", grupo: "financeiro" }, { codigo: "8.1", nome: "Transferência", grupo: "transferencia" },
  { codigo: "9.1", nome: "Pessoal", grupo: "nao_operacional" },
];

test("reserva: 3 meses dos fixos (recorrentes 4.x; sem elas, o formulário); dívida e retirada não entram", () => {
  const r = reserva({ recorrentes: [{ plano_conta: "4.3", valor: 500 }, { plano_conta: "4.2", valor: 2500 }, { plano_conta: "6.2", valor: 900 }, { plano_conta: "5.1", valor: 6000 }], retirada: 6000 });
  assert.deepEqual(r, { fixosMes: 3000, origem: "contas recorrentes do grupo 4 (despesas fixas)", meta: 9000, comRetirada: 27000 });
  assert.equal(reserva({ fixosFormulario: 4000 }).meta, 12000);
  assert.equal(reserva({}).meta, null);
});

test("13 semanas: saldo real, conta atrasada na semana 1, parcela atrasada fora, imposto no dia 20 do mês seguinte", () => {
  const f = projetar({
    hoje: "2026-10-05", semanas: 13,
    saldos: [{ nome: "Conta", saldo: 10000 }, { nome: "Aplicação", saldo: null }],
    parcelas: [{ vencimento: "2026-10-08", valor: 20000, pedido: "PED-1", numero: 1 }, { vencimento: "2026-09-20", valor: 5000, pedido: "PED-0", numero: 2 }],
    contas: [{ vencimento: "2026-10-01", valor: 1500, descricao: "Fornecedor atrasado" }, { vencimento: "2026-10-10", valor: 3000, descricao: "Aluguel" }, { vencimento: "2026-11-10", valor: 3000, descricao: "Aluguel" }],
    impostos: { aliquota_media_pct: 6, origem: "SIMULAÇÃO" }, entradasRealizadasMes: 5000, reservaMeta: 9000,
  });
  assert.equal(f.saldoHoje, 10000);
  assert.deepEqual(f.semSaldo, ["Aplicação"]);
  assert.equal(f.semanas[0].entradas, 20000);
  assert.equal(f.semanas[0].saidas, -4500, "atrasada + aluguel da semana");
  assert.equal(f.semanas[0].saldo_final, 25500);
  assert.equal(f.atrasadas.receber, 5000);
  // DAS de outubro: (5.000 recebidos + 20.000 previstos) x 6% = 1.500 em 20/11
  const das = f.impostos.provisoes.find((p) => p.data === "2026-11-20");
  assert.equal(das.valor, -1500);
  const s7 = f.semanas.find((s) => s.inicio <= "2026-11-20" && s.fim >= "2026-11-20");
  assert.equal(s7.impostos, -1500);
  assert.equal(f.semanas.at(-1).saldo_final, 25500 - 3000 - 1500);
  assert.ok(f.alertas.some((a) => /parcial/.test(a)) && f.alertas.some((a) => /atrasada\(s\) fora/.test(a)));
  assert.deepEqual(f.necessidade, { d30: 0, d60: 0, d90: 0 });
});

test("13 semanas: DAS já lançado como conta não é provisionado de novo; sem saldo = LACUNA", () => {
  const f = projetar({ hoje: "2026-10-05", saldos: [{ nome: "Conta", saldo: null }], parcelas: [{ vencimento: "2026-10-08", valor: 1000 }],
    contas: [{ vencimento: "2026-11-20", valor: 70, descricao: "DAS outubro", plano_conta: "2.1" }], impostos: { aliquota_media_pct: 6 } });
  assert.equal(f.impostos.provisoes.length, 0);
  assert.equal(f.saldoHoje, null);
  assert.equal(f.semanas[0].saldo_final, null);
  assert.ok(f.alertas[0].startsWith("LACUNA"));
  assert.deepEqual(necessidadeDeCaixa(f.semanas, null), { d30: null, d60: null, d90: null });
});

test("13 semanas: caixa negativo gera alerta e necessidade de caixa", () => {
  const f = projetar({ hoje: "2026-10-05", saldos: [{ nome: "C", saldo: 1000 }], contas: [{ vencimento: "2026-10-20", valor: 4000, descricao: "Fornecedor" }], incluirImpostos: false });
  assert.ok(f.alertas.some((a) => /NEGATIVO na semana 3/.test(a)));
  assert.deepEqual(f.necessidade, { d30: 3000, d60: 3000, d90: 3000 });
});

test("DRE pelo caixa: receita líquida, margem de contribuição, operacional, transferência fora, pendências e conferência", () => {
  const movimentos = [
    { valor: 50000, categoria: "1.1" }, { valor: -3000, categoria: "2.1" }, { valor: -20000, categoria: "3.1" }, { valor: -5000, categoria: "3.5" },
    { valor: -500, categoria: "4.3" }, { valor: -2500, categoria: "4.2" }, { valor: -6000, categoria: "5.1" }, { valor: -900, categoria: "6.2" },
    { valor: -1000, categoria: "8.1" }, { valor: 1000, categoria: "8.1" }, { valor: -200, categoria: null }, { valor: -100, categoria: "9.1" },
  ];
  const d = dre({ movimentos, plano: PLANO, impostos: { aliquota_media_pct: 6 }, saldoInicio: 10000, saldoFim: 21800 });
  const l = Object.fromEntries(d.linhas.map((x) => [x.id, x]));
  assert.equal(l.rl.valor, 47000);
  assert.equal(l.mc.valor, 22000);
  assert.equal(l.mc.pct, 46.8);
  assert.equal(l.operacional.valor, 19000);
  assert.equal(l.operacional.pct, 40.4);
  assert.equal(l.resultado.valor, 19000 - 6000 - 900 - 100);
  assert.equal(d.transferencias, 0);
  assert.deepEqual(d.pendentes, { quantidade: 1, entradas: 0, saidas: -200 });
  assert.equal(d.completo, false);
  assert.ok(d.avisos.some((a) => a.startsWith("DRE INCOMPLETO")) && d.avisos.some((a) => /pessoal/.test(a)));
  assert.equal(d.conferencia.bate, true, "11.800 de variação = soma dos lançamentos");
  assert.equal(d.imposto.estimadoSobreReceita, 3000);
  const vazio = dre({ movimentos: [], plano: PLANO });
  assert.ok(vazio.avisos[0].startsWith("LACUNA"));
  assert.equal(agrupar([{ valor: 10, categoria: "1.1" }], PLANO).categorias[0].valor, 10);
});

test("DRE mensal a partir do resumo do banco", () => {
  const m = dreMensal([{ mes: "2026-09", grupo: "receita", entradas: 1000, saidas: null }, { mes: "2026-09", grupo: "custo_variavel", entradas: null, saidas: -400 }, { mes: "2026-09", grupo: "despesa_fixa", entradas: null, saidas: -300 }]);
  assert.equal(m[0].margemContribuicaoPct, 60);
  assert.equal(m[0].margemOperacionalPct, 30);
});

test("indicadores: valores com fórmula e meta da Política; sem extrato = LACUNA (nunca zero)", () => {
  const base = {
    hoje: "2026-10-05", resumo_mensal: [], saldos: [{ nome: "C", saldo: null }], recorrentes: [{ plano_conta: "4.2", valor: 3000 }],
    vendas: [{ total: 60000, cliente: "CLI-1" }, { total: 30000, cliente: "CLI-2" }, { total: 10000, cliente: "CLI-1" }],
    parcelas: [{ vencimento: "2026-08-01", valor: 2000, estado: "aberta" }, { vencimento: "2026-10-20", valor: 8000, estado: "aberta" }],
    contas_abertas: [{ vencimento: "2026-10-10", valor: 1000 }], alertas_exposicao: 0, impostos: {},
  };
  const r = indicadores(base);
  const i = Object.fromEntries(r.indicadores.map((x) => [x.id, x]));
  assert.equal(i.vendido.valor, 100000);
  assert.equal(i.ticket_medio.valor, 33333.33);
  assert.equal(i.ticket_medio.situacao, "atencao");
  assert.equal(i.concentracao.valor, 70);
  assert.equal(i.recebido.situacao, "lacuna");
  assert.equal(i.recebido.valor, null);
  assert.equal(i.inadimplencia.situacao, "lacuna");
  assert.equal(i.a_receber.valor, 10000);
  assert.deepEqual(i.a_receber.detalhe, { a_vencer: 8000, ate30: 0, de31a60: 0, acima60: 2000 });
  assert.equal(i.reserva.situacao, "lacuna");
  const comExtrato = indicadores({ ...base, saldos: [{ nome: "C", saldo: 4500 }], resumo_mensal: [{ mes: "2026-09", grupo: "receita", entradas: 100000 }, { mes: "2026-09", grupo: "custo_variavel", saidas: -60000 }, { mes: "2026-09", grupo: "despesa_fixa", saidas: -30000 }] },
    { diagnostico: { total: 100000, aceitos: [{ total: 15000, margem: { pct: 22 } }, { total: 85000, margem: { pct: 40 } }] } });
  const j = Object.fromEntries(comExtrato.indicadores.map((x) => [x.id, x]));
  assert.equal(j.mc_consolidada.valor, 40);
  assert.equal(j.margem_operacional.valor, 10);
  assert.equal(j.margem_operacional.situacao, "atencao");
  assert.equal(j.inadimplencia.valor, 2);
  assert.equal(j.inadimplencia.situacao, "risco");
  assert.equal(j.reserva.valor, 1.5);
  assert.equal(j.abaixo_minima.valor, 15);
  assert.equal(j.abaixo_minima.situacao, "risco");
});

test("base de preços: todos os orçamentos (versões contam uma vez), margem dos produtos, itens não aprovados, horas e condição", async () => {
  const { qualidadeDaBase } = await import("../../apps/web/js/domain/base_orcamentos.js");
  const lin = (preco, custo, qtd = 1, tipo = "goods") => ({ nome: tipo === "goods" ? "Interruptor touch" : "Instalação da automação", qtd, preco, total: preco * qtd, tipo, custo, unidade: tipo === "goods" ? "un" : "Hr" });
  const orc = [
    { numero: "EST-2", data: "2026-09-10", status: "draft", cliente: "CLI-1", total: 3000, imposto: 0, condicao_pagamento: false, linhas: [lin(200, 100, 10), lin(100, 50, 10, "service")] },
    { numero: "EST-1", data: "2026-09-05", status: "draft", cliente: "CLI-1", total: 2500, imposto: 0, condicao_pagamento: false, linhas: [lin(150, 100, 10), lin(100, 50, 10, "service")] },
    { numero: "EST-3", data: "2026-08-01", status: "accepted", cliente: "CLI-2", total: 1300, imposto: 0, condicao_pagamento: true, linhas: [lin(130, 100, 10)] },
  ];
  const r = qualidadeDaBase(orc, { tProduto: 5, tServico: 8, v: 10, custoHora: 30, produtividade: 100 }, []);
  assert.equal(r.resumo.projetos, 2, "EST-1 é versão do EST-2 (mesmo cliente em 10 dias)");
  assert.deepEqual(r.resumo.por_situacao, { draft: 1, accepted: 1 });
  assert.equal(r.resumo.pct_sem_condicao_de_pagamento, 50);
  assert.equal(r.resumo.pct_sem_imposto_no_preco, 100);
  assert.equal(r.piores[0].numero, "EST-3", "1,3× o custo é o pior");
  assert.ok(r.piores[0].itens_abaixo_25 === 1);
  assert.equal(r.resumo.produtividade_usada, 65, "produtividade irreal (100%) é comparada com 65%");
});

test("condição sugerida: sinal cobre material + RT/comissão pagas na assinatura; texto ao cliente não cita custos internos", async () => {
  const { condicaoSugerida } = await import("../../apps/web/js/domain/condicao.js");
  const sem = condicaoSugerida({ custoProdutos: 20000, total: 100000, entradaMinima: 40, hoje: new Date("2026-10-06T12:00:00Z") });
  const com = condicaoSugerida({ custoProdutos: 20000, total: 100000, entradaMinima: 40, pagoNaAssinatura: 15000, hoje: new Date("2026-10-06T12:00:00Z") });
  assert.equal(sem.sinal, 40);
  assert.equal(com.sinal, 40, "22.000 + 15.000 = 37% → 40% (mínimo)");
  const alto = condicaoSugerida({ custoProdutos: 40000, total: 100000, entradaMinima: 40, pagoNaAssinatura: 15000 });
  assert.equal(alto.sinal, 60, "44.000 + 15.000 = 59% → 60%");
  assert.ok(!/RT|comiss|custos de venda/i.test(alto.texto));
});
