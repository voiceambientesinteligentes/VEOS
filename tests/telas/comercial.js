import { api } from "../js/data/api.js";
import { telaComercial } from "../js/ui/views/painel_dono.js";
import { ORCAMENTOS, PLANO, RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

const hoje = new Date().toISOString().slice(0, 10);
const orc = structuredClone(ORCAMENTOS);
for (const o of orc.orcamentos) o.data = hoje;
api.cfoFormulario = async () => ({ respostas: structuredClone(RESPOSTAS) });
api.cfoOrcamentos = async () => orc;
api.cfoPainel = async () => ({ leadsPorMes: {}, negociosPorMes: {} });
api.plano = async () => structuredClone(PLANO);
rodar(async (v) => {
  await telaComercial(v);
  const t = v.textContent;
  for (const s of ["Plano comercial", "Da meta à semana", "Toques de prospecção", "Canais: onde estão os clientes", "Roteiros de abordagem", "Showroom: próprio e com parceiros", "CASACOR SC Brava"]) if (!t.includes(s)) throw new Error(`falta: ${s}`);
  const meta = v.querySelector("#cm-meta");
  meta.value = "120000"; meta.dispatchEvent(new Event("input"));
  const inv = v.querySelector("#sh-inv");
  inv.value = "50000"; inv.dispatchEvent(new Event("input"));
  if (!v.textContent.includes("vendas para recuperar o investimento")) throw new Error("showroom");
});
