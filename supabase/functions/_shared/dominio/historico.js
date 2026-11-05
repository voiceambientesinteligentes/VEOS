// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/historico.js - nao editar a mao.
// HISTORICO DE UM REGISTRO (sem DOM): transforma uma linha de registros_historico em texto para a tela.
// `mudancas` e o que foi enviado na gravacao (titulo, estado, responsavel, prazo, valor e campos de `dados`).

const ROTULOS = { titulo: "título", estado: "estado", responsavel: "responsável", prazo: "prazo", valor: "valor" };

/** Campos que a gravacao tocou (legiveis). */
export function camposAlterados(mudancas = {}) {
  const c = mudancas ?? {};
  const base = Object.keys(c).filter((k) => k !== "dados" && k !== "estado").map((k) => ROTULOS[k] ?? k);
  const dados = c.dados && typeof c.dados === "object" ? Object.keys(c.dados).map((k) => k.replace(/_/g, " ")) : [];
  return [...base, ...dados];
}

const dataHora = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? "");
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export function linhaHistorico(x) {
  const quem = x.usuario ?? "sistema";
  const estado = x.acao === "criado" ? `criado como "${x.para_estado}"` : x.de_estado && x.para_estado && x.de_estado !== x.para_estado ? `estado: ${x.de_estado} → ${x.para_estado}` : "alterado";
  const campos = camposAlterados(x.mudancas);
  return `${dataHora(x.em)} · ${quem} · ${estado}${campos.length && x.acao !== "criado" ? ` · campos: ${campos.slice(0, 8).join(", ")}${campos.length > 8 ? "…" : ""}` : ""}`;
}
