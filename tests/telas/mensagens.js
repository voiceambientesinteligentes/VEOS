import { api } from "../js/data/api.js";
import { telaMensagens } from "../js/ui/views/mensagens.js";
import { telaRadar } from "../js/ui/views/radar.js";
import { telaConta } from "../js/ui/views/usuarios.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
const enviados = [];
const MSG = (estado) => [
  { id: "11111111-1111-1111-1111-111111111111", canal: "whatsapp", destinatario: "(47) 99999-0000", assunto: null, corpo: "Olá, Cliente TESTE! Lembrete da parcela.", setor_id: "financas", origem: "alerta:FLX_TESTE", estado, criado_em: "2026-10-01T10:00:00Z", autor: "Fernando TESTE", enviada_por_nome: estado === "enviada" ? "Fernando TESTE" : null, enviada_em: estado === "enviada" ? "2026-10-01T11:00:00Z" : null, motivo_descarte: null },
  { id: "22222222-2222-2222-2222-222222222222", canal: "email", destinatario: "cliente@teste.invalid", assunto: "Proposta EST-1 · VOICE", corpo: "Segue a proposta TESTE.", setor_id: null, origem: "proposta:1", estado, criado_em: "2026-10-01T09:00:00Z", autor: "Fernando TESTE", enviada_por_nome: null, enviada_em: null, motivo_descarte: null },
];
const RESUMOS = [{ setor: "financas", data: "2026-10-01", alertas_ativos: 2, alertas_por_severidade: { ALTO: 1 }, alertas_novos_24h: [{ titulo: "Parcela vencida TESTE", severidade: "ALTO" }], resolvidos_24h: 0, tarefas_abertas: 3, tarefas_atrasadas: [{ titulo: "Cobrar TESTE", prazo: "2026-09-29" }], tarefas_hoje: 1, mensagens_rascunho: 1 },
  { setor: "vendas", data: "2026-10-01", alertas_ativos: 0, alertas_por_severidade: {}, alertas_novos_24h: [], resolvidos_24h: 0, tarefas_abertas: 0, tarefas_atrasadas: [], tarefas_hoje: 0, mensagens_rascunho: 0 }];
Object.assign(api, {
  mensagens: async (estado) => ({ mensagens: MSG(estado) }),
  mensagemCriar: async (d) => { enviados.push(["criar", d]); return { id: "x" }; },
  mensagemMarcar: async (id, estado, d) => { enviados.push([estado, id, d]); return { estado }; },
  resumo: async () => ({ resumos: RESUMOS }),
  radar: async () => ({ setores: ["financas", "vendas"], ultima_varredura: { em: "2026-10-01T06:17:00Z", origem: "automatica" }, tarefas: [],
    alertas: [{ id: "a1", chave: "FLX_PARCELA_VENCIDA:1", setor_id: "financas", sentinela: "FLX_PARCELA_VENCIDA", severidade: "ALTO", titulo: "Parcela vencida TESTE", mensagem: "Cliente TESTE", fonte: "Fluxo", notificar: [],
      rascunhos: [{ tipo: "whatsapp", assunto: "", corpo: "Olá TESTE" }], atualizado_em: "2026-10-01T10:00:00Z" }] }),
});
window.confirm = () => true;
window.prompt = () => "TESTE motivo";
const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));

rodar(async (v) => {
  if (caso === "lista") {
    await telaMensagens(v);
    const wa = v.querySelector('a[href^="https://wa.me/5547999990000?text="]');
    const mail = v.querySelector('a[href^="mailto:cliente%40teste.invalid?subject="]');
    if (!wa || !mail) throw new Error("links de envio errados");
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Marquei como enviada").click();
    await espera();
    if (enviados[0]?.[0] !== "enviada") throw new Error(JSON.stringify(enviados));
  }
  if (caso === "nova") {
    await telaMensagens(v);
    v.querySelector("#ms-corpo").value = "Mensagem TESTE";
    v.querySelector("#ms-canal").value = "whatsapp";
    v.querySelector("form").requestSubmit();
    await espera();
    if (enviados[0]?.[1]?.canal !== "whatsapp" || enviados[0][1].corpo !== "Mensagem TESTE") throw new Error(JSON.stringify(enviados));
  }
  if (caso === "radar") {
    await telaRadar(v, new AbortController().signal);
    if (!v.textContent.includes("Resumo do dia") || !v.textContent.includes("1 atrasada(s)")) throw new Error("resumo ausente");
    const b = [...v.querySelectorAll("button")].find((x) => x.textContent === "Levar à caixa de saída");
    b.click();
    await espera();
    if (enviados[0]?.[1]?.origem !== "alerta:FLX_PARCELA_VENCIDA:1" || enviados[0][1].canal !== "whatsapp") throw new Error(JSON.stringify(enviados));
  }
  if (caso === "conta") {
    await telaConta(v, { nome: "Fernando TESTE", email: "f@teste.invalid", papel: "direcao", aal: "aal1", exige_mfa: false }, { fatoresMfa: async () => [] });
    if (!v.textContent.includes("Avisos no navegador")) throw new Error("painel de avisos ausente");
  }
});
