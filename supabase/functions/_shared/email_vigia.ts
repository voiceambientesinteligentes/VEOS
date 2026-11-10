// VIGIA DAS RESPOSTAS DE E-MAIL (roda na varredura da funcao "saude", a cada 10 min): para os e-mails enviados pelo
// VEOS nos ultimos 30 dias sem resposta, pergunta a ponte do Gmail se chegou mensagem de outra pessoa na conversa.
//   - resposta normal: marca a mensagem como respondida (quem, quando, trecho) e cria a tarefa "Responder ..." para
//     quem enviou, no setor da mensagem, para hoje (aparece no Hoje, no Radar e no chat da IA);
//   - pedido para sair ("SAIR", "nao tenho interesse", "me remova"...): o contato entra na lista de bloqueio, os
//     rascunhos para ele sao descartados e os toques de cadencia ligados ao registro sao cancelados.
// Cada conversa e conferida no maximo a cada 20 minutos.
// deno-lint-ignore-file no-explicit-any
import { servico } from "./banco.ts";
import { chamarPonte, ponteLigada } from "./google.ts";
import { pedidoDeSaida } from "./dominio/web_contatos.js";

const DIA = 86_400_000;

export async function vigiarEmails(agora = Date.now()) {
  const ponte = await ponteLigada().catch(() => null);
  if (!ponte) return { pulado: "Gmail não conectado" };
  const desde = new Date(agora - 30 * DIA).toISOString();
  const conferir = new Date(agora - 20 * 60_000).toISOString();
  const ms: any[] = await servico(`/rest/v1/mensagens_saida?via=eq.gmail&estado=eq.enviada&respondida_em=is.null&thread_id=not.is.null&enviada_em=gt.${encodeURIComponent(desde)}&or=(conferida_em.is.null,conferida_em.lt.${encodeURIComponent(conferir)})&select=id,thread_id,enviada_em,destinatario,assunto,setor_id,registro_id,enviada_por,criado_por,tipo&order=conferida_em.asc.nullsfirst&limit=40`);
  if (!ms.length) return { conferidas: 0 };
  const r = await chamarPonte("respostas", { threads: ms.map((m) => ({ thread_id: m.thread_id, desde: m.enviada_em })) }, ponte, 60_000);
  const porThread = new Map((r.conversas ?? []).map((c: any) => [c.thread_id, c]));
  const agoraIso = new Date(agora).toISOString();
  const hoje = new Date(agora).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  let respondidas = 0, saidas = 0;
  for (const m of ms) {
    const c: any = porThread.get(m.thread_id);
    if (!c || c.erro || !c.respostas) continue;
    respondidas++;
    const trecho = String(c.trecho ?? "").replace(/\s+\n/g, "\n").trim().slice(0, 600);
    await servico(`/rest/v1/mensagens_saida?id=eq.${m.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ respondida_em: c.ultima_em ?? agoraIso, resposta_de: String(c.de ?? "").slice(0, 300) || null, resposta_trecho: trecho || null, conferida_em: agoraIso }) });
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
  // as que nao tiveram resposta: marca a conferencia (a proxima so daqui a 20 min)
  const semResposta = ms.filter((m) => { const c: any = porThread.get(m.thread_id); return !c || c.erro || !c.respostas; }).map((m) => m.id);
  if (semResposta.length) await servico(`/rest/v1/mensagens_saida?id=in.(${semResposta.join(",")})`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ conferida_em: agoraIso }) });
  return { conferidas: ms.length, respondidas, pediram_para_sair: saidas };
}
