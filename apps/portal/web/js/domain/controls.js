// Dominio: regras puras da camada de controles CFO e das integracoes (sem DOM).
// Valores monetarios circulam como texto decimal; nenhum calculo usa float.

import { formatBRL, formatPP, formatPct, toScaled } from "./format.js";

const MONEY_RE = /^\d{1,13}(\.\d{1,2})?$/;
const PCT_RE = /^\d{1,3}(\.\d{1,2})?$/;
const THOUSANDS_RE = /^\d{1,3}(\.\d{3})+$/;

// Aceita "1.234,56", "1234,56", "1234.56" e "1.234"; devolve "1234.56" ou null.
export function parseMoneyInput(raw) {
  let s = String(raw ?? "").replace(/R\$|\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (THOUSANDS_RE.test(s)) s = s.replace(/\./g, "");
  if (!MONEY_RE.test(s)) return null;
  const [i, f = ""] = s.split(".");
  return `${BigInt(i)}.${(f + "00").slice(0, 2)}`;
}

export function parsePctInput(raw) {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!PCT_RE.test(s)) return null;
  return toScaled(s, 2) <= 10000n ? s : null;
}

export function arrow(delta) {
  const n = toScaled(delta, 4);
  if (n === null || n === 0n) return "▬";
  return n > 0n ? "▲" : "▼";
}

function signedPct(v) {
  const n = toScaled(v, 1);
  if (n === null) return "";
  return (n > 0n ? "+" : "") + formatPct(v, 1);
}

export function indicatorValue(ind) {
  if (ind.unidade === "lista") return `${(ind.itens || []).length} projeto(s)`;
  if (ind.valor === null || ind.valor === undefined) return "Indisponível";
  if (ind.unidade === "BRL") return formatBRL(ind.valor);
  if (ind.unidade === "%") return formatPct(ind.valor);
  const n = toScaled(ind.valor, 2);
  return `${formatPct(ind.valor).replace("%", "")} dia${n === 100n ? "" : "s"}`;
}

// Comparacao periodo atual x anterior no formato do business-pulse: seta + delta.
export function comparisonLabel(ind) {
  const c = ind.comparacao || {};
  if (c.status === "POR ITEM") return `por projeto vs ${c.periodo_anterior}`;
  if (c.status !== "OK") return `sem comparação: ${c.motivo || "indisponível"}`;
  if (c.delta_pp !== undefined) return `${arrow(c.delta_pp)} ${formatPP(c.delta_pp)} vs ${c.periodo_anterior}`;
  const abs = String(c.delta).replace(/^-/, "");
  const amount = ind.unidade === "BRL" ? formatBRL(abs) : `${formatPct(abs).replace("%", "")} dias`;
  const variacao = c.variacao_pct === null || c.variacao_pct === undefined ? " (variação % indefinida)" : ` (${signedPct(c.variacao_pct)})`;
  return `${arrow(c.delta)} ${amount}${variacao} vs ${c.periodo_anterior}`;
}

export function severityTone(sev) {
  return sev === "critico" ? "risk" : sev === "atencao" ? "warn" : "ok";
}

export function overallTone(status) {
  return { CRITICO: "risk", ATENCAO: "warn", "SEM ALERTA": "ok" }[status] || "neutral";
}

export function alcadaTone(nivel) {
  if (nivel === "AUTONOMIA COMERCIAL" || nivel === "FLUXO NORMAL") return "ok";
  if (nivel === "DIRECAO") return "warn";
  if (nivel === "EXCEPCIONAL - NOVA ANALISE INTEGRAL" || nivel === "EXTRAORDINARIA") return "risk";
  return "neutral";
}

export function stateTone(value) {
  const v = String(value || "");
  if (v === "CONECTADO" || v === "TESTADA - OK" || v.startsWith("ACESSO DE LEITURA")) return "ok";
  if (v === "ERRO" || v === "FALHA" || v === "VERIFICACAO FALHOU") return "risk";
  if (v === "REQUER_AUTENTICACAO" || v.startsWith("NAO CONFIAVEIS") || v.startsWith("EXIGE APROVACAO")) return "warn";
  return "neutral";
}

// Progresso verificavel: contagens de estados reais, nunca percentual global.
export function integrationProgress(p) {
  const t = p?.catalogo_total ?? 0;
  return [
    { label: "Serviços no catálogo oficial", count: t, total: null },
    { label: "Servidor conectado (último healthcheck)", count: p?.servidor_conectado ?? 0, total: t },
    { label: "Leitura testada com sucesso", count: p?.leitura_testada_ok ?? 0, total: p?.com_probe_disponivel ?? 0 },
    { label: "Leitura com erro", count: p?.leitura_com_erro ?? 0, total: p?.com_probe_disponivel ?? 0 },
    { label: "Fontes com dados confiáveis", count: p?.dados_confiaveis ?? 0, total: t },
    { label: "Ações de escrita autorizadas", count: p?.acoes_autorizadas ?? 0, total: t },
  ];
}

// Referencia de fases (ex.: 50/40/10): soma exata de 100%.
export function sumReference(pcts) {
  let total = 0n;
  for (const p of pcts) {
    const v = parsePctInput(p);
    if (v === null) return { ok: false, total: null };
    total += toScaled(v, 2);
  }
  return { ok: total === 10000n, total: `${total / 100n}.${String(total % 100n).padStart(2, "0")}` };
}

// Espelho da regra do servidor (o servidor revalida): recebimento efetivo pode ser
// dividido entre fases, mas nunca alocado acima do valor recebido.
export function buildAllocations(rows, available) {
  const errors = [];
  const allocations = [];
  const used = new Map();
  const pairs = new Set();
  rows.forEach((r, i) => {
    if (!r.recebimento && !String(r.valor || "").trim()) return;
    const valor = parseMoneyInput(r.valor);
    if (!r.fase || !r.recebimento || valor === null || toScaled(valor, 2) === 0n) {
      errors.push(`Linha ${i + 1}: informe fase, recebimento e valor maior que zero.`);
      return;
    }
    const key = `${r.fase}|${r.recebimento}`;
    if (pairs.has(key)) {
      errors.push(`Linha ${i + 1}: recebimento repetido na mesma fase.`);
      return;
    }
    pairs.add(key);
    const total = (used.get(r.recebimento) || 0n) + toScaled(valor, 2);
    used.set(r.recebimento, total);
    if (!(r.recebimento in available)) errors.push(`Linha ${i + 1}: ${r.recebimento} não é recebimento efetivo deste projeto.`);
    else if (total > toScaled(available[r.recebimento], 2)) errors.push(`Linha ${i + 1}: ${r.recebimento} alocado acima do valor recebido (reutilização).`);
    allocations.push({ fase: r.fase, recebimento: r.recebimento, valor });
  });
  return { ok: errors.length === 0, errors, allocations };
}
