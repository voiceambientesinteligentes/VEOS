import { api } from "../js/data/api.js";
import { telaPedido } from "../js/ui/views/fluxo.js";
import { telaTermoAceite } from "../js/ui/views/obra.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
const PED = "11111111-1111-1111-1111-111111111111";
const enviados = [];
const pedido = { id: PED, numero: "PED-00001", cliente_nome: "Cliente TESTE", orcamento_numero: "EST-1", estado: "entregue", valor_total: "5000", custo_total: "2500",
  criado_em: "2026-09-20T10:00:00Z", entregue_em: "2026-09-28T10:00:00Z", projeto_zoho_id: "P1", aceite_em: caso === "aceito" ? "2026-09-30" : null, garantia_ate: caso === "aceito" ? "2027-09-30" : null };
Object.assign(api, {
  fluxoPedido: async () => ({ pedido, itens: [{ item_id: "900", nome: "Central TESTE", tipo: "produto", quantidade: 5, preco_unit: 1000, custo_unit: 500, reservado_pedido: 0, estoque: { fisico: 0, reservado: 0 } }],
    parcelas: [], notas: [], historico: [], anexos: [], compras: [], aprendizado: caso === "aceito" ? { id: "44444444-4444-4444-4444-444444444444", codigo: "BIB-0098", estado: "hipotese" } : null,
    margem: { receita: "5000.00", custo_orcado: "2500.00", margem_orcada_pct: "50.00", custo_real: { materiais_comprados: "2400.00", materiais_estoque: "0.00", outras_despesas: "150.00", mao_de_obra: "325.00", total: "2875.00" },
      margem_realizada: "2125.00", margem_realizada_pct: "42.50", desvio_pp: null, completo: false, lacunas: ["horas lançadas sem custo/hora"], estado: "entregue" },
    caixa: { recebido: "R$ 0,00", compromissos: "R$ 0,00", posicao: "R$ 0,00", exposicao: "R$ 0,00", pct: "0,00%", gatilho: "NAO ACIONADO", contas: 0, fonte: "Política V1.1" },
    horas: [{ id: 1, data: "2026-09-25", pessoa: "Técnico TESTE", horas: "6.5", custo_hora: "50.00", descricao: "instalação" }, { id: 2, data: "2026-09-26", pessoa: "Técnico TESTE", horas: "2", custo_hora: null, descricao: null }],
    obra: { projeto: { zoho_id: "P1", nome: "Obra TESTE", pct: "60", fim: "2026-10-30" }, tarefas: [
      { zoho_id: "T1", nome: "Passar cabos", lista: "Infra", status: { name: "Concluída" }, pct: "100", concluida: "true", fim: "2026-09-20" },
      { zoho_id: "T2", nome: "Programar central", lista: "Comissionamento", status: { name: "Aberta" }, pct: "0", concluida: "false", fim: null }] } }),
  fluxoProjetos: async () => ({ projetos: [{ zoho_id: "P1", nome: "Obra TESTE", status: "Ativo" }, { zoho_id: "P2", nome: "Outra TESTE", status: null }] }),
  fluxoAcao: async (id, acao, d) => { enviados.push([acao, d]); return acao === "aprendizado" ? { codigo: "BIB-0099" } : { ok: true }; },
});
const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));

rodar(async (v) => {
  if (caso === "termo") {
    await telaTermoAceite(v, PED);
    if (!v.textContent.includes("Termo de aceite da obra") || !v.textContent.includes("[Texto do termo aprovado ainda não incluído]")) throw new Error("termo incompleto");
    return;
  }
  await telaPedido(v, PED, { papel: "direcao" });
  const t = v.textContent;
  if (!t.includes("1/2 tarefas concluídas") || !t.includes("8,50 h lançadas") || !t.includes("incompleto (há lançamento sem custo/hora)")) throw new Error("obra/horas incompletas");
  if (caso === "aceito" && (!t.includes("Garantia até 30/09/2027") || !t.includes("BIB-0098"))) throw new Error("garantia/aprendizado ausente");
  if (!t.includes("Margem: orçada × realizada") || !t.includes("42,50%") || !t.includes("Lacunas: horas lançadas sem custo/hora")) throw new Error("margem ausente");
  if (caso === "margem") {
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Registrar aprendizado na Biblioteca").click();
    await espera();
    if (enviados[0]?.[0] !== "aprendizado") throw new Error(JSON.stringify(enviados));
  }
  if (caso === "lancar") {
    v.querySelector("#hr-pessoa").value = "Técnico TESTE";
    v.querySelector("#hr-horas").value = "3,5";
    v.querySelector("#hr-custo").value = "45,00";
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Lançar horas").click();
    await espera();
    v.querySelector("#ac-gar").value = "2027-10-01";
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Registrar aceite").click();
    await espera();
    const [h1, a1] = enviados;
    if (h1?.[0] !== "horas" || h1[1].horas !== "3.5" || h1[1].custo_hora !== "45.00") throw new Error(JSON.stringify(enviados));
    if (a1?.[0] !== "aceite" || a1[1].garantia_ate !== "2027-10-01") throw new Error(JSON.stringify(enviados));
  }
});
