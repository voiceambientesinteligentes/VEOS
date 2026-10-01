// Calculos do painel executivo e do grafico mensal (sem DOM, testaveis no Node).

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const rotuloMes = (ym) => `${MES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;

/** Escala "redonda" para o eixo: maximo e 3 marcas. */
export function escala(max) {
  if (!(max > 0)) return { topo: 1, marcas: [] };
  const passo0 = max / 3, base = 10 ** Math.floor(Math.log10(passo0));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * base).find((p) => p >= passo0);
  return { topo: passo * 3, marcas: [passo, passo * 2, passo * 3] };
}

export const soma = (xs) => (xs.some((x) => x !== null && x !== undefined) ? xs.reduce((t, x) => t + Number(x ?? 0), 0) : null);

export function resumoPainel(p) {
  const ultimos3 = p.meses.slice(-3);
  const fechados = p.orcamentos.filter((o) => ["accepted", "declined", "expired"].includes(o.status));
  const aceitos = p.orcamentos.find((o) => o.status === "accepted")?.qtd ?? 0;
  const totalFechados = fechados.reduce((t, o) => t + o.qtd, 0);
  return {
    vendas12: soma(p.meses.map((m) => m.vendas_total)),
    vendas3: soma(ultimos3.map((m) => m.vendas_total)),
    faturado12: soma(p.meses.map((m) => soma([m.nf_total, m.faturas_zoho_total]))),
    conversao: totalFechados ? Math.round((100 * aceitos) / totalFechados) : null,
    totalFechados,
  };
}

