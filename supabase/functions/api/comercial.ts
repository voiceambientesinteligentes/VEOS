// SETOR COMERCIAL na funcao "api".
//   GET  /comercial/base                   leitura da base real (orcamentos do Zoho): segmentos, especificadores, concentracao
//   GET  /comercial/implantacao            estado de cada item da implantacao do setor
//   POST /comercial/implantacao/:codigo    {estado: a_fazer|em_andamento|feito|nao_se_aplica, evidencia}
//   GET  /comercial/cadencias              registros reais em cadencia, toques abertos e rascunhos
//   POST /comercial/bloqueio               {contato: e-mail ou telefone, motivo}: quem pediu para sair
//   GET  /comercial/orcamentos[?busca=]    orcamentos proprios do VEOS (so a versao vigente de cada serie), mais recentes primeiro
//   GET  /comercial/orcamentos/:id         orcamento completo (cabecalho + itens), de qualquer versao
//   POST /comercial/orcamentos             {cliente_nome, itens:[...], valor_total, ...}: cria ou versiona (CSO-04)
//   POST /comercial/orcamentos/:id/situacao {estado: enviado|recusado|expirado|rascunho, motivo?} (aceito: POST /fluxo/pedidos {orcamento_veos_id})
//   GET  /comercial/clientes[?busca=]      clientes do VEOS (cadastro proprio)
//   GET  /comercial/clientes/:id           ficha: dados, orcamentos, pedidos, oportunidades e historico
//   POST /comercial/clientes[/:id]         cria / altera (parcial)
//   POST /comercial/clientes/zoho/:zid     cria o cliente a partir de um contato do Zoho Books (ou devolve o existente)
//   GET  /comercial/retomar[?busca=]       orcamentos antigos do Zoho nao fechados (rascunho, enviado, expirado, recusado)
//   GET  /comercial/retomar/:zid           itens do orcamento antigo ligados ao catalogo do VEOS, para virar orcamento novo
// Conteudo (itens, cadencias, canais, donos das metas) em apps/web/js/domain/comercial.js.
// deno-lint-ignore-file no-explicit-any
import { HttpError, lerCorpo, type Membro, registrarAcesso, servico } from "../_shared/banco.ts";
import { baseComercial, cadenciaDoRegistro, CADENCIAS, IMPLANTACAO } from "../_shared/dominio/comercial.js";
import { clienteDoZoho, normalizarCliente } from "../_shared/dominio/clientes.js";
import { contatoDoRegistro } from "../_shared/comercial_vigia.ts";
import { ehTeste, filtroAutor, idsTeste } from "../_shared/teste.ts";

const CADASTRAR = ["direcao", "vendas", "financas", "marketing", "posvenda"];
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const CLIENTE_COLS = "id,codigo,tipo,nome,documento,contato_nome,telefone,email,cidade,uf,endereco_obra,tipo_imovel,fase_obra,origem,parceiro,aceita_contato,observacao,zoho_contact_id,estado,criado_por,criado_em,atualizado_em";
const ORC_COLS = "id,numero,versao,serie,cliente_id,cliente_nome,referencia,condicao,estado,valor_total,desconto,validade,prazo_execucao,enviado_em,decidido_em,motivo_recusa,pedido_id,criado_em,atualizado_em";
const limparBusca = (v: unknown) => String(v ?? "").replace(/[%*,()."]/g, " ").trim().slice(0, 60);

/** O usuario so enxerga clientes/orcamentos do proprio "mundo" (real ou robo de teste). */
async function visivel(eu: Membro, criadoPor: string) {
  const ids = await idsTeste();
  return ids.includes(criadoPor) === ehTeste(eu);
}
async function clienteVisivel(eu: Membro, id: string) {
  if (!UUID_RE.test(id)) throw new HttpError(404, "cliente inexistente");
  const [c] = await servico(`/rest/v1/clientes?id=eq.${id}&select=${CLIENTE_COLS}`);
  if (!c || !(await visivel(eu, c.criado_por))) throw new HttpError(404, "cliente inexistente");
  return c;
}
async function salvarCliente(eu: Membro, chave: string, dados: Record<string, unknown>, id: string | null = null) {
  return await servico("/rest/v1/rpc/cliente_salvar", { method: "POST", body: JSON.stringify({ p: { chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, id, dados } }) });
}

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
    if (i.produto_id && !UUID_RE.test(String(i.produto_id))) throw new HttpError(400, `item ${k + 1}: produto inválido`);
    return { secao: texto(i.secao, 200), item_id: i.item_id ?? null, produto_id: i.produto_id ?? null, nome: String(i.nome ?? "Item").slice(0, 300), descricao: texto(i.descricao, 2000),
      tipo: i.tipo, quantidade: String(i.quantidade), unidade: texto(i.unidade, 20), preco_unit: String(i.preco_unit ?? "0"), custo_unit: i.custo_unit ?? null };
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
    const q = new URL(req.url).searchParams;
    const busca = limparBusca(q.get("busca"));
    const estado = q.get("estado") ?? "";
    const filtro = (busca ? `&or=(cliente_nome.ilike.*${encodeURIComponent(busca)}*,numero.ilike.*${encodeURIComponent(busca)}*)` : "")
      + (["rascunho", "enviado", "aceito", "recusado", "expirado"].includes(estado) ? `&estado=eq.${estado}` : "&estado=neq.substituido")
      + (UUID_RE.test(q.get("cliente") ?? "") ? `&cliente_id=eq.${q.get("cliente")}` : "");
    return { orcamentos: await servico(`/rest/v1/comercial_orcamentos?select=${ORC_COLS}${filtro}${await filtroAutor(eu)}&order=atualizado_em.desc&limit=300`) };
  }
  if (post && a === "orcamentos" && b && partes[3] === "situacao") {
    exigir(eu, COMERCIAL);
    if (!UUID_RE.test(b)) throw new HttpError(400, "orçamento inválido");
    const estado = String(corpo.estado ?? "");
    if (!["enviado", "recusado", "expirado", "rascunho"].includes(estado)) throw new HttpError(400, "situação: enviado, recusado, expirado ou rascunho (aceito = gerar o pedido)");
    const [o] = await servico(`/rest/v1/comercial_orcamentos?id=eq.${b}&select=id,criado_por`);
    if (!o || !(await visivel(eu, o.criado_por))) throw new HttpError(404, "orçamento inexistente");
    return await servico("/rest/v1/rpc/orcamento_veos_situacao", { method: "POST", body: JSON.stringify({ p: { id: b, estado, motivo: texto(corpo.motivo, 500), usuario: eu.user_id } }) });
  }

  // ---------------------------------------------------------------- clientes
  if (!post && a === "clientes" && !b) {
    exigir(eu, VER);
    const q = new URL(req.url).searchParams;
    const busca = limparBusca(q.get("busca"));
    const dig = busca.replace(/\D/g, "");
    const ors = busca ? [`nome.ilike.*${encodeURIComponent(busca)}*`, `codigo.ilike.*${encodeURIComponent(busca)}*`, `email.ilike.*${encodeURIComponent(busca)}*`, `cidade.ilike.*${encodeURIComponent(busca)}*`, ...(dig.length >= 4 ? [`telefone.like.*${dig}*`, `documento.like.*${dig}*`] : [])] : [];
    const estado = q.get("estado") === "inativo" ? "inativo" : "ativo";
    const clientes = await servico(`/rest/v1/clientes?estado=eq.${estado}${ors.length ? `&or=(${ors.join(",")})` : ""}${await filtroAutor(eu)}&select=id,codigo,tipo,nome,telefone,email,cidade,uf,origem,parceiro,tipo_imovel,fase_obra,zoho_contact_id,criado_em&order=atualizado_em.desc&limit=300`);
    await registrarAcesso(eu.user_id, "comercial:clientes");
    return { clientes };
  }
  if (!post && a === "clientes" && b) {
    exigir(eu, VER);
    const c = await clienteVisivel(eu, b);
    const [orcamentos, oportunidades, historico] = await Promise.all([
      servico(`/rest/v1/comercial_orcamentos?cliente_id=eq.${b}&estado=neq.substituido&select=${ORC_COLS}&order=atualizado_em.desc&limit=100`),
      servico(`/rest/v1/registros?setor_id=eq.vendas&dados->>cliente_ref=eq.${encodeURIComponent(c.codigo)}&select=id,tipo,titulo,estado,valor::text,atualizado_em&order=atualizado_em.desc&limit=50`),
      servico(`/rest/v1/clientes_historico?cliente_id=eq.${b}&select=acao,detalhe,usuario,em&order=id.desc&limit=50`),
    ]);
    const pids = orcamentos.map((o: any) => o.pedido_id).filter(Boolean);
    const pedidos = pids.length ? await servico(`/rest/v1/pedidos?id=in.(${pids.join(",")})&select=id,numero,estado,valor_total,criado_em`) : [];
    await registrarAcesso(eu.user_id, `cliente:${b}`);
    const { criado_por: _c, ...cliente } = c;
    return { cliente, orcamentos, pedidos, oportunidades, historico };
  }
  if (post && a === "clientes" && b === "zoho" && partes[3]) {
    exigir(eu, CADASTRAR);
    const zid = partes[3];
    if (!ZID_RE.test(zid)) throw new HttpError(400, "contato inválido");
    const [ja] = await servico(`/rest/v1/clientes?zoho_contact_id=eq.${zid}&select=id,codigo,criado_por`);
    if (ja && (await visivel(eu, ja.criado_por))) return { id: ja.id, codigo: ja.codigo, repetido: true };
    const [z] = await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.contacts&zoho_id=eq.${zid}&select=dados`);
    if (!z) throw new HttpError(404, "contato não encontrado no espelho do Zoho");
    const { dados, erros } = normalizarCliente(clienteDoZoho(z.dados));
    // contato antigo sem telefone/e-mail: cadastra assim mesmo (a pessoa completa depois)
    const graves = erros.filter((e: string) => !/pelo menos um contato/.test(e));
    if (graves.length) throw new HttpError(400, graves.join(" "));
    return await salvarCliente(eu, chave, { ...dados, zoho_contact_id: zid });
  }
  if (post && a === "clientes") {
    exigir(eu, CADASTRAR);
    const { dados, erros } = normalizarCliente(corpo, { parcial: Boolean(b) });
    if (erros.length) throw new HttpError(400, erros.join(" "));
    if (b) { await clienteVisivel(eu, b); await registrarAcesso(eu.user_id, `cliente:${b}`, "edicao"); }
    if (!b && dados.documento) {
      const [dup] = await servico(`/rest/v1/clientes?documento=eq.${dados.documento}&select=id,codigo,nome,criado_por`);
      if (dup && (await visivel(eu, dup.criado_por))) throw new HttpError(400, `já existe o cliente ${dup.codigo} (${dup.nome}) com este CPF/CNPJ`);
    }
    return await salvarCliente(eu, chave, dados, b ?? null);
  }

  // ---------------------------------------------------------------- orcamentos antigos do Zoho
  if (!post && a === "retomar" && !b) {
    exigir(eu, VER);
    const busca = limparBusca(new URL(req.url).searchParams.get("busca"));
    const f = busca ? `&or=(nome.ilike.*${encodeURIComponent(busca)}*,dados->>customer_name.ilike.*${encodeURIComponent(busca)}*)` : "";
    const [est, retomados] = await Promise.all([
      servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&dados->>status=in.(draft,sent,expired,declined)${f}&select=zoho_id,numero:dados->>estimate_number,data:dados->>date,status:dados->>status,cliente:dados->>customer_name,cliente_id:dados->>customer_id,total:dados->>total&order=dados->>date.desc&limit=300`),
      servico(`/rest/v1/comercial_orcamentos?referencia=like.Zoho*&select=referencia,numero,estado${await filtroAutor(eu)}&limit=2000`),
    ]);
    const por = new Map(retomados.map((r: any) => [String(r.referencia).replace(/^Zoho\s+/, ""), r]));
    return { orcamentos: est.map((e: any) => ({ ...e, total: Number(e.total) || 0, retomado: por.get(e.numero) ?? null })) };
  }
  if (!post && a === "retomar" && b) {
    exigir(eu, VER);
    if (!ZID_RE.test(b)) throw new HttpError(400, "orçamento inválido");
    const [orc] = await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&zoho_id=eq.${b}&select=dados,detalhe_em`);
    if (!orc) throw new HttpError(404, "orçamento não encontrado no espelho do Zoho");
    if (!orc.detalhe_em) throw new HttpError(409, "a ficha completa deste orçamento ainda não foi copiada do Zoho; tente em alguns minutos");
    const e = orc.dados;
    const linhas = (e.line_items ?? []) as Record<string, any>[];
    const ids = [...new Set(linhas.map((l) => l.item_id).filter(Boolean))] as string[];
    const lista = ids.map((x) => `"${x}"`).join(",");
    const [itensZoho, vinculos] = ids.length ? await Promise.all([
      servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=in.(${lista})&select=zoho_id,tipo:dados->>product_type,compra:dados->>purchase_rate,unidade:dados->>unit`),
      servico(`/rest/v1/produto_vinculos_zoho?zoho_item_id=in.(${lista})&situacao=in.(confirmado,a_revisar)&select=zoho_item_id,situacao,produto:produtos(id,codigo,nome,custo_ultimo,preco_venda,unidade)`),
    ]) : [[], []];
    const zi = new Map(itensZoho.map((x: any) => [x.zoho_id, x]));
    const vi = new Map<string, any>();
    for (const v of vinculos) if (!vi.has(v.zoho_item_id) || v.situacao === "confirmado") vi.set(v.zoho_item_id, v);
    await registrarAcesso(eu.user_id, `zoho:estimate:${b}`);
    return {
      numero: e.estimate_number, data: e.date, status: e.status, cliente_nome: e.customer_name, cliente_zoho_id: e.customer_id ?? null, total: Number(e.total) || 0,
      desconto: Number(e.discount_total) || 0, notas: [e.notes, e.terms].filter(Boolean).join("\n\n"),
      itens: linhas.sort((x, y) => Number(x.item_order) - Number(y.item_order)).map((l) => {
        const z: any = l.item_id ? zi.get(l.item_id) : null;
        const v: any = l.item_id ? vi.get(l.item_id) : null;
        const tipo = (l.product_type ?? z?.tipo) === "service" ? "servico" : "produto";
        const custoZoho = Number(z?.compra) > 0 ? Number(z.compra) : null;
        return {
          secao: (l.header_name ?? "").trim() || "Geral", tipo, nome: String(l.name || l.description || "Item").slice(0, 300), descricao: (l.description ?? "").trim(),
          quantidade: Number(l.quantity) || 1, unidade: l.unit || z?.unidade || "", preco_antigo: Number(l.rate) || 0, item_id: l.item_id ?? null,
          custo_zoho: custoZoho, produto: v?.produto ? { ...v.produto, vinculo: v.situacao } : null,
        };
      }),
    };
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
    const [cliente] = orcamento.cliente_id ? await servico(`/rest/v1/clientes?id=eq.${orcamento.cliente_id}&select=id,codigo,tipo,nome,documento,contato_nome,telefone,email,cidade,uf,endereco_obra,aceita_contato`) : [null];
    const historico = await servico(`/rest/v1/comercial_orcamentos_historico?orcamento_id=eq.${b}&select=acao,detalhe,em&order=id.desc&limit=30`);
    const versoes = await servico(`/rest/v1/comercial_orcamentos?serie=eq.${orcamento.serie}&select=id,numero,versao,estado,valor_total,criado_em&order=versao.desc`);
    return { orcamento, itens, cliente: cliente ?? null, historico, versoes };
  }
  if (post && a === "orcamentos" && !b) {
    exigir(eu, COMERCIAL);
    const clienteNome = texto(corpo.cliente_nome, 200);
    if (!clienteNome) throw new HttpError(400, "informe o cliente");
    if (!MONEY_RE.test(String(corpo.valor_total)) || Number(corpo.valor_total) <= 0) throw new HttpError(400, "preço negociado inválido");
    const itens = validarItensOrcamento(corpo.itens);
    const substitui = texto(corpo.substitui, 36);
    if (substitui && !UUID_RE.test(substitui)) throw new HttpError(400, "orçamento anterior inválido");
    const clienteId = texto(corpo.cliente_id, 36);
    if (clienteId) await clienteVisivel(eu, clienteId);
    const validade = texto(corpo.validade, 10);
    if (validade && !DATA_RE.test(validade)) throw new HttpError(400, "validade inválida (AAAA-MM-DD)");
    const r = await servico("/rest/v1/rpc/orcamento_veos_criar", { method: "POST", body: JSON.stringify({ p: {
      cliente_id: clienteId, validade, prazo_execucao: texto(corpo.prazo_execucao, 300),
      chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, cliente_nome: clienteNome, cliente_zoho_id: texto(corpo.cliente_zoho_id, 40),
      referencia: texto(corpo.referencia, 300), condicao: texto(corpo.condicao, 300), valor_total: Number(corpo.valor_total).toFixed(2),
      desconto: corpo.desconto !== undefined && corpo.desconto !== null ? Number(corpo.desconto).toFixed(2) : null,
      resumo: corpo.resumo && typeof corpo.resumo === "object" ? corpo.resumo : {}, observacao: texto(corpo.observacao, 2000), substitui, itens,
    } }) });
    return r;
  }
  throw new HttpError(404, "rota inexistente");
}
