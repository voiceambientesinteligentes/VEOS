// INDICADORES CORPORATIVOS da Politica de Saude Financeira V1 (sec.13) e reserva (sec.12). Sem DOM.
// Cada indicador traz formula, valor (ou LACUNA com o motivo), meta quando a Politica define e a fonte.
// Metas so as escritas na Politica; o resto e acompanhamento (sem meta inventada).
import { dreMensal } from "./dre.js";
import { reserva } from "./caixa13.js";

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
const dias = (a, b) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 864e5);

function aging(itens, hoje, campoData = "vencimento") {
  const f = { a_vencer: 0, ate30: 0, de31a60: 0, acima60: 0 };
  for (const x of itens) {
    const atraso = dias(hoje, x[campoData]);
    const v = Number(x.valor);
    if (atraso <= 0) f.a_vencer += v; else if (atraso <= 30) f.ate30 += v; else if (atraso <= 60) f.de31a60 += v; else f.acima60 += v;
  }
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, r2(v)]));
}

/** d = resposta de GET /caixa/indicadores; extras = {fluxo (projetar), diagnostico (resumir)} opcionais. */
export function indicadores(d, extras = {}) {
  const hoje = d.hoje;
  const meses = dreMensal(d.resumo_mensal).filter((m) => m.mes < hoje.slice(0, 7) || true);
  const temExtrato = meses.some((m) => m.receita !== 0 || m.despesa_fixa !== 0 || m.custo_variavel !== 0);
  const soma = (k) => r2(meses.reduce((s, m) => s + (m[k] ?? 0), 0));
  const receita12 = soma("receita"), rl12 = r2(receita12 + soma("deducao")), mc12 = r2(rl12 + soma("custo_variavel")), op12 = r2(mc12 + soma("despesa_fixa"));
  const vendas = d.vendas ?? [];
  const vendido = r2(vendas.reduce((s, v) => s + v.total, 0));
  const abertas = (d.parcelas ?? []).filter((p) => p.estado === "aberta");
  const recebidas = (d.parcelas ?? []).filter((p) => p.estado === "recebida" && p.recebido_em);
  const aReceber = r2(abertas.reduce((s, p) => s + Number(p.valor), 0));
  const aPagar = r2((d.contas_abertas ?? []).reduce((s, k) => s + Number(k.valor), 0));
  const vencidas30 = r2(abertas.filter((p) => dias(hoje, p.vencimento) > 30).reduce((s, p) => s + Number(p.valor), 0));
  const atrasoMedio = recebidas.length ? r1(recebidas.reduce((s, p) => s + dias(p.recebido_em, p.vencimento), 0) / recebidas.length) : null;
  const porCliente = new Map();
  for (const v of vendas) porCliente.set(v.cliente, (porCliente.get(v.cliente) ?? 0) + v.total);
  const ranking = [...porCliente.entries()].sort((a, b) => b[1] - a[1]);
  const saldo = (d.saldos ?? []).filter((s) => s.saldo !== null).reduce((t, s) => t + Number(s.saldo), 0);
  const temSaldo = (d.saldos ?? []).some((s) => s.saldo !== null);
  const res = reserva({ recorrentes: d.recorrentes ?? [], fixosFormulario: d.impostos?.fixos_formulario ?? null, retirada: d.impostos?.retirada_formulario ?? null });
  const lac = (motivo) => ({ valor: null, situacao: "lacuna", lacuna: motivo });
  const SEM_EXTRATO = "importe e classifique o extrato bancário (Caixa e extrato)";
  const ind = [];
  const add = (o) => ind.push({ meta: null, situacao: "info", ...o });

  add({ id: "vendido", nome: "Vendido em 12 meses (orçamentos aceitos)", formula: "soma dos orçamentos aceitos ou faturados no Zoho nos últimos 365 dias", valor: vendido, unidade: "R$", fonte: "Zoho Books (espelho)", nota: "É venda fechada, não faturamento: faturamento exige NF registrada no pedido." });
  add({ id: "recebido", nome: "Receita recebida em 12 meses", formula: "entradas do extrato classificadas como receita (grupo 1)", unidade: "R$", fonte: "extrato bancário", ...(temExtrato ? { valor: receita12 } : lac(SEM_EXTRATO)) });
  add({ id: "receita_liquida", nome: "Receita líquida (12 meses)", formula: "receita − impostos, taxas e estornos (Política V1 sec.4)", unidade: "R$", fonte: "extrato bancário", ...(temExtrato ? { valor: rl12 } : lac(SEM_EXTRATO)) });
  const mcPct = rl12 > 0 ? r1((mc12 / rl12) * 100) : null;
  add({ id: "mc_consolidada", nome: "Margem de contribuição consolidada", formula: "(receita líquida − custos variáveis) ÷ receita líquida", unidade: "%", meta: "projeto: alvo 35%, mínimo 30% (sec.3)", fonte: "extrato bancário", ...(mcPct !== null ? { valor: mcPct, situacao: mcPct >= 35 ? "ok" : mcPct >= 30 ? "atencao" : "risco" } : lac(SEM_EXTRATO)) });
  const opPct = rl12 > 0 ? r1((op12 / rl12) * 100) : null;
  add({ id: "margem_operacional", nome: "Margem operacional", formula: "(margem de contribuição − despesas fixas) ÷ receita líquida", unidade: "%", meta: "12% a 15% ou mais (sec.13, meta inicial)", fonte: "extrato bancário", ...(opPct !== null ? { valor: opPct, situacao: opPct >= 12 ? "ok" : opPct >= 0 ? "atencao" : "risco" } : lac(SEM_EXTRATO)) });
  add({ id: "ticket_medio", nome: "Ticket médio (12 meses)", formula: "vendido ÷ número de orçamentos aceitos", unidade: "R$", meta: "desejado R$ 100.000 para projeto completo (sec.2, não é bloqueio)", fonte: "Zoho Books", ...(vendas.length ? { valor: r2(vendido / vendas.length), situacao: vendido / vendas.length >= 100000 ? "ok" : "atencao" } : lac("nenhum orçamento aceito em 12 meses")) });
  add({ id: "a_receber", nome: "Contas a receber (parcelas em aberto)", formula: "soma das parcelas abertas dos pedidos", unidade: "R$", fonte: "pedidos do VEOS", valor: aReceber, detalhe: aging(abertas, hoje), ...(d.parcelas?.length ? {} : { nota: "Nenhuma parcela lançada: crie os pedidos com as parcelas a partir dos orçamentos aceitos." }) });
  add({ id: "a_pagar", nome: "Contas a pagar (em aberto)", formula: "soma das contas a pagar abertas", unidade: "R$", fonte: "contas a pagar do VEOS", valor: aPagar, detalhe: aging(d.contas_abertas ?? [], hoje) });
  const recDia = receita12 > 0 ? receita12 / 365 : null;
  add({ id: "pmr", nome: "Prazo médio de recebimento", formula: "contas a receber ÷ receita recebida por dia (12 meses)", unidade: "dias", fonte: "pedidos + extrato", ...(recDia ? { valor: Math.round(aReceber / recDia) } : lac(SEM_EXTRATO)), nota: atrasoMedio !== null ? `Atraso médio das parcelas já recebidas: ${atrasoMedio} dia(s).` : null });
  add({ id: "inadimplencia", nome: "Inadimplência", formula: "parcelas vencidas há mais de 30 dias ÷ receita recebida em 12 meses", unidade: "%", meta: "abaixo de 2% da receita (sec.13)", fonte: "pedidos + extrato", ...(receita12 > 0 ? { valor: r1((vencidas30 / receita12) * 100), situacao: vencidas30 / receita12 < 0.02 ? "ok" : "risco" } : lac(SEM_EXTRATO)) });
  add({ id: "exposicao", nome: "Pedidos com exposição de caixa acima de 10%", formula: "alertas ativos de exposição (Política V1.1 sec.9)", unidade: "pedidos", meta: "nenhum sem autorização da direção (V1 sec.11)", fonte: "vigia do fluxo", valor: d.alertas_exposicao ?? 0, situacao: (d.alertas_exposicao ?? 0) ? "risco" : "ok" });
  const nec = extras.fluxo?.necessidade;
  add({ id: "necessidade_caixa", nome: "Necessidade de caixa em 30 / 60 / 90 dias", formula: "quanto falta para o saldo projetado não ficar negativo (fluxo de 13 semanas)", unidade: "R$", fonte: "fluxo de 13 semanas", ...(nec && nec.d30 !== null ? { valor: nec.d90, detalhe: nec, situacao: nec.d90 > 0 ? "risco" : "ok" } : lac("falta saldo bancário para projetar")) });
  const top1 = ranking[0], top3 = ranking.slice(0, 3).reduce((s, x) => s + x[1], 0);
  add({ id: "concentracao", nome: "Concentração por cliente/arquiteto (12 meses)", formula: "vendido ao maior cliente ÷ vendido total (e os 3 maiores)", unidade: "%", fonte: "Zoho Books", ...(vendido > 0 ? { valor: r1((top1[1] / vendido) * 100), detalhe: { maior: top1[0], tres_maiores_pct: r1((top3 / vendido) * 100) } } : lac("nenhuma venda em 12 meses")), nota: "A Política manda acompanhar; não define limite." });
  const diag = extras.diagnostico;
  if (diag) {
    const abaixo = (diag.aceitos ?? []).filter((a) => a.margem && a.margem.pct < 30);
    const totalAb = r2(abaixo.reduce((s, a) => s + Number(a.total), 0));
    add({ id: "abaixo_minima", nome: "Faturamento em projetos abaixo de 30% de margem", formula: "total dos orçamentos aceitos com MC estimada < 30% ÷ total aceito", unidade: "%", meta: "no máximo 10% do faturamento do período (sec.13)", fonte: "diagnóstico do CFO (MC estimada)", nota: "Margem estimada orçamento a orçamento pelo diagnóstico do CFO; enquanto o contador não informar as alíquotas, o imposto é SIMULAÇÃO.", ...(diag.total > 0 ? { valor: r1((totalAb / diag.total) * 100), situacao: totalAb / diag.total <= 0.1 ? "ok" : "risco" } : lac("sem orçamentos aceitos")) });
  }
  const meses3 = res.fixosMes ? (temSaldo ? r1(saldo / res.fixosMes) : null) : null;
  add({ id: "reserva", nome: "Reserva de caixa em meses de custos fixos", formula: `saldo bancário ÷ custos fixos do mês (${res.origem ?? "sem base"})`, unidade: "meses", meta: "pelo menos 3 meses (sec.12)", fonte: "extrato + recorrentes", ...(meses3 !== null ? { valor: meses3, situacao: meses3 >= 3 ? "ok" : meses3 >= 1 ? "atencao" : "risco", detalhe: { saldo: r2(saldo), fixos_mes: res.fixosMes, meta_reais: res.meta } } : lac(!temSaldo ? "falta saldo bancário" : "faltam os custos fixos (recorrentes ou formulário)")) });
  return { indicadores: ind, meses, reserva: res, temExtrato };
}
