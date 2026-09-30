// Regras CFO da Politica de Saude Financeira V1 - porte fiel de
// apps/portal/veosportal/cfo_controls.py (margem, faixa, alcada, ticket).
// Paridade verificada por tests/regras/paridade.test.ts.

import { divArred, ge, gt, lt, type Razao, RegraError } from "./dinheiro.ts";

export const POLITICA = "POLITICA";
export const TICKET_DESEJADO = 10_000_000n; // R$ 100.000,00 em centavos (V1 sec.2, META)
const RISCO_PCT = 2n; // V1 sec.6
const MARGEM_ALVO = 35n, MARGEM_NORMAL = 30n, MARGEM_PISO = 25n; // V1 sec.3
const DESC_AUTONOMIA_PCT = 2n, MC_AUTONOMIA_PCT = 32n, DESC_DIRECAO_PCT = 5n; // V1 sec.9

export const EXCECOES_TICKET: Record<string, string> = {
  cliente_recorrente: "cliente recorrente",
  ampliacao_instalacao: "ampliacao de instalacao existente",
  baixa_complexidade: "baixa complexidade operacional",
  margem_superior_meta: "margem superior a meta",
  recebimento_antecipado: "recebimento antecipado",
  relacionamento_estrategico: "relacionamento estrategico com arquiteto ou parceiro",
  continuidade_identificavel: "oportunidade comercial com continuidade concretamente identificavel",
};

const NIVEIS_ALCADA = [
  "FLUXO NORMAL", "AUTONOMIA COMERCIAL", "NAO RESOLVIDO", "DIRECAO",
  "EXCEPCIONAL - NOVA ANALISE INTEGRAL", "EXTRAORDINARIA",
];

export type Faixa = "VERDE" | "ACEITAVEL" | "ATENCAO" | "NAO APROVADO" | "NAO RESOLVIDO";

export function faixaMargem(p: Razao | null): Faixa {
  if (p === null) return "NAO RESOLVIDO";
  if (ge(p, MARGEM_ALVO)) return "VERDE";
  if (ge(p, MARGEM_NORMAL)) return "ACEITAVEL";
  if (ge(p, MARGEM_PISO)) return "ATENCAO";
  return "NAO APROVADO";
}

/** V1 sec.4 e sec.6: MC = RL - custos diretos/variaveis - provisao 2% RL (uma vez). */
export function margem(rl: bigint, custos: bigint) {
  if (rl <= 0n) {
    return { rl, custos, risco: null, mc: null, pct: null as Razao | null, faixa: "NAO RESOLVIDO" as Faixa };
  }
  const risco = divArred(rl * RISCO_PCT, 100n);
  const mc = rl - custos - risco;
  const pct: Razao = { num: mc * 100n, den: rl };
  return { rl, custos, risco, mc, pct: pct as Razao | null, faixa: faixaMargem(pct) };
}

/** V1 sec.9 e piso da sec.3/8. */
export function alcadaDesconto(desc: Razao, mc: Razao | null) {
  if (mc === null) {
    return {
      nivel: "NAO RESOLVIDO", autonomia_comercial: false,
      exigencias: ["Receita Liquida <= 0: margem nao resolvida (falha fechada)."],
    };
  }
  const flags: [string, string][] = [];
  if (desc.num === 0n) {
    flags.push(["FLUXO NORMAL", "Sem desconto: valem as faixas de margem (sec.3)."]);
  } else if (!gt(desc, DESC_AUTONOMIA_PCT)) {
    if (ge(mc, MC_AUTONOMIA_PCT)) {
      flags.push(["AUTONOMIA COMERCIAL", "Desconto ate 2% com MC >= 32%: autonomia comercial (sec.9)."]);
    } else if (ge(mc, MARGEM_NORMAL)) {
      flags.push(["NAO RESOLVIDO",
        "Desconto ate 2% com MC entre 30% e 31,99%: a sec.9 nao define a alcada (autonomia exige MC >= " +
        "32%; direcao e explicita so para desconto > 2% ou MC < 30%). Decisao humana necessaria."]);
    }
  } else if (!gt(desc, DESC_DIRECAO_PCT)) {
    flags.push(["DIRECAO", "Desconto acima de 2% e ate 5%: exige autorizacao da direcao (sec.9)."]);
  } else {
    flags.push(["EXCEPCIONAL - NOVA ANALISE INTEGRAL",
      "Desconto acima de 5%: excepcional; exige nova analise financeira integral (sec.9)."]);
  }
  if (lt(mc, MARGEM_NORMAL)) {
    flags.push(["DIRECAO", "MC abaixo de 30%: exige autorizacao da direcao independentemente do percentual " +
      "concedido (sec.9)."]);
  }
  if (lt(mc, MARGEM_PISO)) {
    flags.push(["EXTRAORDINARIA", "MC abaixo de 25%: nao e operacao comercial normal; aprovacao " +
      "extraordinaria, expressa e registrada (sec.3 e sec.8)."]);
  }
  const nivel = flags.map((f) => f[0]).reduce((a, b) => (NIVEIS_ALCADA.indexOf(b) > NIVEIS_ALCADA.indexOf(a) ? b : a));
  return { nivel, autonomia_comercial: nivel === "AUTONOMIA COMERCIAL", exigencias: flags.map((f) => f[1]) };
}

/** V1 sec.2: ticket desejado e META, nunca bloqueio. margemH = centesimos de %. */
export function avaliarTicket(valor: bigint, justificativas: unknown, margemH: bigint | null) {
  if (valor <= 0n) throw new RegraError("valor_contrato: deve ser maior que zero");
  if (!Array.isArray(justificativas)) throw new RegraError("justificativas: deve ser lista");
  const max = Object.keys(EXCECOES_TICKET).length;
  if (justificativas.length > max) throw new RegraError(`justificativas: no maximo ${max} itens`);
  for (const j of justificativas) {
    if (typeof j !== "string" || !(j in EXCECOES_TICKET)) {
      throw new RegraError(`justificativa desconhecida: ${JSON.stringify(j)}`);
    }
  }
  if (new Set(justificativas).size !== justificativas.length) throw new RegraError("justificativa repetida");
  if (margemH !== null && (margemH >= 100_000n || margemH <= -100_000n)) {
    throw new RegraError("margem_pct: percentual invalido"); // mesmo limite do SIGNED_PCT_RE
  }
  const abaixo = valor < TICKET_DESEJADO;
  const inconsistencias: string[] = [];
  if (justificativas.includes("margem_superior_meta") && (margemH === null || margemH <= MARGEM_ALVO * 100n)) {
    inconsistencias.push("'margem superior a meta' exige margem informada acima de 35%.");
  }
  let situacao: string;
  if (!abaixo) situacao = "ATINGE O TICKET DESEJADO";
  else if (!justificativas.length) situacao = "ABAIXO DO DESEJADO - SEM JUSTIFICATIVA";
  else if (inconsistencias.length) situacao = "ABAIXO DO DESEJADO - JUSTIFICATIVA INCONSISTENTE";
  else situacao = "ABAIXO DO DESEJADO - EXCECAO JUSTIFICADA";
  return { abaixo_do_desejado: abaixo, situacao, inconsistencias, fonte: "Politica V1 sec.2 e sec.3" };
}
