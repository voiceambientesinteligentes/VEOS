// Dominio: validacao do rascunho de parametros de SIMULACAO (espelho da regra
// do servidor, apenas para retorno imediato; o servidor revalida tudo).

export const PARAM_KEYS = [
  "risco_pct",
  "limiar_exposicao_pct",
  "margem_alvo_pct",
  "margem_aceitavel_pct",
  "margem_minima_pct",
];

const PCT_RE = /^\d{1,3}(\.\d{1,2})?$/;

export function normalizeInput(raw) {
  return String(raw ?? "").trim().replace(",", ".");
}

// Compara decimais-texto sem ponto flutuante (ate 2 casas).
export function cents(s) {
  const [i, f = ""] = s.split(".");
  return BigInt(i) * 100n + BigInt((f + "00").slice(0, 2));
}

export function validateDraft(draft, limits) {
  const errors = {};
  const values = {};
  for (const key of PARAM_KEYS) {
    const v = normalizeInput(draft[key]);
    if (!PCT_RE.test(v)) {
      errors[key] = "Use número com até 2 casas decimais.";
      continue;
    }
    const [lo, hi] = (limits?.[key] || ["0", "100"]).map((x) => normalizeInput(x));
    if (cents(v) < cents(lo) || cents(v) > cents(hi)) {
      errors[key] = `Entre ${lo.replace(".", ",")} e ${hi.replace(".", ",")}.`;
      continue;
    }
    values[key] = v;
  }
  const { margem_minima_pct: mn, margem_aceitavel_pct: ac, margem_alvo_pct: al } = values;
  if (mn && ac && al && !(cents(mn) <= cents(ac) && cents(ac) <= cents(al))) {
    errors.margem_aceitavel_pct = errors.margem_aceitavel_pct || "Exige mínima ≤ aceitável ≤ alvo.";
  }
  return { ok: Object.keys(errors).length === 0, errors, values };
}

export function changedFromBase(values, base) {
  return PARAM_KEYS.filter((k) => values[k] !== undefined && base[k] !== undefined && cents(normalizeInput(values[k])) !== cents(normalizeInput(base[k])));
}
