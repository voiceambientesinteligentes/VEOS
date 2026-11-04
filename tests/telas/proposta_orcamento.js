// CSO-04: proposta em PDF a partir do orcamento proprio do VEOS (sem Zoho).
import { api } from "../js/data/api.js";
import { telaProposta } from "../js/ui/views/proposta.js";
import { rodar } from "./_kit.js";

const ID = "11111111-2222-3333-4444-555555555555";
const ORC = {
  numero: "ORV-00042", cliente_nome: "Cliente TESTE VEOS", cliente_zoho_id: null, referencia: "Negociação 03/11", condicao: "30% na assinatura, 70% na entrega",
  valor_total: 8500, desconto: 500, criado_em: "2026-11-03", observacao: "Garantia de 1 ano. TESTE",
};
const ITENS = [
  { ordem: 1, secao: "Sala", nome: "Central de automação TESTE", descricao: "Controle de cenas", quantidade: "2", unidade: "un", preco_unit: "2500", custo_unit: "900", tipo: "produto", item_id: null },
  { ordem: 2, secao: "Sala", nome: "Programação TESTE", quantidade: "4", unidade: "h", preco_unit: "1000", custo_unit: "300", tipo: "servico", item_id: null },
];
Object.assign(api, { comercialOrcamento: async (id) => (id === ID ? { orcamento: ORC, itens: ITENS } : Promise.reject(new Error("id inesperado"))) });

rodar(async (v) => {
  await telaProposta(v, ID);
  const doc = v.querySelector(".proposta-doc").textContent;
  for (const t of ["ORV-00042", "Cliente TESTE VEOS", "Sala", "Central de automação TESTE", "Programação TESTE", "R$ 5.000,00", "R$ 4.000,00", "Investimento total", "R$ 8.500,00", "VEOS"]) {
    if (!doc.includes(t)) throw new Error(`faltou no documento: ${t}`);
  }
  if (/custo|margem/i.test(doc)) throw new Error("custo/margem não pode ir para o cliente");
  // formato global: produto e servico separados pelo _tipo de cada item (nao precisa adivinhar, como no Zoho)
  const formato = v.querySelector("#pp-formato");
  formato.value = "global"; formato.dispatchEvent(new Event("input", { bubbles: true }));
  const global = v.querySelector(".proposta-doc").textContent;
  if (!global.includes("Equipamentos e materiais") || !global.includes("Mão de obra")) throw new Error("global sem os dois grupos (produto e serviço)");
  if (global.includes("R$ 2.500,00") || global.includes("R$ 1.000,00")) throw new Error("global não deveria ter valor unitário por item");
  // condicao de pagamento sugerida (sem exigir contato do Zoho, que este orcamento nao tem)
  if (!v.querySelector("#pp-pag").value) throw new Error("condição de pagamento vazia");
});
