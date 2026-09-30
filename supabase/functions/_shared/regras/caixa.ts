// Caixa do projeto (CFO): posicao, exposicao e cobertura por fase.
// Fontes: Politica V1.1 sec.4-9 (posicao/exposicao/gatilho 10%) e V1 sec.10
// (recebido efetivo cobre os desembolsos da fase antes de aquisicao relevante).
// exposicao() e cobertura() espelham cfo_controls.exposicao/_cobertura (paridade testada).
import { POLITICA } from "./cfo.ts";
import { brl, centavos, centavosOuNulo, centesimos, fixo2, gt, pctTexto, type Razao, RegraError } from "./dinheiro.ts";

const LIMIAR_EXPOSICAO_PCT = 10n; // V1.1 sec.9 (estritamente acima)
const MAX = { fases: 10, recebimentos: 300, compromissos: 300 };
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const SEVERIDADES = ["INFO", "MEDIO", "ALTO", "CRITICO"];

type Obj = Record<string, unknown>;

/** V1.1 sec.7-9: exposicao = max(0, -posicao); % so com contrato > 0; gatilho > 10%. */
export function exposicao(posicao: bigint, valorContrato: bigint | null) {
  const exp = posicao < 0n ? -posicao : 0n;
  if (valorContrato === null || valorContrato <= 0n) {
    return { posicao, exposicao: exp, pct: null as Razao | null, gatilho: "NAO RESOLVIDO (falha fechada)" };
  }
  const pct: Razao = { num: exp * 100n, den: valorContrato };
  return { posicao, exposicao: exp, pct: pct as Razao | null, gatilho: gt(pct, LIMIAR_EXPOSICAO_PCT) ? "ACIONADO" : "NAO ACIONADO" };
}

/** V1 sec.10: a fase esta coberta quando o recebido efetivo alocado >= necessidade. */
export function cobertura(coberto: bigint, necessidade: bigint) {
  const falta = necessidade > coberto ? necessidade - coberto : 0n;
  return { necessidade, coberto, cobre: falta === 0n, deficit: falta, situacao: falta === 0n ? "COBERTA" : "DESCOBERTA" };
}

function lista(v: unknown, ctx: string, max: number): Obj[] {
  if (!Array.isArray(v)) throw new RegraError(`${ctx}: deve ser lista`);
  if (v.length > max) throw new RegraError(`${ctx}: no maximo ${max} itens`);
  return v.map((x, i) => {
    if (typeof x !== "object" || x === null || Array.isArray(x)) throw new RegraError(`${ctx}[${i}]: deve ser objeto`);
    return x as Obj;
  });
}

const ident = (v: unknown, ctx: string) => {
  if (typeof v !== "string" || !ID_RE.test(v)) throw new RegraError(`${ctx}: identificador invalido`);
  return v;
};

const aviso = (codigo: string, severidade: string, titulo: string, mensagem: string, fonte: string) =>
  ({ codigo, diretor: "CFO", severidade, titulo, mensagem, fonte, origem: POLITICA });

const pctTxt = (p: Razao | null) => (p === null ? "não resolvido" : pctTexto(centesimos(p)));

/**
 * Avalia o caixa de um projeto TESTE (e, se informada, uma compra PROPOSTA).
 * entrada: {codigo, valor_contrato|null, fases[{id,nome,custos,encargos}],
 *           recebimentos[{valor, fase|null}], compromissos[{valor}],
 *           compra_proposta?{valor, fase|null, descricao}}
 * Compromissos = caixa ja desembolsado + obrigacoes firmes nao pagas (cada obrigacao
 * conta uma vez pelo seu valor total). Compra proposta NAO entra nos compromissos
 * atuais (V1.1 sec.6); e avaliada como cenario.
 */
export function avaliarCaixaProjeto(e: Obj) {
  if (typeof e.codigo !== "string" || !e.codigo.includes("TESTE")) throw new RegraError("codigo: projeto sintetico deve conter 'TESTE'");
  const vc = centavosOuNulo(e.valor_contrato, "valor_contrato");
  const fases = lista(e.fases ?? [], "fases", MAX.fases).map((f, i) => ({
    id: ident(f.id, `fases[${i}].id`),
    nome: String(f.nome ?? f.id),
    necessidade: centavos(f.custos, `fases[${i}].custos`) + centavos(f.encargos, `fases[${i}].encargos`),
  }));
  const idsFase = new Set(fases.map((f) => f.id));
  if (idsFase.size !== fases.length) throw new RegraError("fases: identificador repetido");
  const recebimentos = lista(e.recebimentos ?? [], "recebimentos", MAX.recebimentos).map((r, i) => {
    const fase = r.fase === null || r.fase === undefined ? null : ident(r.fase, `recebimentos[${i}].fase`);
    if (fase !== null && !idsFase.has(fase)) throw new RegraError(`recebimentos[${i}].fase: fase inexistente ${fase}`);
    return { valor: centavos(r.valor, `recebimentos[${i}].valor`, true), fase };
  });
  const compromissos = lista(e.compromissos ?? [], "compromissos", MAX.compromissos).map((c, i) => centavos(c.valor, `compromissos[${i}].valor`, true));
  let compra: { valor: bigint; fase: string | null; descricao: string } | null = null;
  if (e.compra_proposta !== undefined && e.compra_proposta !== null) {
    const c = e.compra_proposta as Obj;
    const fase = c.fase === null || c.fase === undefined ? null : ident(c.fase, "compra_proposta.fase");
    if (fase !== null && !idsFase.has(fase)) throw new RegraError(`compra_proposta.fase: fase inexistente ${fase}`);
    compra = { valor: centavos(c.valor, "compra_proposta.valor", true), fase, descricao: String(c.descricao ?? "compra proposta").slice(0, 200) };
  }

  const recebido = recebimentos.reduce((s, r) => s + r.valor, 0n);
  const comprometido = compromissos.reduce((s, v) => s + v, 0n);
  const atual = exposicao(recebido - comprometido, vc);
  const avisos: ReturnType<typeof aviso>[] = [];
  const lacunas: string[] = [];

  // 1. Posicao e exposicao atuais (V1.1)
  if (vc === null || vc <= 0n) {
    lacunas.push("Valor do Contrato ausente ou zero: percentual de exposição NÃO RESOLVIDO (V1.1 sec.8, falha fechada).");
    if (atual.exposicao > 0n) {
      avisos.push(aviso("EXP_NAO_RESOLVIDA", "ALTO", "Exposição sem contrato para medir o percentual",
        `A VOICE está exposta em ${brl(atual.exposicao)} e não há Valor do Contrato para calcular o percentual. Decisão por percentual falha fechada: leve à direção.`, "Política V1.1 sec.8"));
    }
  } else if (atual.gatilho === "ACIONADO") {
    avisos.push(aviso("EXP_GATILHO", "ALTO", `Exposição de caixa ${pctTxt(atual.pct)} do contrato`,
      `Compromissos superam o recebido em ${brl(atual.exposicao)}. Acima de 10% do Valor do Contrato exige autorização expressa da direção.`, "Política V1.1 sec.7 e 9"));
  } else if (atual.exposicao > 0n) {
    avisos.push(aviso("EXP_ATENCAO", "MEDIO", `Posição de caixa negativa (${pctTxt(atual.pct)} do contrato)`,
      `Exposição de ${brl(atual.exposicao)}, dentro do limite de 10%. O estado preferido é posição maior ou igual a zero.`, "Política V1.1 sec.7"));
  } else {
    avisos.push(aviso("EXP_OK", "INFO", "Posição de caixa positiva ou neutra",
      `Recebido ${brl(recebido)} cobre os compromissos de ${brl(comprometido)}. Exposição zero.`, "Política V1.1 sec.4 e 7"));
  }

  // 2. Cobertura por fase (V1 sec.10): recebido efetivo alocado a fase
  const linhas = fases.map((f) => {
    const coberto = recebimentos.filter((r) => r.fase === f.id).reduce((s, r) => s + r.valor, 0n);
    const agora = cobertura(coberto, f.necessidade);
    const comCompra = compra && compra.fase === f.id ? cobertura(coberto, f.necessidade + compra.valor) : null;
    return { id: f.id, nome: f.nome, necessidade: f.necessidade, coberto, agora, comCompra };
  });
  for (const l of linhas) {
    if (!l.agora.cobre && !(compra && compra.fase === l.id)) {
      avisos.push(aviso("FASE_DESCOBERTA", "MEDIO", `Fase ${l.nome} ainda não coberta`,
        `Recebido efetivo alocado ${brl(l.coberto)} para desembolsos de ${brl(l.necessidade)} (faltam ${brl(l.agora.deficit)}). Não iniciar aquisição relevante da fase antes de cobrir.`, "Política V1 sec.10"));
    }
  }

  // 3. Compra proposta: cenario, nunca aprovacao
  let cenario: ReturnType<typeof exposicao> | null = null;
  if (compra) {
    cenario = exposicao(recebido - comprometido - compra.valor, vc);
    const linha = linhas.find((l) => l.id === compra!.fase);
    if (compra.fase === null) {
      lacunas.push("Compra proposta sem fase: a cobertura por fase (V1 sec.10) não pode ser verificada.");
    } else if (linha && linha.comCompra && !linha.comCompra.cobre) {
      avisos.push(aviso("COMPRA_SEM_COBERTURA", "CRITICO", `Compra não coberta na fase ${linha.nome}`,
        `Com a compra de ${brl(compra.valor)}, a fase precisa de ${brl(linha.comCompra.necessidade)} e só há ${brl(linha.coberto)} recebido efetivamente (faltam ${brl(linha.comCompra.deficit)}). Receba antes de comprar.`, "Política V1 sec.10"));
    } else if (linha) {
      avisos.push(aviso("COMPRA_COBERTA", "INFO", `Compra coberta pelo recebido da fase ${linha.nome}`,
        `Recebido efetivo ${brl(linha.coberto)} cobre a necessidade de ${brl(linha.comCompra!.necessidade)} com a compra.`, "Política V1 sec.10"));
    }
    if (cenario.gatilho === "ACIONADO" && atual.gatilho !== "ACIONADO") {
      avisos.push(aviso("COMPRA_EXPOSICAO", "ALTO", `Compra levaria a exposição a ${pctTxt(cenario.pct)}`,
        `Assumir ${brl(compra.valor)} deixaria a exposição em ${brl(cenario.exposicao)}, acima de 10% do contrato: exige autorização expressa da direção.`, "Política V1.1 sec.9"));
    } else if (cenario.gatilho === "ACIONADO") {
      avisos.push(aviso("COMPRA_EXPOSICAO", "ALTO", `Compra aumenta uma exposição já acima de 10%`,
        `Exposição iria de ${pctTxt(atual.pct)} para ${pctTxt(cenario.pct)} do contrato. Exige autorização expressa da direção.`, "Política V1.1 sec.9"));
    }
  }

  avisos.sort((a, b) => SEVERIDADES.indexOf(b.severidade) - SEVERIDADES.indexOf(a.severidade));
  const pior = avisos[0]?.severidade ?? "INFO";
  const r2 = (p: Razao | null) => (p === null ? null : fixo2(centesimos(p)));
  return {
    evento: compra ? "compra.proposta" : "projeto.avaliado",
    codigo: e.codigo,
    ambiente: "TESTE",
    situacao: pior === "CRITICO" ? "BLOQUEAR" : pior === "ALTO" || lacunas.length ? "REVISAR" : "OK",
    avisos,
    lacunas,
    resumo: {
      valor_contrato: vc === null ? null : fixo2(vc),
      recebido_efetivo: fixo2(recebido),
      compromissos: fixo2(comprometido),
      posicao: fixo2(atual.posicao),
      exposicao: fixo2(atual.exposicao),
      exposicao_pct: r2(atual.pct),
      gatilho: atual.gatilho,
      cenario_compra: cenario && compra
        ? { valor: fixo2(compra.valor), fase: compra.fase, exposicao: fixo2(cenario.exposicao), exposicao_pct: r2(cenario.pct), gatilho: cenario.gatilho }
        : null,
      fases: linhas.map((l) => ({
        id: l.id, nome: l.nome, necessidade: fixo2(l.necessidade), coberto: fixo2(l.coberto),
        situacao: l.agora.situacao, deficit: fixo2(l.agora.deficit),
        com_compra: l.comCompra ? { situacao: l.comCompra.situacao, deficit: fixo2(l.comCompra.deficit) } : null,
      })),
    },
    nota: compra ? "Cenário de compra PROPOSTA: nada foi comprado nem aprovado." : "Avaliação calculada sobre dados TESTE.",
  };
}
