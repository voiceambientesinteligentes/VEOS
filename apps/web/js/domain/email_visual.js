// VISUAL DOS E-MAILS da VOICE (sem DOM). Monta o HTML (cabecalho com o logotipo, texto, cartoes de produto com foto,
// botao do WhatsApp, assinatura e rodape) e a versao em TEXTO com o mesmo conteudo (filtros de spam comparam as duas).
// Usado pelo servidor no envio pela Brevo (copia em supabase/functions/_shared/dominio) e pelos testes.
// Por que (12/11/2026): o 1o e-mail de teste chegou so em texto, sem marca e no lixo eletronico; o Fernando pediu um
// e-mail que converta. Regras: HTML leve (uma imagem de cabecalho, foto so do produto, texto de verdade), tabelas e
// estilo inline (o que Gmail, Outlook e Hotmail aceitam), largura 600, fundo claro e botao que funciona sem imagem.

export const MARCA_EMAIL = Object.freeze({
  nome: "VOICE Ambientes Inteligentes",
  // 1200x260 (exibido 600x130): fundo #080808 com o logotipo do site (letras brancas e o "O" azul). Arquivo em
  // apps/web/email/ (publicado junto com o portal no GitHub Pages).
  cabecalho: "https://voiceambientesinteligentes.github.io/VEOS/email/voice-cabecalho.png",
  site: "https://voiceambientesinteligentes.com",
  site_rotulo: "voiceambientesinteligentes.com",
  whatsapp: "554730561121",
  whatsapp_rotulo: "(47) 3056-1121",
  email: "contato@voiceambientesinteligentes.com",
  cidades: "Balneário Camboriú · Curitiba",
});

const COR = { escuro: "#080808", azul: "#2fa8d5", azul_escuro: "#1a6e8e", creme: "#f5f2ee", texto: "#1f1f1f", suave: "#5b5650", fraco: "#8a837a", borda: "#e6e1da" };
const FONTE = "Arial,Helvetica,sans-serif";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

/** Trecho com os links (http/https) clicaveis, sem levar a pontuacao do fim. */
function comLinks(trecho) {
  return String(trecho).split(/(https?:\/\/[^\s<>"']+)/g).map((p, i) => {
    if (i % 2 === 0) return esc(p);
    const [, url, resto] = /^(.*?)([.,;:!?)\]]*)$/.exec(p);
    return `<a href="${esc(url)}" target="_blank" style="color:${COR.azul_escuro};text-decoration:underline">${esc(url)}</a>${esc(resto)}`;
  }).join("");
}

/** Link do WhatsApp da VOICE (com a mensagem ja escrita para a pessoa, se houver). */
export function linkWhatsApp(mensagem = "") {
  const m = String(mensagem ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  return `https://wa.me/${MARCA_EMAIL.whatsapp}${m ? `?text=${encodeURIComponent(m)}` : ""}`;
}

/** Nome do produto para o cliente: sem o " - Marca Modelo" do fim (o nome interno do catalogo traz o fornecedor). */
export function nomeNaVitrine(nome) {
  const n = String(nome ?? "").replace(/\s+/g, " ").trim();
  const sem = n.replace(/\s+[-–—]\s+[^-–—]{1,60}$/, "").trim();
  return (sem.length >= 6 ? sem : n).slice(0, 120);
}

const SAIR_RE = /palavra SAIR|responda (com )?SAIR|n[aã]o (quiser|quer) (mais )?receber|n[aã]o receber mais|descadastr/i;
// fim de palavra sem \b (o \b do JS nao entende acento: "Olá," falharia)
const FECHO_RE = /^(abra[cç]os?|abs|um abra[cç]o|grande abra[cç]o|atenciosamente|att|cordialmente|obrigad[oa]s?|muito obrigad[oa]|at[eé] (breve|logo|mais)|sauda[cç][oõ]es|boa semana|bom trabalho)(?=[\s,.;:!]|$)/i;
// "VOICE Ambientes Inteligentes", "Equipe VOICE" ou "Fernando — VOICE Ambientes Inteligentes" (o nome vem junto)
const EMPRESA_RE = /^(?:([^—–|]{2,40}?)\s+[—–|-]\s+)?(?:equipe\s+)?VOICE\b[^.!?]*$/i;
const CONTATO_RE = /(\d{4,5}[-\s]?\d{4}|wa\.me|whats ?app|https?:|www\.|@|\.com\b|instagram)/i;
const NOME_RE = /^[A-ZÀ-Ý][\p{L}'’.-]*(\s+(d[aeo]s?|[A-ZÀ-Ý][\p{L}'’.-]*)){0,4}$/u;
const SAUDACAO_RE = /^(ol[aá]|oi|bom dia|boa tarde|boa noite|prezad[oa]s?|car[oa]s?|ei)(?=[\s,.;:!]|$).{0,50}$/i;

/**
 * Separa o texto do e-mail em corpo, assinatura (nome, cargo e linhas extras) e a linha de "sair" (vai para o rodape).
 * Assinatura: a ultima linha "VOICE ..." (nas 6 ultimas) e ate 2 linhas curtas logo acima (nome e cargo); sem ela,
 * a ultima linha com cara de nome logo depois de um fecho ("Abraço,"). Contatos escritos a mao saem (o bloco
 * padrao ja traz WhatsApp e site).
 */
export function separarPartes(texto) {
  const linhas = String(texto ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/, ""));
  let saida = null;
  for (let i = linhas.length - 1; i >= Math.max(0, linhas.length - 8); i--) {
    if (SAIR_RE.test(linhas[i]) && linhas[i].trim().length <= 220) {
      saida = linhas[i].trim();
      linhas.splice(i, 1);
      while (i - 1 >= 0 && /^\s*[—–-]{1,3}\s*$/.test(linhas[i - 1])) { linhas.splice(i - 1, 1); i--; }
      break;
    }
  }
  while (linhas.length && !linhas[linhas.length - 1].trim()) linhas.pop();
  let fim = linhas.length;
  let nome = null, cargo = null, empresa = -1, junto = null;
  for (let i = linhas.length - 1; i >= Math.max(0, linhas.length - 6); i--) {
    const m = EMPRESA_RE.exec(linhas[i].trim());
    if (m) { empresa = i; junto = m[1] && !CONTATO_RE.test(m[1]) ? m[1].trim() : null; break; }
  }
  if (empresa >= 0 && junto) {
    nome = junto;
    fim = empresa;
  } else if (empresa >= 0) {
    const acima = [];
    let j = empresa - 1;
    while (j >= 0 && acima.length < 2) {
      const l = linhas[j].trim();
      if (!l || l.length > 60 || /[.!?:;,]$/.test(l) || FECHO_RE.test(l) || CONTATO_RE.test(l)) break;
      acima.unshift(l);
      j--;
    }
    nome = acima[0] ?? null;
    cargo = acima[1] ?? null;
    fim = j + 1;
  } else if (linhas.length >= 2) {
    const ult = linhas[linhas.length - 1].trim();
    const ant = linhas[linhas.length - 2].trim();
    if (ult.length <= 40 && NOME_RE.test(ult) && FECHO_RE.test(ant)) { nome = ult; fim = linhas.length - 1; }
  }
  const extras = empresa >= 0 ? linhas.slice(empresa + 1).map((l) => l.trim()).filter((l) => l && !CONTATO_RE.test(l)).slice(0, 2) : [];
  const resto = linhas.slice(0, fim);
  while (resto.length && !resto[resto.length - 1].trim()) resto.pop();
  // "Abraço,\nFernando\n\nFernando\nVOICE...": o nome repetido no fim do corpo sai (fica so na assinatura)
  if (nome && resto.length && resto[resto.length - 1].trim().toLowerCase() === nome.toLowerCase()) resto.pop();
  while (resto.length && !resto[resto.length - 1].trim()) resto.pop();
  // o fecho ("Abraço,") vai junto da assinatura, depois do produto e do botao
  let fecho = null;
  if (resto.length > 1 && resto[resto.length - 1].trim().length <= 40 && FECHO_RE.test(resto[resto.length - 1].trim())) fecho = resto.pop().trim();
  const corpo = resto.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { corpo, fecho, nome, cargo, extras, saida };
}

/** Texto que aparece ao lado do assunto na caixa de entrada: o 1o paragrafo que nao e so a saudacao. */
export function previaDoEmail(corpo) {
  const blocos = String(corpo ?? "").split(/\n{2,}/).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
  const b = blocos.find((x) => !(x.length <= 60 && SAUDACAO_RE.test(x))) ?? blocos[0] ?? "";
  if (b.length <= 120) return b;
  const corte = b.slice(0, 120);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(" "), 80))}…`;
}

function cartao(p) {
  const foto = p.foto
    ? `<tr><td align="center" style="padding:22px 22px 6px"><img src="${esc(p.foto)}" width="240" alt="${esc(p.titulo)}" style="display:block;width:240px;max-width:100%;height:auto;border:0;border-radius:6px"></td></tr>`
    : "";
  const destaque = p.destaque ? `<div style="font-size:15px;line-height:23px;color:${COR.suave};padding-top:8px">${esc(p.destaque)}</div>` : "";
  return `<tr><td style="padding:6px 36px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COR.borda};border-radius:8px;border-collapse:separate">
${foto}<tr><td align="center" style="padding:${p.foto ? "10px" : "22px"} 24px 22px;font-family:${FONTE};text-align:center">
<div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:${COR.azul_escuro};font-weight:bold">Em destaque</div>
<div style="font-size:18px;line-height:25px;color:${COR.escuro};font-weight:bold;padding-top:6px">${esc(p.titulo)}</div>
${destaque}</td></tr>
</table>
</td></tr>`;
}

/**
 * E-mail pronto para enviar: {html, texto, previa}. produtos: [{titulo, destaque?, foto?}] (foto ja publica).
 * tipo "interna" (aviso para a propria VOICE) sai sem o botao do WhatsApp.
 */
export function montarEmail({ texto, assunto = "", tipo = "avulsa", produtos = [], titulo = "", chamada = null } = {}) {
  const M = MARCA_EMAIL;
  const { corpo, fecho, nome, cargo, extras, saida } = separarPartes(texto);
  const itens = (Array.isArray(produtos) ? produtos : [])
    .map((p) => ({ titulo: String(p?.titulo ?? "").replace(/\s+/g, " ").trim().slice(0, 120), destaque: String(p?.destaque ?? "").replace(/\s+/g, " ").trim().slice(0, 220) || null, foto: /^https:\/\/[^\s"'<>]+$/.test(String(p?.foto ?? "")) ? p.foto : null }))
    .filter((p) => p.titulo)
    .slice(0, 3);
  const comBotao = tipo !== "interna";
  const tituloLimpo = String(titulo ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const rotuloBotao = String(chamada?.rotulo ?? "").replace(/\s+/g, " ").trim().slice(0, 40) || "Conversar no WhatsApp";
  const wa = linkWhatsApp(chamada?.mensagem ? chamada.mensagem : itens.length === 1 ? `Olá! Vi no e-mail da VOICE: ${itens[0].titulo}. Quero saber mais.` : "Olá! Recebi o e-mail da VOICE e quero conversar.");
  const previa = previaDoEmail(corpo);

  // ---- versao em texto (mesmo conteudo do HTML)
  const partes = [tituloLimpo, corpo].filter(Boolean);
  if (itens.length) partes.push(itens.map((p) => `• ${p.titulo}${p.destaque ? ` — ${p.destaque}` : ""}`).join("\n"));
  if (comBotao) partes.push(`${rotuloBotao}: ${wa}\n(ou é só responder este e-mail)`);
  partes.push([fecho, nome, cargo, M.nome, ...extras, `WhatsApp ${M.whatsapp_rotulo} · ${M.site_rotulo}`].filter(Boolean).join("\n"));
  if (saida) partes.push(`—\n${saida}`);
  const textoFinal = partes.filter(Boolean).join("\n\n");

  // ---- HTML
  const paragrafos = corpo.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
    .map((b) => `<p style="margin:0 0 18px">${comLinks(b).replace(/\n/g, "<br>")}</p>`).join("\n");
  const botao = comBotao ? `<tr><td align="center" style="padding:14px 36px 6px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
<td align="center" bgcolor="${COR.azul_escuro}" style="background-color:${COR.azul_escuro};border-radius:6px">
<a href="${esc(wa)}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONTE};font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px">${esc(rotuloBotao)}</a>
</td></tr></table>
<div style="font-family:${FONTE};font-size:13px;line-height:20px;color:${COR.suave};padding-top:10px">ou é só responder este e-mail</div>
</td></tr>` : "";
  const negrito = `font-size:16px;line-height:23px;font-weight:bold;color:${COR.escuro}`;
  const assinatura = `<tr><td style="padding:26px 36px 32px">
${fecho ? `<p style="margin:0 0 14px;font-family:${FONTE};font-size:16px;line-height:26px;color:${COR.texto}">${esc(fecho)}</p>\n` : ""}<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-left:3px solid ${COR.azul};padding:2px 0 2px 14px;font-family:${FONTE};font-size:14px;line-height:21px;color:${COR.suave}">
${nome ? `<div style="${negrito}">${esc(nome)}</div>\n` : ""}${cargo ? `<div>${esc(cargo)}</div>\n` : ""}<div${nome ? "" : ` style="${negrito}"`}>${esc(M.nome)}</div>
${extras.map((x) => `<div>${esc(x)}</div>\n`).join("")}<div><a href="${esc(linkWhatsApp())}" target="_blank" style="color:${COR.azul_escuro};text-decoration:none">WhatsApp ${esc(M.whatsapp_rotulo)}</a> &middot; <a href="${esc(M.site)}" target="_blank" style="color:${COR.azul_escuro};text-decoration:none">${esc(M.site_rotulo)}</a></div>
</td></tr></table>
</td></tr>`;
  const rodape = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td align="center" style="padding:18px 24px 6px;font-family:${FONTE};font-size:12px;line-height:18px;color:${COR.fraco}">
${esc(M.nome)} &middot; ${esc(M.cidades)}<br>
<a href="${esc(M.site)}" target="_blank" style="color:${COR.fraco};text-decoration:underline">${esc(M.site_rotulo)}</a> &middot; <a href="mailto:${esc(M.email)}" style="color:${COR.fraco};text-decoration:underline">${esc(M.email)}</a>${saida ? `<br><br>${esc(saida)}` : ""}
</td></tr>
</table>`;
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(assunto || M.nome)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${COR.creme}">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${esc(previa)}${"&#847;&zwnj;&nbsp;".repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COR.creme}" style="background-color:${COR.creme}">
<tr><td align="center" style="padding:24px 12px 28px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;background-color:#ffffff;border:1px solid ${COR.borda};border-radius:10px;border-collapse:separate">
<tr><td bgcolor="${COR.escuro}" style="background-color:${COR.escuro};border-radius:9px 9px 0 0;font-size:0;line-height:0">
<a href="${esc(M.site)}" target="_blank" style="text-decoration:none"><img src="${esc(M.cabecalho)}" width="600" height="130" alt="VOICE Ambientes Inteligentes" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:9px 9px 0 0;color:#ffffff;font-family:${FONTE};font-size:20px;font-weight:bold"></a>
</td></tr>
<tr><td bgcolor="${COR.azul}" height="3" style="background-color:${COR.azul};height:3px;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 36px 10px;font-family:${FONTE};font-size:16px;line-height:26px;color:${COR.texto}">
${tituloLimpo ? `<div style="margin:0 0 18px;font-family:${FONTE};font-size:24px;line-height:31px;font-weight:bold;color:${COR.escuro}">${esc(tituloLimpo)}</div>
<div style="width:48px;height:3px;background-color:${COR.azul};margin:0 0 22px;font-size:0;line-height:0">&nbsp;</div>
` : ""}${paragrafos}
</td></tr>
${itens.map(cartao).join("\n")}
${botao}
${assinatura}
</table>
<!--[if mso]></td></tr></table><![endif]-->
${rodape}
</td></tr>
</table>
</body>
</html>`;
  return { html, texto: textoFinal, previa };
}
