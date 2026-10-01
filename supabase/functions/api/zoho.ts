// Zoho na funcao "api" (somente leitura).
//   GET  /zoho/status             conectado?, quando, por quem (sem tokens)
//   POST /zoho/conectar           direcao: devolve a URL de autorizacao do Zoho
//   POST /zoho/desconectar        direcao: apaga os tokens guardados
//   GET  /zoho/rbt12              receita bruta 12 meses (faturas Books) para o Simples
//   GET  /zoho/orcamentos?busca=&status=   orcamentos do Books
//   GET  /zoho/orcamentos/:id     itens + custo de compra
//   GET  /zoho/crm/etapas         etapas reais do funil (Deals.Stage)
import { HttpError, lerCorpo, type Membro, registrarAcesso, servico } from "../_shared/banco.ts";
const PESSOAIS = new Set(["books.contacts", "crm.Contacts", "crm.Leads", "crm.Accounts"]); // LGPD: fichas com dados pessoais

import { configurado, ESCOPOS, etapasCrm, orcamento, orcamentos, rbt12, urlAutorizacao } from "../_shared/zoho.ts";
import { sincronizar } from "../_shared/zoho_sync.ts";
import { camposEditaveis, escrever } from "../_shared/zoho_escrita.ts";

const COMERCIAL = ["direcao", "financas", "vendas"];
const ESCRITA: Record<string, string[]> = {
  books: ["direcao", "financas", "vendas"],
  crm: ["direcao", "vendas", "marketing", "secretaria", "posvenda"],
  projects: ["direcao", "operacoes", "tecnologia", "posvenda"],
};

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
    const concedidos: string[] = c?.escopos?.split(/[ ,]+/) ?? [];
    const faltando = c ? ESCOPOS.split(",").filter((e) => !concedidos.includes(e)) : [];
    return { configurado: configurado(), conectado: Boolean(c), precisa_reconectar: faltando.length > 0, escopos_faltando: faltando, conectado_em: c?.conectado_em ?? null, conectado_por: por?.nome ?? null, escopos: c?.escopos?.split(",") ?? [], somente_leitura: faltando.some((e) => /\.(CREATE|UPDATE)$/.test(e)) };
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
  if (req.method === "POST" && a === "sincronizar") {
    exigir(eu, ["direcao"]);
    const r = await sincronizar(`manual:${eu.nome}`, { limiteMs: 55_000, forcar: q.get("forcar") === "1" });
    return { ...r, erros: r.erros.slice(0, 20) };
  }
  if (a === "espelho") return await rotearEspelho(req, partes.slice(1), eu);
  // edicao nos dois sentidos: formulario (campos editaveis) e gravacao no Zoho
  if (a === "campos" || a === "escrever") {
    const [, , produto, modulo, id] = partes; // zoho/(campos|escrever)/:produto/:modulo[/:id]
    if (!ESCRITA[produto]?.includes(eu.papel)) throw new HttpError(403, "seu perfil não edita este produto do Zoho");
    if (!/^[A-Za-z0-9_]{2,60}$/.test(modulo ?? "") || (id && !/^[0-9A-Za-z_-]{1,40}$/.test(id))) throw new HttpError(400, "módulo ou id inválido");
    if (req.method === "GET" && a === "campos") return { campos: await camposEditaveis(produto, modulo) };
    if (req.method === "POST" && a === "escrever") {
      const chave = req.headers.get("Idempotency-Key") ?? "";
      if (!/^[A-Za-z0-9-]{16,64}$/.test(chave)) throw new HttpError(400, "Idempotency-Key obrigatorio");
      const corpo = (await lerCorpo(req)) ?? {};
      return await escrever({ produto, modulo, id: id ?? null, campos: corpo.campos ?? {}, modificadoEm: typeof corpo.modificado_em === "string" ? corpo.modificado_em : null, usuario: eu.user_id, chave: `${eu.user_id}:${chave}` });
    }
  }
  if (req.method === "GET" && a === "rbt12") { exigir(eu, COMERCIAL); return await rbt12(); }
  if (req.method === "GET" && a === "orcamentos" && !b) { exigir(eu, COMERCIAL); return { orcamentos: await orcamentos(q.get("busca") ?? "", q.get("status") ?? "") }; }
  if (req.method === "GET" && a === "orcamentos" && b) { exigir(eu, COMERCIAL); return await orcamento(b); }
  if (req.method === "GET" && a === "crm" && b === "etapas") { exigir(eu, COMERCIAL); return { etapas: await etapasCrm() }; }
  throw new HttpError(404, "rota inexistente");
}

// ---------------------------------------------------------------- espelho (aba Zoho)
const ACESSO: Record<string, string[]> = {
  books: ["direcao", "financas", "vendas"],
  crm: ["direcao", "vendas", "marketing", "secretaria", "posvenda"],
  projects: ["direcao", "operacoes", "tecnologia", "posvenda", "vendas", "financas"],
};
const MOD_RE = /^[A-Za-z0-9_]{2,60}$/;
const ID_RE = /^[0-9A-Za-z_-]{1,40}$/;

export async function rotearEspelho(req: Request, partes: string[], eu: Membro) {
  const [, produto, modulo, id] = partes; // espelho/:produto/:modulo/:id
  const q = new URL(req.url).searchParams;
  if (req.method === "GET" && !produto) {
    const [contagens, sync, log] = await Promise.all([
      servico("/rest/v1/rpc/zoho_contagens", { method: "POST", body: "{}" }),
      servico("/rest/v1/zoho_sync?select=produto,modulo,estado,total,ultima_volta_em,erro"),
      servico("/rest/v1/zoho_sync_log?select=em,chamadas,gravados,detalhes,erros,ms&order=id.desc&limit=1"),
    ]);
    const pode = Object.keys(ACESSO).filter((p) => ACESSO[p].includes(eu.papel));
    return { produtos: pode, contagens: contagens.filter((c: { produto: string }) => pode.includes(c.produto)), sync: sync.filter((s: { produto: string }) => pode.includes(s.produto)), ultima_rodada: log[0] ?? null };
  }
  if (!ACESSO[produto]) throw new HttpError(404, "produto inexistente");
  if (!ACESSO[produto].includes(eu.papel)) throw new HttpError(403, "seu perfil não acessa este produto do Zoho");
  if (!MOD_RE.test(modulo ?? "")) throw new HttpError(400, "módulo inválido");
  if (req.method === "GET" && !id) {
    const pagina = Math.max(1, Math.min(500, Number(q.get("pagina") ?? 1) || 1));
    const busca = (q.get("busca") ?? "").replace(/[%*,()]/g, " ").trim().slice(0, 60);
    const filtro = busca ? `&nome=ilike.*${encodeURIComponent(busca)}*` : "";
    const excl = q.get("excluidos") === "1" ? "" : "&excluido=is.false";
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/zoho_registros?produto=eq.${produto}&modulo=eq.${modulo}${excl}${filtro}&select=zoho_id,nome,modificado_em,excluido,linha:resumo,dados&order=modificado_em.desc.nullslast,zoho_id&limit=50&offset=${(pagina - 1) * 50}`, {
      headers: { apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, Prefer: "count=exact" },
    });
    if (!r.ok) throw new HttpError(502, "falha ao ler o espelho");
    const total = Number((r.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
    const linhas = (await r.json()).map((x: Record<string, unknown>) => ({ id: x.zoho_id, nome: x.nome, modificado_em: x.modificado_em, excluido: x.excluido, campos: x.linha ?? x.dados }));
    return { produto, modulo, pagina, total, linhas };
  }
  if (req.method === "GET" && id) {
    if (!ID_RE.test(id)) throw new HttpError(400, "id inválido");
    const [r] = await servico(`/rest/v1/zoho_registros?produto=eq.${produto}&modulo=eq.${modulo}&zoho_id=eq.${id}&select=zoho_id,nome,dados,modificado_em,detalhe_em,sincronizado_em,excluido`);
    if (!r) throw new HttpError(404, "registro não encontrado no espelho");
    if (PESSOAIS.has(`${produto}.${modulo}`)) await registrarAcesso(eu.user_id, `zoho:${produto}.${modulo}:${id}`);
    return r;
  }
  throw new HttpError(404, "rota inexistente");
}
