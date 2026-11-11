// Cliente da BREVO (envio de e-mail; plano gratis de 300 por dia). A chave de API, o remetente e o segredo do
// webhook ficam CIFRADOS em integracoes_segredos ('brevo'); nada disso volta ao navegador. Regras puras (eventos,
// erros, HTML do e-mail, escolha do remetente) em _shared/dominio/brevo.js (copia de apps/web/js/domain/brevo.js).
// deno-lint-ignore-file no-explicit-any
import { HttpError, URL_BASE, servico } from "./banco.ts";
import { gravarIntegracao, lerIntegracao } from "./integracoes.ts";
import { segredoAleatorio } from "./cifra.ts";
import { EVENTOS_WEBHOOK_BREVO, explicarErroBrevo, htmlDoEmail, normalizarIdBrevo, planoDaBrevo, remetentePadrao } from "./dominio/brevo.js";

const API = "https://api.brevo.com/v3";
export const NOME_REMETENTE = "VOICE Ambientes Inteligentes";

export type Remetente = { id: number | null; nome: string; email: string; ativo: boolean };
export type Brevo = { chave: string; remetente: Remetente | null; webhook: { id: number | null; segredo: string } | null; conta: string | null };

/** Brevo conectada (ou null). */
export async function brevoLigada(): Promise<Brevo | null> {
  const i = await lerIntegracao("brevo");
  if (!i || i.situacao !== "conectado" || !i.dados?.chave) return null;
  return { chave: i.dados.chave, remetente: i.dados.remetente ?? null, webhook: i.dados.webhook ?? null, conta: i.conta };
}

/** Brevo pronta para ENVIAR: conectada e com o remetente confirmado. */
export async function brevoPronta(): Promise<Brevo | null> {
  const b = await brevoLigada().catch(() => null);
  return b && b.remetente?.ativo && b.remetente.email ? b : null;
}

/** Chama a API v3 da Brevo. Erros viram HttpError com orientacao em portugues simples. */
export async function chamarBrevo(chave: string, metodo: string, rota: string, corpo?: unknown, timeout = 30_000): Promise<any> {
  let r: Response;
  try {
    r = await fetch(`${API}${rota}`, {
      method: metodo,
      headers: { "api-key": chave, accept: "application/json", ...(corpo === undefined ? {} : { "content-type": "application/json" }) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (e) {
    throw new HttpError(504, `a Brevo não respondeu (${(e as Error).message}); tente de novo em instantes`);
  }
  const texto = await r.text();
  let d: any = null;
  try { d = texto ? JSON.parse(texto) : null; } catch { d = { message: texto.slice(0, 200) }; }
  if (!r.ok) {
    console.error("brevo", metodo, rota, r.status, texto.slice(0, 300));
    const e = explicarErroBrevo(r.status, d);
    throw new HttpError(e.status, e.texto);
  }
  return d;
}

/** Endereco dos avisos (webhook): a funcao "brevo" com o segredo no caminho (a Brevo nao manda JWT). */
export const BASE_WEBHOOK = `${URL_BASE}/functions/v1/brevo/`;
const urlDoWebhook = (segredo: string) => `${BASE_WEBHOOK}${segredo}`;

/** Envia um e-mail 1:1 (texto + HTML simples). Etiqueta veos-<id> e X-Mailin-custom ligam os avisos a mensagem. */
export async function enviarPelaBrevo(b: Brevo, e: { id: string; para: string; assunto: string; texto: string; responderPara?: string | null; nome?: string; tipo?: string }) {
  if (!b.remetente?.email || !b.remetente.ativo) throw new HttpError(409, "o remetente da Brevo ainda não foi confirmado: em Integrações → Brevo, digite o código que a Brevo mandou para o seu e-mail");
  const nome = (e.nome ?? NOME_REMETENTE).slice(0, 70);
  const r = await chamarBrevo(b.chave, "POST", "/smtp/email", {
    sender: { email: b.remetente.email, name: nome },
    to: [{ email: e.para }],
    ...(e.responderPara ? { replyTo: { email: e.responderPara, name: nome } } : {}),
    subject: e.assunto || "(sem assunto)",
    textContent: e.texto,
    htmlContent: htmlDoEmail(e.texto),
    tags: ["veos", `veos-${e.id}`, ...(e.tipo ? [e.tipo] : [])],
    headers: { "X-Mailin-custom": `veos:${e.id}` },
  }, 45_000);
  return { id: normalizarIdBrevo(r?.messageId ?? r?.messageIds?.[0]) };
}

/** Webhook transacional do VEOS na conta (cria ou atualiza o que ja existe). Devolve o id ou o erro (nao derruba). */
async function ligarAvisos(chave: string, segredo: string): Promise<{ id: number | null; erro: string | null }> {
  const corpo = { url: urlDoWebhook(segredo), description: "VEOS — avisos dos e-mails (entregue, aberto, voltou, spam)", events: EVENTOS_WEBHOOK_BREVO };
  try {
    const lista = await chamarBrevo(chave, "GET", "/webhooks?type=transactional");
    const meu = (lista?.webhooks ?? []).find((w: any) => String(w?.url ?? "").startsWith(BASE_WEBHOOK));
    if (meu?.id) {
      await chamarBrevo(chave, "PUT", `/webhooks/${meu.id}`, corpo);
      return { id: Number(meu.id), erro: null };
    }
    const novo = await chamarBrevo(chave, "POST", "/webhooks", { ...corpo, type: "transactional" });
    return { id: novo?.id != null ? Number(novo.id) : null, erro: novo?.id != null ? null : "a Brevo não devolveu o número do aviso" };
  } catch (e) {
    return { id: null, erro: (e as Error).message };
  }
}

/** Le a conta e o remetente na Brevo e grava a integracao. criarRemetente: cria o remetente com o e-mail da conta. */
export async function conectarBrevo(chave: string, usuario: string | null, { criarRemetente = true } = {}) {
  const conta = await chamarBrevo(chave, "GET", "/account");
  const emailConta = String(conta?.email ?? "").trim().toLowerCase();
  const senders = (await chamarBrevo(chave, "GET", "/senders"))?.senders ?? [];
  let remetente: Remetente | null = remetentePadrao(senders, emailConta);
  let codigoEnviado = false;
  // nenhum remetente: cria com o e-mail da conta (a Brevo manda um codigo de 6 digitos para esse e-mail)
  if (!remetente && emailConta && criarRemetente) {
    const novo = await chamarBrevo(chave, "POST", "/senders", { name: NOME_REMETENTE, email: emailConta });
    remetente = { id: novo?.id != null ? Number(novo.id) : null, nome: NOME_REMETENTE, email: emailConta, ativo: false };
    codigoEnviado = true;
  }
  const atual = await lerIntegracao("brevo", { semCache: true });
  const segredo = atual?.dados?.webhook?.segredo ?? segredoAleatorio(32);
  const avisos = await ligarAvisos(chave, segredo);
  const plano = planoDaBrevo(conta?.plan);
  const detalhe = !remetente ? "nenhum remetente na Brevo: crie um em Remetentes, no site da Brevo"
    : !remetente.ativo ? `remetente ${remetente.email} aguardando o código de confirmação que a Brevo mandou para esse e-mail`
    : avisos.erro ? `avisos (entregue, aberto, voltou) não ligados: ${avisos.erro}` : null;
  await gravarIntegracao("brevo", { chave, remetente, webhook: { id: avisos.id, segredo }, plano, empresa: String(conta?.companyName ?? "").slice(0, 120) || null },
    { conta: emailConta.slice(0, 200) || null, situacao: "conectado", detalhe: detalhe?.slice(0, 300) ?? null, usuario });
  return { conta: emailConta, empresa: conta?.companyName ?? null, plano, remetente, codigo_enviado: codigoEnviado, avisos: avisos.id != null, aviso_erro: avisos.erro };
}

/** Confirma o remetente com o codigo de 6 digitos que a Brevo mandou para o e-mail dele. */
export async function confirmarRemetente(codigo: string, usuario: string | null) {
  const b = await brevoLigada();
  if (!b) throw new HttpError(409, "conecte a Brevo primeiro");
  if (!b.remetente?.id) throw new HttpError(409, "o VEOS não tem o número do remetente: confirme o remetente no site da Brevo (Remetentes) e clique em Atualizar");
  if (!/^\d{6}$/.test(codigo)) throw new HttpError(400, "o código tem 6 números");
  await chamarBrevo(b.chave, "PUT", `/senders/${b.remetente.id}/validate`, { otp: Number(codigo) });
  return await conectarBrevo(b.chave, usuario, { criarRemetente: false });
}

/** Desliga: apaga o aviso (webhook) na conta. Nao derruba se a Brevo nao responder. */
export async function desligarAvisos(b: Brevo | null) {
  if (!b?.chave || !b.webhook?.id) return;
  await chamarBrevo(b.chave, "DELETE", `/webhooks/${b.webhook.id}`).catch((e) => console.error("brevo: apagar webhook", e));
}

/** Situacao para a tela (sem a chave). */
export async function situacaoBrevo() {
  const i = await lerIntegracao("brevo");
  if (!i) return { conectado: false, pronta: false };
  const r = i.dados?.remetente ?? null;
  const [ultimo] = await servico("/rest/v1/email_eventos?provedor=eq.brevo&select=evento,recebido_em&order=recebido_em.desc&limit=1").catch(() => []);
  return {
    conectado: i.situacao === "conectado", pronta: i.situacao === "conectado" && Boolean(r?.ativo && r?.email),
    conta: i.conta, empresa: i.dados?.empresa ?? null, conectado_em: i.conectado_em, detalhe: i.detalhe,
    remetente: r ? { nome: r.nome, email: r.email, ativo: Boolean(r.ativo) } : null,
    avisos: i.dados?.webhook?.id != null, plano: i.dados?.plano ?? null,
    ultimo_aviso: ultimo ? { evento: ultimo.evento, em: ultimo.recebido_em } : null,
  };
}
