// Edge Function "saude": verificacao de disponibilidade + atividade no banco.
// Chamada diariamente pelo GitHub Actions (.github/workflows/manter-ativo.yml): mantem o
// projeto gratuito ativo e roda a varredura das sentinelas de todos os setores (no maximo
// uma a cada 10 minutos, para chamadas repetidas nao gerarem carga). Nao revela dados.
import { SERVICE, servico, URL_BASE } from "../_shared/banco.ts";
import { CATALOGO } from "../_shared/setores/catalogo.ts";
import type { Setor } from "../_shared/setores/motor.ts";
import { varrer } from "../_shared/setores/varredura.ts";
import { diagnostico } from "../_shared/zoho.ts";
import { vigiarBiblioteca, vigiarFluxo } from "../_shared/fluxo_vigia.ts";
import { vigiarCaixa } from "../_shared/caixa_vigia.ts";

const INTERVALO_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response(null, { status: 405 });
  const inicio = Date.now();
  let banco = "erro";
  let varredura: unknown = "nao executada";
  try {
    if (!URL_BASE || !SERVICE) throw new Error("configuracao");
    const [ultima] = await servico("/rest/v1/varreduras?select=em&order=em.desc&limit=1");
    banco = "ok";
    if (!ultima || Date.now() - Date.parse(ultima.em) > INTERVALO_MS) {
      const r = await varrer(CATALOGO as unknown as Setor[], null, "automatica");
      const f = await vigiarFluxo().catch((e) => { console.error("vigia do fluxo", e); return null; });
      const bib = await vigiarBiblioteca().catch((e) => { console.error("vigia da biblioteca", e); return null; });
      const cx = await vigiarCaixa().catch((e) => { console.error("vigia do caixa", e); return null; });
      varredura = { novos: r.novos, resolvidos: r.resolvidos, ativos: r.ativos, fluxo: f, biblioteca: bib, caixa: cx };
    } else {
      varredura = "recente (pulada)";
    }
  } catch (e) {
    console.error("saude:", e);
    if (banco === "ok") varredura = "falhou";
  }
  // ?zoho=1: testa a leitura de cada produto do Zoho (so ok/erro e contagens; renova o token)
  let zoho: unknown;
  if (banco === "ok" && new URL(req.url).searchParams.get("zoho") === "1") {
    try { zoho = await diagnostico(); } catch (e) { zoho = { erro: e instanceof Error ? e.message : "falha" }; }
  }
  return new Response(JSON.stringify({ servico: "veos", banco, varredura, zoho, ms: Date.now() - inicio, em: new Date().toISOString() }), {
    status: banco === "ok" ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
