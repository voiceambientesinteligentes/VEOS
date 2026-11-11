// BREVO: envio de e-mail pelo VEOS (sem DOM). Regras puras usadas pela tela Integracoes, pelo servidor (copiado
// para supabase/functions/_shared/dominio) e pelos testes.
// Por que a Brevo (decisao do Fernando, 11/11/2026): plano gratis de 300 e-mails por dia sem cartao, API simples e
// AVISOS de cada e-mail (entregue, aberto, clique, voltou, spam, descadastro) por webhook. O Gmail continua servindo
// para LER as respostas (elas chegam no Gmail) e a agenda, e pode enviar tambem.
// Limite conhecido: sem dominio proprio, a Brevo troca o remetente @gmail.com por um endereco dela (...@brevosend.com).
// O nome "VOICE Ambientes Inteligentes" aparece e as respostas voltam para o Gmail (replyTo). Com dominio proprio
// autenticado na Brevo (pendencia CIO-07) o remetente passa a ser o da VOICE.

export const LINKS_BREVO = {
  cadastro: "https://onboarding.brevo.com/account/register",
  chaves: "https://app.brevo.com/settings/keys/api",
  ips: "https://app.brevo.com/security/authorised_ips",
  remetentes: "https://app.brevo.com/senders/list",
};

/** Passo a passo mostrado na tela (o servidor confere a conta e o remetente e liga os avisos ao conectar). */
export const PASSOS_BREVO = [
  "Crie a conta grátis na Brevo (botão “Abrir a Brevo”). O jeito mais rápido é “Cadastrar com o Google”, com o Gmail da VOICE.",
  "Complete o cadastro que a Brevo pede (seu nome, empresa VOICE Ambientes Inteligentes, endereço e celular). Se ela mandar um código por e-mail ou SMS, confirme.",
  "Gere a chave: menu com o seu nome (canto de cima) → SMTP e API → aba Chaves de API → Gerar uma nova chave de API → nome VEOS → copie (começa com xkeysib-).",
  "Desligue o bloqueio de IP: menu com o seu nome → Segurança → IPs autorizados → desative o bloqueio de IPs desconhecidos. O servidor do VEOS muda de IP; com o bloqueio ligado, a Brevo recusa o envio.",
  "Cole a chave aqui e clique em Conectar. O VEOS confere a conta e o remetente e liga os avisos de entregue, aberto, voltou e spam.",
];

/** Chave de API da Brevo (v3) com formato plausivel. */
export function chaveBrevoValida(chave) {
  return /^xkeysib-[A-Za-z0-9-]{20,200}$/.test(String(chave ?? "").trim());
}

/** A chave SMTP (xsmtpsib-) serve para SMTP, nao para a API. */
export function ehChaveSmtpBrevo(chave) {
  return /^xsmtpsib-/i.test(String(chave ?? "").trim());
}

/** Eventos assinados no webhook transacional da Brevo (nomes da API de criacao do webhook). */
export const EVENTOS_WEBHOOK_BREVO = ["delivered", "hardBounce", "softBounce", "blocked", "spam", "invalid", "deferred", "opened", "uniqueOpened", "click", "unsubscribed"];

const MAPA = {
  request: "enviado", sent: "enviado",
  delivered: "entregue",
  opened: "aberto", uniqueopened: "aberto", open: "aberto", proxyopen: "aberto", uniqueproxyopen: "aberto", firstopening: "aberto",
  click: "clique", clicked: "clique",
  hardbounce: "voltou", invalidemail: "voltou", invalid: "voltou",
  blocked: "bloqueado",
  softbounce: "adiado", deferred: "adiado",
  spam: "spam", complaint: "spam",
  unsubscribed: "descadastro", unsubscribe: "descadastro",
  error: "erro",
};

/** Evento da Brevo ("hard_bounce", "unique_opened"... no aviso; "hardBounce" na assinatura) -> tipo do VEOS. */
export function tipoDoEventoBrevo(nome) {
  return MAPA[String(nome ?? "").toLowerCase().replace(/[^a-z]/g, "")] ?? "outro";
}

/** Tipos que poem o endereco na lista de bloqueio (o VEOS nunca mais envia para ele), com o motivo. */
export const BLOQUEIAM = {
  voltou: "o e-mail voltou: o endereço não existe",
  bloqueado: "a Brevo bloqueou o envio (o endereço já tinha voltado, reclamado ou se descadastrado)",
  spam: "marcou o e-mail como spam",
  descadastro: "pediu para não receber mais e-mails (descadastro)",
};

export const ROTULO_EVENTO = {
  enviado: "Saiu", entregue: "Entregue", aberto: "Aberto", clique: "Clicou no link", voltou: "Voltou (endereço não existe)",
  bloqueado: "Bloqueado pela Brevo", adiado: "Entrega adiada", spam: "Marcou como spam", descadastro: "Descadastrou", erro: "Erro na Brevo", outro: "Aviso",
};

/** Id do envio sem os sinais < > (a Brevo devolve "<x@relay>" no envio e "x@relay" no aviso). */
export function normalizarIdBrevo(id) {
  return String(id ?? "").trim().replace(/^<+|>+$/g, "").slice(0, 100) || null;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function etiquetas(ev) {
  const lista = [];
  if (Array.isArray(ev?.tags)) lista.push(...ev.tags);
  if (typeof ev?.tag === "string" && ev.tag) {
    try { const t = JSON.parse(ev.tag); if (Array.isArray(t)) lista.push(...t); else lista.push(ev.tag); } catch { lista.push(ev.tag); }
  }
  return lista.map((x) => String(x ?? ""));
}

/** Id da mensagem do VEOS num aviso da Brevo: etiqueta veos-<uuid> ou cabecalho X-Mailin-custom "veos:<uuid>". */
export function mensagemDoEventoBrevo(ev) {
  for (const t of etiquetas(ev)) {
    const m = /^veos-(.+)$/i.exec(t.trim());
    if (m && UUID.test(m[1])) return UUID.exec(m[1])[0].toLowerCase();
  }
  const custom = String(ev?.["X-Mailin-custom"] ?? ev?.["x-mailin-custom"] ?? ev?.["X-Mailin-Custom"] ?? "");
  const m = /veos:([0-9a-f-]{36})/i.exec(custom);
  return m && UUID.test(m[1]) ? m[1].toLowerCase() : null;
}

/** Quando o evento aconteceu (ISO). ts_epoch (ms ou s), ts_event (s), ts (s) ou date ("2026-11-11 10:00:00", Paris). */
export function quandoDoEventoBrevo(ev, agora = Date.now()) {
  for (const k of ["ts_epoch", "ts_event", "ts"]) {
    const n = Number(ev?.[k]);
    if (Number.isFinite(n) && n > 0) {
      const ms = n < 1e12 ? n * 1000 : n;
      if (ms > 946_684_800_000 && ms < agora + 86_400_000) return new Date(ms).toISOString();
    }
  }
  const d = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(String(ev?.date ?? "").trim());
  if (d) { const t = Date.parse(`${d[1]}T${d[2]}+01:00`); if (Number.isFinite(t)) return new Date(t).toISOString(); }
  return new Date(agora).toISOString();
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function comLinks(trecho) {
  return trecho.split(/(https?:\/\/[^\s<>"']+)/g).map((p, i) => {
    if (i % 2 === 0) return esc(p);
    const [, url, resto] = /^(.*?)([.,;:!?)\]]*)$/.exec(p);
    return `<a href="${esc(url)}">${esc(url)}</a>${esc(resto)}`;
  }).join("");
}

/** HTML simples do e-mail (o texto continua indo junto): paragrafos, quebras de linha e links clicaveis. */
export function htmlDoEmail(texto) {
  const blocos = String(texto ?? "").replace(/\r\n?/g, "\n").trim().split(/\n{2,}/).filter((b) => b.trim());
  const corpo = blocos.map((b) => `<p style="margin:0 0 14px">${comLinks(b).replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:16px"><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1f1f1f;max-width:640px">${corpo}</div></body></html>`;
}

/** Erro da API da Brevo -> {status, texto} em portugues simples (o que fazer). */
export function explicarErroBrevo(status, corpo) {
  const codigo = String(corpo?.code ?? "").toLowerCase();
  const msg = String(corpo?.message ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const tudo = `${codigo} ${msg}`;
  if (/ip address|unrecogni[sz]ed ip|authori[sz]ed[_ ]ips|endere[cç]o ip/i.test(tudo)) return { status: 502, texto: "a Brevo bloqueou o servidor do VEOS pela proteção de IP: na Brevo, menu com o seu nome → Segurança → IPs autorizados → desative o bloqueio de IPs desconhecidos e tente de novo" };
  if (codigo === "account_under_validation" || /under validation|not (yet )?activated|account.*(suspend|blocked)/i.test(msg)) return { status: 409, texto: "a Brevo ainda não liberou a sua conta para envio (conta nova em validação ou com cadastro incompleto): termine o perfil na Brevo e aguarde; enquanto isso, envie pelo Gmail" };
  if (status === 401 || codigo === "unauthorized" || /key not found|api-key|authentication failed|invalid api key/i.test(tudo)) return { status: 502, texto: "a Brevo recusou a chave de API (apagada, desativada ou copiada pela metade): gere outra em SMTP e API → Chaves de API e conecte de novo" };
  if (codigo === "not_enough_credits" || status === 402 || /insufficient credits|not enough credits/i.test(tudo)) return { status: 429, texto: "acabou a cota de envios da Brevo (plano grátis: 300 por dia); o restante fica para amanhã ou vai pelo Gmail" };
  if (status === 429) return { status: 429, texto: "a Brevo pediu para esperar (muitos envios seguidos); tente de novo em um minuto" };
  if (/sender/i.test(msg) && /(not valid|invalid|inactive|not verified|does not exist|not exist|unverified)/i.test(msg)) return { status: 409, texto: "o remetente ainda não foi confirmado na Brevo: em Integrações → Brevo, digite o código que a Brevo mandou para o seu e-mail (ou confirme o remetente no site da Brevo)" };
  if (codigo === "permission_denied" || status === 403) return { status: 502, texto: `a Brevo negou a permissão${msg ? `: ${msg}` : ""}` };
  if (codigo === "duplicate_parameter" && /sender/i.test(msg)) return { status: 409, texto: "esse remetente já existe na Brevo: confirme-o no site da Brevo (Remetentes) e clique em Testar" };
  return { status: status >= 500 ? 502 : 400, texto: `Brevo: ${msg || codigo || `erro ${status}`}` };
}

/** Remetente para enviar: o ativo com o e-mail da conta; senao o primeiro ativo; senao o da conta (inativo). */
export function remetentePadrao(senders, emailConta) {
  const lista = (Array.isArray(senders) ? senders : []).map((s) => ({ id: s.id ?? null, nome: String(s.name ?? "").slice(0, 70), email: String(s.email ?? "").toLowerCase(), ativo: s.active === true }));
  const conta = String(emailConta ?? "").toLowerCase();
  return lista.find((s) => s.ativo && s.email === conta) ?? lista.find((s) => s.ativo) ?? lista.find((s) => s.email === conta) ?? null;
}

/** Resumo do plano da conta (GET /account). */
export function planoDaBrevo(plan) {
  const p = (Array.isArray(plan) ? plan : []).find((x) => x?.type && x.type !== "sms") ?? null;
  if (!p) return null;
  const tipo = { free: "grátis", payAsYouGo: "créditos avulsos", subscription: "assinatura" }[p.type] ?? p.type;
  return { tipo, creditos: Number.isFinite(Number(p.credits)) ? Number(p.credits) : null, texto: `plano ${tipo}${Number.isFinite(Number(p.credits)) ? ` · ${Number(p.credits)} envios disponíveis` : ""}` };
}

/** Nome e preposicao de cada caminho de envio (para a tela e a fala). */
export const VIAS_EMAIL = {
  brevo: { via: "brevo", nome: "Brevo", pelo: "pela Brevo" },
  gmail: { via: "gmail", nome: "Gmail", pelo: "pelo Gmail" },
};

/**
 * Por onde sai o e-mail. pedido (gmail|brevo) manda, se estiver ligado; resposta a uma conversa do Gmail sai pelo
 * Gmail (fica na mesma conversa); depois o padrao escolhido em Integracoes; senao a Brevo; senao o Gmail.
 * Devolve "brevo", "gmail" ou null (nada ligado).
 */
export function escolherViaEmail({ gmail = false, brevo = false, padrao = null, pedido = null, responderA = null } = {}) {
  if (pedido === "gmail" || pedido === "brevo") return (pedido === "gmail" ? gmail : brevo) ? pedido : null;
  if (responderA && gmail) return "gmail";
  if (padrao === "gmail" && gmail) return "gmail";
  if (padrao === "brevo" && brevo) return "brevo";
  if (brevo) return "brevo";
  if (gmail) return "gmail";
  return null;
}
