// CATALOGO DE PRODUTOS na funcao "api" (catalogo proprio do VEOS; fotos no Storage privado).
//   GET  /produtos?busca=&situacao=&revisar=1&pagina=   lista com miniatura (URL assinada)
//   GET  /produtos/revisao                               duplicados possiveis e agrupamentos a conferir
//   GET  /produtos/:id                                   ficha completa (fontes, ficha tecnica, compras, vinculos, historico)
//   POST /produtos/:id                                   {nome?, descricao?, categoria?, unidade?, situacao?, observacao?}
//   POST /produtos/:id/preco                             {campo: custo_ultimo|preco_venda, valor|null, motivo}
//   POST /produtos/vinculos/:vid                         {situacao: confirmado|descartado, preferencia?: novo|antigo|ambos}
// Alcada (proposta BIB, ate decisao do fundador): custo -> direcao, financas e operacoes;
// preco de venda e decisao de duplicados -> so direcao. Toda mudanca de preco fica no historico.
import { HttpError, lerCorpo, type Membro, SERVICE, servico, URL_BASE } from "../_shared/banco.ts";

const VER = ["direcao", "vendas", "operacoes", "financas"];
const CUSTO = ["direcao", "financas", "operacoes"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const MONEY_RE = /^\d{1,12}(\.\d{1,2})?$/;
const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const exigir = (eu: Membro, papeis: string[]) => { if (!papeis.includes(eu.papel)) throw new HttpError(403, "seu perfil não pode fazer esta operação no catálogo"); };

/** URLs assinadas (10 min) para varias fotos de uma vez. */
async function assinar(caminhos: (string | null)[]) {
  const lista = [...new Set(caminhos.filter(Boolean))] as string[];
  if (!lista.length) return new Map<string, string>();
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/produtos`, {
    method: "POST", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600, paths: lista }),
  });
  const d = await r.json().catch(() => []);
  return new Map((Array.isArray(d) ? d : []).filter((x: { signedURL?: string }) => x.signedURL).map((x: { path: string; signedURL: string }) => [x.path, `${URL_BASE}/storage/v1${x.signedURL}`]));
}

export async function rotearProdutos(req: Request, partes: string[], eu: Membro) {
  const [, a, b] = partes;
  const post = req.method === "POST";
  const corpo = post ? ((await lerCorpo(req)) ?? {}) : {};
  if (post && !CHAVE_RE.test(req.headers.get("Idempotency-Key") ?? "")) throw new HttpError(400, "Idempotency-Key obrigatorio");
  exigir(eu, VER);
  const q = new URL(req.url).searchParams;

  if (!post && !a) {
    const busca = (q.get("busca") ?? "").replace(/[%*,()]/g, " ").trim().slice(0, 60);
    const pagina = Math.max(1, Math.min(200, Number(q.get("pagina") ?? 1) || 1));
    const filtros = [
      busca ? `&or=(nome.ilike.*${encodeURIComponent(busca)}*,codigo.ilike.*${encodeURIComponent(busca)}*,marca.ilike.*${encodeURIComponent(busca)}*,modelo.ilike.*${encodeURIComponent(busca)}*)` : "",
      ["ativo", "inativo", "revisar", "excluido"].includes(q.get("situacao") ?? "") ? `&situacao=eq.${q.get("situacao")}` : "&situacao=neq.excluido", // excluidos so quando pedidos
    ].join("");
    const r = await fetch(`${URL_BASE}/rest/v1/produtos?select=id,codigo,nome,marca,modelo,unidade,tipo,situacao,custo_ultimo,custo_data,preco_venda,imagem,zoho_item_id,origem${filtros}&order=codigo&limit=60&offset=${(pagina - 1) * 60}`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: "count=exact" },
    });
    if (!r.ok) throw new HttpError(502, "falha ao ler o catálogo");
    const total = Number((r.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
    const produtos = await r.json();
    const [fotos, revisar] = await Promise.all([
      assinar(produtos.map((p: { imagem: string | null }) => p.imagem)),
      servico("/rest/v1/produto_vinculos_zoho?situacao=eq.a_revisar&select=produto_id&limit=10000"),
    ]);
    const nRev = new Map<string, number>();
    for (const v of revisar) nRev.set(v.produto_id, (nRev.get(v.produto_id) ?? 0) + 1);
    return { total, pagina, produtos: produtos.map((p: { id: string; imagem: string | null }) => ({ ...p, foto: p.imagem ? fotos.get(p.imagem) ?? null : null, duplicados_a_revisar: nRev.get(p.id) ?? 0 })) };
  }
  if (!post && a === "revisao") {
    const [vinc, agrup] = await Promise.all([
      servico("/rest/v1/produto_vinculos_zoho?situacao=eq.a_revisar&select=id,relacao,evidencia,zoho_item_id,produto:produtos(id,codigo,nome,imagem,custo_ultimo)&order=produto_id&limit=1000"),
      servico("/rest/v1/produtos?situacao=eq.revisar&select=id,codigo,nome,imagem&order=codigo&limit=500"),
    ]);
    const zids = [...new Set(vinc.map((v: { zoho_item_id: string }) => v.zoho_item_id))] as string[];
    const zoho = zids.length ? await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=in.(${zids.map((x) => `"${x}"`).join(",")})&select=zoho_id,nome,sku:dados->>sku,compra:dados->>purchase_rate,venda:dados->>rate`) : [];
    const zm = new Map(zoho.map((z: { zoho_id: string }) => [z.zoho_id, z]));
    const fotos = await assinar([...vinc.map((v: { produto: { imagem: string } }) => v.produto?.imagem), ...agrup.map((p: { imagem: string }) => p.imagem)]);
    return {
      vinculos: vinc.map((v: Record<string, any>) => ({ ...v, zoho: zm.get(v.zoho_item_id) ?? null, foto: fotos.get(v.produto?.imagem) ?? null })),
      agrupamentos: agrup.map((p: Record<string, any>) => ({ ...p, foto: fotos.get(p.imagem) ?? null })),
    };
  }
  if (!post && a && UUID_RE.test(a)) {
    const [[p], fontes, compras, vinculos, historico] = await Promise.all([
      servico(`/rest/v1/produtos?id=eq.${a}&select=*`),
      servico(`/rest/v1/produto_fontes?produto_id=eq.${a}&select=*&order=ultima_compra.desc.nullslast`),
      servico(`/rest/v1/produto_compras_origem?produto_id=eq.${a}&select=*&order=data.desc&limit=200`),
      servico(`/rest/v1/produto_vinculos_zoho?produto_id=eq.${a}&select=*`),
      servico(`/rest/v1/produto_precos_historico?produto_id=eq.${a}&select=campo,de,para,motivo,origem,em,usuario&order=id.desc&limit=100`),
    ]);
    if (!p) throw new HttpError(404, "produto inexistente");
    const zids = vinculos.map((v: { zoho_item_id: string }) => v.zoho_item_id);
    const [zoho, fotos, membros] = await Promise.all([
      zids.length ? servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=in.(${zids.map((x: string) => `"${x}"`).join(",")})&select=zoho_id,nome,sku:dados->>sku,compra:dados->>purchase_rate,venda:dados->>rate`) : [],
      assinar([p.imagem, ...fontes.map((f: { imagem: string | null }) => f.imagem)]),
      servico("/rest/v1/membros?select=user_id,nome"),
    ]);
    const zm = new Map(zoho.map((z: { zoho_id: string }) => [z.zoho_id, z]));
    const nome = new Map(membros.map((m: { user_id: string; nome: string }) => [m.user_id, m.nome]));
    return {
      produto: { ...p, foto: p.imagem ? fotos.get(p.imagem) ?? null : null },
      fontes: fontes.map((f: { imagem: string | null }) => ({ ...f, foto: f.imagem ? fotos.get(f.imagem) ?? null : null })),
      compras, historico: historico.map((x: { usuario: string | null }) => ({ ...x, quem: x.usuario ? nome.get(x.usuario) ?? "—" : "importação" })),
      vinculos: vinculos.map((v: { zoho_item_id: string }) => ({ ...v, zoho: zm.get(v.zoho_item_id) ?? null })),
      pode: { custo: CUSTO.includes(eu.papel), preco: eu.papel === "direcao", editar: ["direcao", "operacoes"].includes(eu.papel), duplicados: eu.papel === "direcao" },
    };
  }
  if (post && a === "vinculos" && b && /^\d{1,12}$/.test(b)) {
    exigir(eu, ["direcao"]);
    return await servico("/rest/v1/rpc/produto_vinculo_decidir", { method: "POST", body: JSON.stringify({ p_vinculo: Number(b), p_situacao: txt(corpo.situacao, 20), p_preferencia: txt(corpo.preferencia, 10), p_usuario: eu.user_id }) });
  }
  if (post && a && UUID_RE.test(a) && b === "preco") {
    const campo = String(corpo.campo);
    if (campo === "preco_venda") exigir(eu, ["direcao"]);
    else if (campo === "custo_ultimo") exigir(eu, CUSTO);
    else throw new HttpError(400, "campo: custo_ultimo ou preco_venda");
    if (corpo.valor !== null && !MONEY_RE.test(String(corpo.valor))) throw new HttpError(400, "valor inválido (use 1234.56; vazio = sem valor)");
    return await servico("/rest/v1/rpc/produto_preco", { method: "POST", body: JSON.stringify({ p_produto: a, p_campo: campo, p_valor: corpo.valor, p_motivo: txt(corpo.motivo, 500), p_usuario: eu.user_id }) });
  }
  if (post && a && UUID_RE.test(a) && !b) {
    exigir(eu, ["direcao", "operacoes"]);
    const campos: Record<string, unknown> = {};
    for (const [k, max] of [["nome", 200], ["descricao", 5000], ["categoria", 80], ["unidade", 20], ["observacao", 2000]] as const) if (k in corpo) campos[k] = txt(corpo[k], max);
    if ("situacao" in corpo) {
      if (!["ativo", "inativo", "revisar", "excluido"].includes(String(corpo.situacao))) throw new HttpError(400, "situação inválida");
      campos.situacao = corpo.situacao;
    }
    if ("nome" in campos && !campos.nome) throw new HttpError(400, "o nome não pode ficar vazio");
    if (!Object.keys(campos).length) throw new HttpError(400, "nada para alterar");
    await servico(`/rest/v1/produtos?id=eq.${a}`, { method: "PATCH", body: JSON.stringify({ ...campos, atualizado_em: new Date().toISOString() }) });
    return { ok: true };
  }
  throw new HttpError(404, "rota inexistente");
}
