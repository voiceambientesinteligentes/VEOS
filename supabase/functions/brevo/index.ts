// Edge Function "brevo": recebe os AVISOS da Brevo sobre os e-mails que o VEOS enviou por ela (entregue, aberto,
// clique, voltou, bloqueado, spam, descadastro, adiado). O endereco e criado pelo proprio VEOS ao conectar a Brevo
// (Integracoes): .../functions/v1/brevo/<segredo>. Sem JWT do Supabase (a Brevo nao envia): a autenticacao e o
// segredo no caminho, comparado com o guardado cifrado (--no-verify-jwt). O corpo e DADO de terceiro.
import { lerIntegracao } from "../_shared/integracoes.ts";
import { processarEventosBrevo } from "../_shared/brevo_eventos.ts";

const MAX_CORPO = 512 * 1024;
const MAX_EVENTOS = 500;
const resp = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function igual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return resp(405, { erro: "use POST" });
  const partes = new URL(req.url).pathname.split("/").filter(Boolean); // functions/v1/brevo/<segredo>
  const i = partes.indexOf("brevo");
  const segredo = i >= 0 ? (partes[i + 1] ?? "") : "";
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  let guardado = "";
  try {
    guardado = String((await lerIntegracao("brevo"))?.dados?.webhook?.segredo ?? "");
  } catch (e) {
    console.error("brevo: integracao", e);
    return resp(503, { erro: "indisponível" });
  }
  if (!guardado || !(igual(segredo, guardado) || igual(bearer, guardado))) return resp(401, { erro: "não autorizado" });
  const bruto = await req.text();
  if (bruto.length > MAX_CORPO) return resp(413, { erro: "aviso grande demais" });
  let corpo: unknown;
  try { corpo = JSON.parse(bruto); } catch { return resp(400, { erro: "JSON inválido" }); }
  const lista = Array.isArray(corpo) ? corpo : Array.isArray((corpo as { items?: unknown[] })?.items) ? (corpo as { items: unknown[] }).items : [corpo];
  try {
    const r = await processarEventosBrevo(lista.slice(0, MAX_EVENTOS));
    return resp(200, { ok: true, ...r });
  } catch (e) {
    console.error("brevo: avisos", e);
    return resp(500, { erro: "falha ao registrar o aviso" }); // a Brevo tenta de novo
  }
});
