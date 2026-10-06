// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/busca.js - nao editar a mao.
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

// Linguagem natural ("prepare uma campanha para arquitetos"): ignora palavras vazias e pontua as
// palavras relevantes encontradas (no titulo valem mais). Usada quando a busca exata nao acha nada.
const VAZIAS = new Set("a o as os um uma uns umas de da do das dos em no na nos nas para pra por com sem que e ou me te se eu voce faca faz fazer prepare preparar quero queria preciso gostaria crie criar monte montar ajuda ajude como qual quais sobre mais isso este esta esse essa nosso nossa empresa voice gente coisa coisas todo toda".split(" "));
const radical = (w0) => { const w = w0.replace(/oes$|aes$/, "ao").replace(/ais$/, "al").replace(/eis$/, "el"); return w.length > 6 ? w.slice(0, 6) : w.replace(/s$/, ""); }; // reunioes ~ reuniao, contratar ~ contratacao
export function buscarSolto(consulta, itens, limite = 3) {
  const termos = [...new Set(normalizar(consulta).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !VAZIAS.has(w)).map(radical))];
  if (!termos.length) return [];
  return itens.map((i) => {
    const t = normalizar(i.titulo), x = normalizar(i.extra ?? "");
    let p = 0, noTitulo = 0;
    for (const w of termos) { if (t.includes(w)) { p += 3; noTitulo++; } else if (x.includes(w)) p += 1; }
    return [noTitulo || p >= 2 ? p : 0, i];
  }).filter(([p]) => p > 0).sort((a, b) => b[0] - a[0]).slice(0, limite).map(([, i]) => i);
}
