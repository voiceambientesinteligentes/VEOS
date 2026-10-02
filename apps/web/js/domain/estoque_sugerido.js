// Estoque estrategico (sugestao do COO, com o CFO liberando o caixa): os itens que a VOICE mais usa,
// medidos nos orcamentos, com quantidade media por obra e lote sugerido. So vale comprar quando o caixa
// estiver saudavel (gatilho). O dolar do dia (PTAX) ao lado da media de 30 dias indica o momento.
// Sem DOM.

const sem = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Agrupa versoes: orcamentos do mesmo cliente com ate `dias` de diferenca contam como um projeto
 * (fica o mais recente). Recusados/expirados ficam fora.
 */
export function projetos(orcamentos, { dias = 10 } = {}) {
  const validos = orcamentos.filter((o) => ["accepted", "invoiced", "draft", "sent"].includes(o.status) && o.linhas?.length)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const ficam = [];
  for (const o of validos) {
    const par = ficam.find((x) => sem(x.cliente) === sem(o.cliente) && Math.abs(new Date(x.data) - new Date(o.data)) <= dias * 864e5);
    if (!par) ficam.push(o);
  }
  return ficam;
}

/**
 * Curva dos itens: em quantos projetos aparece, quantidade media por projeto e consumo mensal estimado
 * (quantidade nos projetos x taxa de fechamento / meses do periodo).
 */
export function curvaItens(orcamentos, { desde, ate, fechamentoPct = 50, prazoDias = 25, coberturaDias = 30 } = {}) {
  const lista = projetos(orcamentos).filter((o) => (!desde || o.data >= desde) && (!ate || o.data <= ate));
  const meses = Math.max(1, desde && ate ? (new Date(ate) - new Date(desde)) / (30.44 * 864e5) : 12);
  const itens = new Map();
  for (const o of lista) {
    const vistos = new Set();
    for (const l of o.linhas) {
      if (l.tipo !== "goods" || !(Number(l.qtd) > 0) || /componentes|^box|kit de instala/i.test(l.nome)) continue;
      const k = sem(l.nome);
      const x = itens.get(k) ?? { nome: l.nome, projetos: 0, qtd: 0, custo: Number(l.custo) > 1 ? Number(l.custo) : null };
      x.qtd += Number(l.qtd);
      if (!vistos.has(k)) { x.projetos += 1; vistos.add(k); }
      itens.set(k, x);
    }
  }
  const total = lista.length;
  const linhas = [...itens.values()].map((x) => {
    const mensal = (x.qtd * (fechamentoPct / 100)) / meses;
    const lote = Math.ceil(mensal * ((prazoDias + coberturaDias) / 30));
    return { ...x, presencaPct: total ? Math.round((x.projetos / total) * 1000) / 10 : 0, mediaPorProjeto: Math.round((x.qtd / x.projetos) * 10) / 10, consumoMensal: Math.round(mensal * 10) / 10, lote, valorLote: x.custo ? Math.round(lote * x.custo * 100) / 100 : null };
  }).sort((a, b) => b.projetos - a.projetos || b.qtd - a.qtd);
  // curva A = itens presentes em pelo menos 20% dos projetos; B = 10 a 20%
  for (const l of linhas) l.classe = l.presencaPct >= 20 ? "A" : l.presencaPct >= 10 ? "B" : "C";
  return { projetos: total, meses: Math.round(meses * 10) / 10, linhas };
}

/** Gatilho do CFO: so libera estoque com reserva de caixa >= `meses` de custo fixo e sem divida em atraso. */
export function gatilhoEstoque({ caixa, fixosMes, dividaEmAtraso = false, meses = 3 }) {
  if (caixa === null || caixa === undefined || fixosMes === null || fixosMes === undefined) return { liberado: false, motivo: "Sem controle de caixa: o estoque só é liberado quando o saldo for conhecido." };
  if (dividaEmAtraso) return { liberado: false, motivo: "Há dívida em atraso: primeiro regularizar." };
  const reserva = fixosMes * meses;
  if (caixa < reserva) return { liberado: false, motivo: `Caixa abaixo da reserva de ${meses} meses de custo fixo (R$ ${Math.round(reserva).toLocaleString("pt-BR")}).`, falta: Math.round(reserva - caixa) };
  return { liberado: true, motivo: "Reserva de caixa atingida: compra de estoque permitida dentro do valor que exceder a reserva.", disponivel: Math.round(caixa - reserva) };
}

/** Momento do dolar: PTAX do dia contra a media do periodo (sinal, nao previsao). */
export function momentoDolar(serie) {
  const v = (serie ?? []).map((x) => Number(x.venda)).filter((x) => x > 0);
  if (v.length < 5) return null;
  const hoje = v[v.length - 1];
  const media = v.reduce((a, x) => a + x, 0) / v.length;
  const dif = ((hoje - media) / media) * 100;
  return { hoje, media: Math.round(media * 10000) / 10000, difPct: Math.round(dif * 10) / 10, minimo: Math.min(...v), maximo: Math.max(...v), sinal: dif <= -1 ? "abaixo da média: momento favorável" : dif >= 1 ? "acima da média: se puder, espere" : "na média" };
}
