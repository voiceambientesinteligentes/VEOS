import { api } from "../js/data/api.js";
import { telaDiagnosticoCfo } from "../js/ui/views/cfo.js";
import { ORCAMENTOS, RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

api.cfoFormulario = async () => ({ respostas: structuredClone(RESPOSTAS) });
api.cfoOrcamentos = async () => ORCAMENTOS;
rodar(async (v) => {
  await telaDiagnosticoCfo(v);
  const t = v.textContent;
  for (const s of ["Últimos orçamentos: o que está certo e o que corrigir", "Horas calculadas", "mostro também o cálculo com 65%", "Diagnóstico dos orçamentos", "2 orçamentos aceitos", "Mão de obra listada e depois tirada no desconto", "Item com custo entregue a preço zero", "Valor fechado numa linha só", "SIMULAÇÃO de impostos", "EST-T002", "Base de preços: todos os orçamentos", "Cobrado × o que deveria, item a item", "Perguntar ao CFO sobre o", "Produtos abaixo de 30%"]) if (!t.includes(s)) throw new Error(`falta: ${s}`);
  // recusado nao entra no diagnostico dos aceitos (so aparece no seletor de orcamentos)
  if ([...v.querySelectorAll("tbody td")].some((td) => td.textContent === "EST-T003")) throw new Error("recusado não entra");
  if (v.querySelectorAll(".cfo-analise").length !== 2) throw new Error(`analises: ${v.querySelectorAll(".cfo-analise").length}`);
  const sel = v.querySelector("#dg-orc");
  sel.value = "EST-T001"; sel.dispatchEvent(new Event("change"));
  if (v.querySelectorAll(".cfo-analise").length !== 1) throw new Error("seletor não filtrou");
  // a Base de precos leva ao orcamento pelo numero
  if (![...v.querySelectorAll("a")].some((a) => a.getAttribute("href") === "#/cfo/diagnostico?orc=EST-T001")) throw new Error("link da base para o orçamento");
});
