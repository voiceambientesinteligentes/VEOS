// Zoho na funcao "api" (somente leitura).
//   GET  /zoho/status             conectado?, quando, por quem (sem tokens)
//   POST /zoho/conectar           direcao: devolve a URL de autorizacao do Zoho
//   POST /zoho/desconectar        direcao: apaga os tokens guardados
//   GET  /zoho/rbt12              receita bruta 12 meses (faturas Books) para o Simples
//   GET  /zoho/orcamentos?busca=&status=   orcamentos do Books
//   GET  /zoho/orcamentos/:id     itens + custo de compra
//   GET  /zoho/crm/etapas         etapas reais do funil (Deals.Stage)
import { HttpError, type Membro, servico } from "../_shared/banco.ts";
import { configurado, etapasCrm, orcamento, orcamentos, rbt12, urlAutorizacao } from "../_shared/zoho.ts";

const COMERCIAL = ["direcao", "financas", "vendas"];

function exigir(eu: Membro, papeis: string[]) {
  if (!papeis.includes(eu.papel)) throw new HttpError(403, "seu perfil não acessa estes dados do Zoho");
}

export async function rotearZoho(req: Request, partes: string[], eu: Membro) {
  const [, a, b] = partes;
  const q = new URL(req.url).searchParams;
  if (req.method === "GET" && a === "status") {
    const [c] = await servico("/rest/v1/integracoes?id=eq.zoho&select=conectado_em,atualizado_em,escopos,conectado_por");
    let por = null;
    if (c) [por] = await servico(`/rest/v1/membros?user_id=eq.${c.conectado_por}&select=nome`);
    return { configurado: configurado(), conectado: Boolean(c), conectado_em: c?.conectado_em ?? null, conectado_por: por?.nome ?? null, escopos: c?.escopos?.split(",") ?? [], somente_leitura: true };
  }
  if (req.method === "POST" && a === "conectar") {
    exigir(eu, ["direcao"]);
    if (!configurado()) throw new HttpError(409, "credenciais do Zoho não configuradas no servidor");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const estado = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await servico("/rest/v1/oauth_estados", { method: "POST", body: JSON.stringify({ estado, provedor: "zoho", usuario: eu.user_id }) });
    return { url: urlAutorizacao(estado) };
  }
  if (req.method === "POST" && a === "desconectar") {
    exigir(eu, ["direcao"]);
    await servico("/rest/v1/integracoes?id=eq.zoho", { method: "DELETE" });
    await servico("/rest/v1/integracoes_log", { method: "POST", body: JSON.stringify({ provedor: "zoho", acao: "desconectado", usuario: eu.user_id }) });
    return { conectado: false };
  }
  if (req.method === "GET" && a === "rbt12") { exigir(eu, COMERCIAL); return await rbt12(); }
  if (req.method === "GET" && a === "orcamentos" && !b) { exigir(eu, COMERCIAL); return { orcamentos: await orcamentos(q.get("busca") ?? "", q.get("status") ?? "") }; }
  if (req.method === "GET" && a === "orcamentos" && b) { exigir(eu, COMERCIAL); return await orcamento(b); }
  if (req.method === "GET" && a === "crm" && b === "etapas") { exigir(eu, COMERCIAL); return { etapas: await etapasCrm() }; }
  throw new HttpError(404, "rota inexistente");
}
