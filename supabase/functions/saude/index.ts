// Edge Function "saude": verificacao de disponibilidade + atividade no banco.
// Chamada diariamente pelo GitHub Actions (.github/workflows/manter-ativo.yml) para o
// projeto gratuito nao ser pausado por inatividade. Nao revela dados nem segredos.
const URL_BASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response(null, { status: 405 });
  const inicio = Date.now();
  let banco = "erro";
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/setores?select=id&limit=1`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    });
    banco = r.ok ? "ok" : `erro ${r.status}`;
  } catch {
    banco = "sem conexao";
  }
  return new Response(JSON.stringify({ servico: "veos", banco, ms: Date.now() - inicio, em: new Date().toISOString() }), {
    status: banco === "ok" ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
