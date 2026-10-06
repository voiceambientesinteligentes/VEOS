// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/obra.js - nao editar a mao.
// Horas da obra (sem DOM). Custo so existe se todo lancamento tiver custo/hora: senao e lacuna (null).

export const somaHoras = (hs) => hs.reduce((s, x) => s + Number(x.horas), 0);

export function custoHoras(hs) {
  if (!hs.length || hs.some((x) => x.custo_hora === null || x.custo_hora === undefined)) return null;
  return Math.round(hs.reduce((s, x) => s + Number(x.horas) * Number(x.custo_hora) * 100, 0)) / 100;
}
