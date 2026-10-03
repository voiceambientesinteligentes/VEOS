// Analise detalhada de UM orcamento pelo CFO e pelo COO: produto (preco cobrado x preco minimo da
// Politica com imposto, comissao e indicacao), mao de obra (horas cobradas x horas calculadas pela
// composicao dos equipamentos com os tempos-padrao) e margem total. Sem DOM.
import { margem, precoPolitica } from "./formacao_preco.js";
import { composicao, minutosItem } from "./tempos.js";

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * p = { tProduto, tServico, v, custoHora, produtividade (%), comissionamento (%), entregaHoras, metrosPorPonto }
 * Faltando imposto, a margem fica null (lacuna). Faltando custo-hora, a MO sai sem custo (lacuna).
 */
export function analisarOrcamento(o, p, catalogo = []) {
  const linhas = o.linhas ?? [];
  const bens = linhas.filter((l) => l.tipo === "goods");
  const serv = linhas.filter((l) => l.tipo === "service");
  const outros = linhas.filter((l) => l.tipo !== "goods" && l.tipo !== "service");
  const temImposto = p.tProduto !== null && p.tProduto !== undefined && p.tServico !== null && p.tServico !== undefined;
  const v = p.v ?? 0;

  // ---------------- produtos
  let venda = 0, custo = 0, semCusto = 0;
  const abaixo = [];
  for (const l of bens) {
    venda += Number(l.total) || 0;
    const c = Number(l.custo) > 1 ? Number(l.custo) : null;
    if (c === null) { semCusto += Number(l.total) || 0; continue; }
    custo += c * (Number(l.qtd) || 0);
    if (temImposto) {
      const meta = precoPolitica(c, { t: p.tProduto, v, alvo: 35 });
      const m = margem(Number(l.preco), c, { t: p.tProduto, v });
      if (Number(l.preco) === 0) abaixo.push({ nome: l.nome, preco: 0, custo: c, mc: null, meta, qtd: Number(l.qtd) });
      else if (m && m.pct < 30) abaixo.push({ nome: l.nome, preco: Number(l.preco), custo: c, mc: m.pct, meta, qtd: Number(l.qtd) });
    }
  }
  const produtos = {
    venda: r2(venda), custo: r2(custo), semCusto: r2(semCusto), multiplicador: custo > 0 ? r2(venda / custo) : null,
    mc: temImposto && venda > 0 ? margem(venda - semCusto, custo, { t: p.tProduto, v }) : null,
    precoMeta: temImposto && custo > 0 ? precoPolitica(custo, { t: p.tProduto, v, alvo: 35 }) : null,
    abaixo,
  };

  // ---------------- mao de obra
  const comp = composicao(linhas, catalogo, { metrosPorPonto: p.metrosPorPonto ?? 25 });
  const cena = catalogo.find((c) => c.dispositivo === "cena" && minutosItem(c) !== null);
  const interruptores = comp.linhas.filter((x) => x.dispositivo === "interruptor").reduce((a, x) => a + x.qtd, 0);
  const minCenas = cena ? minutosItem(cena) * interruptores : 0; // hipotese: uma cena por interruptor
  const horasPadrao = (comp.minutos + minCenas) / 60;
  const comiss = (p.comissionamento ?? 10) / 100;
  const entrega = horasPadrao > 0 ? (p.entregaHoras ?? (horasPadrao > 4 ? 2 : 0.5)) : 0;
  const prod = (p.produtividade ?? 65) / 100;
  const horasReais = horasPadrao > 0 ? (horasPadrao * (1 + comiss) + entrega) / prod : 0;
  const valorServ = serv.reduce((a, l) => a + (Number(l.total) || 0), 0);
  const horasCobradas = comp.horasCobradas;
  const custoMO = p.custoHora ? horasReais * p.custoHora : null;
  const mo = {
    valor: r2(valorServ), horasCobradas, porHora: horasCobradas > 0 ? r2(valorServ / horasCobradas) : null,
    horasPadrao: r1(horasPadrao), horasReais: r1(horasReais), diferencaHoras: horasCobradas > 0 && horasReais > 0 ? r1(horasCobradas - horasReais) : null,
    custo: custoMO === null ? null : r2(custoMO),
    precoHoraMeta: temImposto && p.custoHora ? precoPolitica(p.custoHora, { t: p.tServico, v, alvo: 35 }) : null,
    precoMeta: temImposto && custoMO ? precoPolitica(custoMO, { t: p.tServico, v, alvo: 35 }) : null,
    faltam: comp.faltam, linhas: comp.linhas, fechados: comp.fechados, valorFechado: comp.valorFechado, metrosRede: comp.metrosRede, premissas: { produtividade: prod * 100, comissionamento: comiss * 100, entrega, cenas: cena ? `${interruptores} cena(s) de ${minutosItem(cena)} min` : null },
  };

  // ---------------- total
  const total = Number(o.total) || venda + valorServ;
  const t = temImposto ? (venda * p.tProduto + (total - venda) * p.tServico) / Math.max(1, total) : null;
  const mcTotal = temImposto && total > 0 ? margem(total, custo + (custoMO ?? 0), { t, v }) : null;

  // ---------------- pontos de atencao
  const pontos = [];
  if (!(Number(o.imposto) > 0)) pontos.push("Imposto não está no preço (o orçamento não destaca nem embute imposto).");
  if (!o.condicao_pagamento) pontos.push("Sem condição de pagamento: falta sinal que cubra o material, parcelas por etapa e validade da proposta.");
  if (produtos.mc && produtos.mc.pct < 30) pontos.push(`Produtos com margem de ${String(produtos.mc.pct).replace(".", ",")}%: abaixo do mínimo de 30% depois de imposto e ${String(v).replace(".", ",")}% de cartão, comissão e indicação.`);
  if (abaixo.length) pontos.push(`${abaixo.length} item(ns) abaixo de 30% de margem.`);
  if (semCusto > 0) pontos.push("Há produto sem custo cadastrado: margem incompleta.");
  if (outros.length) pontos.push("Há linhas sem cadastro de item (valor global): não dá para conferir custo.");
  if (mo.diferencaHoras !== null && Math.abs(mo.diferencaHoras) > Math.max(2, horasReais * 0.25)) pontos.push(mo.diferencaHoras > 0 ? `Horas cobradas ${r1(mo.diferencaHoras)} h acima do calculado: confira se há serviço fora do catálogo (ou risco de perder a venda no preço).` : `Horas cobradas ${r1(-mo.diferencaHoras)} h abaixo do calculado: risco de trabalhar de graça.`);
  if (horasCobradas === 0 && horasReais > 1) pontos.push(`Mão de obra sem horas no orçamento: pelo catálogo seriam ${r1(horasReais)} h.`);
  if (comp.faltam.length) pontos.push(`Sem tempo no catálogo para: ${comp.faltam.map((f) => f.dispositivo).join(", ")}.`);
  if (serv.some((l) => !/^h(r|ora)s?$/i.test(String(l.unidade ?? "").trim()))) pontos.push("Há serviço cobrado por unidade/caixa sem horas: difícil comparar com o custo.");
  return { numero: o.numero, cliente: o.cliente, data: o.data, status: o.status, total: r2(total), produtos, mo, mcTotal, pontos, temImposto };
}
