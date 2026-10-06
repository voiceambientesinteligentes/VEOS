// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/sistema.js - nao editar a mao.
// Formatacao da tela Sistema (saude, usuarios, exportacao). Sem dependencias.

export function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 ** 2) return `${(v / 1024).toFixed(0)} KB`;
  if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
  return `${(v / 1024 ** 3).toFixed(2).replace(".", ",")} GB`;
}

/** Uso de um limite: percentual inteiro e tom (ok < 60% <= warn < 80% <= risk). */
export function usoLimite(usado, limite) {
  const pct = limite > 0 ? Math.round((Number(usado) / Number(limite)) * 100) : 0;
  return { pct, tom: pct >= 80 ? "risk" : pct >= 60 ? "warn" : "ok" };
}

/** "há 3 min", "há 2 h", "há 4 dias" (ou "nunca"). */
export function haQuanto(iso, agora = Date.now()) {
  if (!iso) return "nunca";
  const s = Math.max(0, Math.round((agora - Date.parse(iso)) / 1000));
  if (s < 60) return "agora há pouco";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

/** Ultima sincronizacao do Zoho (maior ultima_execucao_em entre os modulos). */
export function ultimaSincronizacao(modulos = []) {
  return modulos.reduce((m, x) => (x.ultima_execucao_em && (!m || x.ultima_execucao_em > m) ? x.ultima_execucao_em : m), null);
}
