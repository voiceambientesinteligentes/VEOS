import { api } from "../js/data/api.js";
import { telaSetorComercial } from "../js/ui/views/comercial.js";
import { ORCAMENTOS, PLANO, RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
history.replaceState(null, "", `#/comercial?aba=${caso}`);
const enviados = [];
const espera = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const seg = (segmento, nome, clientes, orcamentos, ganhos, perdidos, abertos) => ({ segmento, nome, clientes, orcamentos, ganhos, perdidos, abertos, orcado: orcamentos * 20000, ganho: ganhos * 40000, ticket_ganho: ganhos ? 40000 : null, taxa_ganho_decididos: ganhos + perdidos ? Math.round((ganhos / (ganhos + perdidos)) * 1000) / 10 : null });
const cli = (nomes, segmento, orcamentos, ganhos) => ({ chave: nomes[0], nomes, segmento, orcamentos, ganhos, perdidos: 0, abertos: orcamentos - ganhos, orcado: orcamentos * 20000, ganho: ganhos * 40000, ultimo: "2026-09-30" });
Object.assign(api, {
  comercialBase: async () => ({ orcamentos: 20, clientes: 6, ganhos: 6, perdidos: 4, abertos: 10, pct_abertos: 50, ticket_ganho: 40000, mediana_orcamento: 21000, taxa_ganho_decididos: 60,
    por_segmento: [seg("especificador", "Arquitetos e designers (escritório como cliente)", 2, 9, 1, 1, 7), seg("construtora", "Construtoras, incorporadoras e empreendimentos", 1, 3, 2, 1, 0), seg("corporativo", "Corporativo, hotelaria e saúde", 1, 2, 1, 0, 1), seg("cliente_final", "Cliente final (pessoa física)", 2, 6, 2, 2, 2)],
    especificadores: [cli(["Studio TESTE.Arq", "Studio TESTEArq"], "especificador", 8, 1), cli(["Arq TESTE"], "especificador", 1, 0)],
    clientes_lista: [cli(["Studio TESTE.Arq", "Studio TESTEArq"], "especificador", 8, 1), cli(["Fulano TESTE"], "cliente_final", 4, 2)],
    concentracao: { nomes: ["Studio TESTE.Arq", "Studio TESTEArq"], orcamentos: 8, pct: 40 }, duplicados: [["Studio TESTE.Arq", "Studio TESTEArq"]],
    fonte: "Espelho do Zoho Books no VEOS (orçamentos)", segmento: "automático pelo nome do cliente: conferir" }),
  comercialImplantacao: async () => ({ papel: "direcao", estados: { "COM-B1": { codigo: "COM-B1", estado: "feito", evidencia: "Leads TESTE com origem", quem: "Fernando TESTE", atualizado_em: "2026-10-08T10:00:00Z" } } }),
  comercialMarcar: async (codigo, dados) => { enviados.push(["marcar", codigo, dados]); return { ok: true }; },
  comercialCadencias: async () => ({ desde: "2026-10-07", cadencias: [], em_cadencia: [{ registro_id: "r1", titulo: "Lead Ana TESTE", tipo: "lead", estado: "novo", cadencia: "lead_novo", cadencia_nome: "Lead novo (contato que chegou)",
    desde: "2026-10-08T12:00:00Z", contato: "Ana TESTE", toques: 6, feitos: 1, abertos: 1, proximo: { prazo: "2026-10-09", titulo: "Toque 2/6" }, rascunhos: 1 }] }),
  comercialBloqueio: async (d) => { enviados.push(["bloqueio", d]); return { ok: true, contato: d.contato }; },
  cfoFormulario: async () => ({ respostas: structuredClone(RESPOSTAS) }),
  cfoOrcamentos: async () => { const o = structuredClone(ORCAMENTOS); for (const x of o.orcamentos) x.data = new Date().toISOString().slice(0, 10); return o; },
  cfoPainel: async () => ({ leadsPorMes: {}, negociosPorMes: {} }),
  plano: async () => structuredClone(PLANO),
});
const tem = (v, lista) => { const t = v.textContent; for (const s of lista) if (!t.includes(s)) throw new Error(`falta: ${s}`); };

rodar(async (v) => {
  await telaSetorComercial(v, new AbortController().signal);
  await espera();
  if (caso === "visao") {
    tem(v, ["Setor comercial", "O que a base real mostra", "6 · 4 · 10", "50% sem decisão", "R$ 40.000,00", "cadastro duplicado", "Concentração: Studio TESTE.Arq", "Implantação do setor", "Decisões suas que travam o setor", "BIB-0105", "1 registro(s) em cadência"]);
  }
  if (caso === "implantacao") {
    tem(v, ["Decisões do fundador", "Base e processo", "Canais de atendimento", "COM-B1", "por Fernando TESTE", "Decisão do fundador"]);
    if (v.querySelector('input[aria-label="Evidência de COM-B1"]').value !== "Leads TESTE com origem") throw new Error("evidência salva não aparece");
    const sel = v.querySelector('select[aria-label="Situação de COM-C1"]');
    sel.value = "feito";
    v.querySelector('input[aria-label="Evidência de COM-C1"]').value = "WhatsApp Business TESTE configurado";
    sel.closest("li").querySelector("button").click();
    await espera();
    const e = enviados.find((x) => x[0] === "marcar");
    if (!e || e[1] !== "COM-C1" || e[2].estado !== "feito" || e[2].evidencia !== "WhatsApp Business TESTE configurado") throw new Error("marcar errado: " + JSON.stringify(enviados));
    tem(v, ["Salvo."]);
  }
  if (caso === "canais") tem(v, ["Canais de aquisição", "Arquitetos e designers de interiores", "Dono: CSO", "Oferta de entrada:", "O que a IA faz:", "Ferramenta (grátis):", "BIB-0105", "Cadência de follow-up: Parceiro em prospecção"]);
  if (caso === "followup") {
    tem(v, ["Registros em cadência", "Lead Ana TESTE", "1 feito(s) · 1 aberto(s) de 6", "Lead novo (contato que chegou)", "Proposta enviada", "D+0", "Responder em até 1 hora", "Quem pediu para não receber mensagens"]);
    v.querySelector('input[aria-label="Contato que pediu para sair"]').value = "sair@teste.invalid";
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Bloquear contato").click();
    await espera();
    if (enviados.find((x) => x[0] === "bloqueio")?.[1]?.contato !== "sair@teste.invalid") throw new Error("bloqueio não enviado");
    tem(v, ["não recebe mais rascunhos"]);
  }
  if (caso === "metas") tem(v, ["Quem define cada meta", "Faturamento do ano e do mês", "Mix de faturamento por segmento", "Lacuna: propor no Plano", "CEO"]);
  if (caso === "base") tem(v, ["Por segmento", "Arquitetos e designers (escritório como cliente)", "Especificadores (2)", "Studio TESTE.Arq / Studio TESTEArq", "Clientes com mais orçamentos", "1 nome(s) parecem o mesmo cliente"]);
  if (caso === "plano") tem(v, ["Plano comercial", "Da meta à semana", "Roteiros de abordagem", "Abrir os canais"]);
});
