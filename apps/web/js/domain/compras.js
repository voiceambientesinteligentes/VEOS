// Calculos da compra (sem DOM): total pelo mesmo arredondamento do banco (item a item, 2 casas)
// e divisao em parcelas que somam exatamente o total (centavos de sobra na ultima).

const centavos = (v) => Math.round(Number(v) * 100);

/** Soma de round(quantidade x custo, 2) por item, em reais (number). */
export function totalCompra(itens) {
  // inteiros: quantidade em milesimos x custo em centavos (evita 1,5 x 10,01 = 15,0149999...)
  return itens.reduce((t, i) => {
    const prod = Math.round(Number(i.quantidade || 0) * 1000) * Math.round(Number(i.custo_unit || 0) * 100);
    return t + Math.floor((prod + 500) / 1000);
  }, 0) / 100;
}

/** n parcelas a partir do 1o vencimento (AAAA-MM-DD), a cada `dias`; valores em texto "1234.56". */
export function dividirParcelas(total, n, primeiro, dias = 30) {
  const tc = centavos(total);
  if (!(tc > 0) || !(n >= 1)) return [];
  const base = Math.floor(tc / n);
  const d0 = new Date(`${primeiro}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const venc = new Date(d0.getTime() + i * dias * 86_400_000).toISOString().slice(0, 10);
    const c = i === n - 1 ? tc - base * (n - 1) : base;
    return { vencimento: venc, valor: (c / 100).toFixed(2) };
  });
}
