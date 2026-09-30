// Edge Function "zoho" (publica): so recebe o retorno do OAuth do Zoho.
//   GET /zoho/retorno?code=...&state=...&accounts-server=...
// O "state" foi criado pela API quando a direcao clicou em Conectar (uso unico, 10 min).
// Depois redireciona para a tela Integracoes do portal com ok/erro; nenhum token vai ao navegador.
import { HttpError, servico, URL_BASE } from "../_shared/banco.ts";
import { conectar, configurado } from "../_shared/zoho.ts";

// endereco publico do portal (GitHub Pages; a Netlify ficou sem creditos de publicacao)
const PORTAL = `${Deno.env.get("VEOS_PORTAL_URL") ?? "https://voiceambientesinteligentes.github.io/VEOS/"}#/integracoes`;
const ir = (resultado: string) => new Response(null, { status: 303, headers: { Location: `${PORTAL}?zoho=${resultado}`, "Cache-Control": "no-store" } });

async function registrar(acao: string, usuario: string | null, detalhe: string) {
  await servico("/rest/v1/integracoes_log", { method: "POST", body: JSON.stringify({ provedor: "zoho", acao, usuario, detalhe: detalhe.slice(0, 300) }) }).catch(() => {});
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (req.method !== "GET" || !u.pathname.endsWith("/retorno")) return new Response("não encontrado", { status: 404 });
  if (!URL_BASE || !configurado()) return ir("erro-config");
  const estado = u.searchParams.get("state") ?? "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(estado)) return ir("erro-estado");
  // consome o state (uso unico) e confere validade
  const usados = await servico(`/rest/v1/oauth_estados?estado=eq.${estado}&provedor=eq.zoho`, { method: "DELETE", headers: { Prefer: "return=representation" } }).catch(() => []);
  const st = usados?.[0];
  if (!st || Date.now() - Date.parse(st.criado_em) > 10 * 60_000) return ir("erro-estado");
  if (u.searchParams.get("error")) {
    await registrar("falha", st.usuario, `recusado no Zoho: ${u.searchParams.get("error")}`);
    return ir("recusado");
  }
  const code = u.searchParams.get("code") ?? "";
  if (!code || code.length > 512) return ir("erro-codigo");
  try {
    await conectar(code, u.searchParams.get("accounts-server") ?? "", st.usuario);
    await registrar("conectado", st.usuario, "autorizado (somente leitura)");
    return ir("ok");
  } catch (e) {
    await registrar("falha", st.usuario, e instanceof HttpError ? e.message : "falha interna");
    console.error("retorno zoho", e instanceof Error ? e.message : e);
    return ir("erro");
  }
});
