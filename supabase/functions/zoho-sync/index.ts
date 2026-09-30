// Edge Function "zoho-sync": uma rodada da sincronizacao Zoho -> VEOS (espelho completo).
// Chamada a cada 2 minutos pelo agendador do banco (pg_cron + pg_net) com a chave publica;
// no maximo uma rodada a cada 90 s (chamadas repetidas nao geram carga no Zoho).
// Nao devolve dados de negocio: so contagens e erros.
import { servico, URL_BASE } from "../_shared/banco.ts";
import { configurado } from "../_shared/zoho.ts";
import { sincronizar } from "../_shared/zoho_sync.ts";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async () => {
  if (!URL_BASE || !configurado()) return json(503, { erro: "configuracao" });
  const [conexao] = await servico("/rest/v1/integracoes?id=eq.zoho&select=id");
  if (!conexao) return json(200, { pulado: "zoho nao conectado" });
  const [ultima] = await servico("/rest/v1/zoho_sync_log?select=em,ms&order=id.desc&limit=1");
  if (ultima && Date.now() - Date.parse(ultima.em) < 90_000) return json(200, { pulado: "rodada recente" });
  const r = await sincronizar("agendada", { limiteMs: 100_000 });
  return json(200, { ...r, erros: r.erros.length });
});
