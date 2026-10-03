import { api } from "../js/data/api.js";
import { telaNegociacao } from "../js/ui/views/precificacao.js";
import { RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));
api.cfoFormulario = async () => ({ respostas: structuredClone(RESPOSTAS) });
api.cfoCambio = async () => ({ serie: [{ data: "2026-10-01", venda: 5.2079 }] });
const ORC = {
  a: { id: "a", numero: "EST-TA", cliente: "Cliente TESTE", subtotal: "10000.00", total: "10000.00", status: "draft", itens: [{ tipo: "produto", nome: "Interruptor TESTE", quantidade: "10", custo_unit: "150", venda_unit: "300" }, { tipo: "servico", nome: "Instalação TESTE", quantidade: "20", custo_unit: "50", venda_unit: "350" }] },
  b: { id: "b", numero: "EST-TB", cliente: "Cliente TESTE", subtotal: "5000.00", total: "5000.00", status: "draft", itens: [{ tipo: "produto", nome: "Access point TESTE", quantidade: "2", custo_unit: "900", venda_unit: "1800" }, { tipo: "servico", nome: "Rede TESTE", quantidade: "4", custo_unit: "50", venda_unit: "350" }] },
};
const fontes = {
  orcamentos: async () => ({ orcamentos: Object.values(ORC).map((o) => ({ id: o.id, numero: o.numero, cliente: o.cliente, data: "2026-10-01", total: o.total, status: o.status })) }),
  orcamento: async (id) => ORC[id],
};
rodar(async (v) => {
  telaNegociacao(v, fontes);
  await espera(300);
  v.querySelector("#neg-somar").checked = true;
  v.querySelector("#neg-somar").dispatchEvent(new Event("change"));
  for (const b of v.querySelectorAll(".orc-item")) { b.click(); await espera(); }
  if (v.querySelector("#neg-ref").value !== "EST-TA + EST-TB") throw new Error(`referência: ${v.querySelector("#neg-ref").value}`);
  if (!v.querySelector("#neg-tabela").value.startsWith("15.000")) throw new Error(`preço global: ${v.querySelector("#neg-tabela").value}`);
  if (!v.textContent.includes("Somando 2 orçamento(s)")) throw new Error("sem aviso de soma");
  // canal com RT lanca comissao e RT
  const canal = v.querySelector("#neg-canal");
  canal.value = "Com RT/indicação"; canal.dispatchEvent(new Event("change"));
  if (![...v.querySelectorAll("input")].some((i) => i.value.startsWith("RT / indicação"))) throw new Error("RT não lançada");
  // condicao sugerida pelo CFO
  [...v.querySelectorAll("button")].find((b) => b.textContent === "Condição sugerida pelo CFO").click();
  await espera(200);
  const cond = v.querySelector("#neg-condicao").value;
  if (!/sinal/.test(cond) || !/R\$ 5,2079/.test(cond)) throw new Error(`condição: ${cond}`);
  // tirar um orcamento da soma
  v.querySelector(".orc-item").click(); await espera();
  if (v.querySelector("#neg-ref").value !== "EST-TB") throw new Error("não tirou da soma");
});
