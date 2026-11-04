// USO REAL DO MONTADOR no site publicado (Playwright + robo TESTE da direcao, sessao injetada):
// cadastra o cliente pela tela, monta o orcamento com um produto do catalogo e um servico, ve a
// margem, salva, abre a ficha, marca enviado pela proposta e gera o pedido; o pedido TESTE e
// cancelado no fim e o robo fica INATIVO. Tudo do robo fica fora da visao real (serie T).
// Uso: node scripts/online.mjs tests/online/uso_orcamento.mjs   (precisa do pacote playwright)
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.VEOS_SITE ?? "https://voiceambientesinteligentes.github.io/VEOS/";
const EMAIL = "teste-uso-orcamento@veos-teste.invalid";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha, ban_duration: "none" }) });
const membro = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE uso", papel: "direcao", ativo }) });
await membro(true);
const tok = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json();
const sessao = JSON.stringify({ access_token: tok.access_token, refresh_token: tok.refresh_token, expira_em: Date.now() + tok.expires_in * 1000, email: EMAIL });
const nav = await chromium.launch(process.env.CI ? {} : { channel: "msedge" });
const passos = [];
const ok = (t) => { passos.push(t); console.log(`ok  ${t}`); };
let pedido = null;
try {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 }, locale: "pt-BR" });
  await ctx.addInitScript((s) => localStorage.setItem("veos.sessao", s), sessao);
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(e.message));
  pg.on("dialog", (d) => d.accept());
  const sufixo = Date.now().toString(36);

  // 1. cliente pela tela
  await pg.goto(`${SITE}#/clientes?novo=1`, { waitUntil: "networkidle" });
  await pg.fill("#cl-nome", `Cliente TESTE Uso ${sufixo}`);
  await pg.fill("#cl-telefone", "(47) 98888-7777");
  await pg.fill("#cl-cidade", "Balneário Camboriú");
  await pg.selectOption("#cl-origem", "indicacao_arquiteto");
  await pg.click("form.form-cliente button[type=submit]");
  await pg.waitForURL(/#\/clientes\/[0-9a-f-]{36}$/, { timeout: 20000 });
  await pg.waitForSelector("text=+ Novo orçamento");
  const codigo = await pg.locator("#view").innerText();
  assert.match(codigo, /CLI-T\d{5}/); ok("cliente cadastrado pela tela (série de teste)");

  // 2. orcamento
  await pg.click("text=+ Novo orçamento");
  await pg.waitForSelector(".orc-produto button", { timeout: 30000 });
  await pg.fill("#orc-ambiente", "Sala de estar");
  await pg.locator(".orc-produto button").first().click();
  await pg.click("button:has-text('+ Programação e configuração')");
  const linhas = pg.locator(".orc-tabela tbody tr");
  assert.equal(await linhas.count(), 2); ok("produto do catálogo e serviço no ambiente Sala de estar");
  // completa o que faltar (sem custo-hora no formulario: preco e custo do servico a mao)
  const serv = linhas.nth(1).locator("input");
  await serv.nth(2).fill("220"); await serv.nth(3).fill("90");
  const prod = linhas.nth(0).locator("input");
  if (!(await prod.nth(2).inputValue())) await prod.nth(2).fill("900");
  if (!(await prod.nth(3).inputValue())) await prod.nth(3).fill("300");
  await pg.waitForTimeout(300);
  const conf = await pg.locator(".orc-dir").innerText();
  assert.match(conf, /MC [\d,]+%|Faltam|sem custo/); ok(`conferência do CFO: ${conf.match(/MC [\d,]+%[^\n]*/)?.[0] ?? conf.split("\n").find((l) => /Faltam|sem custo/.test(l))}`);
  await pg.click("#orc-condicao ~ * button, button:has-text('Sugestão do CFO')");
  await pg.click("button:has-text('Salvar orçamento')");
  await pg.waitForURL(/#\/orcamentos\/[0-9a-f-]{36}$/, { timeout: 20000 });
  await pg.waitForSelector("text=Proposta em PDF e envio");
  const ficha = await pg.locator("#view").innerText();
  assert.match(ficha, /ORV-T\d{5} · versão 1/); ok(`orçamento salvo: ${ficha.match(/ORV-T\d{5}/)[0]}`);

  // 3. proposta em PDF + marcar enviado
  await pg.click("text=Proposta em PDF e envio");
  await pg.waitForSelector(".proposta-doc");
  const doc = await pg.locator(".proposta-doc").innerText();
  assert.ok(doc.includes("Sala de estar") && doc.includes("Investimento total") && !/custo|margem/i.test(doc)); ok("proposta em PDF com ambiente e total, sem custo/margem");
  await pg.click("text=Já enviei ao cliente: marcar como enviado");
  await pg.waitForSelector("text=Marcado como enviado");
  ok("marcado como enviado pela tela da proposta");

  // 4. aceite -> pedido
  await pg.click("text=‹ Orçamento");
  await pg.waitForSelector("text=Cliente aceitou → gerar pedido");
  await pg.click("text=Cliente aceitou → gerar pedido");
  await pg.waitForURL(/#\/pedidos\/[0-9a-f-]{36}$/, { timeout: 20000 });
  pedido = pg.url().split("/").pop();
  await pg.waitForFunction(() => /PED-T\d{5}/.test(document.getElementById("view")?.innerText ?? ""), null, { timeout: 30000 });
  ok(`cliente aceitou: pedido ${(await pg.locator("#view").innerText()).match(/PED-T\d{5}/)[0]} aberto na tela`);
  assert.deepEqual(erros, [], `erros JS: ${erros.join(" | ")}`); ok("sem erro de JavaScript no caminho");
} finally {
  if (pedido) {
    const r = await fetch(`${URL_BASE}/functions/v1/api/fluxo/pedidos/${pedido}/cancelar`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), Origin: "https://voiceambientesinteligentes.github.io" }, body: JSON.stringify({ motivo: "pedido TESTE do uso_orcamento" }) });
    console.log(r.ok ? "ok  pedido TESTE cancelado" : `aviso: cancelar ${r.status}`);
  }
  await nav.close();
  await membro(false);
  console.log(`\n${passos.length} passos OK no site publicado · robo TESTE inativo`);
}
