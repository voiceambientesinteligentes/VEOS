// Vigia - "sistema vivo" do VEOS (somente TESTE). Porte fiel de
// apps/portal/veosportal/vigia.py: evento orcamento.salvo -> avisos do CFO.
// Deterministico: nao chama IA, nao grava, nao aprova. Dado ausente = lacuna.

import { alcadaDesconto, avaliarTicket, margem, POLITICA, TICKET_DESEJADO } from "./cfo.ts";
import {
  brl, centavos, centavosOuNulo, centesimos, fixo2, pctTexto, type Razao, RegraError,
} from "./dinheiro.ts";

export { RegraError };

const QTD_RE = /^[1-9]\d{0,5}$/;
const MAX_ITENS = 300;
const SEVERIDADES = ["INFO", "MEDIO", "ALTO", "CRITICO"];
const INTEGRIDADE = "INTEGRIDADE DO REGISTRO";

type Obj = Record<string, unknown>;

function chaves(obj: unknown, ctx: string, obrig: string[], opc: string[] = []): Obj {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) throw new RegraError(`${ctx}: deve ser objeto`);
  const o = obj as Obj;
  const falt = obrig.filter((k) => !(k in o));
  if (falt.length) throw new RegraError(`${ctx}: campo(s) ausente(s): ${falt.join(", ")} (ausente nunca vira zero)`);
  const extra = Object.keys(o).filter((k) => !obrig.includes(k) && !opc.includes(k)).sort();
  if (extra.length) throw new RegraError(`${ctx}: campo(s) desconhecido(s): ${extra.join(", ")}`);
  return o;
}

function texto(v: unknown, ctx: string, teste: boolean, maximo: number): string {
  if (typeof v !== "string" || !v.trim()) throw new RegraError(`${ctx}: texto obrigatorio`);
  if ([...v].length > maximo) throw new RegraError(`${ctx}: no maximo ${maximo} caracteres`);
  if (teste && !v.includes("TESTE")) throw new RegraError(`${ctx}: entidade sintetica deve conter 'TESTE'`);
  return v;
}

const aviso = (codigo: string, severidade: string, titulo: string, mensagem: string, fonte: string, origem: string) =>
  ({ codigo, diretor: "CFO", severidade, titulo, mensagem, fonte, origem });

function lerItens(lista: unknown) {
  if (!Array.isArray(lista)) throw new RegraError("itens: deve ser lista");
  if (lista.length > MAX_ITENS) throw new RegraError(`itens: no maximo ${MAX_ITENS} itens`);
  const itens = lista.map((raw, i) => {
    const ctx = `itens[${i}]`;
    const it = chaves(raw, ctx, ["codigo", "quantidade", "preco_unitario"], ["descricao", "custo_unitario"]);
    if (typeof it.quantidade !== "string" || !QTD_RE.test(it.quantidade)) {
      throw new RegraError(`${ctx}.quantidade: inteiro positivo em texto, ex. '2'`);
    }
    const q = BigInt(it.quantidade);
    const preco = centavos(it.preco_unitario, `${ctx}.preco_unitario`);
    const custo = centavosOuNulo(it.custo_unitario, `${ctx}.custo_unitario`);
    return {
      codigo: texto(it.codigo, `${ctx}.codigo`, false, 64), preco, custo,
      totalPreco: preco * q, totalCusto: custo === null ? null : custo * q,
    };
  });
  if (!itens.length) throw new RegraError("itens: orcamento sem itens");
  return itens;
}

export function avaliarOrcamento(entrada: unknown) {
  const o = chaves(entrada, "orcamento", ["id", "ambiente", "itens", "valor_total_informado"],
    ["desconto_valor", "impostos", "justificativas_ticket", "vendedor", "cliente"]);
  texto(o.id, "id", true, 64);
  if (o.ambiente !== "TESTE") {
    throw new RegraError("ambiente: somente TESTE esta habilitado (producao depende de dados validados e de decisao registrada)");
  }
  const itens = lerItens(o.itens);
  const informado = centavos(o.valor_total_informado, "valor_total_informado", true);
  const desconto = centavos(o.desconto_valor || "0", "desconto_valor");
  const impostos = centavosOuNulo(o.impostos, "impostos");

  const avisos: ReturnType<typeof aviso>[] = [];
  const lacunas: string[] = [];
  const soma = itens.reduce((s, i) => s + i.totalPreco, 0n);
  if (soma === 0n) throw new RegraError("itens: a soma dos itens deve ser maior que zero");

  // 1. A lista de produtos fecha com o total informado pelo vendedor?
  if (soma !== informado) {
    avisos.push(aviso("ORC_TOTAL_DIVERGENTE", "CRITICO", "O total não fecha com a lista de produtos",
      `A soma dos itens dá ${brl(soma)}, mas o total informado é ${brl(informado)} ` +
        `(diferença de ${brl(informado - soma)}). Corrija antes de enviar: nenhuma análise de ` +
        "margem vale até isso ser resolvido.",
      "soma de quantidade × preço unitário dos itens", INTEGRIDADE));
  }
  if (desconto > soma) throw new RegraError("desconto_valor maior que a soma dos itens");

  // 2. Itens vendidos abaixo do custo e itens sem custo.
  const semCusto = itens.filter((i) => i.custo === null).map((i) => i.codigo);
  if (semCusto.length) lacunas.push(`Custo unitário ausente: ${semCusto.join(", ")}. Margem não calculada.`);
  for (const i of itens) {
    if (i.custo !== null && i.preco < i.custo) {
      avisos.push(aviso("ORC_ITEM_ABAIXO_CUSTO", "ALTO", `Item ${i.codigo} vendido abaixo do custo`,
        `Preço ${brl(i.preco)} menor que o custo ${brl(i.custo)}.`, "comparação preço × custo do item", INTEGRIDADE));
    }
  }
  if (impostos === null) {
    lacunas.push("Impostos não informados: Receita Líquida e margem não calculadas (Política V1 sec.4).");
  }

  // 3. Margem e alcada (V1 sec.3, 4, 6, 8, 9) - so sem lacunas.
  const liquido = soma - desconto;
  const descPct: Razao = { num: desconto * 100n, den: soma };
  let mg: ReturnType<typeof margem> | null = null;
  let alcada: ReturnType<typeof alcadaDesconto> | null = null;
  if (!lacunas.length) {
    const custos = itens.reduce((s, i) => s + (i.totalCusto as bigint), 0n);
    mg = margem(liquido - (impostos as bigint), custos);
    alcada = alcadaDesconto(descPct, mg.pct);
    const pctTxt = mg.pct === null ? "não resolvida" : pctTexto(centesimos(mg.pct));
    const sev = ({ VERDE: "INFO", ACEITAVEL: "INFO", ATENCAO: "ALTO", "NAO APROVADO": "CRITICO" } as Record<string, string>)[mg.faixa] ?? "ALTO";
    avisos.push(aviso("ORC_MARGEM", sev, `Margem de contribuição ${pctTxt} — faixa ${mg.faixa}`,
      "Margem calculada com provisão de risco de 2% da Receita Líquida (uma única vez).",
      "Política V1 sec.3, 4 e 6", POLITICA));
    if (alcada.nivel !== "FLUXO NORMAL" && alcada.nivel !== "AUTONOMIA COMERCIAL") {
      avisos.push(aviso("ORC_ALCADA", alcada.nivel === "EXTRAORDINARIA" ? "CRITICO" : "ALTO",
        `Alçada exigida: ${alcada.nivel}`, alcada.exigencias.join(" "), "Política V1 sec.3, 8 e 9", POLITICA));
    }
  }

  // 4. Ticket desejado (V1 sec.2): alerta, nunca bloqueio.
  const mgH = mg?.pct ? centesimos(mg.pct) : null;
  const tk = avaliarTicket(liquido, o.justificativas_ticket || [], mgH);
  if (tk.abaixo_do_desejado && tk.situacao !== "ABAIXO DO DESEJADO - EXCECAO JUSTIFICADA") {
    avisos.push(aviso("ORC_TICKET", "MEDIO", tk.situacao[0] + tk.situacao.slice(1).toLowerCase(),
      `Valor ${brl(liquido)} abaixo do ticket desejado de ${brl(TICKET_DESEJADO)}. ` +
        "É meta, não bloqueio: registre a justificativa. " + tk.inconsistencias.join(" "),
      tk.fonte, POLITICA));
  }

  avisos.sort((a, b) => SEVERIDADES.indexOf(b.severidade) - SEVERIDADES.indexOf(a.severidade));
  const pior = avisos.length ? avisos[0].severidade : "INFO";
  return {
    evento: "orcamento.salvo", orcamento: o.id as string, ambiente: "TESTE",
    situacao: pior === "CRITICO" ? "BLOQUEAR_ENVIO" : (pior === "ALTO" || lacunas.length ? "REVISAR" : "OK"),
    avisos, lacunas,
    resumo: {
      soma_itens: fixo2(soma), valor_informado: fixo2(informado), desconto: fixo2(desconto),
      desconto_pct: fixo2(centesimos(descPct)), valor_liquido: fixo2(liquido),
      margem_pct: mg === null || mg.pct === null ? null : fixo2(centesimos(mg.pct)),
      faixa_margem: mg === null ? null : mg.faixa,
      alcada: alcada === null ? null : alcada.nivel,
    },
    nota: "Avisos determinísticos sobre dados TESTE. Nada foi gravado ou aprovado.",
  };
}
