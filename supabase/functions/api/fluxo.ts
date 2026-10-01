// Fluxo vivo na funcao "api": pedido (a partir do orcamento aceito no Zoho) -> estoque ->
// parcelas -> nota fiscal (manual) -> recebimento. As regras ficam no banco (funcoes atomicas);
// aqui: permissao por papel, validacao de entrada e a vigia que atualiza os alertas FLX_*.
//   GET  /fluxo/resumo                    indicadores (a receber, vencido, faturado, previsao)
//   GET  /fluxo/orcamentos-aceitos        orcamentos aceitos no Zoho ainda sem pedido
//   GET  /fluxo/pedidos[?estado=]         lista
//   GET  /fluxo/pedidos/:id               pedido completo
//   POST /fluxo/pedidos                   {orcamento_zoho_id, condicao?, observacao?}
//   POST /fluxo/pedidos/:id/parcelas      {parcelas:[{vencimento, valor, descricao?}]}
//   POST /fluxo/pedidos/:id/(confirmar|reservar|entregar|cancelar|faturar)
//   POST /fluxo/parcelas/:id/receber      {data, valor}
//   GET  /fluxo/estoque[?busca=&pagina=]  produtos com saldo
//   GET  /fluxo/estoque/:item             movimentos do item
//   POST /fluxo/estoque                   {item_id, tipo: entrada|ajuste, quantidade, custo_unit?, observacao?}
import { HttpError, lerCorpo, type Membro, SERVICE, servico, URL_BASE } from "../_shared/banco.ts";

// Storage privado (bucket "anexos"): URLs assinadas de curta duracao, emitidas so pelo servidor.
async function storage(caminho: string, corpo: unknown) {
  const r = await fetch(`${URL_BASE}/storage/v1${caminho}`, { method: "POST", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("storage", caminho, r.status, JSON.stringify(d).slice(0, 200)); throw new HttpError(502, "falha no armazenamento de arquivos"); }
  return d as Record<string, string>;
}
import { vigiarFluxo } from "../_shared/fluxo_vigia.ts";

const VER = ["direcao", "vendas", "operacoes", "financas"];
const COMERCIAL = ["direcao", "vendas", "financas"];
const OPERACAO = ["direcao", "operacoes"];
const FINANCEIRO = ["direcao", "financas"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ZID_RE = /^[0-9A-Za-z_-]{1,40}$/;
const MONEY_RE = /^\d{1,12}(\.\d{1,2})?$/;
const QTD_RE = /^-?\d{1,9}(\.\d{1,3})?$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;

function exigir(eu: Membro, papeis: string[]) {
  if (!papeis.includes(eu.papel)) throw new HttpError(403, "seu perfil não pode fazer esta operação do fluxo");
}
const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => Number(v ?? 0);

async function vigiar() {
  try { await vigiarFluxo(); } catch (e) { console.error("vigia do fluxo", e); }
}

async function pedidoCompleto(id: string) {
  const [[pedido], itens, parcelas, notas, historico, anexos] = await Promise.all([
    servico(`/rest/v1/pedidos?id=eq.${id}&select=*`),
    servico(`/rest/v1/pedido_itens?pedido_id=eq.${id}&select=*&order=ordem`),
    servico(`/rest/v1/parcelas?pedido_id=eq.${id}&select=*&order=numero`),
    servico(`/rest/v1/notas_fiscais?pedido_id=eq.${id}&select=*&order=emitida_em`),
    servico(`/rest/v1/pedidos_historico?pedido_id=eq.${id}&select=acao,detalhe,em,usuario&order=id`),
    servico(`/rest/v1/pedido_anexos?pedido_id=eq.${id}&select=id,nome,tipo,tamanho,enviado_em&order=enviado_em`),
  ]);
  if (!pedido) throw new HttpError(404, "pedido inexistente");
  const ids = [...new Set(itens.filter((i: { tipo: string; item_id: string | null }) => i.tipo === "produto" && i.item_id).map((i: { item_id: string }) => i.item_id))];
  const [saldos, reservas] = ids.length
    ? await Promise.all([
        servico(`/rest/v1/estoque_saldos?item_id=in.(${ids.map((x) => `"${x}"`).join(",")})&select=*`),
        servico(`/rest/v1/estoque_movimentos?pedido_id=eq.${id}&tipo=in.(reserva,liberacao)&select=item_id,tipo,quantidade`),
      ])
    : [[], []];
  const reservado = new Map<string, number>();
  for (const r of reservas) reservado.set(r.item_id, (reservado.get(r.item_id) ?? 0) + (r.tipo === "reserva" ? num(r.quantidade) : -num(r.quantidade)));
  const saldo = new Map(saldos.map((s: { item_id: string }) => [s.item_id, s]));
  return {
    pedido, parcelas, notas, historico, anexos,
    itens: itens.map((i: Record<string, any>) => ({ ...i, reservado_pedido: i.item_id ? reservado.get(i.item_id) ?? 0 : null, estoque: i.item_id ? saldo.get(i.item_id) ?? { fisico: 0, reservado: 0 } : null })),
  };
}

export async function rotearFluxo(req: Request, partes: string[], eu: Membro) {
  const [, a, b, c] = partes; // fluxo/:a/:b/:c
  const q = new URL(req.url).searchParams;
  const post = req.method === "POST";
  const corpo = post ? ((await lerCorpo(req)) ?? {}) : {};
  const chave = req.headers.get("Idempotency-Key") ?? "";
  if (post && !CHAVE_RE.test(chave)) throw new HttpError(400, "Idempotency-Key obrigatorio (16-64 caracteres)");

  // ---------------------------------------------------------------- leitura
  if (!post && a === "resumo") {
    exigir(eu, VER);
    const hoje = new Date().toISOString().slice(0, 10);
    const mes = hoje.slice(0, 7);
    const [pedidos, abertas, notasMes, recebidasMes, saldos] = await Promise.all([
      servico("/rest/v1/pedidos?select=estado,valor_total&limit=10000"),
      servico("/rest/v1/parcelas?estado=eq.aberta&select=vencimento,valor,pedido:pedidos(estado)&limit=10000"),
      servico(`/rest/v1/notas_fiscais?emitida_em=gte.${mes}-01&select=valor&limit=10000`),
      servico(`/rest/v1/parcelas?estado=eq.recebida&recebido_em=gte.${mes}-01&select=valor_recebido&limit=10000`),
      servico("/rest/v1/estoque_saldos?select=fisico,reservado,custo_medio&limit=10000"),
    ]);
    const porEstado: Record<string, { quantidade: number; valor: number }> = {};
    for (const p of pedidos) { const e = (porEstado[p.estado] ??= { quantidade: 0, valor: 0 }); e.quantidade++; e.valor += num(p.valor_total); }
    const validas = abertas.filter((x: { pedido: { estado: string } | null }) => x.pedido && x.pedido.estado !== "cancelado");
    const previsao: Record<string, number> = {};
    for (const x of validas) previsao[x.vencimento.slice(0, 7)] = (previsao[x.vencimento.slice(0, 7)] ?? 0) + num(x.valor);
    return {
      pedidos: porEstado,
      a_receber: validas.reduce((s: number, x: { valor: string }) => s + num(x.valor), 0).toFixed(2),
      vencido: validas.filter((x: { vencimento: string }) => x.vencimento < hoje).reduce((s: number, x: { valor: string }) => s + num(x.valor), 0).toFixed(2),
      faturado_mes: notasMes.reduce((s: number, x: { valor: string }) => s + num(x.valor), 0).toFixed(2),
      recebido_mes: recebidasMes.reduce((s: number, x: { valor_recebido: string }) => s + num(x.valor_recebido), 0).toFixed(2),
      estoque_valor: saldos.reduce((s: number, x: { fisico: string; custo_medio: string | null }) => s + num(x.fisico) * num(x.custo_medio), 0).toFixed(2),
      previsao: Object.entries(previsao).sort().map(([mes_, valor]) => ({ mes: mes_, valor: valor.toFixed(2) })),
      mes,
    };
  }
  if (!post && a === "orcamentos-aceitos") {
    exigir(eu, COMERCIAL);
    const [orcs, usados] = await Promise.all([
      servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&dados->>status=eq.accepted&select=zoho_id,nome,data:dados->>date,cliente:dados->>customer_name,total:dados->>total&order=modificado_em.desc.nullslast&limit=300"),
      servico("/rest/v1/pedidos?orcamento_zoho_id=not.is.null&estado=neq.cancelado&select=orcamento_zoho_id&limit=5000"),
    ]);
    const u = new Set(usados.map((x: { orcamento_zoho_id: string }) => x.orcamento_zoho_id));
    return { orcamentos: orcs.filter((o: { zoho_id: string }) => !u.has(o.zoho_id)) };
  }
  if (!post && a === "pedidos" && !b) {
    exigir(eu, VER);
    const est = q.get("estado");
    const filtro = est && /^[a-z]{3,12}$/.test(est) ? `&estado=eq.${est}` : "";
    return { pedidos: await servico(`/rest/v1/pedidos?select=id,numero,cliente_nome,orcamento_numero,estado,valor_total,custo_total,criado_em,atualizado_em${filtro}&order=criado_em.desc&limit=300`) };
  }
  if (!post && a === "pedidos" && b) {
    exigir(eu, VER);
    if (!UUID_RE.test(b)) throw new HttpError(400, "pedido inválido");
    return await pedidoCompleto(b);
  }
  if (!post && a === "parcelas") {
    exigir(eu, VER);
    const est = ["aberta", "recebida", "cancelada"].includes(q.get("estado") ?? "") ? q.get("estado") : "aberta";
    const ordem = est === "recebida" ? "recebido_em.desc" : "vencimento";
    return { parcelas: await servico(`/rest/v1/parcelas?estado=eq.${est}&select=id,numero,descricao,vencimento,valor,estado,recebido_em,valor_recebido,pedido:pedidos(id,numero,cliente_nome,estado)&order=${ordem}&limit=500`) };
  }
  if (!post && a === "estoque" && !b) {
    exigir(eu, VER);
    const pagina = Math.max(1, Math.min(200, Number(q.get("pagina") ?? 1) || 1));
    const busca = (q.get("busca") ?? "").replace(/[%*,()]/g, " ").trim().slice(0, 60);
    const filtro = busca ? `&nome=ilike.*${encodeURIComponent(busca)}*` : "";
    const itens = await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&excluido=is.false&dados->>product_type=eq.goods${filtro}&select=zoho_id,nome,sku:dados->>sku,unidade:dados->>unit,compra:dados->>purchase_rate,venda:dados->>rate,estoque_zoho:dados->>stock_on_hand&order=nome&limit=50&offset=${(pagina - 1) * 50}`);
    const ids = itens.map((i: { zoho_id: string }) => i.zoho_id);
    const saldos = ids.length ? await servico(`/rest/v1/estoque_saldos?item_id=in.(${ids.map((x: string) => `"${x}"`).join(",")})&select=*`) : [];
    const s = new Map(saldos.map((x: { item_id: string }) => [x.item_id, x]));
    return { pagina, itens: itens.map((i: Record<string, any>) => ({ ...i, saldo: s.get(i.zoho_id) ?? null })) };
  }
  if (!post && a === "estoque" && b) {
    exigir(eu, VER);
    if (!ZID_RE.test(b)) throw new HttpError(400, "item inválido");
    const [[item], movimentos, [saldo]] = await Promise.all([
      servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=eq.${b}&select=zoho_id,nome,dados`),
      servico(`/rest/v1/estoque_movimentos?item_id=eq.${encodeURIComponent(b)}&select=id,tipo,quantidade,custo_unit,observacao,criado_em,pedido:pedidos(numero)&order=id.desc&limit=200`),
      servico(`/rest/v1/estoque_saldos?item_id=eq.${encodeURIComponent(b)}&select=*`),
    ]);
    if (!item) throw new HttpError(404, "item não encontrado no catálogo");
    return { item: { id: item.zoho_id, nome: item.nome, sku: item.dados.sku, unidade: item.dados.unit, compra: item.dados.purchase_rate, venda: item.dados.rate }, saldo: saldo ?? null, movimentos };
  }

  // ---------------------------------------------------------------- escrita
  if (post && a === "pedidos" && !b && corpo.negociacao) {
    // Fechar negociacao: o pedido nasce com o preco negociado e os custos da Negociacao ao Vivo.
    exigir(eu, COMERCIAL);
    const n = corpo.negociacao as Record<string, any>;
    const cliente = texto(n.cliente, 200);
    if (!cliente) throw new HttpError(400, "informe o cliente");
    if (!MONEY_RE.test(String(n.valor_total)) || num(n.valor_total) <= 0) throw new HttpError(400, "preço negociado inválido");
    const itens = (Array.isArray(n.itens) ? n.itens : []).map((i: Record<string, any>, k: number) => {
      if (!["produto", "servico"].includes(i.tipo)) throw new HttpError(400, `item ${k + 1}: tipo inválido`);
      if (!QTD_RE.test(String(i.quantidade)) || num(i.quantidade) <= 0) throw new HttpError(400, `item ${k + 1}: quantidade inválida`);
      if (!MONEY_RE.test(String(i.preco_unit ?? "0"))) throw new HttpError(400, `item ${k + 1}: preço inválido`);
      if (i.custo_unit !== null && i.custo_unit !== undefined && !/^\d{1,12}(\.\d{1,4})?$/.test(String(i.custo_unit))) throw new HttpError(400, `item ${k + 1}: custo inválido`);
      if (i.item_id && !ZID_RE.test(String(i.item_id))) throw new HttpError(400, `item ${k + 1}: item inválido`);
      return { item_id: i.item_id ?? null, nome: String(i.nome ?? "Item").slice(0, 300), tipo: i.tipo, quantidade: String(i.quantidade), preco_unit: String(i.preco_unit ?? "0"), custo_unit: i.custo_unit ?? null };
    });
    if (!itens.length || itens.length > 300) throw new HttpError(400, "o pedido precisa de 1 a 300 itens");
    const oid = texto(n.orcamento_zoho_id, 40);
    if (oid && !ZID_RE.test(oid)) throw new HttpError(400, "orçamento inválido");
    const resumo = n.resumo && typeof n.resumo === "object" ? JSON.stringify(n.resumo).slice(0, 1500) : "";
    const r = await servico("/rest/v1/rpc/pedido_criar", { method: "POST", body: JSON.stringify({ p: {
      chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, orcamento_zoho_id: oid, orcamento_numero: texto(n.orcamento_numero, 40), cliente_zoho_id: texto(n.cliente_zoho_id, 40),
      cliente_nome: cliente, valor_total: num(n.valor_total).toFixed(2), condicao: texto(n.condicao, 300),
      observacao: [texto(n.observacao, 1500), resumo ? `Negociação ao Vivo: ${resumo}` : null].filter(Boolean).join(" | "), itens,
    } }) });
    await vigiar();
    return r;
  }
  if (post && a === "pedidos" && !b) {
    exigir(eu, COMERCIAL);
    const oid = texto(corpo.orcamento_zoho_id, 40);
    if (!oid || !ZID_RE.test(oid)) throw new HttpError(400, "escolha o orçamento aceito");
    const [orc] = await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&zoho_id=eq.${oid}&select=dados,detalhe_em`);
    if (!orc) throw new HttpError(404, "orçamento não encontrado no espelho do Zoho");
    if (!orc.detalhe_em) throw new HttpError(409, "a ficha completa deste orçamento ainda não foi copiada do Zoho; tente em alguns minutos");
    const e = orc.dados;
    if (e.status !== "accepted") throw new HttpError(400, "só orçamentos aceitos viram pedido");
    const linhas = (e.line_items ?? []) as Record<string, any>[];
    if (!linhas.length) throw new HttpError(400, "orçamento sem itens");
    const ids = [...new Set(linhas.map((l) => l.item_id).filter(Boolean))] as string[];
    const cad = ids.length ? await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=in.(${ids.map((x) => `"${x}"`).join(",")})&select=zoho_id,tipo:dados->>product_type,compra:dados->>purchase_rate`) : [];
    const porId = new Map(cad.map((x: { zoho_id: string }) => [x.zoho_id, x]));
    const itens = linhas.map((l) => {
      const c = l.item_id ? porId.get(l.item_id) as { tipo: string; compra: string } | undefined : undefined;
      const tipo = (l.product_type ?? c?.tipo) === "service" ? "servico" : "produto";
      const compra = c && num(c.compra) > 0 ? num(c.compra).toFixed(2) : null;
      return { item_id: l.item_id ?? null, nome: String(l.name || l.description || "Item").slice(0, 300), tipo, quantidade: num(l.quantity || 1), preco_unit: num(l.rate).toFixed(2), custo_unit: compra };
    });
    const r = await servico("/rest/v1/rpc/pedido_criar", { method: "POST", body: JSON.stringify({ p: {
      chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, orcamento_zoho_id: oid, orcamento_numero: e.estimate_number, cliente_zoho_id: e.customer_id,
      cliente_nome: e.customer_name || "Cliente", valor_total: num(e.total).toFixed(2), condicao: texto(corpo.condicao, 300), observacao: texto(corpo.observacao, 2000), itens,
    } }) });
    await vigiar();
    return r;
  }
  if (post && a === "pedidos" && b && c === "anexos") {
    exigir(eu, VER);
    if (!UUID_RE.test(b)) throw new HttpError(400, "pedido inválido");
    const tipo = ["orcamento", "proposta", "contrato", "outro"].includes(String(corpo.tipo)) ? String(corpo.tipo) : "outro";
    const nome = texto(corpo.nome, 200);
    const tamanho = num(corpo.tamanho);
    if (!nome || !/\.pdf$/i.test(nome)) throw new HttpError(400, "envie um arquivo PDF");
    if (!(tamanho > 0 && tamanho <= 16 * 1024 * 1024)) throw new HttpError(400, "o PDF deve ter até 16 MB");
    const [ped] = await servico(`/rest/v1/pedidos?id=eq.${b}&select=id`);
    if (!ped) throw new HttpError(404, "pedido inexistente");
    if (corpo.confirmar === true) {
      // depois do envio: confere que o arquivo existe e registra
      const caminho = String(corpo.caminho ?? "");
      if (!new RegExp(`^${b}/[0-9a-f-]{36}\\.pdf$`).test(caminho)) throw new HttpError(400, "caminho inválido");
      const info = await fetch(`${URL_BASE}/storage/v1/object/info/anexos/${caminho}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
      if (!info.ok) throw new HttpError(409, "o arquivo não chegou ao armazenamento; envie de novo");
      await servico("/rest/v1/pedido_anexos", { method: "POST", body: JSON.stringify({ pedido_id: b, caminho, nome, tipo, tamanho, enviado_por: eu.user_id }) });
      await servico("/rest/v1/pedidos_historico", { method: "POST", body: JSON.stringify({ pedido_id: b, acao: "anexo", detalhe: { nome, tipo }, usuario: eu.user_id }) });
      return { ok: true };
    }
    const caminho = `${b}/${crypto.randomUUID()}.pdf`;
    const s = await storage(`/object/upload/sign/anexos/${caminho}`, {});
    return { caminho, url: `${URL_BASE}/storage/v1${s.url}` };
  }
  if (post && a === "anexos" && b && c === "link") {
    exigir(eu, VER);
    if (!UUID_RE.test(b)) throw new HttpError(400, "anexo inválido");
    const [x] = await servico(`/rest/v1/pedido_anexos?id=eq.${b}&select=caminho,nome`);
    if (!x) throw new HttpError(404, "anexo inexistente");
    const s = await storage(`/object/sign/anexos/${x.caminho}`, { expiresIn: 300 });
    return { url: `${URL_BASE}/storage/v1${s.signedURL}`, nome: x.nome };
  }
  if (post && a === "pedidos" && b) {
    if (!UUID_RE.test(b)) throw new HttpError(400, "pedido inválido");
    let r: unknown;
    if (c === "parcelas") {
      exigir(eu, COMERCIAL);
      const lista = Array.isArray(corpo.parcelas) ? corpo.parcelas : [];
      if (!lista.length || lista.length > 60) throw new HttpError(400, "informe de 1 a 60 parcelas");
      const parcelas = lista.map((x: Record<string, unknown>, i: number) => {
        if (!DATA_RE.test(String(x.vencimento))) throw new HttpError(400, `parcela ${i + 1}: vencimento inválido`);
        if (!MONEY_RE.test(String(x.valor)) || num(x.valor) <= 0) throw new HttpError(400, `parcela ${i + 1}: valor inválido`);
        return { vencimento: x.vencimento, valor: x.valor, descricao: texto(x.descricao, 120) };
      });
      r = await servico("/rest/v1/rpc/pedido_parcelas", { method: "POST", body: JSON.stringify({ p_pedido: b, p_parcelas: parcelas, p_usuario: eu.user_id }) });
    } else if (c === "confirmar" || c === "reservar") {
      exigir(eu, c === "confirmar" ? COMERCIAL : [...OPERACAO, "vendas"]);
      r = await servico(`/rest/v1/rpc/pedido_${c}`, { method: "POST", body: JSON.stringify({ p_pedido: b, p_usuario: eu.user_id }) });
    } else if (c === "entregar") {
      exigir(eu, OPERACAO);
      r = await servico("/rest/v1/rpc/pedido_entregar", { method: "POST", body: JSON.stringify({ p_pedido: b, p_usuario: eu.user_id }) });
    } else if (c === "cancelar") {
      exigir(eu, ["direcao"]);
      const motivo = texto(corpo.motivo, 500);
      if (!motivo) throw new HttpError(400, "informe o motivo do cancelamento");
      r = await servico("/rest/v1/rpc/pedido_cancelar", { method: "POST", body: JSON.stringify({ p_pedido: b, p_usuario: eu.user_id, p_motivo: motivo }) });
    } else if (c === "faturar") {
      exigir(eu, FINANCEIRO);
      if (!["NF-e", "NFS-e"].includes(String(corpo.tipo))) throw new HttpError(400, "tipo de nota: NF-e ou NFS-e");
      if (!/^[0-9A-Za-z./-]{1,30}$/.test(String(corpo.numero ?? ""))) throw new HttpError(400, "número da nota inválido");
      if (!DATA_RE.test(String(corpo.emitida_em))) throw new HttpError(400, "data de emissão inválida");
      if (!MONEY_RE.test(String(corpo.valor)) || num(corpo.valor) <= 0) throw new HttpError(400, "valor da nota inválido");
      const chaveAcesso = texto(corpo.chave_acesso, 60)?.replace(/\D/g, "") ?? null;
      if (chaveAcesso && chaveAcesso.length !== 44) throw new HttpError(400, "chave de acesso deve ter 44 dígitos");
      r = await servico("/rest/v1/rpc/pedido_faturar", { method: "POST", body: JSON.stringify({ p: {
        pedido_id: b, tipo: corpo.tipo, numero: corpo.numero, serie: texto(corpo.serie, 10) ?? "", emitida_em: corpo.emitida_em, valor: corpo.valor,
        chave_acesso: chaveAcesso, observacao: texto(corpo.observacao, 500), usuario: eu.user_id } }) });
    } else throw new HttpError(404, "ação inexistente");
    await vigiar();
    return { resultado: r, ...(await pedidoCompleto(b)) };
  }
  if (post && a === "parcelas" && b && c === "receber") {
    exigir(eu, FINANCEIRO);
    if (!UUID_RE.test(b)) throw new HttpError(400, "parcela inválida");
    if (!DATA_RE.test(String(corpo.data))) throw new HttpError(400, "data do recebimento inválida");
    if (!MONEY_RE.test(String(corpo.valor)) || num(corpo.valor) <= 0) throw new HttpError(400, "valor recebido inválido");
    const r = await servico("/rest/v1/rpc/parcela_receber", { method: "POST", body: JSON.stringify({ p_parcela: b, p_data: corpo.data, p_valor: corpo.valor, p_usuario: eu.user_id }) });
    await vigiar();
    return r;
  }
  if (post && a === "estoque" && !b) {
    exigir(eu, OPERACAO);
    const item = texto(corpo.item_id, 40);
    if (!item || !ZID_RE.test(item)) throw new HttpError(400, "item inválido");
    const [existe] = await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=eq.${item}&select=zoho_id`);
    if (!existe) throw new HttpError(404, "item não está no catálogo");
    if (!["entrada", "ajuste"].includes(String(corpo.tipo))) throw new HttpError(400, "tipo: entrada ou ajuste");
    if (!QTD_RE.test(String(corpo.quantidade)) || num(corpo.quantidade) === 0) throw new HttpError(400, "quantidade inválida");
    if (corpo.tipo === "entrada" && num(corpo.quantidade) < 0) throw new HttpError(400, "entrada deve ser positiva (use ajuste para corrigir)");
    if (corpo.custo_unit !== undefined && corpo.custo_unit !== null && corpo.custo_unit !== "" && !MONEY_RE.test(String(corpo.custo_unit))) throw new HttpError(400, "custo unitário inválido");
    const obs = texto(corpo.observacao, 300);
    if (corpo.tipo === "ajuste" && !obs) throw new HttpError(400, "ajuste exige o motivo na observação");
    if (corpo.tipo === "ajuste" && num(corpo.quantidade) < 0) {
      const [s] = await servico("/rest/v1/rpc/saldo_item", { method: "POST", body: JSON.stringify({ p_item: item }) });
      if (num(s?.fisico) + num(corpo.quantidade) < num(s?.reservado)) throw new HttpError(400, "o ajuste deixaria o físico abaixo do reservado para pedidos");
    }
    await servico("/rest/v1/estoque_movimentos?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({
      item_id: item, tipo: corpo.tipo, quantidade: corpo.quantidade, custo_unit: corpo.custo_unit || null, observacao: obs, usuario: eu.user_id, chave: `${eu.user_id}:${chave}` }) });
    // sistema vivo: entrada completa sozinha as reservas dos pedidos confirmados que esperavam este item
    const completados: string[] = [];
    if (num(corpo.quantidade) > 0) {
      const faltas = (await servico("/rest/v1/rpc/fluxo_faltas", { method: "POST", body: "{}" })).filter((f: { item_id: string }) => f.item_id === item);
      for (const f of faltas) {
        await servico("/rest/v1/rpc/pedido_reservar", { method: "POST", body: JSON.stringify({ p_pedido: f.pedido_id, p_usuario: eu.user_id }) });
        completados.push(f.numero);
      }
    }
    await vigiar();
    return { ok: true, reservas_completadas: completados };
  }
  throw new HttpError(404, "rota inexistente");
}
