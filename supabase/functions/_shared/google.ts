// Cliente da PONTE do Gmail e da Agenda do Google (Apps Script implantado pelo Fernando; codigo em
// apps/web/js/domain/ponte_google.js). O endereco e o segredo ficam cifrados em integracoes_segredos ('gmail').
// deno-lint-ignore-file no-explicit-any
import { HttpError } from "./banco.ts";
import { lerIntegracao } from "./integracoes.ts";

export type Ponte = { url: string; segredo: string; conta: string | null };

/** Ponte ligada (ou null). */
export async function ponteLigada(): Promise<Ponte | null> {
  const i = await lerIntegracao("gmail");
  if (!i || i.situacao !== "conectado" || !i.dados?.url || !i.dados?.segredo) return null;
  return { url: i.dados.url, segredo: i.dados.segredo, conta: i.conta };
}

/** Chama uma acao da ponte. Erros viram HttpError com orientacao em portugues simples. */
export async function chamarPonte(acao: string, dados: Record<string, unknown> = {}, ponte?: Ponte | null, timeout = 45_000): Promise<any> {
  const p = ponte ?? await ponteLigada();
  if (!p) throw new HttpError(409, "o Gmail da VOICE ainda não está conectado ao VEOS: Ajustes → Integrações → E-mail e agenda (Gmail)");
  let r: Response;
  try {
    r = await fetch(p.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...dados, acao, segredo: p.segredo }), redirect: "follow", signal: AbortSignal.timeout(timeout) });
  } catch (e) {
    throw new HttpError(504, `a ponte do Gmail não respondeu (${(e as Error).message}); tente de novo em instantes`);
  }
  const texto = await r.text();
  if (/^\s*<(!doctype|html)/i.test(texto)) {
    const login = /accounts\.google\.com|ServiceLogin|signin/i.test(texto);
    throw new HttpError(502, login
      ? "a ponte do Gmail pediu login: na implantação, 'Quem pode acessar' precisa ser 'Qualquer pessoa' (Implantar → Gerenciar implantações → editar)"
      : "a ponte do Gmail respondeu uma página em vez de dados: confira se o endereço termina em /exec e se a implantação está ativa");
  }
  let d: any;
  try { d = JSON.parse(texto); } catch { throw new HttpError(502, "a ponte do Gmail respondeu algo inesperado"); }
  if (!d?.ok) {
    const erro = String(d?.erro ?? "falha").slice(0, 240);
    if (/não autorizado|nao autorizado/i.test(erro)) throw new HttpError(502, "a ponte do Gmail recusou o código secreto: gere o código de novo em Integrações e cole o novo código no Apps Script");
    if (/(limit|quota|cota|too many|excedeu)/i.test(erro)) throw new HttpError(429, `o Gmail recusou por limite do dia: ${erro}`);
    throw new HttpError(502, `Gmail: ${erro}`);
  }
  return d;
}

/** Inicio do dia em Brasilia (para limite diario). */
export function inicioDoDiaSP(agora = new Date()) {
  const d = agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return new Date(`${d}T00:00:00-03:00`).toISOString();
}

/** Data/hora local de Brasilia ("2026-11-12T15:00") -> ISO. Aceita tambem ISO com fuso. */
export function horaDeBrasilia(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const local = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/);
  const d = local ? new Date(`${local[1]}T${local[2]}:${local[3]}:00-03:00`) : /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T09:00:00-03:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
