// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/web_contatos.js - nao editar a mao.
// PESQUISA NA WEB E CONTATOS DE EMPRESAS (sem DOM e sem rede: testavel). O servidor busca as paginas
// (_shared/web.ts); aqui ficam as regras:
//   - endereco publico (nada de rede interna, usuario/senha na URL ou porta estranha);
//   - leitura dos resultados do DuckDuckGo (versao HTML, sem chave);
//   - texto e metadados da pagina; e-mails, telefones do Brasil, WhatsApp e redes do site;
//   - escolha do melhor e-mail (o do dominio do site primeiro) e o nome da empresa;
//   - rodape "sair" dos e-mails de prospeccao e deteccao do pedido de saida na resposta.
// So dados publicos de EMPRESAS (B2B, legitimo interesse com opcao de sair). Instagram, LinkedIn,
// Facebook e Google NAO sao lidos (regras deles e BIB-0107): aparecem so como link.

const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");

// ---------------------------------------------------------------- endereco publico
const PRIVADO_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^19[89]\.1[89]\./, /^2(2[4-9]|[3-5]\d)\./];
const HOST_INTERNO = /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp|invalid|test|example|onion|arpa)$/i;

/** Normaliza e valida um endereco que o servidor pode buscar. Lanca Error com o motivo. */
export function urlPublica(bruto) {
  let u;
  const t = String(bruto ?? "").trim();
  try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`); } catch { throw new Error("endereço inválido"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("só endereços http ou https");
  if (u.username || u.password) throw new Error("endereço com usuário ou senha não é aceito");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("porta não permitida");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") || host.includes(":")) throw new Error("endereço IPv6 direto não é permitido");
  if (!host.includes(".") || HOST_INTERNO.test(host)) throw new Error("endereço interno não é permitido");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && PRIVADO_V4.some((re) => re.test(host))) throw new Error("endereço de rede interna não é permitido");
  u.hash = "";
  return u.toString();
}

/** Dominio sem "www." (ex.: arqinove.com.br). */
export function dominioDe(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\d?\./, ""); } catch { return ""; }
}

// Portais, redes e diretorios: nao sao o site da empresa (nao extraimos contato deles).
const PORTAIS = /(^|\.)(instagram\.com|facebook\.com|fb\.com|linkedin\.com|youtube\.com|youtu\.be|tiktok\.com|twitter\.com|x\.com|pinterest\.[a-z.]+|threads\.net|whatsapp\.com|wa\.me|google\.[a-z.]+|goo\.gl|bing\.com|duckduckgo\.com|wikipedia\.org|wikimedia\.org|eguias\.net|guiamais\.com\.br|apontador\.com\.br|telelistas\.net|cnpj\.biz|casadosdados\.com\.br|econodata\.com\.br|solutudo\.com\.br|empresaqui\.com\.br|cnpja\.com|consultacnpj\.com|yelp\.[a-z.]+|tripadvisor\.[a-z.]+|houzz\.[a-z.]+|archdaily\.[a-z.]+|habitissimo\.[a-z.]+|getninjas\.com\.br|olx\.com\.br|mercadolivre\.com\.br|reclameaqui\.com\.br|glassdoor\.[a-z.]+|indeed\.[a-z.]+|catho\.com\.br|vagas\.com\.br|infojobs\.com\.br|jusbrasil\.com\.br|issuu\.com|behance\.net|medium\.com|blogspot\.com|wordpress\.com|linktr\.ee|guiadacidade\.[a-z.]+|cylex\.[a-z.]+|hotfrog\.[a-z.]+|encontra[a-z]+\.com\.br|listamais\.com\.br|construct\.com\.br|vivadecora\.com\.br|casacor\.abril\.com\.br)$/i;
export const ehPortal = (url) => PORTAIS.test(dominioDe(url));

// ---------------------------------------------------------------- HTML -> texto
const NOMEADAS = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", copy: "©", reg: "®", ordm: "º", ordf: "ª", deg: "°", middot: "·", bull: "•",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  atilde: "ã", otilde: "õ", Atilde: "Ã", Otilde: "Õ", acirc: "â", ecirc: "ê", ocirc: "ô", Acirc: "Â", Ecirc: "Ê", Ocirc: "Ô",
  agrave: "à", Agrave: "À", ccedil: "ç", Ccedil: "Ç", uuml: "ü", Uuml: "Ü", ntilde: "ñ", Ntilde: "Ñ",
};
export function decodificarEntidades(s) {
  return String(s ?? "").replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NOMEADAS[e] ?? NOMEADAS[e.toLowerCase()] ?? m;
  });
}
const semTags = (s) => decodificarEntidades(String(s ?? "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/** Texto legivel da pagina (sem script/estilo), ate `max` caracteres. */
export function htmlParaTexto(html, max = 8000) {
  const s = String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer|ul|ol|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodificarEntidades(s).replace(/[ \t\f\v ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

/** Titulo, descricao e nome do site (og:site_name) da pagina. */
export function metaDaPagina(html) {
  const h = String(html ?? "").slice(0, 300_000);
  const meta = (nome) => {
    const n = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = h.match(new RegExp(`<meta[^>]+(?:name|property)\\s*=\\s*["']${n}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, "i"))
      ?? h.match(new RegExp(`<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*(?:name|property)\\s*=\\s*["']${n}["']`, "i"));
    return m ? semTags(m[1]) : "";
  };
  const titulo = semTags(h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  return { titulo: titulo.slice(0, 200), descricao: (meta("description") || meta("og:description")).slice(0, 400), site: meta("og:site_name").slice(0, 120) };
}

// ---------------------------------------------------------------- resultados do DuckDuckGo (HTML)
/** Lista {titulo, url, trecho} da pagina de resultados html.duckduckgo.com (anuncios fora). */
export function lerResultadosDuckDuckGo(html) {
  const out = [];
  // corta no PRIMEIRO "result" da classe (nao guloso): o resto da classe (ex.: "result--ad") fica para o filtro de anuncio
  const blocos = String(html ?? "").split(/<div[^>]+?class="[^"]*?\bresult\b/i).slice(1);
  for (const b of blocos) {
    if (/^[^>]*result--ad\b/i.test(b) || /class="[^"]*badge--ad/i.test(b)) continue;
    const a = b.match(/<a[^>]+class="[^"]*\bresult__a\b[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ?? b.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*\bresult__a\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    let url = decodificarEntidades(a[1]);
    const red = url.match(/[?&]uddg=([^&]+)/);
    if (red) { try { url = decodeURIComponent(red[1]); } catch { continue; } }
    if (url.startsWith("//")) url = `https:${url}`;
    if (!/^https?:\/\//i.test(url) || /duckduckgo\.com\/(y\.js|l\/)/i.test(url)) continue;
    const t = b.match(/class="[^"]*\bresult__snippet\b[^"]*"[^>]*>([\s\S]*?)<\/(a|div|td|span)>/i);
    out.push({ titulo: semTags(a[2]).slice(0, 200), url, trecho: t ? semTags(t[1]).slice(0, 400) : "" });
  }
  const vistos = new Set();
  return out.filter((r) => { const k = r.url.replace(/[#?].*$/, "").replace(/\/$/, ""); if (vistos.has(k)) return false; vistos.add(k); return true; });
}

// ---------------------------------------------------------------- contatos da pagina
const EMAIL_RE = /[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}/g;
const EMAIL_OK = /^[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9.-]+\.[a-z]{2,24}$/;
const EMAIL_LIXO = /\.(png|jpe?g|gif|webp|svg|bmp|ico|css|js|woff2?|ttf|mp4|pdf)$|^(no-?reply|nao-?responda|naoresponda|donotreply|do-not-reply|mailer-daemon|postmaster|abuse|webmaster|wordpress|admin@wordpress)@|@(sentry|sentry-next|wixpress|wix|example|exemplo|email|dominio|seudominio|domain|test|teste|mysite|yoursite|site|empresa)\.(com|com\.br|io|net|org)$|^[0-9a-f]{16,}@|@\d+x\.|^(seu|your|nome|name|usuario|user|email|e-mail)@/i;
const WEBMAIL = /@(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|bol|uol|terra|ig|icloud|me|globo|globomail|r7|zipmail|protonmail|proton)\.(com|com\.br|me)$/i;
const DDD = new Set("11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99".split(" "));

/** Telefone brasileiro (com DDD) normalizado ou null: {digitos: "5547999991234", exibir: "(47) 99999-1234", celular}. */
export function telefoneBR(bruto) {
  let d = String(bruto ?? "").replace(/\D/g, "");
  if (d.startsWith("0") && d.length >= 11) d = d.replace(/^0+/, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = d.slice(0, 2), num = d.slice(2);
  if (!DDD.has(ddd)) return null;
  if (num.length === 9 && num[0] !== "9") return null;
  if (num.length === 8 && !/^[2-5]/.test(num)) return null;
  if (/^(\d)\1+$/.test(num)) return null;
  return { digitos: `55${d}`, exibir: `(${ddd}) ${num.slice(0, num.length - 4)}-${num.slice(-4)}`, celular: num.length === 9 };
}

const unicos = (xs) => [...new Set(xs.filter(Boolean))];

/** E-mails, telefones, WhatsApp, redes sociais e paginas de contato encontrados no HTML. */
export function extrairContatos(html, base = "") {
  const h = String(html ?? "");
  let baseUrl = null;
  try { baseUrl = new URL(base); } catch { /* sem base: links relativos ignorados */ }
  const dominio = baseUrl ? dominioDe(baseUrl.href) : "";
  // e-mails (mailto, texto e as formas "contato [arroba] empresa [ponto] com")
  const texto = decodificarEntidades(h)
    .replace(/\s*[[(]\s*(?:at|arroba)\s*[\])]\s*/gi, "@")
    .replace(/\s*[[(]\s*(?:dot|ponto)\s*[\])]\s*/gi, ".");
  const brutos = [];
  for (const m of texto.matchAll(/mailto:([^"'?<>\s]+)/gi)) { try { brutos.push(decodeURIComponent(m[1])); } catch { brutos.push(m[1]); } }
  for (const m of texto.matchAll(EMAIL_RE)) brutos.push(m[0]);
  const emails = unicos(brutos.map((e) => e.trim().toLowerCase().replace(/^[._%+-]+|[._%+-]+$/g, ""))).filter((e) => EMAIL_OK.test(e) && !EMAIL_LIXO.test(e)).slice(0, 12);

  // telefones: links tel:, WhatsApp e texto com DDD entre parenteses ou separado
  const fones = [];
  const whatsapp = [];
  for (const m of h.matchAll(/href=["']tel:([^"']+)["']/gi)) fones.push(m[1]);
  for (const m of h.matchAll(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?(?:[^"']*&)?phone=|whatsapp\.com\/send\/?\?(?:[^"']*&)?phone=)(\+?\d{10,13})/gi)) {
    const t = telefoneBR(m[1]);
    if (t) whatsapp.push(t);
  }
  const visivel = htmlParaTexto(h, 60_000);
  for (const m of visivel.matchAll(/(?:\+?\s?55[\s.-]?)?\(\s*(\d{2})\s*\)\s*(9?\s?\d{4})[\s.-]?(\d{4})\b/g)) fones.push(`${m[1]}${m[2]}${m[3]}`);
  for (const m of visivel.matchAll(/(?:^|[^\d])(?:\+?55[\s.-])?(\d{2})[\s.-](9?\d{4})[\s.-](\d{4})(?!\d)/g)) fones.push(`${m[1]}${m[2]}${m[3]}`);
  const telefones = [];
  const vistos = new Set();
  for (const f of fones) {
    const t = telefoneBR(f);
    if (t && !vistos.has(t.digitos)) { vistos.add(t.digitos); telefones.push(t); }
  }
  const wa = [];
  for (const t of whatsapp) if (!wa.some((x) => x.digitos === t.digitos)) wa.push(t);

  // redes (so o link; nao lemos as redes)
  const rede = (re) => {
    const m = h.match(re);
    return m ? `https://${m[1].replace(/\/+$/, "")}` : null;
  };
  const redes = {
    instagram: rede(/https?:\/\/((?:www\.)?instagram\.com\/(?!p\/|reel\/|explore\/|stories\/|accounts\/|share)[A-Za-z0-9_.]{2,30})\/?["'?#\s<]/i),
    facebook: rede(/https?:\/\/((?:www\.|pt-br\.|m\.)?facebook\.com\/(?!sharer|share|plugins|tr\b|dialog|login)[A-Za-z0-9_.-]{2,60})\/?["'?#\s<]/i),
    linkedin: rede(/https?:\/\/((?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_%-]{2,80})\/?["'?#\s<]/i),
  };

  // paginas de contato do mesmo site
  const paginas = [];
  if (baseUrl) {
    for (const m of h.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
      const alvo = `${m[1]} ${semTags(m[2])}`;
      if (!/contat|contact|fale|atendimento|orcamento|orçamento|sobre|quem-somos|about/i.test(semAcento(alvo))) continue;
      try {
        const u = new URL(decodificarEntidades(m[1]), baseUrl);
        if (!/^https?:$/.test(u.protocol) || dominioDe(u.href) !== dominio) continue;
        u.hash = "";
        paginas.push(u.href);
      } catch { /* link quebrado */ }
    }
  }
  const contatoPrimeiro = unicos(paginas).sort((a, b) => Number(/contat|contact|fale/i.test(b)) - Number(/contat|contact|fale/i.test(a)));
  return { emails, telefones: telefones.slice(0, 6), whatsapp: wa.slice(0, 3), redes, paginas_contato: contatoPrimeiro.slice(0, 4) };
}

/** Junta dois resultados de extrairContatos (pagina inicial + pagina de contato). */
export function juntarContatos(a, b) {
  const por = (xs) => { const m = new Map(); for (const x of xs) m.set(x.digitos, x); return [...m.values()]; };
  return {
    emails: unicos([...(a?.emails ?? []), ...(b?.emails ?? [])]).slice(0, 12),
    telefones: por([...(a?.telefones ?? []), ...(b?.telefones ?? [])]).slice(0, 6),
    whatsapp: por([...(a?.whatsapp ?? []), ...(b?.whatsapp ?? [])]).slice(0, 3),
    redes: { instagram: a?.redes?.instagram ?? b?.redes?.instagram ?? null, facebook: a?.redes?.facebook ?? b?.redes?.facebook ?? null, linkedin: a?.redes?.linkedin ?? b?.redes?.linkedin ?? null },
    paginas_contato: unicos([...(a?.paginas_contato ?? []), ...(b?.paginas_contato ?? [])]).slice(0, 4),
  };
}

const PREFERIDOS = ["contato", "comercial", "atendimento", "orcamento", "orcamentos", "projetos", "projeto", "arquitetura", "studio", "estudio", "escritorio", "ola", "oi", "hello", "info", "contact", "vendas"];
/** Melhor e-mail para falar com a empresa: do dominio do site > webmail do escritorio > outros dominios. */
export function escolherEmail(emails, dominioSite = "") {
  const ds = String(dominioSite ?? "").toLowerCase().replace(/^www\./, "");
  const nota = (e) => {
    const [local, dom] = e.split("@");
    let n = 0;
    if (ds && (dom === ds || dom.endsWith(`.${ds}`) || ds.endsWith(`.${dom}`))) n += 100;
    else if (WEBMAIL.test(e)) n += 40;
    const i = PREFERIDOS.indexOf(semAcento(local).replace(/[^a-z]/g, ""));
    if (i >= 0) n += 30 - i;
    if (/financeiro|cobranca|rh|curriculo|vagas|trabalhe|nfe|fiscal|contabil|privacidade|lgpd|dpo|suporte|sac/.test(local)) n -= 60;
    return n;
  };
  return [...(emails ?? [])].sort((a, b) => nota(b) - nota(a))[0] ?? null;
}

/** Nome da empresa: og:site_name > primeiro pedaco do titulo > dominio. */
export function nomeDaEmpresa(meta = {}, url = "", tituloResultado = "") {
  const generico = /^(home|inicio|início|pagina inicial|página inicial|bem[- ]vindo|welcome|index|site|default|contato)$/i;
  const pedaco = (t) => String(t ?? "").split(/\s+[|–—•·-]\s+|\s+::\s+/).map((x) => x.trim()).filter((x) => x && !generico.test(x) && x.length <= 80);
  const site = String(meta.site ?? "").trim();
  if (site && !generico.test(site)) return site.slice(0, 120);
  const t = pedaco(meta.titulo)[0] ?? pedaco(tituloResultado)[0];
  if (t) return t.slice(0, 120);
  const d = dominioDe(url).split(".")[0] ?? "";
  return d ? d.charAt(0).toUpperCase() + d.slice(1) : "Empresa";
}

// ---------------------------------------------------------------- e-mail: rodape "sair", pedido de saida, modelos
export const RODAPE_SAIR = "Se preferir não receber mais mensagens da VOICE, é só responder com a palavra SAIR.";

/** Acrescenta a linha de "sair" no fim (se o texto ainda nao oferece). */
export function comRodapeSaida(corpo) {
  const t = String(corpo ?? "").trimEnd();
  if (/\b(sair|descadastr\w*|não receber mais|nao receber mais)\b/i.test(t.slice(-400))) return t;
  return `${t}\n\n—\n${RODAPE_SAIR}`;
}

/** A resposta pede para nao receber mais (ou recusa de vez)? */
export function pedidoDeSaida(texto) {
  const linhas = semAcento(texto).toLowerCase().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // so o texto novo (antes da citacao "Em ..., ... escreveu:" ou das linhas com ">")
  const novas = [];
  for (const l of linhas) { if (l.startsWith(">") || /^(em|on) .+(escreveu|wrote):?$/.test(l) || /^-{2,}\s*(mensagem|original)/.test(l)) break; novas.push(l); }
  const t = novas.join(" ").slice(0, 600);
  if (!t) return false;
  return /^(sair|remover|remova|descadastrar|descadastre|parar|pare|stop|unsubscribe|cancelar inscricao)\b[\s.!]*$/.test(t)
    || /\b(nao (quero|desejo|gostaria de) (mais )?receber|nao tenho interesse|sem interesse|pare(m)? de (me )?(enviar|mandar)|me (remova|retire|tire|descadastre)|me (remover|retirar|tirar|descadastrar)|(remover|retirar|tirar|remova|retire|tire)( o meu| meu)? (contato |e-?mail )?(da|de sua|da sua|dessa|desta) (lista|base|mailing)|remova (meu|o meu|esse|este) (e-?mail|contato|endereco)|descadastr\w+|unsubscribe|nao me (envie|mande) mais)\b/.test(t);
}

/** Troca {{nome}}, {{primeiro_nome}}, {{empresa}}... pelos dados; o que faltar sai sem deixar ", !" no texto. */
export function preencherModelo(texto, vars = {}) {
  return String(texto ?? "")
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => String(vars[k.toLowerCase()] ?? "").trim())
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/,\s*([!.?])/g, "$1")
    .replace(/(Olá|Ola|Oi|Prezad[oa]s?|Car[oa]s?)\s*,\s*\n/gi, "$1,\n")
    .replace(/[ \t]{2,}/g, " ");
}

/** E-mail em texto simples: tira a marcacao de Markdown que modelos de IA colocam (**negrito**, # titulo, `codigo`). */
export function limparTextoEmail(t) {
  return String(t ?? "")
    .replace(/\r/g, "")
    // codigo interno do VEOS entre parenteses nao vai para fora: "(PRD-0125)", "(CLI-00012)"
    .replace(/[ \t]*\((?:PRD|CLI|ORV|PED|COM|BIB|FOR|CTR)-[0-9A-Z-]{2,20}\)/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[\s(])\*(\S[^*\n]*?\S|\S)\*(?=[\s).,!?:;]|$)/g, "$1$2")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** O texto promete anexo? (o VEOS ainda nao anexa arquivos ao e-mail) */
export const prometeAnexo = (t) => /\b(em anexo|anexad[oa]s?|segue anexo|seguem anexos?|confira o anexo|no anexo)\b/i.test(String(t ?? ""));

export const primeiroNome = (nome) => {
  const p = String(nome ?? "").trim().split(/\s+/)[0] ?? "";
  return /^(a descobrir|equipe|escritorio|escritório|contato|sr\.?|sra\.?|dr\.?|dra\.?)$/i.test(p) || p.length < 2 ? "" : p;
};

/** Valida uma lista de e-mails (convites, copias). */
export const emailValido = (e) => EMAIL_OK.test(String(e ?? "").trim().toLowerCase());
