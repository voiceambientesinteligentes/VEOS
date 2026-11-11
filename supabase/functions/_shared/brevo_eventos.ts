// AVISOS DA BREVO -> VEOS (funcao "brevo"). Cada aviso (entregue, aberto, clique, voltou, bloqueado, spam,
// descadastro, adiado) vira uma linha em email_eventos (o mesmo aviso repetido pela Brevo nao conta duas vezes) e
// atualiza a mensagem da caixa de saida (achada pela etiqueta veos-<id> ou pelo id do envio):
//   - voltou/bloqueado/spam/descadastro: o endereco entra na lista de bloqueio e os rascunhos para ele sao descartados;
//   - spam/descadastro: os toques de cadencia do registro sao cancelados;
//   - voltou/bloqueado e spam: tarefa para quem enviou (no Hoje e no chat da IA) com o que fazer.
// O corpo do aviso e DADO de terceiro: so serve para achar a mensagem e carimbar data/contagem.
// deno-lint-ignore-file no-explicit-any
import { servico } from "./banco.ts";
import { BLOQUEIAM, mensagemDoEventoBrevo, normalizarIdBrevo, quandoDoEventoBrevo, tipoDoEventoBrevo } from "./dominio/brevo.js";
import { emailValido } from "./dominio/web_contatos.js";

const COLUNAS = "id,estado,via,destinatario,assunto,setor_id,registro_id,enviada_por,criado_por,aberturas,cliques,entregue_em,aberta_em,clicada_em,devolvida_em,spam_em,tipo";
const minimo = { "Content-Type": "application/json", Prefer: "return=minimal" };

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function acharMensagem(ev: any, pid: string | null) {
  const id = mensagemDoEventoBrevo(ev);
  if (id) {
    const [m] = await servico(`/rest/v1/mensagens_saida?id=eq.${id}&select=${COLUNAS}`);
    if (m) return m;
  }
  if (pid) {
    const [m] = await servico(`/rest/v1/mensagens_saida?via=eq.brevo&provedor_id=eq.${encodeURIComponent(pid)}&select=${COLUNAS}&limit=1`);
    if (m) return m;
  }
  return null;
}

async function tarefa(m: any, chave: string, origem: string, titulo: string, hoje: string) {
  await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ setor_id: m.setor_id ?? "vendas", titulo: titulo.slice(0, 240), prazo: hoje, origem, registro_id: m.registro_id, responsavel: m.enviada_por ?? null, chave, criado_por: m.enviada_por ?? m.criado_por }) })
    .catch((e) => console.error("brevo: tarefa", chave, e));
}

async function aplicar(m: any, tipo: string, quando: string, ev: any, email: string | null, agora: number) {
  const motivoBrevo = String(ev?.reason ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  const patch: Record<string, unknown> = { ultimo_evento: tipo, ultimo_evento_em: quando };
  if (tipo === "entregue" && !m.entregue_em) patch.entregue_em = quando;
  if (tipo === "aberto") { patch.aberturas = (m.aberturas ?? 0) + 1; if (!m.aberta_em) patch.aberta_em = quando; }
  if (tipo === "clique") { patch.cliques = (m.cliques ?? 0) + 1; if (!m.clicada_em) patch.clicada_em = quando; }
  if ((tipo === "voltou" || tipo === "bloqueado") && !m.devolvida_em) patch.devolvida_em = quando;
  if (tipo === "spam" && !m.spam_em) patch.spam_em = quando;
  if (["voltou", "bloqueado", "erro"].includes(tipo)) patch.erro_envio = `${BLOQUEIAM[tipo as keyof typeof BLOQUEIAM] ?? "erro na Brevo"}${motivoBrevo ? ` (${motivoBrevo})` : ""}`.slice(0, 300);
  // "aberto/clique" depois de "voltou" nao apaga o carimbo do problema: so o ultimo evento muda
  await servico(`/rest/v1/mensagens_saida?id=eq.${m.id}`, { method: "PATCH", headers: minimo, body: JSON.stringify(patch) });

  const motivo = BLOQUEIAM[tipo as keyof typeof BLOQUEIAM];
  if (!motivo) return;
  const destino = (email && emailValido(email) ? email : String(m.destinatario ?? "").trim().toLowerCase()) || null;
  const usuario = m.enviada_por ?? m.criado_por;
  if (usuario) {
    await servico("/rest/v1/mensagens_historico", { method: "POST", headers: minimo, body: JSON.stringify({ mensagem_id: m.id, acao: tipo, detalhe: { via: "brevo", evento: String(ev?.event ?? "").slice(0, 40), motivo: motivoBrevo || null }, usuario }) })
      .catch((e) => console.error("brevo: historico", e));
  }
  if (destino) {
    await servico("/rest/v1/contatos_bloqueio?on_conflict=contato", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ contato: destino, canal: "email", motivo: `${motivo} (aviso da Brevo)`.slice(0, 300), registrado_por: null }) }).catch((e) => console.error("brevo: bloqueio", e));
    await servico(`/rest/v1/mensagens_saida?destinatario=ilike.${encodeURIComponent(destino)}&estado=eq.rascunho`, { method: "PATCH", headers: minimo,
      body: JSON.stringify({ estado: "descartada", motivo_descarte: `não enviar: ${motivo}` }) }).catch(() => {});
  }
  const iso = new Date(agora).toISOString();
  if ((tipo === "spam" || tipo === "descadastro") && m.registro_id) {
    await servico(`/rest/v1/tarefas?registro_id=eq.${m.registro_id}&origem=like.cadencia:*&estado=eq.aberta`, { method: "PATCH", headers: minimo, body: JSON.stringify({ estado: "cancelada", concluida_em: iso }) }).catch(() => {});
  }
  const hoje = new Date(agora).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const quem = destino ?? "o destinatário";
  if (tipo === "voltou" || tipo === "bloqueado") {
    await tarefa(m, `EMAIL:${m.id}:voltou`, "email:voltou", tipo === "voltou"
      ? `O e-mail para ${quem} voltou (o endereço não existe). Procure outro contato e atualize o cadastro.`
      : `A Brevo não entregou o e-mail para ${quem} (endereço bloqueado por ela). Procure outro contato.`, hoje);
  } else if (tipo === "spam") {
    await tarefa(m, `EMAIL:${m.id}:spam`, "email:spam", `${quem} marcou o e-mail "${String(m.assunto ?? "").slice(0, 80)}" como spam: contato bloqueado. Revise o texto antes da próxima prospecção.`, hoje);
  } else if (tipo === "descadastro") {
    await tarefa(m, `EMAIL:${m.id}:saida`, "email:saida", `${quem} pediu para não receber mais e-mails (já bloqueado). Atualize o cadastro se for o caso.`, hoje);
  }
}

/** Registra os avisos recebidos e aplica na caixa de saida. */
export async function processarEventosBrevo(eventos: unknown[], agora = Date.now()) {
  let gravados = 0, repetidos = 0, sem_mensagem = 0, ignorados = 0;
  for (const ev of eventos as any[]) {
    if (!ev || typeof ev !== "object" || !ev.event) { ignorados++; continue; }
    const tipo = tipoDoEventoBrevo(ev.event);
    const pid = normalizarIdBrevo(ev["message-id"] ?? ev.messageId ?? ev.message_id);
    const email = String(ev.email ?? "").trim().toLowerCase().slice(0, 200) || null;
    const quando = quandoDoEventoBrevo(ev, agora);
    const m = await acharMensagem(ev, pid);
    const chave = await sha256(`brevo|${pid ?? ""}|${tipo}|${quando}|${email ?? ""}|${String(ev.link ?? "").slice(0, 300)}`);
    const novo = await servico("/rest/v1/email_eventos?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({ chave, provedor: "brevo", mensagem_id: m?.id ?? null, provedor_id: pid, evento: tipo, original: String(ev.event).slice(0, 40), email,
        detalhe: String(ev.reason ?? ev.link ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null, ocorrido_em: quando }) });
    if (!Array.isArray(novo) || !novo.length) { repetidos++; continue; }
    gravados++;
    if (!m) { sem_mensagem++; continue; }
    await aplicar(m, tipo, quando, ev, email, agora);
  }
  return { gravados, repetidos, sem_mensagem, ignorados };
}
