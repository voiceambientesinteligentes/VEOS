import { test } from "node:test";
import assert from "node:assert/strict";
import { linkWhatsApp, MARCA_EMAIL, montarEmail, nomeNaVitrine, previaDoEmail, separarPartes } from "../../apps/web/js/domain/email_visual.js";

const TEXTO = "Olá, Ana!\n\nChegou à VOICE um sensor que não apaga a luz com a pessoa parada.\n\nPosso levar uma unidade para você ver.\n\nAbraço,\nFernando\nVOICE Ambientes Inteligentes\n\n—\nSe preferir não receber mais mensagens da VOICE, é só responder com a palavra SAIR.";

test("partes do e-mail: corpo, fecho, assinatura e linha de sair", () => {
  const p = separarPartes(TEXTO);
  assert.equal(p.corpo, "Olá, Ana!\n\nChegou à VOICE um sensor que não apaga a luz com a pessoa parada.\n\nPosso levar uma unidade para você ver.");
  assert.equal(p.fecho, "Abraço,");
  assert.equal(p.nome, "Fernando");
  assert.equal(p.cargo, null);
  assert.match(p.saida, /palavra SAIR/);
  // nome junto da empresa; telefone escrito a mao sai (o bloco padrao ja traz)
  const q = separarPartes("Oi!\n\nTexto.\n\nAtenciosamente,\nFernando — VOICE Ambientes Inteligentes\n(47) 3056-1121");
  assert.equal(q.nome, "Fernando");
  assert.equal(q.fecho, "Atenciosamente,");
  assert.equal(q.corpo, "Oi!\n\nTexto.");
  assert.deepEqual(q.extras, []);
  // a IA assinou e o VEOS acrescentou: o nome aparece uma vez so
  const r = separarPartes("Texto.\n\nAbraço,\nFernando\n\nFernando\nVOICE Ambientes Inteligentes");
  assert.deepEqual([r.corpo, r.fecho, r.nome], ["Texto.", "Abraço,", "Fernando"]);
  // sem a linha da VOICE: o nome logo depois do fecho
  const s = separarPartes("Texto.\n\nAbraço,\nFernando");
  assert.deepEqual([s.corpo, s.fecho, s.nome], ["Texto.", "Abraço,", "Fernando"]);
});

test("previa da caixa de entrada: pula a saudacao e corta na palavra", () => {
  assert.equal(previaDoEmail("Olá, Ana!\n\nChegou um sensor novo."), "Chegou um sensor novo.");
  const longa = previaDoEmail(`Bom dia!\n\n${"palavra ".repeat(30)}`);
  assert.ok(longa.endsWith("…") && longa.length <= 121 && !/\s…$/.test(longa));
});

test("nome do produto no e-mail sem o fornecedor do fim; link do WhatsApp", () => {
  assert.equal(nomeNaVitrine("Sensor de Presença mmWave 60GHz Wi-Fi - LinknLink eMotion Ultra"), "Sensor de Presença mmWave 60GHz Wi-Fi");
  assert.equal(nomeNaVitrine("Controlador de Fita LED Zigbee 5 em 1 + Controle Remoto - WZ5 + RS1"), "Controlador de Fita LED Zigbee 5 em 1 + Controle Remoto");
  assert.equal(nomeNaVitrine("Hub - X"), "Hub - X");
  assert.equal(linkWhatsApp(), "https://wa.me/554730561121");
  assert.equal(linkWhatsApp("Olá! Quero saber"), "https://wa.me/554730561121?text=Ol%C3%A1!%20Quero%20saber");
});

test("e-mail montado: logotipo, cartao do produto, botao do WhatsApp, assinatura e sair no rodape", () => {
  const foto = "https://x.supabase.co/storage/v1/object/public/vitrine/produtos/PRD-0121-abc.jpg";
  const { html, texto, previa } = montarEmail({ texto: TEXTO, assunto: "Sensor <novo>", tipo: "prospeccao",
    produtos: [{ titulo: "Sensor de Presença <mmWave>", destaque: "Não apaga a luz com a pessoa parada.", foto }, { titulo: "", foto: "https://x" }] });
  assert.equal(previa, "Chegou à VOICE um sensor que não apaga a luz com a pessoa parada.");
  assert.ok(html.includes(MARCA_EMAIL.cabecalho));
  assert.ok(html.includes(`src="${foto}"`));
  assert.ok(html.includes("Sensor de Presença &lt;mmWave&gt;") && !html.includes("<mmWave>"));
  assert.equal((html.match(/Em destaque/g) ?? []).length, 1);
  assert.ok(html.includes("Conversar no WhatsApp") && html.includes(`https://wa.me/${MARCA_EMAIL.whatsapp}?text=`));
  assert.ok(html.includes("<title>Sensor &lt;novo&gt;</title>"));
  assert.ok(!/<script|javascript:/i.test(html));
  // sair: uma vez, no rodape (depois do botao), fora do corpo
  assert.equal((html.match(/palavra SAIR/g) ?? []).length, 1);
  assert.ok(html.indexOf("palavra SAIR") > html.indexOf("Conversar no WhatsApp"));
  // texto com o mesmo conteudo: corpo -> produto -> WhatsApp -> fecho e assinatura -> sair
  const ordem = ["Posso levar uma unidade", "• Sensor de Presença <mmWave> — Não apaga a luz", "https://wa.me/554730561121", "Abraço,\nFernando\nVOICE Ambientes Inteligentes\nWhatsApp (47) 3056-1121", "palavra SAIR"].map((t) => texto.indexOf(t));
  assert.ok(ordem.every((x, i) => x >= 0 && (i === 0 || x > ordem[i - 1])), JSON.stringify(ordem));
  // aviso interno: sem o botao do WhatsApp
  const interno = montarEmail({ texto: "Teste.\n\nVOICE Ambientes Inteligentes", tipo: "interna" });
  assert.ok(!interno.html.includes("Conversar no WhatsApp") && !interno.texto.includes("Converse com a gente"));
});
