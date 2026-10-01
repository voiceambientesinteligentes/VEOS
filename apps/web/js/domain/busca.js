// Busca global (Ctrl+K): normaliza texto (sem acento, minusculo) e pontua resultados.
// Todas as palavras precisam aparecer; comeco de palavra e titulo pesam mais.

export const normalizar = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function pontuar(consulta, item) {
  const termos = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (!termos.length) return 0;
  const titulo = normalizar(item.titulo), extra = normalizar(item.extra ?? "");
  let p = 0;
  for (const t of termos) {
    if (titulo.startsWith(t)) p += 6;
    else if (new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(titulo)) p += 4;
    else if (titulo.includes(t)) p += 2;
    else if (extra.includes(t)) p += 1;
    else return 0;
  }
  return p;
}

export function buscar(consulta, itens, limite = 12) {
  return itens.map((i) => [pontuar(consulta, i), i]).filter(([p]) => p > 0).sort((a, b) => b[0] - a[0] || a[1].titulo.length - b[1].titulo.length).slice(0, limite).map(([, i]) => i);
}
