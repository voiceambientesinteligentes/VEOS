// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/equilibrio.js - nao editar a mao.
// PONTO DE EQUILIBRIO, METAS E SIMULACOES (CFO + CSO). Sem DOM.
// Ponto de equilibrio FINANCEIRO (o que o caixa precisa): (custos fixos + retirada + equipe +
// parcelas de dividas) / margem de contribuicao por real vendido. A equipe entra como custo do mes
// porque e paga trabalhando ou nao; por isso a MO vendida conta inteira na margem.
import { custoMensalPessoa, margem, precoPolitica, RISCO } from "./formacao_preco.js";
import { numeroBR } from "./formulario_cfo.js";
import { classificarItem, composicao } from "./tempos.js";

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;

/** Saidas de caixa do mes, separadas. A retirada usa a planejada (metas) > media real > pro-labore. */
export function saidasMensais(p, respostas = {}) {
  const pessoas = respostas.equipe?.dados?.pessoas ?? [];
  let equipe = 0;
  const semValor = [];
  for (const x of pessoas) {
    if (x.vinculo === "socio") continue; // a funcao tecnica do socio ja esta na retirada
    const c = custoMensalPessoa({ ...x, valor: numeroBR(x.valor), encargos_pct: numeroBR(x.encargos_pct) ?? 0, beneficios: (numeroBR(x.beneficios) ?? 0) + (numeroBR(x.alimentacao) ?? 0) + (numeroBR(x.transporte) ?? 0), dias_mes: numeroBR(x.dias_mes) });
    if (c === null) semValor.push(x.nome || "pessoa"); else equipe += c;
  }
  const d = respostas.equipe?.dados ?? {};
  const partes = ["combustivel_mes", "manutencao_veiculo_mes", "seguro_veiculo_mes", "parcela_veiculo_mes"].map((k) => numeroBR(d[k]));
  const veiculo = partes.some((x) => x !== null) ? partes.reduce((a, x) => a + (x ?? 0), 0) : numeroBR(d.veiculo_mes) ?? 0;
  const operacao = veiculo + (numeroBR(d.ferramentas_mes) ?? 0);
  const retirada = p.metas?.retirada_planejada ?? p.retirada ?? p.proLabore ?? 0;
  const linhas = [
    ["Custos fixos (aluguel, sistemas, contador...)", p.fixos ?? 0],
    [p.metas?.retirada_planejada ? "Sua retirada planejada" : "Sua retirada (média informada)", retirada],
    ["Equipe de campo (sem você)", equipe],
    ["Veículo, ferramentas e EPI", operacao],
    ["Parcelas de dívidas (Simples etc.)", p.parcelasMes ?? 0],
  ];
  return { linhas, total: r2(linhas.reduce((a, [, v]) => a + v, 0)), semValor, faltaFixos: p.fixos === null };
}

/**
 * Margem de contribuicao por real vendido, pelo mix produto/servico.
 * Produto: sobra (1 - t)(1 - 2%) - v - 1/multiplicador. Servico: (1 - t)(1 - 2%) - v (a equipe ja esta nas saidas).
 */
export function margemPorReal({ tProduto, tServico, v, multiplicador, mixProduto }) {
  const base = (t) => (1 - t / 100) * (1 - RISCO / 100) - v / 100;
  const prod = base(tProduto) - 1 / multiplicador;
  const serv = base(tServico);
  return { produto: r1(prod * 100), servico: r1(serv * 100), media: r1((mixProduto * prod + (1 - mixProduto) * serv) * 100) };
}

/** Passo a passo do ponto de equilibrio (para a tela "Como chegamos nesse numero"). */
export function pontoEquilibrio(saidas, mc) {
  if (!(mc.media > 0)) return null;
  const meta = Math.ceil(saidas.total / (mc.media / 100) / 100) * 100;
  return { meta, porDia: Math.round(meta / 22), cadaMil: Math.round(1000 / (mc.media / 100)) };
}

/** Mix e multiplicador praticados nos projetos (produto ÷ total, venda ÷ custo dos produtos). */
export function mixPraticado(projetos) {
  let bens = 0, serv = 0, vendaComCusto = 0, custo = 0;
  for (const o of projetos) for (const l of o.linhas ?? []) {
    const t = Number(l.total) || 0;
    if (l.tipo === "goods") { bens += t; if (Number(l.custo) > 1 && t > 0) { vendaComCusto += t; custo += Number(l.custo) * (Number(l.qtd) || 0); } } // brinde (preco zero) nao distorce o multiplicador
    else if (l.tipo === "service") serv += t;
  }
  const precoHora = (() => {
    const h = projetos.flatMap((o) => (o.linhas ?? []).filter((l) => l.tipo === "service" && /^h(r|ora)s?$/i.test(String(l.unidade ?? "").trim()) && Number(l.preco) > 0).map((l) => Number(l.preco))).sort((a, b) => a - b);
    return h.length ? h[Math.floor(h.length / 2)] : null;
  })();
  return { mixProduto: bens + serv > 0 ? r2(bens / (bens + serv)) : null, multiplicador: custo > 0 ? r2(vendaComCusto / custo) : null, precoHora };
}

// ---------------------------------------------------------------- simulacao de obras
// Modelos genericos (quantidades tipicas de projetos de alto padrao). Custo de cada item vem do
// historico de orcamentos (item mais usado de cada dispositivo); preco pela Politica.
export const MODELOS_OBRA = [
  { id: "completo", nome: "Apartamento alto padrão completo (automação, rede e áudio)", itens: { roteador: 1, ap: 5, switch: 1, cabo_rede: 900, coax: 200, hub: 2, voz: 6, ir: 8, interruptor: 15, cortina: 6, sensor: 2, receiver: 1, caixa_som: 6 } },
  { id: "medio", nome: "Apartamento médio (automação e Wi-Fi)", itens: { roteador: 1, ap: 3, switch: 1, cabo_rede: 450, hub: 1, voz: 4, ir: 5, interruptor: 10, cortina: 4, sensor: 1 } },
];

/** Item de referencia por dispositivo: o mais frequente nos projetos, com o custo do cadastro. */
export function itensReferencia(projetos) {
  const cont = new Map();
  for (const o of projetos) for (const l of o.linhas ?? []) {
    if (l.tipo !== "goods" || !(Number(l.custo) > 1)) continue;
    const c = classificarItem(l.nome);
    if (!c) continue;
    const k = `${c.dispositivo}|${l.nome}`;
    const x = cont.get(k) ?? { dispositivo: c.dispositivo, tecnologia: c.tecnologia, nome: l.nome, custo: Number(l.custo), n: 0 };
    x.n += 1;
    cont.set(k, x);
  }
  const ref = {};
  for (const x of [...cont.values()].sort((a, b) => b.n - a.n)) if (!ref[x.dispositivo]) ref[x.dispositivo] = x;
  return ref;
}

/**
 * Simula uma obra pelo modelo: produtos no preco da Politica (alvo), mao de obra pelas horas da
 * composicao x preco da hora, e a margem que sobra para pagar a estrutura do mes.
 */
export function simularObra(modelo, ref, p) {
  const linhas = [];
  const faltam = [];
  for (const [disp, qtd] of Object.entries(modelo.itens)) {
    const r = ref[disp];
    if (!r) { faltam.push(disp); continue; }
    const preco = precoPolitica(r.custo, { t: p.tProduto, v: p.v, alvo: p.alvo ?? 35 });
    linhas.push({ dispositivo: disp, nome: r.nome, qtd, custo: r.custo, preco, total: r2(preco * qtd), custoTotal: r2(r.custo * qtd), tipo: "goods", unidade: disp.startsWith("cabo") || disp === "coax" ? "m" : "un" });
  }
  const comp = composicao(linhas.map((l) => ({ nome: l.nome, qtd: l.qtd, tipo: "goods" })), p.catalogo ?? [], { metrosPorPonto: p.metrosPorPonto ?? 25 });
  const horas = comp.horas > 0 ? r1(((comp.horas * (1 + (p.comissionamento ?? 10) / 100)) + (p.entregaHoras ?? 2)) / ((p.produtividade ?? 65) / 100)) : 0;
  const produtos = r2(linhas.reduce((a, l) => a + l.total, 0));
  const custoProdutos = r2(linhas.reduce((a, l) => a + l.custoTotal, 0));
  const maoDeObra = r2(horas * (p.precoHora ?? 0));
  const total = r2(produtos + maoDeObra);
  const t = total > 0 ? (produtos * p.tProduto + maoDeObra * p.tServico) / total : 0;
  const m = margem(total, custoProdutos, { t, v: p.v }); // equipe ja esta nas saidas do mes
  return { modelo: modelo.nome, linhas, faltam, horas, produtos, custoProdutos, maoDeObra, total, sobra: m ? m.mc : null, sobraPct: m && total ? r1((m.mc / total) * 100) : null, semTempo: comp.faltam.map((f) => f.dispositivo) };
}

// ---------------------------------------------------------------- funil comercial
/** Atividade necessaria para a meta: vendas -> orcamentos -> visitas -> leads -> toques (taxas editaveis). */
export function funilNecessario({ meta, ticket, conversao = 35, visitaParaOrcamento = 65, leadParaVisita = 50, toqueParaLead = 25 }) {
  if (!(meta > 0) || !(ticket > 0)) return null;
  const vendas = meta / ticket;
  const orcamentos = vendas / (conversao / 100);
  const visitas = orcamentos / (visitaParaOrcamento / 100);
  const leads = visitas / (leadParaVisita / 100);
  const toques = leads / (toqueParaLead / 100);
  const mes = { vendas: r1(vendas), orcamentos: Math.ceil(orcamentos), visitas: Math.ceil(visitas), leads: Math.ceil(leads), toques: Math.ceil(toques) };
  const semana = Object.fromEntries(Object.entries(mes).map(([k, v]) => [k, r1(v / 4.33)]));
  return { mes, semana };
}

// ---------------------------------------------------------------- showroom
/** Quantas vendas pagam um custo mensal (showroom proprio) ou recuperam um investimento (parceiro). */
export function showroom({ custoMensal = 0, investimento = 0, meses = 12, ticket, mcPct, indicacaoPct = 0 }) {
  if (!(ticket > 0) || !(mcPct > 0)) return null;
  const porVenda = ticket * (mcPct / 100) - ticket * (indicacaoPct / 100);
  if (!(porVenda > 0)) return { porVenda: r2(porVenda), impossivel: true };
  const vendasMesCusto = custoMensal / porVenda;
  const vendasInvest = investimento / porVenda;
  return { porVenda: r2(porVenda), vendasMesParaPagarCusto: r1(vendasMesCusto), vendasParaRecuperar: r1(vendasInvest), vendasMesNoPrazo: r1(vendasInvest / meses + vendasMesCusto) };
}

// ---------------------------------------------------------------- checklist
/** O que falta para fechar custos, precos e metas, com a secao do formulario onde se resolve. */
export function oQueFalta(p, respostas = {}, { desfechoPct = null } = {}) {
  const r = (k) => respostas[k]?.dados ?? {};
  const itens = [
    ["Alíquotas reais de produto e serviço (contador)", p.tProduto !== null && p.tServico !== null, "impostos"],
    ["Regime e alíquotas de 2027 (exclusão do Simples)", p.tProduto2027 !== null, "impostos"],
    ["Confirmação de como o AliExpress cobra (preço já com impostos?)", Boolean(r("compras").preco_inclui_impostos), "compras"],
    ["Folga do dólar até a compra", p.margemCambial !== null, "compras"],
    ["Equipe com valor, horas e % em obra", p.hora?.custoHora !== null, "equipe"],
    ["Dia de obra (deslocamento, preparação, espera) para a produtividade", numeroBR(r("equipe").jornada_horas_dia) !== null, "equipe"],
    ["Veículo separado (combustível, manutenção, seguro, parcela)", ["combustivel_mes", "manutencao_veiculo_mes", "seguro_veiculo_mes", "parcela_veiculo_mes"].some((k) => numeroBR(r("equipe")[k]) !== null), "equipe"],
    ["Catálogo de tempos confirmado e salvo no formato novo", Boolean(respostas.tempos && !respostas.tempos.convertido), "tempos"],
    ["Metros médios de cabo por ponto", numeroBR(r("tempos").metros_por_ponto) !== null, "tempos"],
    ["Sua retirada planejada e o pró-labore de gestor", p.metas?.retirada_planejada !== null || numeroBR(r("voce").pro_labore_gestor) !== null, "voce"],
    ["Custos fixos por tipo", (r("fixos").itens ?? []).some((x) => x.categoria), "fixos"],
    ["Canais de venda (direto, RT/indicação, turn key) com os %", (r("vendas").canais ?? []).length > 0, "vendas"],
    ["Sinal e parcelas que você quer praticar", numeroBR(r("vendas").entrada_pct) !== null, "vendas"],
    ["Saldo em conta e contas a pagar dos próximos 30 dias", numeroBR(r("dividas").caixa_hoje) > 0 || numeroBR(r("dividas").a_pagar_30d) !== null, "dividas"],
    ["Desfecho dos orçamentos (fechou/perdeu)", desfechoPct !== null && desfechoPct >= 80, "pedidos"],
    ["Metas aprovadas por você", p.metas?.meta_vendas_mes !== null, "metas"],
  ];
  return itens.map(([texto, ok, secao]) => ({ texto, ok: Boolean(ok), secao }));
}
