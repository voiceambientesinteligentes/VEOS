// PESQUISA NA WEB e CONTATOS DE EMPRESAS no servidor. Provedores na ordem (os que tiverem chave):
//   Tavily (1.000 creditos/mes gratis, sem cartao) -> Brave Search -> Serper -> Parallel (MCP de pesquisa GRATIS e sem
//   chave para agentes: search.parallel.ai/mcp) -> DuckDuckGo (sem chave; costuma pedir verificacao a servidores).
// A Parallel tambem le paginas (web_fetch) quando o site bloqueia a leitura direta do servidor.
// Chave: segredo do servidor (TAVILY_API_KEY, BRAVE_API_KEY, SERPER_API_KEY) ou guardada cifrada em Integracoes.
// Leitura de pagina: so endereco publico (urlPublica), redirecionamentos conferidos um a um, no maximo 1,5 MB,
// so HTML/texto. Regras de extracao em ../dominio/web_contatos.js (testaveis no Node).
// deno-lint-ignore-file no-explicit-any
import { HttpError, servico } from "./banco.ts";
import { lerIntegracao } from "./integracoes.ts";
import { dominioDe, ehPortal, escolherEmail, extrairContatos, htmlParaTexto, juntarContatos, lerResultadosDuckDuckGo, metaDaPagina, nomeDaEmpresa, urlPublica } from "./dominio/web_contatos.js";

const NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
export type Resultado = { titulo: string; url: string; trecho: string };

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function chaveDe(provedor: "tavily" | "brave" | "serper") {
  const env = Deno.env.get(`${provedor.toUpperCase()}_API_KEY`) ?? "";
  if (env) return env;
  const i = await lerIntegracao(`pesquisa_${provedor}`).catch(() => null);
  return (i?.dados?.chave as string) ?? "";
}

// ---------------------------------------------------------------- provedores de pesquisa
async function tavily(q: string, n: number, chave: string): Promise<Resultado[]> {
  const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
    body: JSON.stringify({ query: q, max_results: Math.min(n, 15), search_depth: "basic", include_answer: false }), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  const d = await r.json();
  return (d.results ?? []).map((x: any) => ({ titulo: String(x.title ?? "").slice(0, 200), url: String(x.url ?? ""), trecho: String(x.content ?? "").replace(/\s+/g, " ").slice(0, 400) }));
}
async function brave(q: string, n: number, chave: string): Promise<Resultado[]> {
  const u = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q, count: String(Math.min(n, 20)), country: "BR", search_lang: "pt-br" })}`;
  const r = await fetch(u, { headers: { Accept: "application/json", "X-Subscription-Token": chave }, signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`Brave ${r.status}`);
  const d = await r.json();
  return (d.web?.results ?? []).map((x: any) => ({ titulo: String(x.title ?? "").replace(/<[^>]+>/g, "").slice(0, 200), url: String(x.url ?? ""), trecho: String(x.description ?? "").replace(/<[^>]+>/g, "").slice(0, 400) }));
}
async function serper(q: string, n: number, chave: string): Promise<Resultado[]> {
  const r = await fetch("https://google.serper.dev/search", { method: "POST", headers: { "Content-Type": "application/json", "X-API-KEY": chave }, body: JSON.stringify({ q, gl: "br", hl: "pt-br", num: Math.min(n, 20) }), signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`Serper ${r.status}`);
  const d = await r.json();
  return (d.organic ?? []).map((x: any) => ({ titulo: String(x.title ?? "").slice(0, 200), url: String(x.link ?? ""), trecho: String(x.snippet ?? "").slice(0, 400) }));
}
// ---- Parallel (MCP por HTTP: initialize -> tools/call). Gratis e anonimo; uma chave (PARALLEL_API_KEY) so aumenta o limite.
const PARALLEL = "https://search.parallel.ai/mcp";
const SESSAO_VEOS = crypto.randomUUID().replace(/-/g, ""); // id estavel desta instancia (pedido pela Parallel para limitar o uso gratis)
let sessaoParallel: { id: string; em: number } | null = null;
async function lerJsonRpc(r: Response) {
  const t = await r.text();
  if (/text\/event-stream/i.test(r.headers.get("content-type") ?? "")) {
    const linhas = t.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).filter(Boolean);
    for (const l of linhas.reverse()) { try { const d = JSON.parse(l); if (d.result || d.error) return d; } catch { /* proxima */ } }
    throw new Error("Parallel: resposta sem dados");
  }
  return JSON.parse(t);
}
async function chamarParallel(ferramenta: "web_search" | "web_fetch", args: Record<string, unknown>, timeout = 25_000): Promise<any> {
  const chave = Deno.env.get("PARALLEL_API_KEY") ?? "";
  const cab: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(chave ? { Authorization: `Bearer ${chave}` } : {}) };
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (!sessaoParallel || Date.now() - sessaoParallel.em > 10 * 60_000) {
      const r = await fetch(PARALLEL, { method: "POST", headers: cab, signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "veos", version: "1.0" } } }) });
      if (!r.ok) throw new Error(`Parallel ${r.status}`);
      await r.body?.cancel();
      sessaoParallel = { id: r.headers.get("mcp-session-id") ?? "", em: Date.now() };
    }
    const r = await fetch(PARALLEL, { method: "POST", headers: { ...cab, ...(sessaoParallel.id ? { "Mcp-Session-Id": sessaoParallel.id } : {}) }, signal: AbortSignal.timeout(timeout),
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: ferramenta, arguments: { ...args, session_id: SESSAO_VEOS, model_name: "veos-servidor" } } }) });
    if ((r.status === 400 || r.status === 404) && tentativa === 0) { await r.body?.cancel(); sessaoParallel = null; continue; } // sessao expirou
    if (!r.ok) throw new Error(`Parallel ${r.status}`);
    const d = await lerJsonRpc(r);
    if (d.error) throw new Error(`Parallel: ${String(d.error.message ?? "erro").slice(0, 120)}`);
    if (d.result?.isError) throw new Error(`Parallel: ${String(d.result?.content?.[0]?.text ?? "erro").slice(0, 120)}`);
    return d.result?.structuredContent ?? JSON.parse(d.result?.content?.[0]?.text ?? "{}");
  }
  throw new Error("Parallel: sessão recusada");
}
const consultas = (q: string) => {
  const curta = q.split(/\s+/).slice(0, 7).join(" ");
  return [...new Set([curta, q.replace(/\b(em|no|na|de|do|da|para)\b/gi, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 6).join(" ")])].filter((x) => x.length >= 3).slice(0, 2);
};
async function parallel(q: string, n: number): Promise<Resultado[]> {
  const d = await chamarParallel("web_search", { objective: `Encontrar na web: ${q}`.slice(0, 300), search_queries: consultas(q) });
  return (d.results ?? []).slice(0, Math.max(n, 15)).map((x: any) => ({ titulo: String(x.title ?? "").slice(0, 200), url: String(x.url ?? ""), trecho: (x.excerpts ?? []).join(" ").replace(/\s+/g, " ").slice(0, 400) }));
}
/** Le paginas pela Parallel (excertos em markdown, com os links) quando o site bloqueia o servidor. */
export async function lerViaParallel(urls: string[], objetivo: string): Promise<{ url: string; titulo: string; texto: string }[]> {
  const d = await chamarParallel("web_fetch", { urls: urls.slice(0, 5), objective: objetivo.slice(0, 200) }, 40_000);
  return (d.results ?? []).map((x: any) => ({ url: String(x.url ?? ""), titulo: String(x.title ?? "").slice(0, 200), texto: (x.excerpts ?? []).join("\n").slice(0, 20_000) }));
}
// markdown da Parallel -> "HTML" que o extrator entende (links viram href; o texto fica)
const mdParaHtml = (md: string) => md.replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`).replace(/\n/g, "<br>");

async function duckduckgo(q: string, n: number): Promise<Resultado[]> {
  const r = await fetch("https://html.duckduckgo.com/html/", { method: "POST", headers: { "User-Agent": NAVEGADOR, "Content-Type": "application/x-www-form-urlencoded", Accept: "text/html", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6" },
    body: new URLSearchParams({ q, kl: "br-pt" }), signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`DuckDuckGo ${r.status}`);
  const html = await r.text();
  const res = lerResultadosDuckDuckGo(html);
  if (!res.length) throw new Error(/anomaly|captcha|challenge|unusual/i.test(html) ? "DuckDuckGo pediu verificação (bloqueio temporário do servidor)" : "DuckDuckGo sem resultados");
  return res.slice(0, n);
}

/** Provedores disponiveis agora (sem expor chaves). */
export async function situacaoPesquisa() {
  const [t, b, s] = await Promise.all([chaveDe("tavily"), chaveDe("brave"), chaveDe("serper")]);
  return {
    provedores: [
      { id: "tavily", nome: "Tavily", ativo: Boolean(t), nota: "1.000 créditos por mês grátis, sem cartão (app.tavily.com)" },
      { id: "brave", nome: "Brave Search", ativo: Boolean(b), nota: "plano gratuito; confira se pede cartão" },
      { id: "serper", nome: "Serper (Google)", ativo: Boolean(s), nota: "2.500 pesquisas grátis uma vez, sem cartão" },
      { id: "parallel", nome: "Parallel (grátis, sem chave)", ativo: true, nota: "pesquisa gratuita para agentes de IA; também lê sites que bloqueiam o servidor" },
      { id: "duckduckgo", nome: "DuckDuckGo (sem chave)", ativo: true, nota: "reserva; costuma pedir verificação a servidores" },
    ],
  };
}

/** Pesquisa com cache de 24 h. Tenta os provedores na ordem; devolve o primeiro que responder. */
export async function pesquisarWeb(consulta: string, n = 8): Promise<{ provedor: string; resultados: Resultado[]; cache?: boolean; falhas?: string[] }> {
  const q = String(consulta ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (q.length < 3) throw new HttpError(400, "escreva o que pesquisar");
  const qtd = Math.max(1, Math.min(15, Math.round(Number(n) || 8)));
  const chave = await sha256(`v1|${q.toLowerCase()}|${qtd}`);
  try {
    const [c] = await servico(`/rest/v1/pesquisa_cache?chave=eq.${chave}&em=gt.${encodeURIComponent(new Date(Date.now() - 86_400_000).toISOString())}&select=resultado`);
    if (c?.resultado?.resultados?.length) return { ...c.resultado, cache: true };
  } catch (e) { console.error("cache de pesquisa", e); }
  const falhas: string[] = [];
  const fila: [string, () => Promise<Resultado[]>][] = [];
  const [kt, kb, ks] = await Promise.all([chaveDe("tavily"), chaveDe("brave"), chaveDe("serper")]);
  if (kt) fila.push(["Tavily", () => tavily(q, qtd, kt)]);
  if (kb) fila.push(["Brave Search", () => brave(q, qtd, kb)]);
  if (ks) fila.push(["Serper", () => serper(q, qtd, ks)]);
  fila.push(["Parallel", () => parallel(q, qtd)]);
  fila.push(["DuckDuckGo", () => duckduckgo(q, qtd)]);
  for (const [nome, f] of fila) {
    try {
      const resultados = (await f()).filter((r) => /^https?:\/\//.test(r.url)).slice(0, qtd);
      if (!resultados.length) { falhas.push(`${nome}: sem resultados`); continue; }
      const saida = { provedor: nome, resultados };
      servico("/rest/v1/pesquisa_cache?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ chave, resultado: saida, em: new Date().toISOString() }) }).catch(() => {});
      return falhas.length ? { ...saida, falhas } : saida;
    } catch (e) {
      falhas.push(`${nome}: ${(e as Error).message}`.slice(0, 160));
    }
  }
  throw new HttpError(502, `a pesquisa na web não respondeu agora (${falhas.join("; ")}). Para mais estabilidade, ligue uma chave gratuita do Tavily em Integrações.`);
}

// ---------------------------------------------------------------- leitura de pagina
function charsetDe(tipo: string, inicio: Uint8Array) {
  const h = /charset=([\w-]+)/i.exec(tipo)?.[1];
  if (h) return h.toLowerCase();
  const m = /<meta[^>]+charset=["']?([\w-]+)/i.exec(new TextDecoder("latin1").decode(inicio.slice(0, 3000)));
  return (m?.[1] ?? "utf-8").toLowerCase();
}

/** Busca uma pagina publica (HTML/texto) com limites. Devolve o endereco final e o HTML. */
export async function buscarPagina(url: string, { timeout = 9_000, max = 1_500_000 } = {}): Promise<{ url: string; html: string }> {
  let atual = urlPublica(url);
  if (ehPortal(atual) && /instagram|facebook|linkedin|tiktok|google\./i.test(dominioDe(atual))) throw new Error("redes sociais e Google não são lidos pelo VEOS (só o link)");
  for (let salto = 0; salto < 5; salto++) {
    const r = await fetch(atual, { redirect: "manual", headers: { "User-Agent": NAVEGADOR, Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.3", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5" }, signal: AbortSignal.timeout(timeout) });
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      const loc = r.headers.get("location");
      await r.body?.cancel();
      if (!loc) throw new Error("redirecionamento sem destino");
      atual = urlPublica(new URL(loc, atual).href);
      continue;
    }
    if (!r.ok) { await r.body?.cancel(); throw new Error(`a página respondeu ${r.status}`); }
    const tipo = r.headers.get("content-type") ?? "";
    if (tipo && !/text\/html|application\/xhtml|text\/plain/i.test(tipo)) { await r.body?.cancel(); throw new Error(`não é uma página (${tipo.split(";")[0]})`); }
    const leitor = r.body?.getReader();
    const partes: Uint8Array[] = [];
    let total = 0;
    if (leitor) {
      while (total < max) {
        const { done, value } = await leitor.read();
        if (done || !value) break;
        partes.push(value);
        total += value.length;
      }
      await leitor.cancel().catch(() => {});
    }
    const bytes = new Uint8Array(Math.min(total, max));
    let pos = 0;
    for (const p of partes) { const pedaco = p.slice(0, Math.max(0, bytes.length - pos)); bytes.set(pedaco, pos); pos += pedaco.length; if (pos >= bytes.length) break; }
    let html: string;
    try { html = new TextDecoder(charsetDe(tipo, bytes)).decode(bytes); } catch { html = new TextDecoder("utf-8").decode(bytes); }
    return { url: atual, html };
  }
  throw new Error("redirecionamentos demais");
}

/** Leitura para a IA: titulo, descricao, texto e contatos (se o site bloquear o servidor, le pela Parallel). */
export async function lerPagina(url: string, maxTexto = 6000) {
  const fmt = (c: any) => ({ ...c, telefones: c.telefones.map((t: any) => t.exibir), whatsapp: c.whatsapp.map((t: any) => t.exibir) });
  try {
    const p = await buscarPagina(url);
    const meta = metaDaPagina(p.html);
    return { url: p.url, titulo: meta.titulo, descricao: meta.descricao, site: meta.site || null, texto: htmlParaTexto(p.html, maxTexto), contatos: fmt(extrairContatos(p.html, p.url)) };
  } catch (e) {
    if (/redes sociais|não é uma página|interna|inválido|porta|usuário|IPv6|http ou https/.test((e as Error).message)) throw e;
    const alvo = urlPublica(url);
    const [x] = await lerViaParallel([alvo], "conteúdo principal e contato (e-mail, telefone, WhatsApp) da empresa").catch(() => []);
    if (!x?.texto) throw e;
    return { url: x.url || alvo, titulo: x.titulo, descricao: "", site: null, texto: x.texto.slice(0, maxTexto), contatos: fmt(extrairContatos(mdParaHtml(x.texto), x.url || alvo)), nota: "lido pela Parallel (o site bloqueia a leitura direta do servidor): trechos, não a página inteira" };
  }
}

// ---------------------------------------------------------------- empresas com contato publico
// autor = filtro PostgREST de criado_por (dados de robo de teste x dados reais nao se misturam)
async function conhecidos(emails: string[], dominios: string[], autor = "") {
  const lista = [...new Set(emails.filter(Boolean))];
  const q = (xs: string[]) => xs.map((x) => `"${x.replace(/"/g, "")}"`).join(",");
  const [bloq, regs, clis] = lista.length ? await Promise.all([
    servico(`/rest/v1/contatos_bloqueio?contato=in.(${encodeURIComponent(q(lista))})&select=contato`).catch(() => []),
    servico(`/rest/v1/registros?dados->>email=in.(${encodeURIComponent(q(lista))})${autor}&select=id,setor_id,tipo,titulo,estado,email:dados->>email&limit=200`).catch(() => []),
    servico(`/rest/v1/clientes?email=in.(${encodeURIComponent(q(lista))})${autor}&select=id,codigo,email&limit=200`).catch(() => []),
  ]) : [[], [], []];
  // mesmo dominio ja cadastrado (ex.: outro e-mail do mesmo escritorio)
  const porDominio = dominios.length ? await servico(`/rest/v1/registros?setor_id=eq.vendas&tipo=eq.parceiro${autor}&select=id,titulo,estado,email:dados->>email&limit=2000`).catch(() => []) : [];
  return { bloq: new Set(bloq.map((b: any) => b.contato)), regs, clis, porDominio };
}

/** Acha empresas pela pesquisa, le o site de cada uma (e a pagina de contato) e devolve o contato publico. */
export async function encontrarContatos(busca: string, quantidade = 5, autor = "") {
  const n = Math.max(1, Math.min(8, Math.round(Number(quantidade) || 5)));
  const p = await pesquisarWeb(busca, 15);
  const porDominio = new Map<string, Resultado>();
  for (const r of p.resultados) { const d = dominioDe(r.url); if (d && !porDominio.has(d)) porDominio.set(d, r); }
  const proprios = [...porDominio.values()].filter((r) => !ehPortal(r.url));
  const portais = [...porDominio.values()].filter((r) => ehPortal(r.url));
  const candidatos = proprios.slice(0, Math.min(10, n + 4));
  const t0 = Date.now();
  const lidos = await Promise.all(candidatos.map(async (r) => {
    try {
      const pag = await buscarPagina(r.url, { timeout: 8_000 });
      const meta = metaDaPagina(pag.html);
      let c = extrairContatos(pag.html, pag.url);
      const raiz = (() => { const u = new URL(pag.url); return `${u.protocol}//${u.host}/`; })();
      const tentar = [];
      if (!c.emails.length && pag.url.replace(/\/$/, "") !== raiz.replace(/\/$/, "")) tentar.push(raiz);
      if (!c.emails.length && c.paginas_contato[0]) tentar.push(c.paginas_contato[0]);
      for (const u of [...new Set(tentar)].slice(0, 2)) {
        if (c.emails.length || Date.now() - t0 > 20_000) break;
        try { const p2 = await buscarPagina(u, { timeout: 7_000 }); c = juntarContatos(c, extrairContatos(p2.html, p2.url)); } catch { /* segue sem */ }
      }
      return { r, url: pag.url, meta, c };
    } catch (e) {
      return { r, erro: (e as Error).message };
    }
  }));
  // site que bloqueou o servidor ou sem e-mail: uma leitura em lote pela Parallel (pagina de contato ou inicio)
  const faltam = (lidos as any[]).filter((x) => x.erro || !x.c.emails.length).slice(0, 5);
  if (faltam.length && Date.now() - t0 < 30_000) {
    const alvo = (x: any) => { try { return x.erro ? x.r.url : (x.c.paginas_contato[0] ?? `${new URL(x.url).protocol}//${new URL(x.url).host}/`); } catch { return x.r.url; } };
    const extra = await lerViaParallel(faltam.map(alvo), "e-mail, telefone e WhatsApp de contato da empresa").catch((e) => { console.error("parallel web_fetch", e); return []; });
    for (const ex of extra) {
      const x = faltam.find((f) => dominioDe(f.url ?? f.r.url) === dominioDe(ex.url));
      if (!x || !ex.texto) continue;
      const c2 = extrairContatos(mdParaHtml(ex.texto), ex.url);
      if (x.erro) { delete x.erro; x.url = ex.url; x.meta = { titulo: ex.titulo, descricao: "", site: "" }; x.c = c2; x.via = "Parallel"; }
      else x.c = juntarContatos(x.c, c2);
    }
  }
  const ok = lidos.filter((x: any) => !x.erro) as any[];
  const emails = ok.flatMap((x) => x.c.emails);
  const k = await conhecidos(emails, ok.map((x) => dominioDe(x.url)), autor);
  const empresas = ok.map((x) => {
    const dom = dominioDe(x.url);
    const email = escolherEmail(x.c.emails, dom);
    const reg = k.regs.find((g: any) => x.c.emails.includes(String(g.email ?? "").toLowerCase()));
    const cli = k.clis.find((g: any) => x.c.emails.includes(String(g.email ?? "").toLowerCase()));
    const mesmoDominio = !reg ? k.porDominio.find((g: any) => g.email && dominioDe(`https://${String(g.email).split("@")[1] ?? ""}`) === dom && !/gmail|hotmail|outlook|yahoo|bol|uol|terra/i.test(dom)) : null;
    return {
      nome: nomeDaEmpresa(x.meta, x.url, x.r.titulo), site: `https://${new URL(x.url).host}`, email, outros_emails: x.c.emails.filter((e: string) => e !== email).slice(0, 3),
      telefone: x.c.telefones[0]?.exibir ?? null, whatsapp: x.c.whatsapp[0]?.exibir ?? null, instagram: x.c.redes.instagram, linkedin: x.c.redes.linkedin,
      descricao: (x.meta.descricao || x.r.trecho || "").slice(0, 300), fonte: x.url,
      ja_no_veos: reg ? { registro_id: reg.id, setor: reg.setor_id, tipo: reg.tipo, titulo: reg.titulo, estado: reg.estado } : cli ? { cliente_id: cli.id, codigo: cli.codigo } : mesmoDominio ? { registro_id: mesmoDominio.id, titulo: mesmoDominio.titulo, estado: mesmoDominio.estado, aviso: "mesmo domínio já cadastrado" } : null,
      bloqueado: Boolean(email && k.bloq.has(email)),
    };
  });
  const comEmail = empresas.filter((e) => e.email && !e.bloqueado);
  return {
    busca, provedor: p.provedor,
    encontrados: comEmail.slice(0, n),
    sem_email: empresas.filter((e) => !e.email).slice(0, 5).map((e) => ({ nome: e.nome, site: e.site, telefone: e.telefone, whatsapp: e.whatsapp, instagram: e.instagram, fonte: e.fonte })),
    bloqueados: empresas.filter((e) => e.bloqueado).map((e) => ({ nome: e.nome, email: e.email, aviso: "pediu para não receber mensagens: não contatar" })),
    nao_lidos: lidos.filter((x: any) => x.erro).slice(0, 5).map((x: any) => ({ url: x.r.url, motivo: x.erro })),
    portais_e_redes: portais.slice(0, 5).map((r) => ({ titulo: r.titulo, url: r.url })),
    aviso: "Contatos públicos dos sites das próprias empresas (B2B). Confira antes de enviar; quem pedir para sair entra na lista de bloqueio e não recebe mais nada.",
  };
}
