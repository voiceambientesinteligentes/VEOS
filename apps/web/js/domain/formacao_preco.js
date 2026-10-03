// Formacao de preco do CFO pela Politica de Saude Financeira V1 (margem de contribuicao, nao markup):
//   RL = P x (1 - t);  MC = RL - C - v x P - 2% x RL;  MC / RL = alvo
//   =>  P = C / ((1 - t) x (1 - 2% - alvo) - v)
// t = impostos sobre a venda; v = despesas variaveis sobre o preco (taxa de cartao, comissao);
// C = custos diretos e variaveis (produto ja com importacao; ou horas x custo-hora).
// Sem DOM. Dinheiro em reais com arredondamento a centavos (calculo de apoio, nao contabil).
// Percentuais sempre em pontos (6 = 6%). Dado ausente = lacuna (null), nunca zero inventado.

export const RISCO = 2; // V1 sec.6: provisao de risco sobre a receita liquida
export const FAIXAS = [["meta", 35], ["minimo", 30], ["piso", 25]]; // V1 sec.3

const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
export const centavos = (v) => (v === null ? null : Math.round(v * 100) / 100);

/** Preco minimo para a MC atingir `alvo` (%). null se faltar dado ou se nao existir preco possivel. */
export function precoPolitica(custo, { t, v = 0, alvo }) {
  const [c, ti, vi, a] = [num(custo), num(t), num(v), num(alvo)];
  if (c === null || ti === null || vi === null || a === null || c <= 0) return null;
  const den = (1 - ti / 100) * (1 - RISCO / 100 - a / 100) - vi / 100;
  if (!(den > 0)) return null;
  return Math.ceil((c / den) * 100 - 1e-9) / 100; // para cima: o centavo nunca deixa a MC abaixo do alvo
}

/** MC de um preco ja praticado: { rl, mc, pct } (pct em pontos) pela formula oficial. */
export function margem(preco, custo, { t, v = 0 }) {
  const [p, c, ti, vi] = [num(preco), num(custo), num(t), num(v)];
  if (p === null || c === null || ti === null || vi === null || p <= 0) return null;
  const rl = p * (1 - ti / 100);
  const mc = rl - c - p * (vi / 100) - rl * (RISCO / 100);
  return { rl: centavos(rl), mc: centavos(mc), pct: rl > 0 ? Math.round((mc / rl) * 1000) / 10 : null };
}

export function faixa(pct) {
  if (pct === null || pct === undefined) return "NAO RESOLVIDO";
  return pct >= 35 ? "VERDE" : pct >= 30 ? "ACEITAVEL" : pct >= 25 ? "ATENCAO" : "NAO APROVADO";
}

// ---------------------------------------------------------------- importacao
// Fator = total pago no pedido / (preco unitario x quantidade), medido nos pedidos de um item so.
// Fora de [1; 2,2] o pedido provavelmente tinha outros itens: nao serve de medida.
export const FATOR_MIN = 1, FATOR_MAX = 2.2;
export function fatorMedido(compras) {
  const r = (compras ?? []).filter((x) => x.unico && num(x.preco_unit) > 0 && num(x.quantidade) > 0 && num(x.total_pedido) > 0)
    .map((x) => x.total_pedido / (x.preco_unit * x.quantidade)).filter((f) => f >= FATOR_MIN && f <= FATOR_MAX).sort((a, b) => a - b);
  if (!r.length) return null;
  const m = r.length % 2 ? r[(r.length - 1) / 2] : (r[r.length / 2 - 1] + r[r.length / 2]) / 2;
  return Math.round(m * 1000) / 1000;
}

// Regra vigente do Remessa Conforme (Receita Federal; Portaria MF 1.342/2026, desde 12/05/2026), compra
// de pessoa fisica entregue em SC: II 0% ate US$ 50; acima, 60% menos US$ 30; ICMS 17% "por dentro".
export const VIGENCIA_REGRA = "2026-05-12";
export function fatorRegra(precoBRL, cambio) {
  const [p, c] = [num(precoBRL), num(cambio)];
  if (p === null || c === null || p <= 0 || c <= 0) return null;
  const usd = p / c;
  const ii = usd <= 50 ? 0 : Math.max(0, usd * 0.6 - 30);
  return Math.round(((usd + ii) / 0.83 / usd) * 1000) / 1000;
}
// Mediana dos pedidos de um item so depois de 12/05/2026 ate R$ 280 (VEOS, 02/10/2026): 1,205 (= 1 / 0,83).
// Acima de ~R$ 280 o item pode passar de US$ 50 (II de 60%): sem cambio, fica lacuna (nunca a mediana).
export const FATOR_MEDIO = { ate280: 1.205, limite: 280 };
// HIPOTESE para comparar: importacao regular no CNPJ com II de 60% sem deducao + ICMS 17% por dentro.
export const FATOR_CNPJ = Math.round((1.6 / 0.83) * 1000) / 1000; // 1,928

/**
 * Fator de importacao de um produto, com a origem. Ordem: informado no formulario > preco ja inclui
 * impostos > medido no pedido mais recente do proprio produto (pos-regra) > regra vigente com cambio > mediana.
 */
export function fatorProduto(produto, { manual = null, incluiImpostos = null, cambio = null, compra = "atual" } = {}) {
  if (compra === "cnpj") return { fator: FATOR_CNPJ, origem: "HIPÓTESE: compra no CNPJ, II 60% + ICMS 17% (confirmar com o contador)" };
  if (num(manual) !== null && num(manual) >= 1) return { fator: num(manual), origem: "informado por você" };
  const recentes = (produto.compras ?? []).filter((x) => x.unico && String(x.data ?? "") >= VIGENCIA_REGRA)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  for (const x of recentes) {
    const f = num(x.preco_unit) > 0 && num(x.quantidade) > 0 ? x.total_pedido / (x.preco_unit * x.quantidade) : null;
    if (f !== null && f >= FATOR_MIN && f <= FATOR_MAX) {
      // o pedido real vale mais que a resposta: se voce disse que ja inclui e o pedido mostra +20%, avisa e usa o medido
      if (incluiImpostos === "sim" && f > 1.1) return { fator: Math.round(f * 1000) / 1000, origem: `medido no pedido de ${x.data} (você informou que o preço já inclui impostos, mas o total pago foi ${Math.round((f - 1) * 100)}% maior: confira)`, conflito: true };
      return { fator: Math.round(f * 1000) / 1000, origem: `medido no pedido de ${x.data}` };
    }
  }
  if (incluiImpostos === "sim") return { fator: 1, origem: "preço já inclui impostos (informado)" };
  const r = fatorRegra(produto.custo, cambio);
  if (r !== null) return { fator: r, origem: "regra vigente do Remessa Conforme (câmbio informado)" };
  if (num(produto.custo) === null) return { fator: null, origem: "sem preço de compra" };
  if (num(produto.custo) > FATOR_MEDIO.limite) return { fator: null, origem: "LACUNA: informe o câmbio (acima de US$ 50 o II é 60%)" };
  return { fator: FATOR_MEDIO.ate280, origem: "mediana dos seus pedidos após 12/05/2026" };
}

/**
 * Variacao do dolar desde a compra: PTAX de hoje / PTAX do dia da compra (ou o ultimo dia util antes).
 * O AliExpress precifica em dolar e converte para reais no dia; sem a taxa propria dele, a PTAX mede a
 * variacao. serie = [{data, venda}] em ordem. null se faltar cotacao.
 */
export function variacaoDolar(dataCompra, serie) {
  if (!dataCompra || !serie?.length) return null;
  const hoje = serie[serie.length - 1];
  let base = null;
  for (const x of serie) { if (x.data <= String(dataCompra).slice(0, 10)) base = x; else break; }
  if (!base) return null;
  return { fator: Math.round((hoje.venda / base.venda) * 10000) / 10000, de: base, para: hoje };
}

/** Custo no Brasil: preco pago x fator de importacao (impostos + frete) x (1 + perdas %). */
export function custoNoBrasil(preco, { fator, perdas = 0 }) {
  const [p, f, pe] = [num(preco), num(fator), num(perdas) ?? 0];
  if (p === null || f === null || p <= 0 || f < 1) return null;
  return centavos(p * f * (1 + pe / 100));
}

// ---------------------------------------------------------------- mao de obra
// Custo-hora direto (metodo de custeio Sebrae): custo mensal de quem executa + custos mensais da
// operacao de campo (veiculo, ferramentas, EPI) dividido pelas horas produtivas (horas vendaveis).
export const CUSTO_MENSAL = {
  clt: (p) => (num(p.valor) === null ? null : num(p.valor) * (1 + (num(p.encargos_pct) ?? NaN) / 100) + (num(p.beneficios) ?? 0)),
  pj: (p) => (num(p.valor) === null ? null : num(p.valor) + (num(p.beneficios) ?? 0)),
  socio: (p) => (num(p.valor) === null ? null : num(p.valor) + (num(p.beneficios) ?? 0)),
  diarista: (p) => (num(p.valor) === null || num(p.dias_mes) === null ? null : num(p.valor) * num(p.dias_mes) + (num(p.beneficios) ?? 0)),
};

/** Custo mensal cheio de uma pessoa (sem o rateio de % em obra). null se faltar dado. */
export function custoMensalPessoa(p) {
  const fn = CUSTO_MENSAL[p.vinculo];
  const c = fn ? fn(p) : null;
  return c === null || Number.isNaN(c) ? null : centavos(c);
}

/**
 * equipe: [{ nome, vinculo: clt|pj|socio|diarista, valor, encargos_pct?, beneficios?, dias_mes?, horas_mes, campo_pct }]
 *   campo_pct = % das horas da pessoa que vao para obra/servico vendido (o resto e administrativo).
 * operacao: valor mensal de veiculo + ferramentas + EPI + deslocamento.
 * produtividade: % das horas de campo que viram hora vendida (descontados deslocamento, retrabalho, espera).
 */
export function custoHora({ equipe = [], operacao = 0, produtividade }) {
  const lacunas = [];
  let custo = 0, horas = 0;
  for (const p of equipe) {
    const fn = CUSTO_MENSAL[p.vinculo];
    const c = fn ? fn(p) : null;
    const campo = num(p.campo_pct), hm = num(p.horas_mes);
    if (c === null || Number.isNaN(c)) { lacunas.push(`${p.nome || "pessoa"}: falta o valor${p.vinculo === "clt" ? " ou os encargos" : p.vinculo === "diarista" ? " ou os dias por mês" : ""}`); continue; }
    if (campo === null || hm === null) { lacunas.push(`${p.nome || "pessoa"}: faltam horas por mês ou % em obra`); continue; }
    custo += c * (campo / 100);
    horas += hm * (campo / 100);
  }
  const prod = num(produtividade);
  if (!equipe.length) lacunas.push("cadastre quem executa os serviços");
  if (prod === null) lacunas.push("falta a produtividade (% das horas em obra que são vendidas)");
  const op = num(operacao) ?? 0;
  if (lacunas.length || horas <= 0) return { custoHora: null, custoMensal: centavos(custo + op), horasVendaveis: null, lacunas };
  const vendaveis = horas * (prod / 100);
  return { custoHora: centavos((custo + op) / vendaveis), custoMensal: centavos(custo + op), horasVendaveis: Math.round(vendaveis), lacunas };
}

/** Faturamento mensal minimo para pagar estrutura, pro-labore e parcelas de dividas com a MC media. */
export function faturamentoMinimo({ fixos, proLabore = 0, dividas = 0, mcPct, t }) {
  const [f, pl, d, a, ti] = [num(fixos), num(proLabore) ?? 0, num(dividas) ?? 0, num(mcPct), num(t)];
  if (f === null || a === null || ti === null || a <= 0) return null;
  // MC em R$ por real vendido = (1 - t) x MC%
  return centavos((f + pl + d) / ((1 - ti / 100) * (a / 100)));
}
