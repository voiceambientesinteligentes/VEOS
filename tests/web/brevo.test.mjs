// Brevo (envio de e-mail): regras puras — avisos do webhook, erros da API em portugues, HTML do e-mail, remetente e
// por onde o e-mail sai (Brevo ou Gmail). Sem rede.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLOQUEIAM, chaveBrevoValida, ehChaveSmtpBrevo, escolherViaEmail, explicarErroBrevo, htmlDoEmail, mensagemDoEventoBrevo,
  normalizarIdBrevo, planoDaBrevo, quandoDoEventoBrevo, remetentePadrao, tipoDoEventoBrevo,
} from "../../apps/web/js/domain/brevo.js";
import { buscaDeResposta, codigoDaPonte, VERSAO_PONTE } from "../../apps/web/js/domain/ponte_google.js";

const ID = "0b5e8f1a-1111-4222-8333-444455556666";

test("chave: API (xkeysib-) aceita; SMTP (xsmtpsib-) reconhecida e recusada", () => {
  assert.equal(chaveBrevoValida(`xkeysib-${"a1".repeat(32)}-AbCdEf123456`), true);
  assert.equal(chaveBrevoValida("xsmtpsib-abc"), false);
  assert.equal(ehChaveSmtpBrevo(" xsmtpsib-abcdef "), true);
  assert.equal(chaveBrevoValida("minha senha"), false);
});

test("avisos: nomes do aviso e da assinatura viram o mesmo tipo; quem bloqueia o endereco", () => {
  assert.equal(tipoDoEventoBrevo("hard_bounce"), "voltou");
  assert.equal(tipoDoEventoBrevo("hardBounce"), "voltou");
  assert.equal(tipoDoEventoBrevo("invalid_email"), "voltou");
  assert.equal(tipoDoEventoBrevo("unique_opened"), "aberto");
  assert.equal(tipoDoEventoBrevo("proxy_open"), "aberto");
  assert.equal(tipoDoEventoBrevo("soft_bounce"), "adiado");
  assert.equal(tipoDoEventoBrevo("delivered"), "entregue");
  assert.equal(tipoDoEventoBrevo("spam"), "spam");
  assert.equal(tipoDoEventoBrevo("unsubscribed"), "descadastro");
  assert.equal(tipoDoEventoBrevo("algo_novo"), "outro");
  assert.ok(BLOQUEIAM.voltou && BLOQUEIAM.spam && BLOQUEIAM.descadastro && BLOQUEIAM.bloqueado);
  assert.equal(BLOQUEIAM.aberto, undefined);
  assert.equal(BLOQUEIAM.adiado, undefined);
});

test("aviso -> mensagem do VEOS: etiqueta veos-<id>, cabecalho X-Mailin-custom ou nada", () => {
  assert.equal(mensagemDoEventoBrevo({ tags: ["veos", `veos-${ID}`, "prospeccao"] }), ID);
  assert.equal(mensagemDoEventoBrevo({ tag: JSON.stringify(["x", `veos-${ID}`]) }), ID);
  assert.equal(mensagemDoEventoBrevo({ "X-Mailin-custom": `veos:${ID}` }), ID);
  assert.equal(mensagemDoEventoBrevo({ tags: ["veos-nao-e-uuid"] }), null);
  assert.equal(mensagemDoEventoBrevo({}), null);
  assert.equal(normalizarIdBrevo("<201798300811.5787683@relay.domain.com>"), "201798300811.5787683@relay.domain.com");
  assert.equal(normalizarIdBrevo(""), null);
});

test("quando: ts_epoch em ms ou s, ts_event, data da Brevo (Paris) e reserva", () => {
  const agora = Date.parse("2026-11-11T15:00:00Z");
  assert.equal(quandoDoEventoBrevo({ ts_epoch: 1762873200123 }, agora), new Date(1762873200123).toISOString());
  assert.equal(quandoDoEventoBrevo({ ts_epoch: 1762873200 }, agora), new Date(1762873200000).toISOString());
  assert.equal(quandoDoEventoBrevo({ ts_event: 1762873200 }, agora), new Date(1762873200000).toISOString());
  assert.equal(quandoDoEventoBrevo({ date: "2026-11-11 10:00:00" }, agora), "2026-11-11T09:00:00.000Z");
  assert.equal(quandoDoEventoBrevo({}, agora), new Date(agora).toISOString());
});

test("HTML do e-mail: escapa, quebra paragrafos e linhas e deixa o link clicavel sem a pontuacao", () => {
  const h = htmlDoEmail("Olá <João> & cia,\n\nVeja https://voice.com.br/caderno.\nAbraço");
  assert.ok(h.includes("Olá &lt;João&gt; &amp; cia,"));
  assert.ok(h.includes('<a href="https://voice.com.br/caderno">https://voice.com.br/caderno</a>.<br>Abraço'));
  assert.equal((h.match(/<p /g) ?? []).length, 2);
  assert.ok(!h.includes("<script"));
});

test("erros da Brevo em portugues: IP, chave, conta em validacao, cota, remetente", () => {
  assert.match(explicarErroBrevo(401, { code: "unauthorized", message: "We have detected you are using an unrecognised IP address 34.1.2.3" }).texto, /IPs autorizados/);
  assert.match(explicarErroBrevo(401, { code: "unauthorized", message: "Key not found" }).texto, /chave de API/);
  assert.match(explicarErroBrevo(400, { code: "account_under_validation", message: "x" }).texto, /validação/);
  const cota = explicarErroBrevo(402, { code: "not_enough_credits", message: "x" });
  assert.equal(cota.status, 429);
  assert.match(cota.texto, /300 por dia/);
  assert.match(explicarErroBrevo(400, { code: "invalid_parameter", message: "Sender is invalid / inactive" }).texto, /remetente/);
  assert.match(explicarErroBrevo(400, { code: "invalid_parameter", message: "to is missing" }).texto, /^Brevo: to is missing/);
});

test("remetente: o ativo com o e-mail da conta; senao outro ativo; senao o da conta inativo", () => {
  const s = [{ id: 1, name: "Outro", email: "x@voice.com", active: true }, { id: 2, name: "VOICE", email: "voice@gmail.com", active: true }];
  assert.equal(remetentePadrao(s, "VOICE@gmail.com").id, 2);
  assert.equal(remetentePadrao([s[0]], "voice@gmail.com").id, 1);
  assert.deepEqual(remetentePadrao([{ id: 3, name: "V", email: "voice@gmail.com", active: false }], "voice@gmail.com"), { id: 3, nome: "V", email: "voice@gmail.com", ativo: false });
  assert.equal(remetentePadrao([], "voice@gmail.com"), null);
  assert.equal(planoDaBrevo([{ type: "free", credits: 300, creditsType: "sendLimit" }, { type: "sms", credits: 0 }]).texto, "plano grátis · 300 envios disponíveis");
});

test("por onde sai: pedido, resposta no Gmail, padrao, Brevo antes do Gmail, nada ligado", () => {
  assert.equal(escolherViaEmail({ gmail: true, brevo: true }), "brevo");
  assert.equal(escolherViaEmail({ gmail: true, brevo: true, padrao: "gmail" }), "gmail");
  assert.equal(escolherViaEmail({ gmail: true, brevo: true, responderA: "thread123" }), "gmail");
  assert.equal(escolherViaEmail({ gmail: false, brevo: true, responderA: "thread123" }), "brevo");
  assert.equal(escolherViaEmail({ gmail: true, brevo: false, padrao: "brevo" }), "gmail");
  assert.equal(escolherViaEmail({ gmail: true, brevo: true, pedido: "gmail", padrao: "brevo" }), "gmail");
  assert.equal(escolherViaEmail({ gmail: false, brevo: true, pedido: "gmail" }), null);
  assert.equal(escolherViaEmail({}), null);
});

test("ponte v2: busca da resposta de e-mail que saiu pela Brevo (webmail = endereco; empresa = dominio)", () => {
  assert.equal(VERSAO_PONTE, 2);
  assert.equal(buscaDeResposta("Studio@Gmail.com", "2026-11-11T12:00:00Z"), "from:(studio@gmail.com) after:2026/11/10 -in:sent -in:chats");
  assert.equal(buscaDeResposta("contato@studiolima.com.br", "2026-11-11T12:00:00Z"), "from:(studiolima.com.br) after:2026/11/10 -in:sent -in:chats");
  assert.equal(buscaDeResposta("sem-arroba", "2026-11-11T12:00:00Z"), null);
  const c = codigoDaPonte("B".repeat(40));
  assert.ok(c.includes("x.busca") && c.includes("GmailApp.search(String(x.busca)") && c.includes("chave: x.chave"));
});
