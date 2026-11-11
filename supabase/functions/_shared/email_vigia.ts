// VIGIA DAS RESPOSTAS DE E-MAIL (roda na varredura da funcao "saude", a cada 10 min): para os e-mails enviados pelo
// VEOS nos ultimos 30 dias sem resposta, pergunta a ponte do Gmail se chegou mensagem de outra pessoa na conversa.
// E-mail que saiu pela BREVO: a resposta chega no Gmail numa conversa nova, entao a ponte busca o remetente (o mesmo
// endereco, ou o dominio da empresa) depois da data do envio. Sem o Gmail conectado nao ha como ver as respostas.
//   - resposta normal: marca a mensagem como respondida (quem, quando, trecho) e cria a tarefa "Responder ..." para
//     quem enviou, no setor da mensagem, para hoje (aparece no Hoje, no Radar e no chat da IA);
//   - pedido para sair ("SAIR", "nao tenho interesse", "me remova"...): o contato entra na lista de bloqueio, os
//     rascunhos para ele sao descartados e os toques de cadencia ligados ao registro sao cancelados.
// Cada conversa e conferida no maximo a cada 20 minutos nos 3 primeiros dias e a cada 3 horas depois (cota do Google).
// deno-lint-ignore-file no-explicit-any
import { servico } from "./banco.ts";
import { chamarPonte, ponteLigada } from "./google.ts";
import { pedidoDeSaida } from "./dominio/web_contatos.js";
import { buscaDeResposta } from "./dominio/ponte_google.js";

const DIA = 86_400_000;
const CAMPOS = "id,via,thread_id,enviada_em,destinatario,assunto,setor_id,registro_id,enviada_por,criado_por,tipo";

export async function vigiarEmails(agora = Date.now()) {
  const ponte = await ponteLigada().catch(() => null);
  if (!ponte) return { pulado: "Gmail não conectado" };
  const iso = (ms: number) => encodeURIComponent(new Date(ms).toISOString());
  const base = `/rest/v1/mensagens_saida?via=in.(gmail,brevo)&estado=eq.enviada&respondida_em=is.null&select=${CAMPOS}&order=conferida_em.asc.nullsfirst`;
  // recentes (ate 3 dias): a cada 20 min; mais velhas (ate 30 dias): a cada 3 horas
  const [recentes, velhas]: any[][] = await Promise.all([
    servico(`${base}&enviada_em=gt.${iso(agora - 3 * DIA)}&or=(conferida_em.is.null,conferida_em.lt.${iso(agora - 20 * 60_000)})&limit=40`),
    servico(`${base}&enviada_em=gt.${iso(agora - 30 * DIA)}&enviada_em=lte.${iso(agora - 3 * DIA)}&or=(conferida_em.is.null,conferida_em.lt.${iso(agora - 3 * 3_600_000)})&limit=20`),
  ]);
  // Gmail: pela conversa; Brevo: busca do remetente no Gmail (sem endereco valido nao ha o que buscar)
  const todas = [...recentes, ...velhas].slice(0, 40).map((m) => ({ ...m, busca: m.thread_id ? null : buscaDeResposta(m.destinatario, m.enviada_em) }));
  const ms = todas.filter((m) => m.thread_id || m.busca);
  const semComo = todas.filter((m) => !m.thread_id && !m.busca).map((m) => m.id);
  if (semComo.length) await servico(`/rest/v1/mensagens_saida?id=in.(${semComo.join(",")})`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ conferida_em: new Date(agora).toISOString() }) });
  if (!ms.length) return { conferidas: 0 };
  const r = await chamarPonte("respostas", { threads: ms.map((m) => (m.thread_id ? { chave: m.id, thread_id: m.thread_id, desde: m.enviada_em } : { chave: m.id, busca: m.busca, desde: m.enviada_em })) }, ponte, 60_000);
  // a ponte v2 devolve a chave (id da mensagem); a v1 so o thread_id
  const porChave = new Map<string, any>();
  for (const c of r.conversas ?? []) porChave.set(String(c.chave ?? c.thread_id), c);
  const achar = (m: any) => porChave.get(m.id) ?? (m.thread_id ? porChave.get(m.thread_id) : undefined);
  const agoraIso = new Date(agora).toISOString();
  const hoje = new Date(agora).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  let respondidas = 0, saidas = 0;
  for (const m of ms) {
    const c: any = achar(m);
    if (!c || c.erro || !c.respostas) continue;
    respondidas++;
    const trecho = String(c.trecho ?? "").replace(/\s+\n/g, "\n").trim().slice(0, 600);
    // e-mail da Brevo: a conversa da resposta no Gmail vira a conversa da mensagem (para responder nela)
    await servico(`/rest/v1/mensagens_saida?id=eq.${m.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ respondida_em: c.ultima_em ?? agoraIso, resposta_de: String(c.de ?? "").slice(0, 300) || null, resposta_trecho: trecho || null, conferida_em: agoraIso,
        ...(!m.thread_id && /^[A-Za-z0-9_-]{6,100}$/.test(String(c.thread_id ?? "")) ? { thread_id: c.thread_id } : {}) }) });
    await servico("/rest/v1/mensagens_historico", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ mensagem_id: m.id, acao: "respondida", detalhe: { de: c.de, em: c.ultima_em }, usuario: m.enviada_por ?? m.criado_por }) }).catch(() => {});
    const destino = String(m.destinatario ?? "").toLowerCase();
    if (pedidoDeSaida(trecho)) {
      saidas++;
      if (destino) {
        await servico("/rest/v1/contatos_bloqueio?on_conflict=contato", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ contato: destino, canal: "email", motivo: `respondeu pedindo para sair: "${trecho.slice(0, 120)}"`, registrado_por: null }) }).catch((e) => console.error("bloqueio", e));
        await servico(`/rest/v1/mensagens_saida?destinatario=ilike.${encodeURIComponent(destino)}&estado=eq.rascunho`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ estado: "descartada", motivo_descarte: "o contato pediu para não receber mensagens" }) }).catch(() => {});
      }
      if (m.registro_id) {
        await servico(`/rest/v1/tarefas?registro_id=eq.${m.registro_id}&origem=like.cadencia:*&estado=eq.aberta`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ estado: "cancelada", concluida_em: agoraIso }) }).catch(() => {});
      }
      await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ setor_id: m.setor_id ?? "vendas", titulo: `${c.de ?? destino} pediu para não receber mais mensagens (já bloqueado). Atualize o cadastro se for o caso.`.slice(0, 240), prazo: hoje, origem: "email:saida", registro_id: m.registro_id, responsavel: m.enviada_por ?? null, chave: `EMAIL:${m.id}:saida`, criado_por: m.enviada_por ?? m.criado_por }) }).catch((e) => console.error("tarefa de saida", e));
      continue;
    }
    await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ setor_id: m.setor_id ?? "vendas", titulo: `Responder ${c.de ?? destino}: ${m.assunto ?? "(sem assunto)"}`.slice(0, 240), prazo: hoje, origem: "email:resposta", registro_id: m.registro_id, responsavel: m.enviada_por ?? null, chave: `EMAIL:${m.id}:resposta`, criado_por: m.enviada_por ?? m.criado_por }) }).catch((e) => console.error("tarefa de resposta", e));
  }
  // as que nao tiveram resposta: marca a conferencia (a proxima so daqui a 20 min ou 3 h)
  const semResposta = ms.filter((m) => { const c: any = achar(m); return !c || c.erro || !c.respostas; }).map((m) => m.id);
  if (semResposta.length) await servico(`/rest/v1/mensagens_saida?id=in.(${semResposta.join(",")})`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ conferida_em: agoraIso }) });
  return { conferidas: ms.length, respondidas, pediram_para_sair: saidas };
}
