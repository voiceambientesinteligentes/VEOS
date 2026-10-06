// DRE GERENCIAL DO MES (rotina proposta PL-048), pelo CAIXA REAL do extrato classificado no plano de
// contas. Sem DOM. Formula da Politica V1 sec.4: Receita Liquida = vendido - descontos - impostos;
// MC = RL - custos diretos e variaveis; margem operacional = (MC - despesas fixas) / RL (meta inicial
// 12-15%, sec.13). Transferencias entre contas nao sao receita nem despesa; o que nao foi classificado
// aparece como pendencia e o DRE fica marcado como incompleto.

const r2 = (v) => Math.round(v * 100) / 100;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

/** Soma por grupo e por categoria. movimentos [{valor, categoria}]; plano [{codigo, nome, grupo}]. */
export function agrupar(movimentos, plano) {
  const porCodigo = new Map(plano.map((p) => [p.codigo, p]));
  const grupos = {};
  const categorias = {};
  const pendentes = { quantidade: 0, entradas: 0, saidas: 0 };
  for (const m of movimentos) {
    const v = Number(m.valor);
    const p = m.categoria ? porCodigo.get(m.categoria) : null;
    if (!p) { pendentes.quantidade++; if (v > 0) pendentes.entradas += v; else pendentes.saidas += v; continue; }
    grupos[p.grupo] = r2((grupos[p.grupo] ?? 0) + v);
    const c = (categorias[p.codigo] ??= { codigo: p.codigo, nome: p.nome, grupo: p.grupo, valor: 0, quantidade: 0 });
    c.valor = r2(c.valor + v);
    c.quantidade++;
  }
  pendentes.entradas = r2(pendentes.entradas);
  pendentes.saidas = r2(pendentes.saidas);
  return { grupos, categorias: Object.values(categorias).sort((a, b) => a.codigo.localeCompare(b.codigo)), pendentes };
}

/**
 * DRE pelo caixa. g = grupos (somas com sinal: entradas +, saidas -).
 * impostos = {aliquota_media_pct, origem} para estimar o imposto da receita do mes (a pagar no dia 20 seguinte).
 */
export function dre({ movimentos = [], plano = [], impostos = null, saldoInicio = null, saldoFim = null }) {
  const { grupos: g, categorias, pendentes } = agrupar(movimentos, plano);
  const v = (k) => g[k] ?? 0;
  const receita = v("receita");
  const deducoes = v("deducao");
  const rl = r2(receita + deducoes);
  const variaveis = v("custo_variavel");
  const mc = r2(rl + variaveis);
  const fixas = v("despesa_fixa");
  const operacional = r2(mc + fixas);
  const retirada = v("retirada");
  const financeiro = v("financeiro");
  const investimento = v("investimento");
  const naoOperacional = v("nao_operacional");
  const resultadoCaixa = r2(operacional + retirada + financeiro + investimento + naoOperacional);
  const transferencias = v("transferencia");
  const soma = r2(movimentos.reduce((s, m) => s + Number(m.valor), 0));
  const aliq = Number(impostos?.aliquota_media_pct);
  const impostoEstimado = receita > 0 && Number.isFinite(aliq) ? r2((receita * aliq) / 100) : null;
  const variacao = saldoInicio !== null && saldoFim !== null ? r2(saldoFim - saldoInicio) : null;
  const linhas = [
    { id: "receita", nome: "Receita bruta recebida", valor: r2(receita), nivel: 0 },
    { id: "deducoes", nome: "(−) Impostos, taxas e estornos pagos", valor: r2(deducoes), nivel: 1 },
    { id: "rl", nome: "= Receita líquida", valor: rl, nivel: 0, destaque: true },
    { id: "variaveis", nome: "(−) Custos variáveis (equipamentos, frete, terceiros, comissão, RT)", valor: r2(variaveis), nivel: 1 },
    { id: "mc", nome: "= Margem de contribuição", valor: mc, pct: pct(mc, rl), nivel: 0, destaque: true },
    { id: "fixas", nome: "(−) Despesas fixas", valor: r2(fixas), nivel: 1 },
    { id: "operacional", nome: "= Resultado operacional", valor: operacional, pct: pct(operacional, rl), nivel: 0, destaque: true },
    { id: "retirada", nome: "(−) Retirada do sócio", valor: r2(retirada), nivel: 1 },
    { id: "financeiro", nome: "(±) Financeiro (juros, empréstimos, parcelamentos, rendimentos)", valor: r2(financeiro), nivel: 1 },
    { id: "investimento", nome: "(−) Investimentos", valor: r2(investimento), nivel: 1 },
    { id: "nao_operacional", nome: "(−) Despesas pessoais pagas pela empresa", valor: r2(naoOperacional), nivel: 1 },
    { id: "resultado", nome: "= Resultado de caixa do mês", valor: resultadoCaixa, nivel: 0, destaque: true },
  ];
  const avisos = [];
  if (!movimentos.length) avisos.push("LACUNA: nenhum lançamento de extrato no mês. Importe o extrato das contas da empresa.");
  if (pendentes.quantidade) avisos.push(`DRE INCOMPLETO: ${pendentes.quantidade} lançamento(s) sem categoria (entradas ${pendentes.entradas.toFixed(2)}, saídas ${pendentes.saidas.toFixed(2)}).`);
  if (naoOperacional) avisos.push("Há despesa pessoal paga pela conta da empresa: separe as contas (proposta PL-004).");
  if (receita > 0 && !categorias.some((c) => c.codigo === "2.1") && impostoEstimado !== null) avisos.push(`Nenhum imposto pago no mês: o imposto desta receita (estimado em ${impostoEstimado.toFixed(2)}) vence no dia 20 do mês seguinte.`);
  if (variacao !== null && Math.abs(variacao - soma) > 0.01) avisos.push(`Conferência: a variação do saldo (${variacao.toFixed(2)}) difere da soma dos lançamentos (${soma.toFixed(2)}). Falta extrato de algum período ou o saldo informado está desatualizado.`);
  return {
    linhas, categorias, pendentes, transferencias: r2(transferencias),
    indicadores: { receita: r2(receita), receitaLiquida: rl, margemContribuicao: mc, margemContribuicaoPct: pct(mc, rl), resultadoOperacional: operacional, margemOperacionalPct: pct(operacional, rl), resultadoCaixa },
    imposto: { estimadoSobreReceita: impostoEstimado, aliquota: Number.isFinite(aliq) ? aliq : null, origem: impostos?.origem ?? null },
    conferencia: { somaLancamentos: soma, variacaoSaldo: variacao, bate: variacao === null ? null : Math.abs(variacao - soma) <= 0.01 },
    completo: movimentos.length > 0 && pendentes.quantidade === 0,
    avisos,
  };
}

/** Resumo mensal (caixa_resumo_mensal) -> DRE resumido por mes, para indicadores e graficos. */
export function dreMensal(resumo) {
  const meses = {};
  for (const x of resumo ?? []) {
    const m = (meses[x.mes] ??= { mes: x.mes, receita: 0, deducao: 0, custo_variavel: 0, despesa_fixa: 0, retirada: 0, financeiro: 0, investimento: 0, nao_operacional: 0, transferencia: 0, a_classificar: 0 });
    m[x.grupo] = r2((m[x.grupo] ?? 0) + Number(x.entradas ?? 0) + Number(x.saidas ?? 0));
  }
  return Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes)).map((m) => {
    const rl = r2(m.receita + m.deducao), mc = r2(rl + m.custo_variavel), op = r2(mc + m.despesa_fixa);
    return { ...m, receitaLiquida: rl, margemContribuicao: mc, margemContribuicaoPct: pct(mc, rl), resultadoOperacional: op, margemOperacionalPct: pct(op, rl) };
  });
}
