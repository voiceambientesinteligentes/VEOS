// Dominio: Calculadora de Precos e Negociacao ao Vivo pela Politica de Saude Financeira V1
// e impostos do Simples Nacional (LC 123/2006). Sem DOM e sem float: dinheiro em centavos
// (BigInt) e percentuais em centesimos de ponto (6% = 600n). Regras de margem, alcada e
// ticket espelham supabase/functions/_shared/regras/cfo.ts (paridade em tests/web).

export const FONTE_POLITICA = "Política de Saúde Financeira V1 (sec.2, 3, 4, 6 e 9)";
export const FONTE_SIMPLES = "LC 123/2006, Anexos I, III e V (redação da LC 155/2016, vigente desde 01/01/2018)";

const RISCO_PCT = 2n; // V1 sec.6
const ALVO = 35n, NORMAL = 30n, PISO = 25n; // V1 sec.3
const TICKET_DESEJADO = 10_000_000n; // R$ 100.000,00 (V1 sec.2, meta e nao bloqueio)
const LIMITE_SIMPLES = 480_000_000n; // R$ 4.800.000,00

// [teto da faixa em centavos, aliquota nominal em centesimos de ponto, parcela a deduzir em centavos]
const FAIXAS = (linhas) => linhas.map(([teto, nominal, deduzir]) => ({ teto: teto * 100n, nominal, deduzir: deduzir * 100n }));
export const SIMPLES = {
  I: { nome: "Anexo I (comércio: venda de equipamentos)", faixas: FAIXAS([[180_000n, 400n, 0n], [360_000n, 730n, 5_940n], [720_000n, 950n, 13_860n], [1_800_000n, 1070n, 22_500n], [3_600_000n, 1430n, 87_300n], [4_800_000n, 1900n, 378_000n]]) },
  III: { nome: "Anexo III (serviços: instalação, programação e manutenção)", faixas: FAIXAS([[180_000n, 600n, 0n], [360_000n, 1120n, 9_360n], [720_000n, 1350n, 17_640n], [1_800_000n, 1600n, 35_640n], [3_600_000n, 2100n, 125_640n], [4_800_000n, 3300n, 648_000n]]) },
  V: { nome: "Anexo V (serviços com Fator R abaixo de 28%)", faixas: FAIXAS([[180_000n, 1550n, 0n], [360_000n, 1800n, 4_500n], [720_000n, 1950n, 9_900n], [1_800_000n, 2050n, 17_100n], [3_600_000n, 2300n, 62_100n], [4_800_000n, 3050n, 540_000n]]) },
};

export class PrecoError extends Error {}

/** a*b/c arredondado meio-para-longe-do-zero (como o ROUND_HALF_UP do motor). */
function arred(num, den) {
  if (den < 0n) { num = -num; den = -den; }
  const neg = num < 0n;
  const r = (2n * (neg ? -num : num) + den) / (2n * den);
  return neg ? -r : r;
}
const teto = (num, den) => (num <= 0n ? -((-num) / den) : (num + den - 1n) / den);
/** Razao {num, den} -> centesimos de ponto percentual. */
export const centesimos = (r) => (r === null ? null : arred(r.num * 100n, r.den));
const ge = (r, k) => r.num >= k * r.den;
const gt = (r, k) => r.num > k * r.den;
const lt = (r, k) => r.num < k * r.den;

/**
 * Aliquota efetiva do Simples = (RBT12 x nominal - parcela a deduzir) / RBT12.
 * Sem receita nos 12 meses (empresa nova), usa a nominal da 1a faixa.
 * Devolve a aliquota como Razao de percentual (num/den = %).
 */
export function aliquotaSimples(rbt12, anexo) {
  const tab = SIMPLES[anexo];
  if (!tab) throw new PrecoError(`anexo do Simples desconhecido: ${anexo}`);
  if (rbt12 < 0n) throw new PrecoError("receita dos últimos 12 meses não pode ser negativa");
  if (rbt12 > LIMITE_SIMPLES) throw new PrecoError("receita dos últimos 12 meses acima de R$ 4,8 milhões: fora do Simples Nacional");
  const i = rbt12 === 0n ? 0 : tab.faixas.findIndex((f) => rbt12 <= f.teto);
  const f = tab.faixas[i];
  const efetiva = rbt12 === 0n ? { num: f.nominal, den: 100n } : { num: rbt12 * f.nominal - f.deduzir * 10000n, den: rbt12 * 100n };
  return { anexo, faixa: i + 1, nominal: f.nominal, deduzir: f.deduzir, efetiva, efetivaH: centesimos(efetiva) };
}

/** Fator R (folha 12 meses / RBT12) >= 28% leva o servico ao Anexo III; abaixo, Anexo V. */
export function anexoPorFatorR(folha12, rbt12) {
  if (folha12 === null || rbt12 === null || rbt12 <= 0n) return null;
  return folha12 * 100n >= 28n * rbt12 ? "III" : "V";
}

export function faixaMargem(p) {
  if (p === null) return "NAO RESOLVIDO";
  if (ge(p, ALVO)) return "VERDE";
  if (ge(p, NORMAL)) return "ACEITAVEL";
  if (ge(p, PISO)) return "ATENCAO";
  return "NAO APROVADO";
}

/** V1 sec.4 e 6: MC = receita liquida - custos diretos/variaveis - provisao de risco de 2% da RL. */
export function margemPolitica(rl, custos) {
  if (rl <= 0n) return { rl, custos, risco: null, mc: null, pct: null, faixa: "NAO RESOLVIDO" };
  const risco = arred(rl * RISCO_PCT, 100n);
  const mc = rl - custos - risco;
  const pct = { num: mc * 100n, den: rl };
  return { rl, custos, risco, mc, pct, faixa: faixaMargem(pct) };
}

const NIVEIS = ["FLUXO NORMAL", "AUTONOMIA COMERCIAL", "NAO RESOLVIDO", "DIRECAO", "EXCEPCIONAL - NOVA ANALISE INTEGRAL", "EXTRAORDINARIA"];

/** V1 sec.9 (alcada de desconto) + piso das sec.3/8. desc e mc sao Razoes de percentual. */
export function alcadaDesconto(desc, mc) {
  if (mc === null) return { nivel: "NAO RESOLVIDO", autonomia_comercial: false, exigencias: ["Receita líquida zero ou negativa: margem não resolvida."] };
  const f = [];
  if (desc.num === 0n) f.push(["FLUXO NORMAL", "Sem desconto: valem as faixas de margem (sec.3)."]);
  else if (!gt(desc, 2n)) {
    if (ge(mc, 32n)) f.push(["AUTONOMIA COMERCIAL", "Desconto até 2% com MC ≥ 32%: autonomia comercial (sec.9)."]);
    else if (ge(mc, NORMAL)) f.push(["NAO RESOLVIDO", "Desconto até 2% com MC entre 30% e 31,99%: a sec.9 não define a alçada. Decisão humana necessária."]);
  } else if (!gt(desc, 5n)) f.push(["DIRECAO", "Desconto acima de 2% e até 5%: exige autorização da direção (sec.9)."]);
  else f.push(["EXCEPCIONAL - NOVA ANALISE INTEGRAL", "Desconto acima de 5%: excepcional; exige nova análise financeira integral (sec.9)."]);
  if (lt(mc, NORMAL)) f.push(["DIRECAO", "MC abaixo de 30%: exige autorização da direção, qualquer que seja o desconto (sec.9)."]);
  if (lt(mc, PISO)) f.push(["EXTRAORDINARIA", "MC abaixo de 25%: não é operação normal; só com aprovação extraordinária, expressa e registrada (sec.3 e 8)."]);
  const nivel = f.map((x) => x[0]).reduce((a, b) => (NIVEIS.indexOf(b) > NIVEIS.indexOf(a) ? b : a));
  return { nivel, autonomia_comercial: nivel === "AUTONOMIA COMERCIAL", exigencias: f.map((x) => x[1]) };
}

const pctDe = (base, h) => arred(base * h, 10000n); // valor x (h/100)%

// Impostos da VOICE com nota, pelo enquadramento do CNPJ (Lucro Presumido), conforme a tela de
// negociacao validada pela direcao em 30/09/2026. Editaveis na tela; confirmar com o contador.
export const IMPOSTOS_PADRAO = {
  produto: [["PIS", 65n], ["COFINS", 300n], ["IRPJ", 480n], ["CSLL", 288n]],
  servico: [["ISS", 265n], ["PIS", 0n], ["COFINS", 0n], ["IRPJ", 0n], ["CSLL", 0n]],
};
export const OVERHEAD_PADRAO = 2000n; // 20% sobre o custo direto (tela validada pela direcao)
/** Soma de aliquotas em centesimos de ponto -> Razao de percentual. */
export const somaAliquotas = (linhas) => ({ num: linhas.reduce((a, [, h_]) => a + h_, 0n), den: 100n });

/**
 * Negociacao ao Vivo.
 * entrada = {
 *   tabela: centavos, desconto: { modo: "pct"|"rs", valor: centesimos|centavos },
 *   custos: [{ tipo: "produto"|"servico", total: centavos }],
 *   extras: [{ modo: "pct"|"rs", valor }],            // % incide sobre o preco JA com desconto
 *   impostos: { produto: Razao %, servico: Razao % } // aliquota efetiva (ex.: aliquotaSimples().efetiva)
 * }
 */
export function negociacao({ tabela, desconto, custos = [], extras = [], impostos, overhead = OVERHEAD_PADRAO }) {
  if (tabela < 0n) throw new PrecoError("preço de tabela não pode ser negativo");
  const descontoRs = desconto?.modo === "pct" ? pctDe(tabela, desconto.valor) : (desconto?.valor ?? 0n);
  if (descontoRs < 0n) throw new PrecoError("desconto não pode ser negativo");
  const liquido = tabela - descontoRs > 0n ? tabela - descontoRs : 0n;
  const descPct = tabela > 0n ? { num: descontoRs * 100n, den: tabela } : { num: 0n, den: 1n };

  let custoProduto = 0n, custoServico = 0n;
  for (const c of custos) {
    if (c.total < 0n) throw new PrecoError("custo não pode ser negativo");
    if (c.tipo === "produto") custoProduto += c.total;
    else if (c.tipo === "servico") custoServico += c.total;
    else throw new PrecoError(`tipo de custo desconhecido: ${c.tipo}`);
  }
  const custoDireto = custoProduto + custoServico;
  const extrasLinhas = extras.map((e) => ({ ...e, total: e.modo === "pct" ? pctDe(liquido, e.valor) : e.valor }));
  const custoExtras = extrasLinhas.reduce((a, e) => a + e.total, 0n);

  // Rateio da receita entre produto e servico pela participacao no custo direto.
  const pendencias = [];
  let receitaProduto = null, receitaServico = null, impostoTotal = null;
  if (custoDireto === 0n) pendencias.push("Sem custos lançados: não dá para ratear a receita entre produto e serviço nem calcular a margem.");
  if (!impostos?.produto || !impostos?.servico) pendencias.push("Alíquotas de imposto não definidas.");
  if (!pendencias.length) {
    receitaProduto = arred(liquido * custoProduto, custoDireto);
    receitaServico = liquido - receitaProduto;
    impostoTotal = arred(receitaProduto * impostos.produto.num, impostos.produto.den * 100n) + arred(receitaServico * impostos.servico.num, impostos.servico.den * 100n);
  }
  const rl = impostoTotal === null ? null : liquido - impostoTotal;
  const m = rl === null ? { rl: null, custos: custoDireto + custoExtras, risco: null, mc: null, pct: null, faixa: "NAO RESOLVIDO" } : margemPolitica(rl, custoDireto + custoExtras);
  const alcada = alcadaDesconto(descPct, m.pct);
  const ticketAbaixo = liquido > 0n && liquido < TICKET_DESEJADO;
  // Visao da negociacao (tela validada pela direcao): custo total = direto + overhead + adicionais;
  // margem antes dos impostos e margem com nota.
  if (overhead < 0n) throw new PrecoError("overhead não pode ser negativo");
  const custoOverhead = pctDe(custoDireto, overhead);
  const custoTotal = custoDireto + custoOverhead + custoExtras;
  const razao = (v) => (liquido > 0n && v !== null ? centesimos({ num: v * 100n, den: liquido }) : null);
  const lucroAntes = liquido - custoTotal;
  const lucroComNota = impostoTotal === null ? null : liquido - custoTotal - impostoTotal;
  return {
    overheadH: overhead, custoOverhead, custoTotal,
    antesImpostos: { lucro: lucroAntes, margemH: custoDireto > 0n ? razao(lucroAntes) : null },
    comNota: { impostos: impostoTotal, taxaH: razao(impostoTotal), lucro: lucroComNota, margemH: custoDireto > 0n ? razao(lucroComNota) : null },
    tabela, descontoRs, descPct, descPctH: centesimos(descPct), liquido,
    custoProduto, custoServico, custoDireto, extras: extrasLinhas, custoExtras,
    receitaProduto, receitaServico, impostoTotal, ...m, pctH: centesimos(m.pct), alcada,
    ticket: { abaixo_do_desejado: ticketAbaixo, texto: ticketAbaixo ? "Abaixo do ticket desejado de R$ 100.000,00 (meta, não bloqueio: registre a justificativa)." : null },
    pendencias,
  };
}

/**
 * Calculadora de Precos: preco minimo para a MC atingir o alvo, ja com imposto e provisao de 2%.
 * RL = P x (1 - t); MC = RL - C - 2% RL; MC/RL = alvo  =>  P = C / ((1 - t) x (1 - 2% - alvo)).
 * horas em centesimos (1,5 h = 150n); alvo e rateio em centesimos de ponto; imposto Razao %.
 */
export function calculadora({ materiais = 0n, horas = 0n, valorHora = 0n, rateioFixo = 0n, alvo = ALVO * 100n, imposto = { num: 0n, den: 1n } }) {
  if ([materiais, horas, valorHora, rateioFixo].some((v) => v < 0n)) throw new PrecoError("valores não podem ser negativos");
  if (alvo <= 0n || alvo >= 9800n) throw new PrecoError("margem alvo deve ficar entre 0% e 98% (a provisão de risco de 2% já ocupa parte da receita)");
  if (imposto.num < 0n || imposto.num >= 100n * imposto.den) throw new PrecoError("alíquota de imposto inválida");
  const maoDeObra = arred(horas * valorHora, 100n);
  const base = materiais + maoDeObra;
  const fixo = pctDe(base, rateioFixo);
  const custo = base + fixo;
  if (custo === 0n) return { maoDeObra, fixo, custo, preco: 0n, pendencias: ["Informe materiais ou horas para calcular."] };
  // P = C * 100 * den * 10000 / ((100*den - num) * (10000 - 200 - alvo)), arredondado para cima
  const num = custo * 100n * imposto.den * 10000n;
  const den = (100n * imposto.den - imposto.num) * (10000n - RISCO_PCT * 100n - alvo);
  let preco = teto(num, den), impostoRs, m;
  // o arredondamento do imposto e da provisao em centavos pode deixar a MC um fio abaixo do alvo
  for (;;) {
    impostoRs = arred(preco * imposto.num, imposto.den * 100n);
    m = margemPolitica(preco - impostoRs, custo);
    if (m.pct.num * 100n >= alvo * m.pct.den) break;
    preco += 1n;
  }
  return { maoDeObra, fixo, custo, preco, impostoRs, ...m, pctH: centesimos(m.pct), lucro: m.mc, markupH: arred(preco * 100n, custo), pendencias: [] };
}

const fixo2 = (c) => `${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n}.${String((c < 0n ? -c : c) % 100n).padStart(2, "0")}`;
const FAIXA_PROPOSTA = { VERDE: "VERDE", ACEITAVEL: "ACEITAVEL", ATENCAO: "ATENCAO", "NAO APROVADO": "NAO_APROVADO" };

/**
 * Converte o resultado da Negociacao ao Vivo num registro "proposta" do Comercial (vendas),
 * com os campos que as regras vivas vigiam (faixa de margem, faixa de desconto, aprovacao).
 * Falha se a margem nao estiver resolvida: nunca grava proposta com margem inventada.
 */
export function paraProposta(r, { cliente, referencia, condicao, versao = 1 }) {
  if (r.faixa === "NAO RESOLVIDO" || r.pctH === null) throw new PrecoError("margem não resolvida: preencha custos e impostos antes de salvar");
  if (!cliente?.trim()) throw new PrecoError("informe o cliente");
  if (!referencia?.trim()) throw new PrecoError("informe a referência da oportunidade (ex.: número do orçamento)");
  if (!condicao?.trim()) throw new PrecoError("informe a condição de pagamento");
  const d = r.descPctH;
  const faixaDesconto = d === 0n ? "sem_desconto" : d <= 200n ? "ate_2_autonomia" : d <= 500n ? "acima_2_ate_5_direcao" : "acima_5_analise_integral";
  const precisaDirecao = !["FLUXO NORMAL", "AUTONOMIA COMERCIAL"].includes(r.alcada.nivel);
  return {
    setor: "vendas", tipo: "proposta",
    titulo: `Proposta ${cliente.trim()}`.slice(0, 200),
    estado: precisaDirecao ? "aguardando_direcao" : "rascunho",
    valor: fixo2(r.liquido),
    dados: {
      oportunidade_ref: referencia.trim(), versao: String(versao), valor_bruto: fixo2(r.tabela),
      desconto_percentual: fixo2(d), faixa_desconto: faixaDesconto,
      margem_contribuicao_percentual: fixo2(r.pctH), faixa_margem: FAIXA_PROPOSTA[r.faixa],
      aprovacao_direcao: precisaDirecao ? "pendente" : "nao_necessaria", condicao_pagamento: condicao.trim(),
    },
  };
}
