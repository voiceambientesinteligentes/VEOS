// MONTADOR DE ORCAMENTO do VEOS (sem DOM). Orcamento do zero: cliente, ambientes, produtos do
// catalogo e mao de obra. Os calculos de margem e alcada sao os MESMOS da Negociacao ao Vivo
// (precificacao.js: Politica V1, MC com provisao de 2%, alcada de desconto da sec.9); o preco
// sugerido e o da Politica (formacao_preco.js: MC meta de 35%). Preco sugerido e sugestao: quem tem
// alcada confirma (o vendedor pode mudar o preco da linha; a margem mostra o efeito na hora).
import { custoNoBrasil, FATOR_MEDIO, fatorProduto, precoPolitica, variacaoDolar } from "./formacao_preco.js";
import { negociacao } from "./precificacao.js";

const num = (v) => { const s = String(v ?? "").trim(); if (!s) return null; const n = Number(s.replace(",", ".")); return Number.isFinite(n) ? n : null; };
export const centavos = (v) => Math.round((Number(v) || 0) * 100) / 100;
const big = (reais) => BigInt(Math.round((Number(reais) || 0) * 100));
const razao = (pct) => ({ num: BigInt(Math.round((Number(pct) || 0) * 100)), den: 100n }); // % -> Razao de percentual (num/den = %)

export const AMBIENTES_SUGERIDOS = ["Sala de estar", "Home theater", "Cozinha", "Área gourmet", "Suíte master", "Suítes", "Escritório", "Área externa", "Garagem", "Rede e infraestrutura", "Segurança", "Geral"];

/** Servicos-padrao (descricao clara para o cliente; preco/hora vem da Politica quando ha custo-hora). */
export const SERVICOS = [
  { id: "projeto", nome: "Projeto de automação e infraestrutura", descricao: "Visita técnica, levantamento, projeto executivo dos pontos e memorial descritivo.", unidade: "h" },
  { id: "infra", nome: "Infraestrutura e cabeamento", descricao: "Passagem e identificação de cabos de rede, áudio e automação; organização de quadros.", unidade: "h" },
  { id: "instalacao", nome: "Instalação de equipamentos", descricao: "Instalação física e ligação dos equipamentos do escopo.", unidade: "h" },
  { id: "programacao", nome: "Programação e configuração", descricao: "Configuração da rede, cenas, aplicativo, comandos de voz e integrações.", unidade: "h" },
  { id: "comissionamento", nome: "Comissionamento, testes e treinamento", descricao: "Testes de cada sistema, ajustes finos, treinamento dos moradores e entrega documentada.", unidade: "h" },
];

/** Linha: { secao, tipo: produto|servico, nome, descricao?, quantidade, unidade?, preco_unit, custo_unit?, produto_id?, item_id? } */
export const totalLinha = (l) => centavos((num(l.quantidade) ?? 0) * (num(l.preco_unit) ?? 0));
export const custoLinha = (l) => (num(l.custo_unit) === null || l.custo_unit === "" ? null : centavos((num(l.quantidade) ?? 0) * num(l.custo_unit)));

/** Problemas que impedem salvar (a tela mostra todos de uma vez). */
export function errosOrcamento({ cliente, linhas }) {
  const e = [];
  if (!cliente) e.push("Escolha ou cadastre o cliente.");
  if (!linhas.length) e.push("Inclua pelo menos um item.");
  linhas.forEach((l, i) => {
    const q = num(l.quantidade), p = num(l.preco_unit);
    if (!String(l.nome ?? "").trim()) e.push(`Linha ${i + 1}: falta a descrição.`);
    if (q === null || q <= 0) e.push(`Linha ${i + 1} (${l.nome || "item"}): quantidade inválida.`);
    if (p === null || p < 0) e.push(`Linha ${i + 1} (${l.nome || "item"}): preço inválido.`);
    if (l.custo_unit !== null && l.custo_unit !== undefined && l.custo_unit !== "" && (num(l.custo_unit) === null || num(l.custo_unit) < 0)) e.push(`Linha ${i + 1}: custo inválido.`);
  });
  if (linhas.length > 300) e.push("Até 300 itens por orçamento.");
  return e;
}

/** Totais por ambiente e do orcamento. desconto = { modo: "pct"|"rs", valor }. */
export function totais(linhas, desconto = { modo: "pct", valor: 0 }) {
  const secoes = [];
  let produtos = 0, servicos = 0, custo = 0, semCusto = 0;
  for (const l of linhas) {
    const nome = String(l.secao ?? "").trim() || "Geral";
    let s = secoes.find((x) => x.secao === nome);
    if (!s) secoes.push((s = { secao: nome, total: 0, itens: 0 }));
    const t = totalLinha(l);
    s.total = centavos(s.total + t); s.itens += 1;
    if (l.tipo === "servico") servicos += t; else produtos += t;
    const c = custoLinha(l);
    if (c === null) semCusto += 1; else custo += c;
  }
  const subtotal = centavos(produtos + servicos);
  const dv = num(desconto?.valor) ?? 0;
  const descontoRs = Math.min(subtotal, Math.max(0, desconto?.modo === "rs" ? centavos(dv) : centavos((subtotal * dv) / 100)));
  return { secoes, produtos: centavos(produtos), servicos: centavos(servicos), subtotal, desconto: descontoRs, descontoPct: subtotal ? Math.round((descontoRs / subtotal) * 10000) / 100 : 0, total: centavos(subtotal - descontoRs), custo: centavos(custo), semCusto };
}

/**
 * Conferencia pela Politica V1 com o motor da Negociacao ao Vivo.
 * imp = { produto: %, servico: % } (aliquota efetiva; null = lacuna); v = % sobre o preco (comissao, RT, cartao).
 */
export function analise(linhas, desconto, { imp, v = 0 } = {}) {
  const t = totais(linhas, desconto);
  if (!t.subtotal) return { ...t, resolvido: false, motivo: "Inclua itens com preço." };
  if (t.semCusto) return { ...t, resolvido: false, motivo: `${t.semCusto} item(ns) sem custo: a margem ficaria inflada. Informe o custo ou remova.` };
  if (!imp || imp.produto === null || imp.produto === undefined || imp.servico === null || imp.servico === undefined) return { ...t, resolvido: false, motivo: "Faltam as alíquotas de imposto (Formulário do CFO)." };
  const custos = [];
  for (const l of linhas) { const c = custoLinha(l); if (c) custos.push({ tipo: l.tipo === "servico" ? "servico" : "produto", total: big(c) }); }
  const r = negociacao({
    tabela: big(t.subtotal), desconto: { modo: "rs", valor: big(t.desconto) }, custos,
    extras: Number(v) > 0 ? [{ modo: "pct", valor: BigInt(Math.round(Number(v) * 100)) }] : [],
    impostos: { produto: razao(imp.produto), servico: razao(imp.servico) },
  });
  const pct = (h) => (h === null || h === undefined ? null : Number(h) / 100);
  if (r.pctH === null) return { ...t, resolvido: false, motivo: r.pendencias.join(" ") || "Margem não resolvida." };
  return {
    ...t, resolvido: true, mcPct: pct(r.pctH), faixa: r.faixa, alcada: r.alcada.nivel, exigencias: r.alcada.exigencias,
    lucroComNota: Number(r.comNota.lucro) / 100, margemComNota: pct(r.comNota.margemH), impostos: r.comNota.impostos === null ? null : Number(r.comNota.impostos) / 100,
    mc: Number(r.mc) / 100, ticket: r.ticket?.texto ?? null,
  };
}

/**
 * Custo no Brasil e preco sugerido de um produto do catalogo.
 * cfo = { produtos: [/cfo/produtos], p: parametros(), cambio, serie, tProduto } (so direcao/financas leem);
 * sem cfo: custo = ultimo preco pago x fator medio (com rotulo) e sem preco sugerido.
 */
export function precoDoProduto(prod, cfo = null) {
  const venda = num(prod.preco_venda);
  const ref = cfo?.produtos?.find((x) => x.id === prod.id) ?? null;
  let custo = null, origemCusto = "sem preço de compra";
  if (ref && cfo.p) {
    const f = fatorProduto(ref, { ...cfo.p.fator, cambio: cfo.cambio ?? null });
    const ultima = (ref.compras ?? []).map((c) => c.data).filter(Boolean).sort().pop() ?? null;
    const vd = variacaoDolar(ultima, cfo.serie ?? []);
    const fatorDolar = vd ? vd.fator * (1 + (cfo.p.spreadAliexpress ?? 0) / 100) : 1;
    custo = f.fator === null ? null : custoNoBrasil(ref.custo * fatorDolar, { fator: f.fator, perdas: cfo.p.perdas });
    origemCusto = custo === null ? f.origem : `custo no Brasil (${f.origem}${vd ? ", dólar de hoje" : ""})`;
  } else if (num(prod.custo_ultimo) > 0) {
    custo = num(prod.custo_ultimo) <= FATOR_MEDIO.limite ? centavos(num(prod.custo_ultimo) * FATOR_MEDIO.ate280) : centavos(num(prod.custo_ultimo));
    origemCusto = num(prod.custo_ultimo) <= FATOR_MEDIO.limite ? "último preço pago × fator médio de importação 1,205" : "último preço pago (sem fator: confira com o CFO)";
  }
  const t = cfo?.tProduto ?? null;
  const sugerido = custo !== null && t !== null ? precoPolitica(custo, { t, v: cfo?.v ?? 0, alvo: 35 }) : null;
  const preco = venda ?? sugerido;
  return { custo, origemCusto, preco, origemPreco: venda !== null ? "preço de tabela" : sugerido !== null ? "sugerido pela Política V1 (MC 35%)" : "sem preço: informe", sugerido };
}

/** Preco da hora pela Politica (MC 35%) a partir do custo-hora do Formulario do CFO. */
export function precoHora(custoHora, tServico, v = 0) {
  if (!(Number(custoHora) > 0) || tServico === null || tServico === undefined) return null;
  return precoPolitica(custoHora, { t: tServico, v, alvo: 35 });
}

/** Payload da API (POST /comercial/orcamentos). */
export function paraSalvar({ cliente, linhas, desconto, condicao, validade, prazo, observacao, analise: a, substitui = null }) {
  const t = totais(linhas, desconto);
  return {
    cliente_id: cliente.id, cliente_nome: cliente.nome, cliente_zoho_id: cliente.zoho_contact_id ?? null,
    referencia: cliente.referencia ?? null, condicao: condicao || null, validade: validade || null, prazo_execucao: prazo || null, observacao: observacao || null,
    valor_total: t.total.toFixed(2), desconto: t.desconto ? t.desconto.toFixed(2) : null, substitui,
    resumo: a?.resolvido ? { mc_politica: a.mcPct, faixa: a.faixa, alcada: a.alcada, margem_com_nota: a.margemComNota, custo_total: t.custo } : { pendente: a?.motivo ?? null },
    itens: linhas.map((l) => ({
      secao: String(l.secao ?? "").trim() || "Geral", tipo: l.tipo === "servico" ? "servico" : "produto", nome: String(l.nome).trim().slice(0, 300), descricao: l.descricao || null,
      quantidade: String(num(l.quantidade)), unidade: l.unidade || null, preco_unit: (num(l.preco_unit) ?? 0).toFixed(2),
      custo_unit: num(l.custo_unit) === null || l.custo_unit === "" ? null : num(l.custo_unit).toFixed(2), produto_id: l.produto_id ?? null, item_id: l.item_id ?? null,
    })),
  };
}

/** Itens salvos (API) -> linhas do montador (para nova versao). */
export const linhasDosItens = (itens = []) => itens.map((i) => ({
  secao: i.secao ?? "Geral", tipo: i.tipo, nome: i.nome, descricao: i.descricao ?? "", quantidade: String(Number(i.quantidade)), unidade: i.unidade ?? "",
  preco_unit: String(Number(i.preco_unit)), custo_unit: i.custo_unit === null || i.custo_unit === undefined ? "" : String(Number(i.custo_unit)), produto_id: i.produto_id ?? null, item_id: i.item_id ?? null,
}));

export const SITUACOES = {
  rascunho: ["Rascunho", "neutral"], enviado: ["Enviado ao cliente", "live"], aceito: ["Aceito", "ok"], recusado: ["Recusado", "risk"], expirado: ["Expirado", "warn"], substituido: ["Substituído", "neutral"],
};

/** Proximo passo do orcamento (para a lista e a ficha). */
export function proximoPasso(o, hoje = new Date().toISOString().slice(0, 10)) {
  if (o.estado === "rascunho") return "Gerar o PDF e enviar ao cliente";
  if (o.estado === "enviado") return o.validade && o.validade < hoje ? "Validade vencida: renovar (nova versão) ou marcar expirado" : "Acompanhar: ligar em 2 dias, registrar a resposta";
  if (o.estado === "aceito") return "Pedido criado: parcelas, compras e obra";
  if (o.estado === "recusado") return "Registrar o aprendizado (motivo) e reativar em 90 dias";
  if (o.estado === "expirado") return "Oferecer revisão com preço atualizado";
  return "—";
}
