// FERRAMENTAS DO CFO na funcao "api" (direcao e financas): formulario do fundador, diagnostico dos
// orcamentos do Zoho e preco dos produtos do catalogo pela Politica V1. Calculo no navegador
// (apps/web/js/domain/formacao_preco.js e diagnostico.js); aqui so leitura, resumo e gravacao.
//   GET  /cfo/formulario                 respostas vigentes por secao (com autor e versoes)
//   POST /cfo/formulario                 {secao, dados}  -> nova versao da secao (historico preservado)
//   GET  /cfo/orcamentos                 orcamentos do espelho do Zoho resumidos (linhas com tipo e custo do item)
//   GET  /cfo/produtos                   catalogo com compras (para o fator de importacao) e preco atual no Zoho
import { HttpError, lerCorpo, type Membro, registrarAcesso, servico } from "../_shared/banco.ts";
import { rbt12 } from "../_shared/zoho.ts";

const PAPEIS = ["direcao", "financas"];
const SECOES = ["impostos", "compras", "equipe", "fixos", "vendas", "dividas", "pedidos"];
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
// condicao de pagamento escrita nos termos/notas do orcamento
const PAGAMENTO_RE = /(entrada|sinal|parcela|parcelad|à vista|a vista|pix|boleto|cart[aã]o|\d+\s*x\b|\d+\s*%)/i;

/** Mantem so texto curto, numeros, booleanos, listas e objetos rasos (o formulario nao guarda mais que isso). */
function limpar(v: unknown, nivel = 0): unknown {
  if (v === null || typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") return v.slice(0, 2000);
  if (nivel >= 4) throw new HttpError(400, "formulário com níveis demais");
  if (Array.isArray(v)) {
    if (v.length > 300) throw new HttpError(400, "lista longa demais (máx. 300 linhas)");
    return v.map((x) => limpar(x, nivel + 1));
  }
  if (typeof v === "object") {
    const o: Record<string, unknown> = {};
    const entradas = Object.entries(v as Record<string, unknown>);
    if (entradas.length > 400) throw new HttpError(400, "campos demais");
    for (const [k, x] of entradas) {
      if (!ID_RE.test(k)) throw new HttpError(400, `campo inválido: ${k.slice(0, 40)}`);
      o[k] = limpar(x, nivel + 1);
    }
    return o;
  }
  throw new HttpError(400, "valor inválido no formulário");
}

export async function rotearCfo(req: Request, partes: string[], eu: Membro) {
  if (!PAPEIS.includes(eu.papel)) throw new HttpError(403, "ferramentas do CFO: só direção e financeiro");
  const [, a] = partes;
  const post = req.method === "POST";
  if (post && !CHAVE_RE.test(req.headers.get("Idempotency-Key") ?? "")) throw new HttpError(400, "Idempotency-Key obrigatorio");

  if (a === "formulario" && !post) {
    const [linhas, membros] = await Promise.all([
      servico("/rest/v1/rpc/formulario_vigente", { method: "POST", body: JSON.stringify({ p_formulario: "cfo" }) }),
      servico("/rest/v1/membros?select=user_id,nome"),
    ]);
    const nome = new Map(membros.map((m: { user_id: string; nome: string }) => [m.user_id, m.nome]));
    const respostas: Record<string, unknown> = {};
    for (const l of linhas) respostas[l.secao] = { dados: l.dados, em: l.em, autor_nome: nome.get(l.autor) ?? "—", versoes: l.versoes };
    return { respostas };
  }
  if (a === "formulario" && post) {
    const corpo = (await lerCorpo(req)) ?? {};
    if (!SECOES.includes(corpo.secao)) throw new HttpError(400, "seção inválida");
    if (!corpo.dados || typeof corpo.dados !== "object" || Array.isArray(corpo.dados)) throw new HttpError(400, "dados do formulário ausentes");
    const dados = limpar(corpo.dados);
    if (JSON.stringify(dados).length > 150_000) throw new HttpError(400, "formulário grande demais");
    const [r] = await servico("/rest/v1/formulario_respostas", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ formulario: "cfo", secao: corpo.secao, dados, autor: eu.user_id }) });
    return { id: r.id, em: r.em };
  }
  if (a === "orcamentos" && !post) {
    const [estimativas, itens, faturamento] = await Promise.all([
      servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&select=dados&limit=5000"),
      servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&excluido=is.false&select=zoho_id,tipo:dados->>product_type,custo:dados->>purchase_rate,unidade:dados->>unit&limit=10000"),
      rbt12(),
    ]);
    const item = new Map(itens.map((i: { zoho_id: string }) => [i.zoho_id, i]));
    const orcamentos = estimativas.map(({ dados: e }: { dados: Record<string, any> }) => ({
      numero: e.estimate_number, data: e.date, status: e.status, cliente: e.customer_name, vendedor: e.salesperson_name ?? "",
      desconto: Number(e.discount_total) || 0, ajuste: Number(e.adjustment) || 0, total: Number(e.total) || 0, imposto: Number(e.tax_total) || 0,
      condicao_pagamento: PAGAMENTO_RE.test(`${e.terms ?? ""} ${e.notes ?? ""}`),
      linhas: (e.line_items ?? []).map((l: Record<string, any>) => {
        const it = item.get(String(l.item_id ?? "")) as { tipo?: string; custo?: string; unidade?: string } | undefined;
        return { nome: String(l.name ?? "").slice(0, 120), qtd: Number(l.quantity) || 0, preco: Number(l.rate) || 0, total: Number(l.item_total) || 0, tipo: it?.tipo ?? null, custo: it?.custo === undefined || it?.custo === null ? null : Number(it.custo), unidade: l.unit || it?.unidade || null };
      }),
    })).sort((x: { data: string }, y: { data: string }) => String(y.data).localeCompare(String(x.data)));
    await registrarAcesso(eu.user_id, "cfo:diagnostico:orcamentos");
    return { orcamentos, rbt12: faturamento, fonte: "Espelho do Zoho Books no VEOS (orçamentos e cadastro de itens)" };
  }
  if (a === "produtos" && !post) {
    const [produtos, compras, vinculos] = await Promise.all([
      servico("/rest/v1/produtos?situacao=in.(ativo,revisar)&tipo=eq.produto&select=id,codigo,nome,categoria,situacao,custo:custo_ultimo,custo_data,preco_venda,unidade&order=codigo&limit=5000"),
      servico("/rest/v1/produto_compras_origem?select=produto_id,pedido,data,preco_unit,quantidade,total_pedido&limit=20000"),
      servico("/rest/v1/produto_vinculos_zoho?relacao=eq.mesmo_produto&situacao=neq.descartado&select=produto_id,zoho_item_id&limit=10000"),
    ]);
    const ids = [...new Set(vinculos.map((v: { zoho_item_id: string }) => v.zoho_item_id))].filter((x) => ID_RE.test(String(x)));
    const zoho = ids.length ? await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=in.(${ids.join(",")})&select=zoho_id,nome,venda:dados->>rate,custo:dados->>purchase_rate`) : [];
    const z = new Map(zoho.map((x: { zoho_id: string }) => [x.zoho_id, x]));
    const linhasPorPedido = new Map<string, number>();
    for (const c of compras) linhasPorPedido.set(c.pedido, (linhasPorPedido.get(c.pedido) ?? 0) + 1);
    const porProduto = new Map<string, unknown[]>();
    for (const c of compras) {
      const l = porProduto.get(c.produto_id) ?? [];
      l.push({ pedido: c.pedido, data: c.data, preco_unit: Number(c.preco_unit), quantidade: Number(c.quantidade), total_pedido: c.total_pedido === null ? null : Number(c.total_pedido), unico: linhasPorPedido.get(c.pedido) === 1 });
      porProduto.set(c.produto_id, l);
    }
    const zohoDe = new Map<string, unknown[]>();
    for (const v of vinculos) {
      const x = z.get(v.zoho_item_id) as { nome: string; venda: string; custo: string } | undefined;
      if (x) zohoDe.set(v.produto_id, [...(zohoDe.get(v.produto_id) ?? []), { nome: x.nome, venda: Number(x.venda) || null, custo: Number(x.custo) || null }]);
    }
    return {
      produtos: produtos.map((p: { id: string; custo: string | null; preco_venda: string | null }) => ({ ...p, custo: p.custo === null ? null : Number(p.custo), preco_venda: p.preco_venda === null ? null : Number(p.preco_venda), compras: porProduto.get(p.id) ?? [], zoho: zohoDe.get(p.id) ?? [] })),
    };
  }
  throw new HttpError(404, "rota inexistente");
}
