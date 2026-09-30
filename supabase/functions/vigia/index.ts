// Edge Function "vigia": POST {"entrada": <orcamento TESTE>} -> avisos do CFO.
// Calculo puro: nada e gravado nem aprovado. Somente ambiente TESTE.
import { avaliarOrcamento, RegraError } from "../_shared/regras/vigia.ts";

const MAX_BODY = 64 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { erro: "use POST" });
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return json(413, { erro: "corpo acima de 64 KB" });
  let body: { entrada?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { erro: "JSON invalido" });
  }
  try {
    return json(200, avaliarOrcamento(body?.entrada));
  } catch (e) {
    if (e instanceof RegraError) return json(400, { erro: e.message });
    console.error(e);
    return json(500, { erro: "falha interna" });
  }
});
