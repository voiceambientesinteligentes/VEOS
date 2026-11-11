// POR ONDE SAI O E-MAIL do VEOS (Brevo ou Gmail) e os limites do dia. Usado pela caixa de saida (envio), pela tela
// Integracoes (situacao) e pela IA (texto "pronto para enviar pela ..."). A escolha em si e pura:
// escolherViaEmail em _shared/dominio/brevo.js.
import { servico } from "./banco.ts";
import { lerIntegracao } from "./integracoes.ts";
import { inicioDoDiaSP, ponteLigada } from "./google.ts";
import { brevoPronta } from "./brevo.ts";
import { escolherViaEmail, VIAS_EMAIL } from "./dominio/brevo.js";

export const LIMITE_GMAIL_DIA = 80; // o Gmail gratuito aceita ~100 destinatarios/dia pela ponte
export const LIMITE_BREVO_DIA = 280; // plano gratis da Brevo: 300/dia (folga para o teste)
export const LIMITE_PROSPECCAO_DIA = 30; // prospeccao 1:1 (nada de disparo em massa), somando os dois caminhos

/** E-mails enviados pelo VEOS hoje (Brasilia), por caminho. Envio simulado (robo de teste) nao conta. */
export async function enviadosHoje() {
  const desde = encodeURIComponent(inicioDoDiaSP());
  const ms: { via: string; tipo: string }[] = await servico(`/rest/v1/mensagens_saida?via=in.(gmail,brevo)&enviada_em=gte.${desde}&select=via,tipo&limit=1000`);
  return {
    todos: ms.length,
    gmail: ms.filter((m) => m.via === "gmail").length,
    brevo: ms.filter((m) => m.via === "brevo").length,
    prospeccao: ms.filter((m) => m.tipo === "prospeccao").length,
  };
}

/** O que esta ligado para enviar e o padrao escolhido em Integracoes. */
export async function caminhosDeEnvio() {
  const [ponte, brevo, pref] = await Promise.all([ponteLigada().catch(() => null), brevoPronta(), lerIntegracao("email_envio").catch(() => null)]);
  const padrao = ["gmail", "brevo"].includes(String(pref?.dados?.via)) ? String(pref?.dados?.via) : null;
  return { ponte, brevo, padrao };
}

/** Caminho que o VEOS usaria agora (ou null) com o nome para a tela/IA. */
export async function viaDeEnvio(responderA: string | null = null) {
  const c = await caminhosDeEnvio();
  const via = escolherViaEmail({ gmail: Boolean(c.ponte), brevo: Boolean(c.brevo), padrao: c.padrao, responderA });
  return { ...c, via, info: via ? VIAS_EMAIL[via as "brevo" | "gmail"] : null };
}

export const limiteDoDia = (via: string | null) => (via === "brevo" ? LIMITE_BREVO_DIA : LIMITE_GMAIL_DIA);
