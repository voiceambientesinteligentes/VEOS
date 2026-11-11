import { test } from "node:test";
import assert from "node:assert/strict";
import { comRodapeSaida, escolherEmail, extrairContatos, ehPortal, lerResultadosDuckDuckGo, limparTextoEmail, metaDaPagina, nomeDaEmpresa, pedidoDeSaida, preencherModelo, primeiroNome, prometeAnexo, telefoneBR, urlPublica } from "../../apps/web/js/domain/web_contatos.js";
import { codigoDaPonte, urlDaPonteValida } from "../../apps/web/js/domain/ponte_google.js";
import { CAPACIDADES } from "../../apps/web/js/domain/capacidades.js";

test("urlPublica: barra rede interna, IP privado em qualquer forma, IPv6, porta e usuario/senha", () => {
  for (const u of ["http://127.0.0.1/", "http://localhost", "http://10.1.2.3", "http://192.168.0.1", "http://169.254.169.254/latest", "http://2130706433/", "http://0x7f.0.0.1/", "https://[::1]/", "ftp://a.com", "http://u:p@a.com", "http://a.com:8080", "https://metadata.google.internal/"]) {
    assert.throws(() => urlPublica(u), Error, u);
  }
  assert.equal(urlPublica("arqinove.com.br"), "https://arqinove.com.br/");
  assert.equal(urlPublica("https://www.site.com.br/contato#form"), "https://www.site.com.br/contato");
});

test("DuckDuckGo HTML: decodifica o redirecionador, ignora anuncio e duplicado", () => {
  const html = `<div class="result results_links web-result"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Farqinove.com.br%2F&amp;rut=x">Arqinove - Escrit&oacute;rio</a><a class="result__snippet" href="#">15 anos de <b>arquitetura</b></a></div>
<div class="result result--ad results_links"><a class="result__a" href="https://anuncio.com/">Anúncio</a></div>
<div class="result results_links"><a class="result__a" href="https://arqinove.com.br/">Arqinove de novo</a></div>
<div class="result results_links"><a class="result__a" href="https://www.instagram.com/x/">Insta</a></div>`;
  const r = lerResultadosDuckDuckGo(html);
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], { titulo: "Arqinove - Escritório", url: "https://arqinove.com.br/", trecho: "15 anos de arquitetura" });
  assert.ok(ehPortal(r[1].url) && !ehPortal(r[0].url));
});

test("contatos do site: e-mail do dominio primeiro, telefone BR valido, WhatsApp, redes e pagina de contato", () => {
  const html = `<html><head><title>Studio Lima | Arquitetura</title><meta name="description" content="Projetos residenciais em Itajaí"><meta property="og:site_name" content="Studio Lima"></head>
<body><a href="mailto:contato@studiolima.com.br">fale</a> studiolima@gmail.com <img src="logo@2x.png"> noreply@studiolima.com.br
<p>(47) 99912-1424 · 47 3366-1234 · 1765209307 · CNPJ 12.345.678/0001-90</p><a href="https://wa.me/5547999121424">whats</a>
<a href="https://www.instagram.com/studiolima/">ig</a><a href="https://www.linkedin.com/company/studio-lima">in</a><a href="/contato">Contato</a><a href="https://outro.com/contato">fora</a>
financeiro [arroba] studiolima [ponto] com [ponto] br</body></html>`;
  const c = extrairContatos(html, "https://www.studiolima.com.br/");
  assert.ok(c.emails.includes("contato@studiolima.com.br") && c.emails.includes("studiolima@gmail.com") && c.emails.includes("financeiro@studiolima.com.br"));
  assert.ok(!c.emails.some((e) => /noreply|2x\.png/.test(e)));
  assert.equal(escolherEmail(c.emails, "studiolima.com.br"), "contato@studiolima.com.br");
  assert.deepEqual(c.telefones.map((t) => t.exibir), ["(47) 99912-1424", "(47) 3366-1234"]);
  assert.equal(c.whatsapp[0].exibir, "(47) 99912-1424");
  assert.equal(c.redes.instagram, "https://www.instagram.com/studiolima");
  assert.match(c.redes.linkedin, /linkedin\.com\/company\/studio-lima/);
  assert.deepEqual(c.paginas_contato, ["https://www.studiolima.com.br/contato"]);
  const meta = metaDaPagina(html);
  assert.equal(nomeDaEmpresa(meta, "https://www.studiolima.com.br/"), "Studio Lima");
  assert.equal(nomeDaEmpresa({ titulo: "Home | Casa Arq" }, "https://casaarq.com"), "Casa Arq");
});

test("telefoneBR: DDD valido, celular com 9, fixo comecando de 2 a 5", () => {
  assert.equal(telefoneBR("+55 (47) 99912-1424").exibir, "(47) 99912-1424");
  assert.equal(telefoneBR("4733661234").exibir, "(47) 3366-1234");
  for (const x of ["1765209307", "(11) 1234-5678", "47 89999-1111", "(20) 99999-1111", "9999"]) assert.equal(telefoneBR(x), null, x);
});

test("e-mail: linha de sair, pedido de saida na resposta (sem ler a citacao) e modelo com nome", () => {
  assert.match(comRodapeSaida("Olá.\n\nFernando"), /responder com a palavra SAIR/);
  assert.equal(comRodapeSaida("Texto. Se preferir não receber mais, responda sair."), "Texto. Se preferir não receber mais, responda sair.");
  for (const s of ["SAIR", "sair.", "Não tenho interesse, obrigado", "Pode me remover da lista por favor", "Por favor, me descadastre"]) assert.equal(pedidoDeSaida(s), true, s);
  for (const s of ["Ótimo, podemos marcar quinta?", "Oi Fernando, gostei!\n\nEm ter., 10 de nov. de 2026, VOICE escreveu:\n> responda SAIR"]) assert.equal(pedidoDeSaida(s), false, s);
  assert.equal(preencherModelo("Olá, {{primeiro_nome}}! Vi o trabalho do {{empresa}}.", { empresa: "Studio" }), "Olá! Vi o trabalho do Studio.");
  assert.equal(preencherModelo("Olá, {{primeiro_nome}}!", { primeiro_nome: "Ana" }), "Olá, Ana!");
  assert.equal(primeiroNome("a descobrir"), "");
  assert.equal(primeiroNome("Ana Paula Souza"), "Ana");
});

test("e-mail em texto simples: tira Markdown da IA e acusa promessa de anexo", () => {
  assert.equal(limparTextoEmail("Olá,\n\n**Caderno técnico** e *café*.\n# Título\n* item\n\n\n\nFim"), "Olá,\n\nCaderno técnico e café.\nTítulo\n• item\n\nFim");
  assert.equal(limparTextoEmail("Veja [nosso site](https://voice.com.br)."), "Veja nosso site (https://voice.com.br).");
  assert.equal(prometeAnexo("Confira o caderno técnico em anexo."), true);
  assert.equal(prometeAnexo("Posso te enviar nosso caderno técnico depois."), false);
});

test("ponte do Gmail: codigo com o segredo e as acoes; URL do app da Web conferida", () => {
  assert.throws(() => codigoDaPonte("curto"), /segredo inválido/);
  const s = "A".repeat(40);
  const c = codigoDaPonte(s);
  assert.ok(c.includes(`var SEGREDO = "${s}"`));
  for (const a of ["ping:", "enviar:", "buscar:", "conversa:", "respostas:", "agenda:", "evento:"]) assert.ok(c.includes(a), a);
  assert.ok(c.includes("function doPost(e)") && !c.includes("${"));
  assert.equal(urlDaPonteValida("https://script.google.com/macros/s/AKfycbx1234567890abcdefghijklmnop/exec"), true);
  assert.equal(urlDaPonteValida("https://script.google.com/macros/s/AKfycbx1234567890abcdefghijklmnop/dev"), false);
  assert.equal(urlDaPonteValida("https://evil.com/macros/s/AKfycbx1234567890abcdefghijklmnop/exec"), false);
});

test("capacidades: os 9 setores com pedidos de exemplo e o que o VEOS faz", () => {
  assert.equal(CAPACIDADES.length, 9);
  for (const c of CAPACIDADES) {
    assert.ok(c.itens.length >= 4, c.setor);
    for (const i of c.itens) assert.ok(i.pedido.length > 10 && i.faz.length > 10 && (!i.precisa || ["gmail", "envio", "tela"].includes(i.precisa)), i.pedido);
  }
});
