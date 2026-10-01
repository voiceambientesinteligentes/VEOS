// Formacao de preco pelo metodo de markup (Sebrae): Markup = 100 / [100 - (DV + DF + ML)].
// DV = despesas variaveis (% sobre a venda: impostos, comissao, taxas), DF = despesas fixas
// (% do faturamento), ML = margem de lucro desejada (%). Preco = custo x markup.
// E SIMULACAO: os percentuais da VOICE ainda nao foram definidos (lacuna); preco de tabela so
// vale quando registrado por quem tem alcada. Fonte: Sebrae (ver referencia na Biblioteca).

const pct = (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", ".")));

export function markup(dv, df, ml) {
  const [a, b, c] = [pct(dv), pct(df), pct(ml)];
  if ([a, b, c].some((x) => x === null || Number.isNaN(x) || x < 0)) return null;
  const soma = a + b + c;
  if (soma >= 100) return null; // nao existe preco que cubra 100% ou mais da venda
  return 100 / (100 - soma);
}

/** Custo de aquisicao: preco pago + frete e impostos de importacao rateados por unidade (quando conhecidos). */
export function custoAquisicao(precoPago, freteUnit, impostosUnit) {
  const p = Number(precoPago);
  if (!(p > 0)) return null;
  return Math.round((p + (Number(freteUnit) || 0) + (Number(impostosUnit) || 0)) * 100) / 100;
}

export function precoSugerido(custo, dv, df, ml) {
  const m = markup(dv, df, ml);
  if (m === null || !(Number(custo) > 0)) return null;
  return { markup: Math.round(m * 10000) / 10000, preco: Math.round(Number(custo) * m * 100) / 100 };
}
