// SETOR COMERCIAL na funcao "api".
//   GET  /comercial/base                   leitura da base real (orcamentos do Zoho): segmentos, especificadores, concentracao
//   GET  /comercial/implantacao            estado de cada item da implantacao do setor
//   POST /comercial/implantacao/:codigo    {estado: a_fazer|em_andamento|feito|nao_se_aplica, evidencia}
//   GET  /comercial/cadencias              registros reais em cadencia, toques abertos e rascunhos
//   POST /comercial/bloqueio               {contato: e-mail ou telefone, motivo}: quem pediu para sair
//   GET  /comercial/orcamentos[?busca=]    orcamentos proprios do VEOS (so a versao vigente de cada serie), mais recentes primeiro
//   GET  /comercial/orcamentos/:id         orcamento completo (cabecalho + itens), de qualquer versao
//   POST /comercial/orcamentos             {cliente_nome, itens:[...], valor_total, ...}: cria ou versiona (CSO-04)
// Conteudo (itens, cadencias, canais, donos das metas) em apps/web/js/domain/comercial.js.
// deno-lint-ignore-file no-explicit-any
import { HttpError, lerCorpo, type Membro, registrarAcesso, servico } from "../_shared/banco.ts";
import { baseComercial, cadenciaDoRegistro, CADENCIAS, IMPLANTACAO } from "../_shared/dominio/comercial.js";
import { contatoDoRegistro } from "../_shared/comercial_vigia.ts";

const VER = ["direcao", "financas", "vendas", "marketing", "posvenda"];
const MARCAR = ["direcao", "vendas", "marketing", "posvenda", "tecnologia", "secretaria", "pessoas"];
const COMERCIAL = ["direcao", "vendas", "financas"];
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ZID_RE = /^[0-9A-Za-z_-]{1,40}$/;
const MONEY_RE = /^\d{1,12}(\.\d{1,2})?$/;
const QTD_RE = /^-?\d{1,9}(\.\d{1,3})?$/;
const exigir = (eu: Membro, papeis: string[]) => { if (!papeis.includes(eu.papel)) throw new HttpError(403, "seu perfil não pode fazer esta operação no comercial"); };
const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const ITENS = new Map(IMPLANTACAO.flatMap((g: any) => g.itens.map((i: any) => [i.codigo, i])));

/** Itens validados no mesmo formato usado pelo pedido (fluxo.ts): tipo, quantidade, preco/custo unitario. */
function validarItensOrcamento(itens: unknown): Record<string, any>[] {
  const lista = (Array.isArray(itens) ? itens : []).map((i: Record<string, any>, k: number) => {
    if (!["produto", "servico"].includes(i.tipo)) throw new HttpError(400, `item ${k + 1}: tipo inválido`);
    if (!QTD_RE.test(String(i.quantidade)) || Number(i.quantidade) <= 0) throw new HttpError(400, `item ${k + 1}: quantidade inválida`);
    if (!MONEY_RE.test(String(i.preco_unit ?? "0"))) throw new HttpError(400, `item ${k + 1}: preço inválido`);
    if (i.custo_unit !== null && i.custo_unit !== undefined && !/^\d{1,12}(\.\d{1,4})?$/.test(String(i.custo_unit))) throw new HttpError(400, `item ${k + 1}: custo inválido`);
    if (i.item_id && !ZID_RE.test(String(i.item_id))) throw new HttpError(400, `item ${k + 1}: item inválido`);
    return { secao: texto(i.secao, 200), item_id: i.item_id ?? null, nome: String(i.nome ?? "Item").slice(0, 300), descricao: texto(i.descricao, 2000),
      tipo: i.tipo, quantidade: String(i.quantidade), preco_unit: String(i.preco_unit ?? "0"), custo_unit: i.custo_unit ?? null };
  });
  if (!lista.length || lista.length > 300) throw new HttpError(400, "o orçamento precisa de 1 a 300 itens");
  return lista;
}

export async function rotearComercial(req: Request, partes: string[], eu: Membro) {
  const [, a, b] = partes;
  const post = req.method === "POST";
  const chave = req.headers.get("Idempotency-Key") ?? "";
  if (post && !CHAVE_RE.test(chave)) throw new HttpError(400, "Idempotency-Key obrigatorio");
  const corpo = post ? ((await lerCorpo(req)) ?? {}) as Record<string, any> : {};

  if (!post && a === "base") {
    exigir(eu, VER);
    const est = await servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&select=numero:dados->>estimate_number,data:dados->>date,status:dados->>status,cliente:dados->>customer_name,contato:dados->>contact_number,cid:dados->>customer_id,total:dados->>total&limit=5000");
    await registrarAcesso(eu.user_id, "comercial:base");
    // codigo = o mesmo que os diretores (IA) usam para citar o cliente sem o nome
    const base = baseComercial(est.map((e: any) => ({ ...e, total: Number(e.total) || 0, codigo: e.contato || (e.cid ? `cliente-${String(e.cid).slice(-5)}` : "cliente") })));
    return { ...base, clientes_lista: base.clientes_lista.slice(0, 80), fonte: "Espelho do Zoho Books no VEOS (orçamentos)", segmento: "automático pelo nome do cliente: conferir" };
  }
  if (!post && a === "implantacao") {
    exigir(eu, VER.concat(MARCAR));
    const [estados, membros] = await Promise.all([
      servico("/rest/v1/comercial_implantacao?select=codigo,estado,evidencia,atualizado_por,atualizado_em&limit=500"),
      servico("/rest/v1/membros?select=user_id,nome"),
    ]);
    const nome = new Map(membros.map((m: any) => [m.user_id, m.nome]));
    return { estados: Object.fromEntries(estados.map((e: any) => [e.codigo, { ...e, quem: e.atualizado_por ? nome.get(e.atualizado_por) ?? "—" : null }])), papel: eu.papel };
  }
  if (post && a === "implantacao" && b) {
    exigir(eu, MARCAR);
    const item = ITENS.get(b) as any;
    if (!item) throw new HttpError(404, "item inexistente");
    if (item.decisao && eu.papel !== "direcao") throw new HttpError(403, "decisão do fundador: só a direção marca este item");
    return await servico("/rest/v1/rpc/comercial_implantacao_marcar", { method: "POST", body: JSON.stringify({ p_codigo: b, p_estado: String(corpo.estado ?? ""), p_evidencia: typeof corpo.evidencia === "string" ? corpo.evidencia.slice(0, 2000) : null, p_usuario: eu.user_id }) });
  }
  if (!post && a === "cadencias") {
    exigir(eu, VER);
    const [candidatos, tarefas, rascunhos] = await Promise.all([
      servico("/rest/v1/rpc/cadencia_candidatos", { method: "POST", body: "{}" }),
      servico("/rest/v1/tarefas?origem=like.cadencia:*&select=registro_id,estado,prazo,titulo&order=prazo.asc&limit=5000"),
      servico("/rest/v1/mensagens_saida?origem=like.cadencia:*&estado=eq.rascunho&select=origem&limit=5000"),
    ]);
    const lista = candidatos.map((r: any) => {
      const cad = cadenciaDoRegistro(r);
      if (!cad) return null;
      const ts = tarefas.filter((t: any) => t.registro_id === r.id);
      return { registro_id: r.id, titulo: r.titulo, tipo: r.tipo, estado: r.estado, cadencia: cad.id, cadencia_nome: cad.nome, desde: r.desde, contato: contatoDoRegistro(r).nome,
        toques: cad.passos.length, feitos: ts.filter((t: any) => t.estado === "feita").length, abertos: ts.filter((t: any) => t.estado === "aberta").length,
        proximo: ts.find((t: any) => t.estado === "aberta") ?? null, rascunhos: rascunhos.filter((m: any) => m.origem.startsWith(`cadencia:${r.id}:`)).length };
    }).filter(Boolean);
    return { em_cadencia: lista, cadencias: CADENCIAS.map((c: any) => ({ id: c.id, nome: c.nome, toques: c.passos.length })), desde: "2026-10-07" };
  }
  if (post && a === "bloqueio") {
    exigir(eu, ["direcao", "vendas", "marketing", "posvenda"]);
    const bruto = String(corpo.contato ?? "").trim();
    const email = bruto.includes("@");
    const contato = email ? bruto.toLowerCase() : bruto.replace(/\D/g, "");
    if (email ? !/^[^@\s]{1,64}@[^@\s]{1,255}\.[a-z]{2,}$/i.test(contato) : contato.length < 10) throw new HttpError(400, "informe um e-mail ou telefone válido");
    await servico("/rest/v1/contatos_bloqueio?on_conflict=contato", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ contato, canal: email ? "email" : "telefone", motivo: typeof corpo.motivo === "string" ? corpo.motivo.slice(0, 300) : null, registrado_por: eu.user_id }) });
    // rascunhos ja gerados para esse contato sao descartados
    await servico(`/rest/v1/mensagens_saida?destinatario=eq.${encodeURIComponent(contato)}&estado=eq.rascunho`, { method: "PATCH", body: JSON.stringify({ estado: "descartada", motivo_descarte: "contato pediu para não receber mensagens" }) });
    return { ok: true, contato };
  }
  if (!post && a === "orcamentos" && !b) {
    exigir(eu, VER);
    const busca = texto(new URL(req.url).searchParams.get("busca"), 60);
    const filtro = busca ? `&or=(cliente_nome.ilike.*${encodeURIComponent(busca)}*,numero.ilike.*${encodeURIComponent(busca)}*)` : "";
    return { orcamentos: await servico(`/rest/v1/comercial_orcamentos?estado=eq.rascunho${filtro}&select=id,numero,versao,cliente_nome,referencia,valor_total,criado_em,atualizado_em&order=atualizado_em.desc&limit=300`) };
  }
  if (!post && a === "orcamentos" && b) {
    exigir(eu, VER);
    if (!UUID_RE.test(b)) throw new HttpError(400, "orçamento inválido");
    const [[orcamento], itens] = await Promise.all([
      servico(`/rest/v1/comercial_orcamentos?id=eq.${b}&select=*`),
      servico(`/rest/v1/comercial_orcamento_itens?orcamento_id=eq.${b}&select=*&order=ordem`),
    ]);
    if (!orcamento) throw new HttpError(404, "orçamento inexistente");
    await registrarAcesso(eu.user_id, `orcamento:${b}`);
    return { orcamento, itens };
  }
  if (post && a === "orcamentos" && !b) {
    exigir(eu, COMERCIAL);
    const clienteNome = texto(corpo.cliente_nome, 200);
    if (!clienteNome) throw new HttpError(400, "informe o cliente");
    if (!MONEY_RE.test(String(corpo.valor_total)) || Number(corpo.valor_total) <= 0) throw new HttpError(400, "preço negociado inválido");
    const itens = validarItensOrcamento(corpo.itens);
    const substitui = texto(corpo.substitui, 36);
    if (substitui && !UUID_RE.test(substitui)) throw new HttpError(400, "orçamento anterior inválido");
    const r = await servico("/rest/v1/rpc/orcamento_veos_criar", { method: "POST", body: JSON.stringify({ p: {
      chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, cliente_nome: clienteNome, cliente_zoho_id: texto(corpo.cliente_zoho_id, 40),
      referencia: texto(corpo.referencia, 300), condicao: texto(corpo.condicao, 300), valor_total: Number(corpo.valor_total).toFixed(2),
      desconto: corpo.desconto !== undefined && corpo.desconto !== null ? Number(corpo.desconto).toFixed(2) : null,
      resumo: corpo.resumo && typeof corpo.resumo === "object" ? corpo.resumo : {}, observacao: texto(corpo.observacao, 2000), substitui, itens,
    } }) });
    return r;
  }
  throw new HttpError(404, "rota inexistente");
}
