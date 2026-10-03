import assert from "node:assert/strict";
import { test } from "node:test";

import { analisar, resumir } from "../../apps/web/js/domain/diagnostico.js";
import { custoHora, custoNoBrasil, faixa, fatorMedido, fatorProduto, fatorRegra, faturamentoMinimo, margem, precoPolitica } from "../../apps/web/js/domain/formacao_preco.js";
import { numeroBR, parametros, progresso, SECOES } from "../../apps/web/js/domain/formulario_cfo.js";
import { calculadora } from "../../apps/web/js/domain/precificacao.js";

test("preço pela Política: a MC fica exatamente no alvo", () => {
  const p = precoPolitica(100, { t: 6, v: 0, alvo: 35 });
  assert.equal(p, 168.87); // 100 / (0,94 x (1 - 2% - 35%))
  const m = margem(p, 100, { t: 6 });
  assert.ok(m.pct >= 35 && m.pct < 35.1, JSON.stringify(m));
  assert.equal(faixa(m.pct), "VERDE");
  // com 3% de cartão/comissão o preço sobe
  assert.ok(precoPolitica(100, { t: 6, v: 3, alvo: 35 }) > p);
  // lacunas e impossibilidades
  assert.equal(precoPolitica(100, { t: null, alvo: 35 }), null);
  assert.equal(precoPolitica(0, { t: 6, alvo: 35 }), null);
  assert.equal(precoPolitica(100, { t: 6, v: 70, alvo: 35 }), null);
});

test("paridade com a Calculadora de Preços do VEOS (sem despesas variáveis)", () => {
  for (const [custo, t, alvo] of [[100, 6, 35], [2500, 11.33, 30], [87.9, 5.39, 25]]) {
    const r = calculadora({ materiais: BigInt(Math.round(custo * 100)), alvo: BigInt(alvo * 100), imposto: { num: BigInt(Math.round(t * 100)), den: 100n } });
    const nosso = precoPolitica(custo, { t, alvo });
    assert.ok(Math.abs(Number(r.preco) / 100 - nosso) <= 0.02, `${custo} ${t} ${alvo}: ${r.preco} x ${nosso}`);
  }
});

test("faixas da Política V1", () => {
  assert.deepEqual([35, 34.9, 30, 29.9, 25, 24.9, null].map(faixa), ["VERDE", "ACEITAVEL", "ACEITAVEL", "ATENCAO", "ATENCAO", "NAO APROVADO", "NAO RESOLVIDO"]);
});

test("importação: regra vigente, fator medido e custo no Brasil", () => {
  assert.equal(fatorRegra(150, 5), 1.205); // US$ 30: só ICMS 17% por dentro
  assert.equal(fatorRegra(500, 5), 1.566); // US$ 100: (100 + 30) / 0,83 / 100
  assert.equal(fatorRegra(100, null), null);
  const compras = [
    { unico: true, preco_unit: 100, quantidade: 1, total_pedido: 120.5, data: "2026-06-01" },
    { unico: true, preco_unit: 100, quantidade: 1, total_pedido: 144.6, data: "2026-01-01" },
    { unico: false, preco_unit: 100, quantidade: 1, total_pedido: 900, data: "2026-07-01" },
    { unico: true, preco_unit: 10, quantidade: 1, total_pedido: 60, data: "2026-08-01" }, // fora da faixa: pedido com outros itens
  ];
  assert.equal(fatorMedido(compras), 1.326);
  assert.deepEqual(fatorProduto({ custo: 100, compras }), { fator: 1.205, origem: "medido no pedido de 2026-06-01" });
  assert.equal(fatorProduto({ custo: 100, compras }, { manual: 1.3 }).fator, 1.3);
  const conflito = fatorProduto({ custo: 100, compras }, { incluiImpostos: "sim" });
  assert.equal(conflito.fator, 1.205); // o pedido real vence a resposta, com aviso
  assert.ok(conflito.conflito);
  assert.equal(fatorProduto({ custo: 100, compras: [] }, { incluiImpostos: "sim" }).fator, 1);
  assert.equal(fatorProduto({ custo: 500, compras: [] }, { cambio: 5 }).fator, 1.566);
  assert.equal(fatorProduto({ custo: 90, compras: [] }).origem, "mediana dos seus pedidos após 12/05/2026");
  assert.equal(fatorProduto({ custo: 6000, compras: [] }).fator, null); // caro e sem câmbio: lacuna
  assert.equal(fatorProduto({ custo: 90, compras }, { compra: "cnpj" }).fator, 1.928);
  assert.equal(custoNoBrasil(100, { fator: 1.205, perdas: 2 }), 122.91);
  assert.equal(custoNoBrasil(100, { fator: null }), null);
});

test("custo da hora e faturamento mínimo", () => {
  const r = custoHora({
    equipe: [
      { nome: "Técnico", vinculo: "clt", valor: 3000, encargos_pct: 40, beneficios: 600, horas_mes: 176, campo_pct: 100 },
      { nome: "Fernando", vinculo: "socio", valor: 8000, horas_mes: 200, campo_pct: 50 },
    ],
    operacao: 1400, produtividade: 70,
  });
  // (3000*1,4 + 600) + 8000*0,5 + 1400 = 10.200 ; horas (176 + 100) x 0,7 = 193,2
  assert.equal(r.custoMensal, 10200);
  assert.equal(r.horasVendaveis, 193);
  assert.equal(r.custoHora, 52.8);
  const falta = custoHora({ equipe: [{ nome: "X", vinculo: "clt", valor: 3000, horas_mes: 176, campo_pct: 100 }], produtividade: 70 });
  assert.equal(falta.custoHora, null);
  assert.match(falta.lacunas[0], /encargos/);
  assert.equal(faturamentoMinimo({ fixos: 10000, proLabore: 8000, dividas: 3000, mcPct: 35, t: 6 }), 63829.79);
  assert.equal(faturamentoMinimo({ fixos: null, mcPct: 35, t: 6 }), null);
});

const ORC = {
  numero: "EST-T1", data: "2026-01-10", status: "accepted", cliente: "Cliente TESTE", vendedor: "Arquiteto TESTE",
  desconto: 1000, ajuste: -10, total: 8990, imposto: 0, condicao_pagamento: false,
  linhas: [
    { nome: "Interruptor", qtd: 10, preco: 300, total: 3000, tipo: "goods", custo: 150 },
    { nome: "Módulo", qtd: 2, preco: 100, total: 200, tipo: "goods", custo: 120 },
    { nome: "Brinde", qtd: 1, preco: 0, total: 0, tipo: "goods", custo: 500 },
    { nome: "Instalação", qtd: 20, preco: 300, total: 6000, tipo: "service", custo: 1, unidade: "Hr" },
    { nome: "Sem custo", qtd: 1, preco: 800, total: 800, tipo: "goods", custo: 0 },
  ],
};

test("diagnóstico: sinais de cada orçamento", () => {
  const a = analisar(ORC, {});
  assert.equal(a.bruto, 10000);
  assert.equal(a.desconto, 1010);
  assert.equal(a.descPct, 10.1);
  for (const s of ["DESCONTO_ANALISE", "ABAIXO_DO_CUSTO", "PRECO_ZERO", "SEM_CUSTO", "SEM_IMPOSTO", "SEM_CONDICAO", "INDICADOR"]) assert.ok(a.sinais.includes(s), s);
  assert.ok(!a.sinais.includes("MAO_DE_OBRA_DADA"));
  assert.equal(a.horas, 20);
  assert.equal(a.margem, null); // sem impostos: lacuna, nunca zero
  assert.deepEqual(a.lacunas, ["impostos", "custo de produto", "custo da hora"]);
  const b = analisar({ ...ORC, desconto: 5900, linhas: ORC.linhas.filter((l) => l.custo !== 0), vendedor: "VOICE AMBIENTES INTELIGENTES", imposto: 10, condicao_pagamento: true }, { tProduto: 6, tServico: 6, v: 0, custoHora: 60 });
  assert.ok(b.sinais.includes("MAO_DE_OBRA_DADA"));
  assert.ok(!b.sinais.includes("INDICADOR") && !b.sinais.includes("SEM_IMPOSTO"));
  assert.equal(b.margemCompleta, true);
  assert.equal(b.custoMO, 1200);
});

test("diagnóstico: resumo da carteira", () => {
  const r = resumir([ORC, { ...ORC, numero: "EST-T2", status: "declined" }, { ...ORC, numero: "EST-T3", status: "draft" }]);
  assert.equal(r.quantidade, 1);
  assert.equal(r.conversaoPct, 50);
  assert.equal(r.acimaAlcada, 1);
  assert.ok(["DESCONTO_ANALISE", "ABAIXO_DO_CUSTO"].includes(r.sinais[0].id));
});

test("formulário: progresso e parâmetros (lacunas explícitas)", () => {
  assert.equal(SECOES.length, 10);
  assert.equal(numeroBR("1.234,56"), 1234.56);
  assert.equal(numeroBR("6%"), 6);
  assert.equal(numeroBR("4.000"), 4000);
  assert.equal(numeroBR("1.205"), 1205);
  assert.equal(numeroBR("1,205"), 1.205);
  assert.equal(numeroBR(""), null);
  const vazio = parametros({});
  assert.equal(vazio.tProduto, null);
  assert.ok(vazio.lacunas.length >= 4);
  const resp = {
    impostos: { dados: { aliquota_produto_pct: "5,39", aliquota_servico_pct: "6" }, em: "2026-10-02T12:00:00Z", autor_nome: "Fernando TESTE" },
    vendas: { dados: { taxa_cartao_pct: "4", vendas_cartao_pct: "50", comissao_vendedor_pct: "0", paga_indicacao: "sim", indicacao_pct: "5" } },
    equipe: { dados: { pessoas: [{ nome: "T", vinculo: "pj", valor: "4.000", horas_mes: "160", campo_pct: "100" }], produtividade_pct: "75", veiculo_mes: "800" } },
    fixos: { dados: { itens: [{ descricao: "Aluguel", valor: "3.000" }, { descricao: "Contador", valor: "900" }], pro_labore: "6000" } },
    dividas: { dados: { lista: [{ credor: "Receita", saldo: "20.000", parcela: "700" }, { credor: "Cartão", saldo: "8.000", parcela: "1.000" }] } },
  };
  const p = parametros(resp);
  assert.equal(p.tProduto, 5.39);
  assert.equal(p.v, 7); // 4% x 50% + 5% de indicação
  assert.equal(p.hora.custoHora, 40);
  assert.equal(p.fixos, 3900);
  assert.equal(p.parcelasMes, 1700);
  assert.equal(p.saldoDividas, 28000);
  assert.deepEqual(p.lacunas, []);
  const pr = progresso(resp);
  assert.equal(pr.find((x) => x.id === "impostos").feitos, 2);
  assert.equal(pr.find((x) => x.id === "pedidos").feitos, 0);
});
