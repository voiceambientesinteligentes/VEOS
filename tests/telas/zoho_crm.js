// Historico do CRM do Zoho: botao "Levar ao funil do VEOS" na ficha de lead e de negocio, com a API simulada.
import { api } from "../js/data/api.js";
import { telaZoho } from "../js/ui/views/zoho.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1) || "lead";
const LEAD = { zoho_id: "99", nome: "Maria TESTE", modificado_em: "2025-01-02T10:00:00Z", sincronizado_em: "2026-11-05T10:00:00Z", excluido: false, dados: { id: "99", Full_Name: "Maria TESTE", Mobile: "(47) 99999-1111", Email: "maria@veos-teste.invalid", Lead_Source: "Casa Hall Shopping", Company: "Studio TESTE", City: "Itajaí" } };
const NEG = { zoho_id: "55", nome: "Casa TESTE", modificado_em: "2025-01-02T10:00:00Z", sincronizado_em: "2026-11-05T10:00:00Z", excluido: false, dados: { id: "55", Deal_Name: "Casa TESTE", Stage: "Ganho", Amount: 85000, Account_Name: { name: "Família TESTE" }, Closing_Date: "2025-08-20", Lead_Source: "Parceiro" } };
const criados = [];
Object.assign(api, {
  zohoStatus: async () => ({ conectado: true, produtos: ["books", "crm", "projects"] }),
  zohoEspelho: async () => ({ produtos: ["books", "crm", "projects"], contagens: [{ produto: "crm", modulo: "Leads", total: 28 }, { produto: "crm", modulo: "Deals", total: 14 }], sync: [], ultima_rodada: null }),
  zohoEspelhoRegistro: async () => (caso === "lead" ? LEAD : NEG),
  setor: async () => ({ setor: "vendas", registros: [], tarefas: [], alertas: [] }),
  criarRegistro: async (r) => { criados.push(r); return { id: "r1", ...r }; },
});

rodar(async (v) => {
  const t = () => v.textContent;
  const exigir = (...xs) => { for (const x of xs) if (!t().includes(x)) throw new Error(`falta: ${x}`); };
  await telaZoho(v, ["zoho", "crm", caso === "lead" ? "Leads" : "Deals", caso === "lead" ? "99" : "55"], { papel: "direcao" });
  await new Promise((r) => setTimeout(r, 30));
  const botao = [...v.querySelectorAll("button")].find((b) => b.textContent === "Levar ao funil do VEOS");
  if (!botao) throw new Error("botão 'Levar ao funil do VEOS' não aparece");
  botao.click();
  await new Promise((r) => setTimeout(r, 30));
  if (caso === "lead") {
    exigir("Levar este lead ao funil");
    if (v.querySelector("#f-lead-nome_contato")?.value !== "Maria TESTE") throw new Error("nome não veio preenchido");
    if (!(v.querySelector("#f-lead-interesse")?.value ?? "").includes("Leads 99")) throw new Error("origem do Zoho não ficou escrita no registro");
    if (v.querySelector("#f-lead-tipo_imovel")?.value) throw new Error("tipo de imóvel não pode ser inventado");
  } else {
    exigir("Levar este negócio ao funil");
    if (v.querySelector("#f-oportunidade-cliente_nome")?.value !== "Família TESTE") throw new Error("cliente não veio");
    if (v.querySelector("#f-oportunidade-estado")?.value !== "ganha") throw new Error("etapa não foi mapeada");
    if (!(v.querySelector("#f-oportunidade-proximo_passo")?.value ?? "").includes("Deals 55")) throw new Error("origem do Zoho não ficou escrita");
  }
});
