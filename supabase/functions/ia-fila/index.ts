// Edge Function "ia-fila": nova tentativa automatica do motor de IA dos diretores. Chamada a cada 5
// minutos pelo agendador do banco (pg_cron + pg_net) com a chave publica. Atende UMA pergunta por vez
// (a mais antiga que falhou por sobrecarga/cota, ou que nunca foi tentada) para caber no tempo da
// funcao. Nao devolve dados de negocio: so se havia pergunta e se deu certo.
import { servico, URL_BASE } from "../_shared/banco.ts";
import { provedores, responderPergunta } from "../_shared/ia/motor.ts";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async () => {
  if (!URL_BASE) return json(503, { erro: "configuracao" });
  if (!provedores().length) return json(200, { pulado: "sem motor de IA configurado" });
  const id = await servico("/rest/v1/rpc/pergunta_ia_proxima", { method: "POST", body: "{}" });
  if (!id) return json(200, { pulado: "fila vazia" });
  const r = await responderPergunta(String(id));
  return json(200, { tentou: true, ok: r.ok });
});
