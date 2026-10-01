// SISTEMA na funcao "api" (direcao; a saude tambem para tecnologia).
//   GET  /sistema/saude          retrato (banco, arquivos, Zoho, agendamentos, HTTP, varreduras) + alertas SIS_*
//   GET  /sistema/membros        membros, ultimo acesso, MFA, autoridades e historico
//   POST /sistema/membros        convidar {email, nome, papel}: cria o login (sem enviar e-mail) + membro
//   POST /sistema/membros/:id    {acao: papel|desativar|reativar|exigir_mfa|dispensar_mfa, papel?, motivo?}
//   GET  /sistema/exportar/:conjunto   linhas planas para CSV (pedidos, itens, parcelas, NF, estoque, Biblioteca)
// As regras ficam no banco (sistema_saude, membro_gerir); aqui: identidade, Auth admin e validacao.
import { HttpError, lerCorpo, type Membro, servico, SERVICE, URL_BASE } from "../_shared/banco.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
export const PAPEIS = ["direcao", "financas", "operacoes", "tecnologia", "marketing", "vendas", "secretaria", "posvenda", "pessoas"];
const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });
const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

type UsuarioAuth = { id: string; email: string; last_sign_in_at?: string; banned_until?: string; factors?: { id: string; factor_type: string; status: string }[] };

async function authAdmin(path: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_BASE}/auth/v1/admin/${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("auth admin", r.status, JSON.stringify(dados).slice(0, 300));
    throw new HttpError(r.status === 422 ? 400 : 502, dados.msg || dados.message || "falha no serviço de login");
  }
  return dados;
}
async function usuariosAuth(): Promise<UsuarioAuth[]> {
  return (await authAdmin("users?per_page=1000")).users ?? [];
}
// Conjuntos exportaveis (a tela gera o CSV). Ate LIMITE linhas por conjunto, mais recentes primeiro.
const LIMITE = 10000;
const CONJUNTOS: Record<string, { nome: string; caminho: string }> = {
  pedidos: { nome: "Pedidos", caminho: "pedidos?select=*&order=criado_em.desc" },
  pedido_itens: { nome: "Itens dos pedidos", caminho: "pedido_itens?select=pedido:pedidos(numero,cliente_nome),*&order=pedido_id,ordem" },
  parcelas: { nome: "Parcelas", caminho: "parcelas?select=pedido:pedidos(numero,cliente_nome),*&order=vencimento.desc" },
  notas_fiscais: { nome: "Notas fiscais", caminho: "notas_fiscais?select=pedido:pedidos(numero,cliente_nome),*&order=emitida_em.desc" },
  estoque: { nome: "Estoque (saldos)", caminho: "estoque_saldos?select=*&order=item_id" },
  estoque_movimentos: { nome: "Movimentos de estoque", caminho: "estoque_movimentos?select=*&order=id.desc" },
  compras: { nome: "Compras", caminho: "compras?select=*,pedido:pedidos(numero)&order=criado_em.desc" },
  compra_itens: { nome: "Itens das compras", caminho: "compra_itens?select=compra:compras(numero,fornecedor_nome),*&order=compra_id,ordem" },
  contas_pagar: { nome: "Contas a pagar", caminho: "contas_pagar?select=compra:compras(numero),pedido:pedidos(numero),*&order=vencimento.desc" },
  biblioteca: { nome: "Biblioteca", caminho: "biblioteca_registros?select=codigo,tipo,estado,versao,titulo,conteudo,assuntos,setores,autoridade,autor_nome,registrado_em,vigente_desde,valido_ate,justificativa,condicoes,responsavel,restrito&order=codigo" },
};
/** Objeto aninhado vira colunas com prefixo (pedido.numero -> pedido_numero); listas viram texto. */
export function planificar(linha: Record<string, unknown>, prefixo = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(linha)) {
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, planificar(v as Record<string, unknown>, `${prefixo}${k}_`));
    else out[`${prefixo}${k}`] = Array.isArray(v) ? v.join(", ") : v;
  }
  return out;
}

const mfaVerificado = (u?: UsuarioAuth) => (u?.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");

export async function rotearSistema(req: Request, partes: string[], eu: Membro) {
  const [, a, b] = partes;
  if (req.method === "GET" && a === "saude") {
    if (!["direcao", "tecnologia"].includes(eu.papel)) throw new HttpError(403, "somente direção e tecnologia");
    return await rpc("sistema_saude", {});
  }
  if (eu.papel !== "direcao") throw new HttpError(403, "somente a direção");
  const post = req.method === "POST";
  const corpo = post ? ((await lerCorpo(req)) ?? {}) : {};
  if (post && !CHAVE_RE.test(req.headers.get("Idempotency-Key") ?? "")) throw new HttpError(400, "Idempotency-Key obrigatorio");

  if (a === "exportar" && !post) {
    if (!b) return { conjuntos: Object.entries(CONJUNTOS).map(([id, c]) => ({ id, nome: c.nome })) };
    const c = CONJUNTOS[b];
    if (!c) throw new HttpError(404, "conjunto inexistente");
    let linhas: Record<string, unknown>[] = await servico(`/rest/v1/${c.caminho}&limit=${LIMITE + 1}`);
    const truncado = linhas.length > LIMITE;
    linhas = linhas.slice(0, LIMITE).map((l) => planificar(l));
    if (b === "estoque" && linhas.length) {
      const nomes: { zoho_id: string; nome: string }[] = await servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&select=zoho_id,nome&limit=20000");
      const porId = new Map(nomes.map((n) => [n.zoho_id, n.nome]));
      linhas = linhas.map((l) => ({ item_id: l.item_id, item: porId.get(String(l.item_id)) ?? "", ...l }));
    }
    const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))];
    return { conjunto: b, nome: c.nome, colunas, linhas, truncado, gerado_em: new Date().toISOString() };
  }
  if (a === "membros" && !b && !post) {
    const [membros, contas, autoridades, historico] = await Promise.all([
      servico("/rest/v1/membros?select=user_id,nome,papel,email,ativo,exige_mfa,criado_em,atualizado_em&order=ativo.desc,nome"),
      usuariosAuth(),
      servico("/rest/v1/governanca_autoridades?select=user_id,autoridade,desde"),
      servico("/rest/v1/membros_historico?select=user_id,acao,de,para,motivo,por,em&order=id.desc&limit=60"),
    ]);
    const porId = new Map(contas.map((u) => [u.id, u]));
    const nome = new Map(membros.map((m: { user_id: string; nome: string }) => [m.user_id, m.nome]));
    return {
      papeis: PAPEIS,
      membros: membros.map((m: { user_id: string; email: string | null }) => {
        const u = porId.get(m.user_id);
        return { ...m, email: u?.email ?? m.email, ultimo_acesso: u?.last_sign_in_at ?? null, mfa: mfaVerificado(u), bloqueado: Boolean(u?.banned_until && Date.parse(u.banned_until) > Date.now()),
          autoridades: autoridades.filter((x: { user_id: string }) => x.user_id === m.user_id).map((x: { autoridade: string }) => x.autoridade), teste: /\.invalid$/.test(u?.email ?? m.email ?? "") };
      }),
      historico: historico.map((h: { user_id: string; por: string }) => ({ ...h, nome: nome.get(h.user_id) ?? "—", por_nome: nome.get(h.por) ?? "—" })),
      eu: eu.user_id,
    };
  }
  if (a === "membros" && !b && post) {
    const email = String(corpo.email ?? "").trim().toLowerCase();
    const nomeM = txt(corpo.nome, 120);
    if (!EMAIL_RE.test(email)) throw new HttpError(400, "e-mail inválido");
    if (!nomeM) throw new HttpError(400, "informe o nome");
    if (!PAPEIS.includes(String(corpo.papel))) throw new HttpError(400, "papel inválido");
    // login sem senha (entra pelo link do e-mail); nenhum e-mail e enviado pelo VEOS
    let u = (await usuariosAuth()).find((x) => x.email?.toLowerCase() === email);
    if (!u) u = await authAdmin("users", { method: "POST", body: JSON.stringify({ email, email_confirm: true }) });
    await rpc("membro_gerir", { p: { por: eu.user_id, acao: "convidar", user_id: u!.id, nome: nomeM, papel: corpo.papel, email } });
    return { ok: true, user_id: u!.id };
  }
  if (a === "membros" && b && UUID_RE.test(b) && post) {
    const acao = String(corpo.acao ?? "");
    if (!["papel", "desativar", "reativar", "exigir_mfa", "dispensar_mfa"].includes(acao)) throw new HttpError(400, "ação inválida");
    if (acao === "papel" && !PAPEIS.includes(String(corpo.papel))) throw new HttpError(400, "papel inválido");
    let temMfa = false;
    if (acao === "exigir_mfa") temMfa = mfaVerificado(await authAdmin(`users/${b}`));
    await rpc("membro_gerir", { p: { por: eu.user_id, acao, user_id: b, papel: corpo.papel ?? null, motivo: txt(corpo.motivo, 1000), tem_mfa: temMfa } });
    // desativado tambem nao entra (o VEOS ja recusa pelo cadastro; o bloqueio impede novo login)
    if (acao === "desativar") await authAdmin(`users/${b}`, { method: "PUT", body: JSON.stringify({ ban_duration: "876000h" }) });
    if (acao === "reativar") await authAdmin(`users/${b}`, { method: "PUT", body: JSON.stringify({ ban_duration: "none" }) });
    return { ok: true };
  }
  throw new HttpError(404, "rota inexistente");
}
