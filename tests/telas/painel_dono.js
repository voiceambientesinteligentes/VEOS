import { api } from "../js/data/api.js";
import { telaPainelDono } from "../js/ui/views/painel_dono.js";
import { ORCAMENTOS, PLANO, RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

const hoje = new Date().toISOString().slice(0, 10);
const orc = structuredClone(ORCAMENTOS);
orc.orcamentos[0].data = hoje; // aceito neste mes
orc.orcamentos[1].data = hoje.slice(0, 8) + "01";
api.cfoFormulario = async () => ({ respostas: structuredClone(RESPOSTAS) });
api.cfoOrcamentos = async () => orc;
api.cfoPainel = async () => ({ leadsPorMes: { [hoje.slice(0, 7)]: 3 }, negociosPorMes: {} });
api.plano = async () => structuredClone(PLANO);
rodar(async (v) => {
  await telaPainelDono(v);
  const t = v.textContent;
  for (const s of ["Painel do dono", "Quanto preciso vender por mês", "Ponto de equilíbrio", "Simulação: duas obras que pagam o mês", "Metas do mês", "proposta", "Funil: contatos, orçamentos e vendas", "O que falta para fechar custos", "Perguntar ao CFO", "Impostos ainda SIMULADOS"]) if (!t.includes(s)) throw new Error(`falta: ${s}`);
  if (!v.querySelector(".grafico")) throw new Error("sem gráfico");
  const barra = v.querySelector(".barra-progresso > span");
  if (!barra || !/^\d+(\.\d+)?%$/.test(barra.style.width) || barra.getAttribute("style")?.includes("width:1")) throw new Error(`barra: ${barra?.style.width}`);
  // passo a passo abre e tem a tabela das saidas
  const passo = [...v.querySelectorAll("details")].find((d) => d.textContent.includes("Como chegamos nesse número"));
  if (!passo || !passo.textContent.includes("Sua retirada")) throw new Error("passo a passo incompleto");
  // trocar o canal muda a margem
  const antes = v.querySelector(".cfo-stats").textContent;
  const c = v.querySelector("#pd-canal");
  c.value = c.options[1].value; c.dispatchEvent(new Event("change"));
  if (v.querySelector(".cfo-stats").textContent === antes) throw new Error("canal não mudou o cálculo");
});
