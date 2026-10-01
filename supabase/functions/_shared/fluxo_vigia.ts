// Vigia do fluxo vivo: olha pedidos, estoque, parcelas, notas e orcamentos aceitos no Zoho e
// mantem os alertas FLX_* (novos, atualizados, resolvidos sozinhos) com tarefas e rascunhos.
// Roda depois de cada acao do fluxo e na varredura automatica.
import { servico } from "./banco.ts";
import { CATALOGO } from "./setores/catalogo.ts";
import { exposicao } from "./regras/caixa.ts";
import { centesimos, pctTexto } from "./regras/dinheiro.ts";

type Sev = "INFO" | "MEDIO" | "ALTO" | "CRITICO";
type Tarefa = { titulo: string; papel: string; prazo: string };
type Alvo = { chave: string; setor: string; sentinela: string; severidade: Sev; titulo: string; mensagem: string; fonte: string; notificar: string[]; rascunhos: unknown[]; tarefas: Tarefa[] };
type Obj = Record<string, any>;

const DIA = 86_400_000;
const dia = (t: number) => new Date(t).toISOString().slice(0, 10);
export const brl = (v: number | string) => `R$ ${Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const dataBR = (iso: string) => String(iso).slice(0, 10).split("-").reverse().join("/");
const FONTE = "Fluxo vivo do VEOS (pedido → estoque → parcelas → NF)";

function modelo(setor: string, id: string, vars: Record<string, string>) {
  const s = (CATALOGO as unknown as { id: string; modelos: { id: string; tipo: string; assunto: string; corpo: string }[] }[]).find((x) => x.id === setor);
  const m = s?.modelos.find((x) => x.id === id);
  if (!m) return [];
  const troca = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
  return [{ modelo: m.id, tipo: m.tipo, assunto: troca(m.assunto), corpo: troca(m.corpo) }];
}

export async function vigiarFluxo(agora = Date.now()) {
  const hoje = dia(agora);
  const [faltas, parcelas, entregues, confirmados, aceitos, pedidosOrc, contas, compras, ativos, recebidas, compromissos]: Obj[][] = await Promise.all([
    servico("/rest/v1/rpc/fluxo_faltas_compra", { method: "POST", body: "{}" }),
    servico(`/rest/v1/parcelas?estado=eq.aberta&vencimento=lte.${dia(agora + 3 * DIA)}&select=id,numero,vencimento,valor,pedido:pedidos(id,numero,cliente_nome,estado)&limit=1000`),
    servico(`/rest/v1/pedidos?estado=eq.entregue&entregue_em=lt.${new Date(agora - 2 * DIA).toISOString()}&select=id,numero,cliente_nome,valor_total,entregue_em&limit=500`),
    servico(`/rest/v1/pedidos?estado=eq.confirmado&confirmado_em=lt.${new Date(agora - 15 * DIA).toISOString()}&select=id,numero,cliente_nome,confirmado_em&limit=500`),
    servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&dados->>status=eq.accepted&dados->>date=gte.${dia(agora - 30 * DIA)}&select=zoho_id,nome,data:dados->>date,total:dados->>total&limit=500`),
    servico("/rest/v1/pedidos?orcamento_zoho_id=not.is.null&estado=neq.cancelado&select=orcamento_zoho_id&limit=5000"),
    servico(`/rest/v1/contas_pagar?estado=eq.aberta&vencimento=lte.${dia(agora + 3 * DIA)}&select=id,descricao,fornecedor,vencimento,valor&limit=1000`),
    servico(`/rest/v1/compras?estado=in.(aberta,parcial)&previsao_entrega=lt.${hoje}&select=id,numero,fornecedor_nome,previsao_entrega&limit=500`),
    servico("/rest/v1/pedidos?estado=in.(confirmado,entregue,faturado)&select=id,numero,cliente_nome,valor_total&limit=2000"),
    servico("/rest/v1/parcelas?estado=eq.recebida&select=pedido_id,valor,valor_recebido&limit=10000"),
    servico("/rest/v1/contas_pagar?estado=neq.cancelada&pedido_id=not.is.null&select=pedido_id,valor&limit=10000"),
  ]);
  const alvos = new Map<string, Alvo>();
  const add = (a: Omit<Alvo, "fonte" | "rascunhos" | "tarefas" | "notificar"> & Partial<Alvo>) =>
    alvos.set(a.chave, { fonte: FONTE, rascunhos: [], tarefas: [], notificar: [], ...a });

  // 1. estoque insuficiente para pedido confirmado (um alerta por pedido)
  const porPedido = new Map<string, { numero: string; cliente: string; itens: string[]; sem_compra: boolean; compras: Set<string> }>();
  for (const f of faltas) {
    const p = porPedido.get(f.pedido_id) ?? { numero: f.numero, cliente: f.cliente_nome, itens: [], sem_compra: false, compras: new Set<string>() };
    const coberto = Number(f.em_compra) >= Number(f.falta);
    p.itens.push(`${f.nome}: faltam ${Number(f.falta)}${Number(f.em_compra) > 0 ? ` (em compra: ${Number(f.em_compra)})` : ""}`);
    if (!coberto) p.sem_compra = true;
    for (const c of String(f.compras ?? "").split(", ").filter(Boolean)) p.compras.add(c);
    porPedido.set(f.pedido_id, p);
  }
  for (const [id, p] of porPedido) {
    if (!p.sem_compra) {
      add({ chave: `FLX_ESTOQUE_INSUFICIENTE:${id}`, setor: "operacoes", sentinela: "FLX_ESTOQUE_INSUFICIENTE", severidade: "INFO",
        titulo: `Pedido ${p.numero} aguardando a compra ${[...p.compras].join(", ")}`,
        mensagem: `Pedido ${p.numero} (${p.cliente}): ${p.itens.join("; ")}. Ao receber a mercadoria em Compras, a reserva é completada sozinha.` });
      continue;
    }
    add({ chave: `FLX_ESTOQUE_INSUFICIENTE:${id}`, setor: "operacoes", sentinela: "FLX_ESTOQUE_INSUFICIENTE", severidade: "ALTO",
      titulo: `Estoque insuficiente para o pedido ${p.numero}`,
      mensagem: `Pedido ${p.numero} (${p.cliente}) confirmado sem estoque suficiente. ${p.itens.join("; ")}. Compre e registre a entrada no Estoque: a reserva é completada sozinha.`,
      notificar: ["COO", "comprador"],
      tarefas: [{ titulo: `Comprar itens do pedido ${p.numero}: ${p.itens.join("; ")}`.slice(0, 240), papel: "comprador", prazo: dia(agora + DIA) }] });
  }
  // 2. parcelas vencidas / vencendo em ate 3 dias
  for (const x of parcelas) {
    if (!x.pedido || x.pedido.estado === "cancelado") continue;
    const vencida = x.vencimento < hoje;
    const dias = Math.round(Math.abs(Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${x.vencimento}T00:00:00Z`)) / DIA);
    add({ chave: `${vencida ? "FLX_PARCELA_VENCIDA" : "FLX_PARCELA_VENCENDO"}:${x.id}`, setor: "financas",
      sentinela: vencida ? "FLX_PARCELA_VENCIDA" : "FLX_PARCELA_VENCENDO", severidade: vencida ? "ALTO" : "INFO",
      titulo: vencida ? `Parcela ${x.numero} do pedido ${x.pedido.numero} vencida há ${dias} dia(s)` : `Parcela ${x.numero} do pedido ${x.pedido.numero} vence ${dias ? `em ${dias} dia(s)` : "hoje"}`,
      mensagem: `${x.pedido.cliente_nome}: ${brl(x.valor)} com vencimento em ${dataBR(x.vencimento)}. ${vencida ? "Cobre e registre o recebimento no pedido." : "Lembre o cliente."}`,
      notificar: vencida ? ["CFO", "analista_receber"] : [],
      rascunhos: modelo("financas", "whatsapp_lembrete_boleto", { cliente: x.pedido.cliente_nome, parcela: String(x.numero), valor: brl(x.valor), vencimento: dataBR(x.vencimento) }),
      tarefas: vencida ? [{ titulo: `Cobrar parcela ${x.numero} do pedido ${x.pedido.numero} (${x.pedido.cliente_nome})`.slice(0, 240), papel: "analista_receber", prazo: hoje }] : [] });
  }
  // 2b. contas a pagar vencidas / vencendo em ate 3 dias
  for (const k of contas) {
    const vencida = k.vencimento < hoje;
    add({ chave: `${vencida ? "FLX_CONTA_VENCIDA" : "FLX_CONTA_VENCENDO"}:${k.id}`, setor: "financas", sentinela: vencida ? "FLX_CONTA_VENCIDA" : "FLX_CONTA_VENCENDO", severidade: vencida ? "ALTO" : "INFO",
      titulo: `${vencida ? "Conta a pagar vencida" : "Conta a pagar vence"} em ${dataBR(k.vencimento)}: ${k.descricao}`.slice(0, 300),
      mensagem: `${k.fornecedor}: ${brl(k.valor)}. ${vencida ? "Pague ou renegocie e registre em Contas a pagar." : "Programe o pagamento."}`,
      notificar: vencida ? ["CFO", "analista_pagar"] : [],
      tarefas: vencida ? [{ titulo: `Pagar ou renegociar: ${k.descricao} (${k.fornecedor})`.slice(0, 240), papel: "analista_pagar", prazo: hoje }] : [] });
  }
  // 2c. compra com previsao de entrega vencida e ainda nao recebida
  for (const c of compras) {
    add({ chave: `FLX_COMPRA_ATRASADA:${c.id}`, setor: "operacoes", sentinela: "FLX_COMPRA_ATRASADA", severidade: "MEDIO",
      titulo: `Compra ${c.numero} atrasada (${c.fornecedor_nome})`,
      mensagem: `A entrega estava prevista para ${dataBR(c.previsao_entrega)} e não foi registrada. Cobre o fornecedor ou registre o recebimento em Compras.`,
      tarefas: [{ titulo: `Cobrar entrega da compra ${c.numero} (${c.fornecedor_nome})`.slice(0, 240), papel: "comprador", prazo: hoje }] });
  }
  // 2d. caixa do pedido (Politica V1.1): exposicao acima de 10% do contrato exige autorizacao da direcao
  const cents = (v: unknown) => BigInt(Math.round(Number(v ?? 0) * 100));
  const recPorPedido = new Map<string, bigint>(), compPorPedido = new Map<string, bigint>();
  for (const x of recebidas) recPorPedido.set(x.pedido_id, (recPorPedido.get(x.pedido_id) ?? 0n) + cents(x.valor_recebido ?? x.valor));
  for (const x of compromissos) compPorPedido.set(x.pedido_id, (compPorPedido.get(x.pedido_id) ?? 0n) + cents(x.valor));
  for (const p of ativos) {
    if (!compPorPedido.has(p.id)) continue;
    const e = exposicao((recPorPedido.get(p.id) ?? 0n) - compPorPedido.get(p.id)!, cents(p.valor_total));
    if (e.gatilho !== "ACIONADO") continue;
    add({ chave: `FLX_EXPOSICAO_PEDIDO:${p.id}`, setor: "financas", sentinela: "FLX_EXPOSICAO_PEDIDO", severidade: "ALTO",
      titulo: `Exposição de caixa do pedido ${p.numero}: ${e.pct ? pctTexto(centesimos(e.pct)) : "—"} do contrato`,
      mensagem: `${p.cliente_nome}: compromissos superam o recebido em ${brl(Number(e.exposicao) / 100)}. Acima de 10% do valor do pedido exige autorização expressa da direção.`,
      fonte: "Política V1.1 sec.7 e 9", notificar: ["CFO"],
      tarefas: [{ titulo: `Decidir a exposição de caixa do pedido ${p.numero}`, papel: "controller", prazo: hoje }] });
  }
  // 3. entregue sem nota fiscal ha mais de 2 dias
  for (const p of entregues) {
    add({ chave: `FLX_ENTREGUE_SEM_NF:${p.id}`, setor: "financas", sentinela: "FLX_ENTREGUE_SEM_NF", severidade: "MEDIO",
      titulo: `Pedido ${p.numero} entregue sem nota fiscal`,
      mensagem: `Pedido ${p.numero} (${p.cliente_nome}, ${brl(p.valor_total)}) foi entregue em ${dataBR(p.entregue_em)} e ainda não tem NF registrada. Emita a nota e registre no pedido.`,
      notificar: ["analista_fiscal"], tarefas: [{ titulo: `Emitir e registrar a NF do pedido ${p.numero}`, papel: "analista_fiscal", prazo: hoje }] });
  }
  // 4. pedido confirmado ha mais de 15 dias sem entrega
  for (const p of confirmados) {
    add({ chave: `FLX_PEDIDO_PARADO:${p.id}`, setor: "operacoes", sentinela: "FLX_PEDIDO_PARADO", severidade: "MEDIO",
      titulo: `Pedido ${p.numero} confirmado há mais de 15 dias sem entrega`,
      mensagem: `Pedido ${p.numero} (${p.cliente_nome}) confirmado em ${dataBR(p.confirmado_em)}. Verifique compras e agenda de obra e registre a entrega.`,
      tarefas: [{ titulo: `Destravar a entrega do pedido ${p.numero}`, papel: "gerente_obra", prazo: dia(agora + DIA) }] });
  }
  // 5. orcamento aceito no Zoho (ultimos 30 dias) sem pedido no VEOS
  const comPedido = new Set(pedidosOrc.map((x) => x.orcamento_zoho_id));
  for (const o of aceitos) {
    if (comPedido.has(o.zoho_id)) continue;
    add({ chave: `FLX_ORC_ACEITO_SEM_PEDIDO:${o.zoho_id}`, setor: "vendas", sentinela: "FLX_ORC_ACEITO_SEM_PEDIDO", severidade: "MEDIO",
      titulo: `Orçamento aceito sem pedido: ${o.nome}`,
      mensagem: `O orçamento ${o.nome} (${o.total ? brl(o.total) : "valor não informado"}), de ${o.data ? dataBR(o.data) : "—"}, está aceito no Zoho e ainda não virou pedido no VEOS. Crie o pedido para reservar estoque e gerar as parcelas.`,
      tarefas: [{ titulo: `Criar o pedido do orçamento ${o.nome}`.slice(0, 240), papel: "assistente_comercial", prazo: hoje }] });
  }

  return await sincronizarAlertas("FLX_", alvos, agora);
}

/** Sincroniza os alertas de um prefixo (FLX_, BIB_): cria, atualiza, reativa e resolve sozinho. */
export async function sincronizarAlertas(prefixo: string, alvos: Map<string, Alvo>, agora = Date.now()) {
  const hoje = dia(agora);
  const existentes: Obj[] = await servico(`/rest/v1/alertas?sentinela=like.${prefixo}*&select=id,chave,estado,titulo,mensagem&limit=5000`);
  const porChave = new Map(existentes.map((e) => [e.chave, e]));
  const linha = (a: Alvo) => ({ chave: a.chave, setor_id: a.setor, sentinela: a.sentinela, severidade: a.severidade, titulo: a.titulo.slice(0, 300), mensagem: a.mensagem.slice(0, 2000), fonte: a.fonte, registro_id: null, rascunhos: a.rascunhos, notificar: a.notificar });
  const inserir: unknown[] = [], tarefas: unknown[] = [];
  const agoraIso = new Date(agora).toISOString();
  const tarefasDe = (a: Alvo) => a.tarefas.forEach((t, i) => tarefas.push({ setor_id: a.setor, titulo: t.titulo, papel: t.papel, prazo: t.prazo, origem: a.sentinela, chave: `${a.chave}:${i}:${hoje}` }));
  let novos = 0;
  for (const a of alvos.values()) {
    const e = porChave.get(a.chave);
    if (!e) { inserir.push(linha(a)); tarefasDe(a); novos++; continue; }
    if (e.estado === "resolvido") { tarefasDe(a); novos++; }
    if (e.estado === "resolvido" || (e.estado === "ativo" && (e.titulo !== a.titulo || e.mensagem !== a.mensagem))) {
      await servico(`/rest/v1/alertas?id=eq.${e.id}`, { method: "PATCH", body: JSON.stringify({ ...linha(a), estado: "ativo", atualizado_em: agoraIso, resolvido_em: null }) });
    }
  }
  const resolver = existentes.filter((e) => e.estado === "ativo" && !alvos.has(e.chave)).map((e) => e.id);
  if (inserir.length) await servico("/rest/v1/alertas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(inserir) });
  if (resolver.length) await servico(`/rest/v1/alertas?id=in.(${resolver.join(",")})`, { method: "PATCH", body: JSON.stringify({ estado: "resolvido", resolvido_em: agoraIso, atualizado_em: agoraIso }) });
  if (tarefas.length) await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(tarefas) });
  return { ativos: alvos.size, novos, resolvidos: resolver.length };
}

/**
 * Vigia da Biblioteca: pareceres vencidos viram "sem resposta" (nunca aprovacao) e geram alerta
 * para quem conclui; conflitos encaminhados a CEO/fundador ficam visiveis no Radar da direcao.
 */
export async function vigiarBiblioteca(agora = Date.now()) {
  await servico("/rest/v1/rpc/bib_expirar_pareceres", { method: "POST", body: "{}" });
  const [semResposta, encaminhados]: Obj[][] = await Promise.all([
    servico("/rest/v1/biblioteca_pareceres?estado=eq.sem_resposta&select=id,setor_id,participacao,responsavel_conclusao,prazo,registro:biblioteca_registros(id,codigo,titulo,estado)&limit=500"),
    servico("/rest/v1/biblioteca_pareceres?estado=eq.pendente&encaminhamento=not.is.null&select=id,encaminhamento,motivo,registro:biblioteca_registros(id,codigo,titulo)&limit=500"),
  ]);
  const alvos = new Map<string, Alvo>();
  for (const p of semResposta) {
    if (!p.registro || !["rascunho", "em_consulta", "aberta", "em_analise"].includes(p.registro.estado)) continue;
    alvos.set(`BIB_PARECER_SEM_RESPOSTA:${p.id}`, { chave: `BIB_PARECER_SEM_RESPOSTA:${p.id}`, setor: "direcao", sentinela: "BIB_PARECER_SEM_RESPOSTA", severidade: "MEDIO",
      titulo: `Parecer sem resposta: ${p.setor_id} em ${p.registro.codigo}`,
      mensagem: `O setor ${p.setor_id} (${p.participacao}) não respondeu até ${dataBR(p.prazo)} sobre "${p.registro.titulo}". Ausência de resposta NÃO é aprovação: ${p.responsavel_conclusao} decide como concluir (novo prazo, decisão com a informação disponível ou encaminhamento).`,
      fonte: "Biblioteca do VEOS (governança de pareceres)", notificar: [String(p.responsavel_conclusao)], rascunhos: [], tarefas: [] });
  }
  for (const p of encaminhados) {
    if (!p.registro) continue;
    alvos.set(`BIB_CONFLITO_ENCAMINHADO:${p.id}`, { chave: `BIB_CONFLITO_ENCAMINHADO:${p.id}`, setor: "direcao", sentinela: "BIB_CONFLITO_ENCAMINHADO", severidade: p.encaminhamento === "fundador" ? "ALTO" : "MEDIO",
      titulo: `Conflito encaminhado ${p.encaminhamento === "fundador" ? "ao fundador" : "à CEO"}: ${p.registro.codigo}`,
      mensagem: `${p.registro.titulo}. Motivo: ${p.motivo}`, fonte: "Biblioteca do VEOS (encaminhamento de conflitos)", notificar: [p.encaminhamento === "fundador" ? "fundador" : "CEO"], rascunhos: [], tarefas: [] });
  }
  return await sincronizarAlertas("BIB_", alvos, agora);
}
