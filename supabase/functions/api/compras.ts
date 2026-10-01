// Compras, contas a pagar e previsao de caixa (dentro de /fluxo). Regras no banco (compra_*,
// conta_pagar_*, caixa_previsao); aqui: permissao, validacao, reserva automatica apos o
// recebimento e o caixa do pedido pela Politica V1.1 (mesma exposicao() de regras/caixa.ts).
//   GET  /fluxo/compras[?estado=]            lista          GET /fluxo/compras/faltas   faltas x em compra
//   GET  /fluxo/compras/fornecedores         nomes (Zoho)   GET /fluxo/compras/:id      compra completa
//   POST /fluxo/compras                      {fornecedor_nome, fornecedor_zoho_id?, pedido_id?, previsao_entrega?, observacao?, itens[], parcelas[]}
//   POST /fluxo/compras/:id/receber          {itens:[{ordem, quantidade}]}
//   POST /fluxo/compras/:id/cancelar         {motivo}
//   GET  /fluxo/contas-pagar[?estado=]       POST /fluxo/contas-pagar {descricao, fornecedor, categoria, vencimento, valor, pedido_id?}
//   POST /fluxo/contas-pagar/:id/(pagar|cancelar)   {data, valor} | {motivo}
//   GET  /fluxo/caixa                        previsao: 2 meses atras ate 6 a frente
import { HttpError, type Membro, servico } from "../_shared/banco.ts";
import { exposicao } from "../_shared/regras/caixa.ts";
import { brl, centesimos, pctTexto } from "../_shared/regras/dinheiro.ts";

const OPERACAO = ["direcao", "operacoes"];
const FINANCEIRO = ["direcao", "financas"];
const VER = ["direcao", "operacoes", "financas"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ZID_RE = /^[0-9A-Za-z_-]{1,40}$/;
const MONEY_RE = /^\d{1,12}(\.\d{1,2})?$/;
const QTD_RE = /^\d{1,9}(\.\d{1,3})?$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIAS = ["servico_terceiro", "frete", "imposto", "despesa_fixa", "outro"];
const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });
const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const exigir = (eu: Membro, papeis: string[]) => {
  if (!papeis.includes(eu.papel)) throw new HttpError(403, "seu perfil não pode fazer esta operação");
};
const cent = (v: unknown) => BigInt(Math.round(Number(v ?? 0) * 100));
const dataOuNulo = (v: unknown, nome: string) => {
  if (v === undefined || v === null || v === "") return null;
  if (!DATA_RE.test(String(v))) throw new HttpError(400, `${nome}: data inválida`);
  return String(v);
};

/** Caixa do pedido (Politica V1.1): posicao = recebido efetivo - compromissos (contas do pedido, pagas ou firmes). */
export async function caixaPedido(id: string, valorTotal: unknown) {
  const [parcelas, contas] = await Promise.all([
    servico(`/rest/v1/parcelas?pedido_id=eq.${id}&estado=eq.recebida&select=valor,valor_recebido`),
    servico(`/rest/v1/contas_pagar?pedido_id=eq.${id}&estado=neq.cancelada&select=valor,estado`),
  ]);
  const recebido = parcelas.reduce((s: bigint, p: { valor: string; valor_recebido: string | null }) => s + cent(p.valor_recebido ?? p.valor), 0n);
  const compromissos = contas.reduce((s: bigint, k: { valor: string }) => s + cent(k.valor), 0n);
  const e = exposicao(recebido - compromissos, cent(valorTotal));
  return {
    recebido: brl(recebido), compromissos: brl(compromissos), posicao: brl(e.posicao), exposicao: brl(e.exposicao),
    pct: e.pct === null ? null : pctTexto(centesimos(e.pct)), gatilho: e.gatilho, contas: contas.length,
    fonte: "Política V1.1 sec.4-9: posição = recebido efetivo − compromissos; exposição acima de 10% do contrato exige autorização da direção.",
  };
}

async function completarReservas(itens: string[], usuario: string) {
  const faltas = (await rpc("fluxo_faltas", {})).filter((f: { item_id: string }) => itens.includes(f.item_id));
  const feitos = new Set<string>();
  for (const f of faltas) {
    if (feitos.has(f.pedido_id)) continue;
    await rpc("pedido_reservar", { p_pedido: f.pedido_id, p_usuario: usuario });
    feitos.add(f.pedido_id);
  }
  return faltas.filter((f: { pedido_id: string }) => feitos.has(f.pedido_id)).map((f: { numero: string }) => f.numero);
}

export async function rotearCompras(req: Request, partes: string[], eu: Membro, corpo: Record<string, unknown>, chave: string, vigiar: () => Promise<void>) {
  const [, a, b, c] = partes;
  const post = req.method === "POST";
  const q = new URL(req.url).searchParams;

  // ---------------------------------------------------------------- compras
  if (a === "compras" && !post) {
    exigir(eu, VER);
    if (!b) {
      const est = q.get("estado");
      const filtro = est && /^[a-z]{5,10}$/.test(est) ? `&estado=eq.${est}` : "";
      return { compras: await servico(`/rest/v1/compras?select=id,numero,fornecedor_nome,estado,valor_total,previsao_entrega,criado_em,recebida_em,pedido:pedidos(id,numero,cliente_nome)${filtro}&order=criado_em.desc&limit=300`) };
    }
    if (b === "faltas") {
      const faltas = await rpc("fluxo_faltas_compra", {});
      const ids = [...new Set(faltas.map((f: { item_id: string }) => f.item_id))] as string[];
      const custos = ids.length ? await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=in.(${ids.map((x) => `"${x}"`).join(",")})&select=zoho_id,compra:dados->>purchase_rate`) : [];
      const porId = new Map(custos.map((x: { zoho_id: string; compra: string | null }) => [x.zoho_id, x.compra]));
      return { faltas: faltas.map((f: { item_id: string }) => ({ ...f, custo_zoho: porId.get(f.item_id) ?? null })) };
    }
    if (b === "fornecedores") {
      const [books, crm] = await Promise.all([
        servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.contacts&excluido=is.false&dados->>contact_type=eq.vendor&select=zoho_id,nome&order=nome&limit=1000"),
        servico("/rest/v1/zoho_registros?produto=eq.crm&modulo=eq.Vendors&excluido=is.false&select=nome&order=nome&limit=1000"),
      ]);
      const nomes = new Map<string, string | null>();
      for (const x of books) nomes.set(x.nome, x.zoho_id);
      for (const x of crm) if (!nomes.has(x.nome)) nomes.set(x.nome, null);
      return { fornecedores: [...nomes].filter(([n]) => n).map(([nome, zoho_id]) => ({ nome, zoho_id })) };
    }
    if (!UUID_RE.test(b)) throw new HttpError(400, "compra inválida");
    const [[compra], itens, contas, historico] = await Promise.all([
      servico(`/rest/v1/compras?id=eq.${b}&select=*,pedido:pedidos(id,numero,cliente_nome)`),
      servico(`/rest/v1/compra_itens?compra_id=eq.${b}&select=*&order=ordem`),
      servico(`/rest/v1/contas_pagar?compra_id=eq.${b}&select=*&order=numero`),
      servico(`/rest/v1/compras_historico?compra_id=eq.${b}&select=acao,detalhe,em,membro:membros(nome)&order=id`),
    ]);
    if (!compra) throw new HttpError(404, "compra inexistente");
    return { compra, itens, contas, historico };
  }
  if (a === "compras" && post && !b) {
    exigir(eu, OPERACAO);
    const fornecedor = texto(corpo.fornecedor_nome, 200);
    if (!fornecedor) throw new HttpError(400, "informe o fornecedor");
    const itens = Array.isArray(corpo.itens) ? corpo.itens.slice(0, 100) : [];
    const parcelas = Array.isArray(corpo.parcelas) ? corpo.parcelas.slice(0, 24) : [];
    for (const [i, it] of itens.entries()) {
      if (!ZID_RE.test(String(it?.item_id))) throw new HttpError(400, `item ${i + 1}: produto inválido`);
      if (!QTD_RE.test(String(it.quantidade)) || Number(it.quantidade) <= 0) throw new HttpError(400, `item ${i + 1}: quantidade inválida`);
      if (!MONEY_RE.test(String(it.custo_unit))) throw new HttpError(400, `item ${i + 1}: custo unitário inválido`);
    }
    for (const [i, p] of parcelas.entries()) {
      if (!DATA_RE.test(String(p?.vencimento))) throw new HttpError(400, `parcela ${i + 1}: vencimento inválido`);
      if (!MONEY_RE.test(String(p.valor)) || Number(p.valor) <= 0) throw new HttpError(400, `parcela ${i + 1}: valor inválido`);
    }
    const ids = [...new Set(itens.map((it: { item_id: string }) => it.item_id))];
    const cat = ids.length ? await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&excluido=is.false&zoho_id=in.(${ids.map((x) => `"${x}"`).join(",")})&select=zoho_id,nome`) : [];
    const nomes = new Map(cat.map((x: { zoho_id: string; nome: string }) => [x.zoho_id, x.nome]));
    const falta = ids.find((x) => !nomes.has(x));
    if (falta) throw new HttpError(400, `produto ${falta} não está no catálogo do Zoho`);
    const pedido = texto(corpo.pedido_id, 36);
    if (pedido && !UUID_RE.test(pedido)) throw new HttpError(400, "pedido inválido");
    const r = await rpc("compra_criar", { p: {
      chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, fornecedor_nome: fornecedor, fornecedor_zoho_id: texto(corpo.fornecedor_zoho_id, 40), pedido_id: pedido,
      previsao_entrega: dataOuNulo(corpo.previsao_entrega, "previsão de entrega"), observacao: texto(corpo.observacao, 1000),
      itens: itens.map((it: Record<string, unknown>) => ({ item_id: it.item_id, nome: nomes.get(String(it.item_id)), quantidade: it.quantidade, custo_unit: it.custo_unit })),
      parcelas: parcelas.map((p: Record<string, unknown>) => ({ vencimento: p.vencimento, valor: p.valor })),
    } });
    await vigiar();
    return r;
  }
  if (a === "compras" && post && b && UUID_RE.test(b)) {
    exigir(eu, OPERACAO);
    if (c === "receber") {
      const itens = (Array.isArray(corpo.itens) ? corpo.itens : []).slice(0, 100).map((it: Record<string, unknown>, i: number) => {
        if (!/^\d{1,3}$/.test(String(it?.ordem)) || !QTD_RE.test(String(it.quantidade))) throw new HttpError(400, `linha ${i + 1}: quantidade inválida`);
        return { ordem: Number(it.ordem), quantidade: it.quantidade };
      });
      const r = await rpc("compra_receber", { p: { compra_id: b, usuario: eu.user_id, chave: `${eu.user_id}:${chave}`, itens } });
      const completados = r.repetido ? [] : await completarReservas(r.itens ?? [], eu.user_id);
      await vigiar();
      return { ...r, reservas_completadas: completados };
    }
    if (c === "cancelar") {
      const r = await rpc("compra_cancelar", { p_compra: b, p_usuario: eu.user_id, p_motivo: texto(corpo.motivo, 500) });
      await vigiar();
      return r;
    }
  }

  // ---------------------------------------------------------------- contas a pagar
  if (a === "contas-pagar" && !post) {
    exigir(eu, FINANCEIRO);
    const est = ["aberta", "paga", "cancelada"].includes(q.get("estado") ?? "") ? q.get("estado") : "aberta";
    const ordem = est === "paga" ? "pago_em.desc" : "vencimento";
    return { contas: await servico(`/rest/v1/contas_pagar?estado=eq.${est}&select=*,compra:compras(id,numero),pedido:pedidos(id,numero,cliente_nome)&order=${ordem}&limit=500`) };
  }
  if (a === "contas-pagar" && post && !b) {
    exigir(eu, FINANCEIRO);
    const descricao = texto(corpo.descricao, 300), fornecedor = texto(corpo.fornecedor, 200);
    if (!descricao || !fornecedor) throw new HttpError(400, "informe descrição e fornecedor");
    if (!CATEGORIAS.includes(String(corpo.categoria))) throw new HttpError(400, "categoria inválida");
    if (!DATA_RE.test(String(corpo.vencimento))) throw new HttpError(400, "vencimento inválido");
    if (!MONEY_RE.test(String(corpo.valor)) || Number(corpo.valor) <= 0) throw new HttpError(400, "valor inválido");
    const pedido = texto(corpo.pedido_id, 36);
    if (pedido && !UUID_RE.test(pedido)) throw new HttpError(400, "pedido inválido");
    const r = await rpc("conta_pagar_criar", { p: { chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, descricao, fornecedor, categoria: corpo.categoria, vencimento: corpo.vencimento, valor: corpo.valor, pedido_id: pedido } });
    await vigiar();
    return r;
  }
  if (a === "contas-pagar" && post && b && UUID_RE.test(b)) {
    exigir(eu, FINANCEIRO);
    let r;
    if (c === "pagar") {
      if (!DATA_RE.test(String(corpo.data))) throw new HttpError(400, "data do pagamento inválida");
      if (!MONEY_RE.test(String(corpo.valor)) || Number(corpo.valor) <= 0) throw new HttpError(400, "valor pago inválido");
      r = await rpc("conta_pagar_pagar", { p_conta: b, p_data: corpo.data, p_valor: corpo.valor, p_usuario: eu.user_id });
    } else if (c === "cancelar") {
      r = await rpc("conta_pagar_cancelar", { p_conta: b, p_usuario: eu.user_id, p_motivo: texto(corpo.motivo, 500) });
    } else throw new HttpError(404, "rota inexistente");
    await vigiar();
    return r;
  }
  if (a === "caixa" && !post) {
    exigir(eu, FINANCEIRO);
    const hoje = new Date();
    const de = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 2, 1)).toISOString().slice(0, 10);
    const ate = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 6, 1)).toISOString().slice(0, 10);
    return { ...(await rpc("caixa_previsao", { p_de: de, p_ate: ate })), mes_atual: hoje.toISOString().slice(0, 7) };
  }
  throw new HttpError(404, "rota inexistente");
}
