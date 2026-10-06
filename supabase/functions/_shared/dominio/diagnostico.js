// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/diagnostico.js - nao editar a mao.
// Diagnostico dos orcamentos do Zoho pelo CFO: o que cada orcamento aceito fez com preco, desconto,
// mao de obra, imposto e margem, contra a Politica V1. Entrada = orcamentos resumidos pela API
// (sem DOM). Custo de produto = custo de compra do item no Zoho (lacuna quando 0/1 ou ausente);
// custo de mao de obra = horas vendidas x custo-hora do formulario (lacuna sem ele).
import { faixa, margem } from "./formacao_preco.js";

const VOICE = /^(|voice ambientes inteligentes|padr[aã]o)$/i;
const r2 = (v) => Math.round(v * 100) / 100;
const p1 = (v) => Math.round(v * 10) / 10;

export const SINAIS = {
  DESCONTO_ANALISE: { texto: "Desconto acima de 5%: pela Política exigiria nova análise financeira completa", peso: 3 },
  DESCONTO_DIRECAO: { texto: "Desconto entre 2% e 5%: exigiria autorização da direção", peso: 1 },
  MAO_DE_OBRA_DADA: { texto: "Mão de obra listada e depois tirada no desconto (serviço praticamente dado)", peso: 3 },
  ABAIXO_DO_CUSTO: { texto: "Item vendido abaixo do custo de compra", peso: 3 },
  PRECO_ZERO: { texto: "Item com custo entregue a preço zero", peso: 2 },
  SEM_CUSTO: { texto: "Produto sem custo cadastrado: margem não verificável", peso: 1 },
  VALOR_GLOBAL: { texto: "Valor fechado numa linha só, sem itens: custo e margem não verificáveis", peso: 2 },
  SEM_IMPOSTO: { texto: "Nenhum imposto considerado no orçamento", peso: 2 },
  SEM_CONDICAO: { texto: "Orçamento sem condição de pagamento (entrada, parcelas, fases)", peso: 2 },
  INDICADOR: { texto: "Indicador/arquiteto no campo vendedor: confirmar se houve comissão ou RT fora da conta", peso: 1 },
  MARGEM_PISO: { texto: "Margem estimada abaixo de 25% (não aprovável pela Política)", peso: 3 },
  MARGEM_ATENCAO: { texto: "Margem estimada entre 25% e 30% (exigiria direção)", peso: 2 },
};

/** Analisa um orcamento. p = { tProduto, tServico, v, custoHora } (% e R$; null = lacuna). */
export function analisar(o, p = {}) {
  let bens = 0, servicos = 0, outros = 0, custoBens = 0, semCusto = 0, horas = 0, servicoSemHora = 0;
  const sinais = new Set();
  const itens = [];
  for (const l of o.linhas ?? []) {
    const total = Number(l.total) || 0;
    const custo = Number(l.custo) > 1 ? Number(l.custo) : null;
    if (l.tipo === "service") {
      servicos += total;
      if (/^h(r|ora)s?$/i.test(String(l.unidade ?? "").trim())) horas += Number(l.qtd) || 0;
      else servicoSemHora += total;
    } else if (l.tipo === "goods") {
      bens += total;
      if (custo === null) { semCusto += total; if (total > 0) sinais.add("SEM_CUSTO"); }
      else {
        custoBens += custo * (Number(l.qtd) || 0);
        if (Number(l.preco) === 0) { sinais.add("PRECO_ZERO"); itens.push({ nome: l.nome, problema: "preço zero", custo: r2(custo * (Number(l.qtd) || 0)) }); }
        else if (Number(l.preco) < custo) { sinais.add("ABAIXO_DO_CUSTO"); itens.push({ nome: l.nome, problema: "abaixo do custo", preco: Number(l.preco), custo }); }
      }
    } else outros += total;
  }
  const bruto = bens + servicos + outros;
  const ajusteNeg = Math.min(0, Number(o.ajuste) || 0);
  const desconto = (Number(o.desconto) || 0) - ajusteNeg;
  const descPct = bruto > 0 ? p1((desconto / bruto) * 100) : 0;
  if (descPct > 5) sinais.add("DESCONTO_ANALISE"); else if (descPct > 2) sinais.add("DESCONTO_DIRECAO");
  if (servicos > 0 && desconto >= 0.8 * servicos) sinais.add("MAO_DE_OBRA_DADA");
  if (bruto > 0 && outros >= 0.5 * bruto) sinais.add("VALOR_GLOBAL");
  if (!(Number(o.imposto) > 0)) sinais.add("SEM_IMPOSTO");
  if (!o.condicao_pagamento) sinais.add("SEM_CONDICAO");
  if (!VOICE.test(String(o.vendedor ?? "").trim())) sinais.add("INDICADOR");

  // Margem estimada: a receita (ja com desconto) e repartida entre produto e servico pelo bruto.
  const total = Number(o.total) || 0;
  const recBens = bruto > 0 ? total * (bens / bruto) : 0;
  const recServ = total - recBens;
  const lacunas = [];
  if (p.tProduto === null || p.tProduto === undefined || p.tServico === null || p.tServico === undefined) lacunas.push("impostos");
  if (semCusto > 0) lacunas.push("custo de produto");
  if (outros > 0) lacunas.push("itens sem cadastro");
  const custoMO = horas > 0 ? (p.custoHora ? horas * p.custoHora : null) : 0;
  if (custoMO === null) lacunas.push("custo da hora");
  if (servicoSemHora > 0) lacunas.push("serviço sem horas");
  let m = null;
  if (!lacunas.includes("impostos") && total > 0) {
    const t = total > 0 ? (recBens * p.tProduto + recServ * p.tServico) / total : 0;
    m = margem(total, custoBens + (custoMO ?? 0), { t, v: p.v ?? 0 });
  }
  const completa = m !== null && lacunas.length === 0;
  if (m && completa) { if (m.pct < 25) sinais.add("MARGEM_PISO"); else if (m.pct < 30) sinais.add("MARGEM_ATENCAO"); }
  return {
    numero: o.numero, data: o.data, status: o.status, cliente: o.cliente, vendedor: o.vendedor,
    bruto: r2(bruto), desconto: r2(desconto), descPct, total: r2(total), bens: r2(bens), servicos: r2(servicos), outros: r2(outros),
    custoBens: r2(custoBens), margemBensPct: bens > 0 && semCusto === 0 ? p1(((bens - custoBens) / bens) * 100) : null,
    horas, custoMO: custoMO === null ? null : r2(custoMO),
    margem: m, margemCompleta: completa, faixa: completa ? faixa(m.pct) : "NAO RESOLVIDO", lacunas,
    sinais: [...sinais], itens,
  };
}

/** Resumo da carteira de orcamentos aceitos: totais, descontos, mao de obra dada e sinais mais frequentes. */
export function resumir(orcamentos, p = {}) {
  const aceitos = orcamentos.filter((o) => o.status === "accepted" || o.status === "invoiced").map((o) => analisar(o, p));
  const soma = (k) => r2(aceitos.reduce((a, x) => a + (x[k] || 0), 0));
  const bruto = soma("bruto"), desconto = soma("desconto"), total = soma("total");
  const freq = {};
  for (const a of aceitos) for (const s of a.sinais) freq[s] = (freq[s] ?? 0) + 1;
  const moDada = aceitos.filter((a) => a.sinais.includes("MAO_DE_OBRA_DADA"));
  const status = {};
  for (const o of orcamentos) status[o.status] = (status[o.status] ?? 0) + 1;
  const decididos = (status.accepted ?? 0) + (status.invoiced ?? 0) + (status.declined ?? 0);
  return {
    aceitos, quantidade: aceitos.length, bruto, desconto, total, descPct: bruto > 0 ? p1((desconto / bruto) * 100) : 0,
    servicos: soma("servicos"), bens: soma("bens"),
    maoDeObraDada: { orcamentos: moDada.length, servicos: r2(moDada.reduce((a, x) => a + x.servicos, 0)) },
    acimaAlcada: aceitos.filter((a) => a.descPct > 5).length,
    sinais: Object.entries(freq).sort((a, b) => b[1] * SINAIS[b[0]].peso - a[1] * SINAIS[a[0]].peso).map(([id, n]) => ({ id, n, texto: SINAIS[id].texto })),
    status, conversaoPct: decididos ? p1((((status.accepted ?? 0) + (status.invoiced ?? 0)) / decididos) * 100) : null,
    margensCompletas: aceitos.filter((a) => a.margemCompleta).length,
  };
}
