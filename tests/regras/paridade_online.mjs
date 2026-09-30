// Envia os casos de paridade-vigia.json para a Edge Function publicada e compara
// com a resposta do vigia Python. Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... node tests/regras/paridade_online.mjs
import { readFileSync } from "node:fs";

const url = `${process.env.SUPABASE_URL}/functions/v1/vigia`;
const key = process.env.SUPABASE_ANON_KEY;
if (!process.env.SUPABASE_URL || !key) throw new Error("defina SUPABASE_URL e SUPABASE_ANON_KEY");

const casos = JSON.parse(readFileSync(new URL("./paridade-vigia.json", import.meta.url), "utf8"));
const norm = (v) => (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v).toFixed(2) : v);
const normResumo = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, norm(v)]));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let ok = 0;
const falhas = [];
const tempos = [];
for (let i = 0; i < casos.length; i += 10) {
  const lote = casos.slice(i, i + 10).map(async (c, j) => {
    const t0 = performance.now();
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ entrada: c.entrada }),
    });
    tempos.push(performance.now() - t0);
    const body = await r.json();
    const n = i + j;
    if (c.esperado.erro) {
      if (r.status === 400 && body.erro) ok++;
      else falhas.push({ n, status: r.status, body });
    } else if (r.status === 200 && igual({ ...body, resumo: normResumo(body.resumo) }, { ...c.esperado, resumo: normResumo(c.esperado.resumo) })) {
      ok++;
    } else {
      falhas.push({ n, status: r.status, body: JSON.stringify(body).slice(0, 300) });
    }
  });
  await Promise.all(lote);
}
tempos.sort((a, b) => a - b);
console.log(JSON.stringify({
  endpoint: url, casos: casos.length, iguais: ok, falhas: falhas.length,
  latencia_ms: { mediana: Math.round(tempos[tempos.length >> 1]), p95: Math.round(tempos[Math.floor(tempos.length * 0.95)]) },
  primeiras_falhas: falhas.slice(0, 3),
}, null, 1));
process.exit(falhas.length ? 1 : 0);
