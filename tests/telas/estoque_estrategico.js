import { api } from "../js/data/api.js";
import { telaEstoqueEstrategico } from "../js/ui/views/estrategia.js";
import { CAMBIO, ORCAMENTOS, RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

const hoje = new Date().toISOString().slice(0, 10);
const orc = structuredClone(ORCAMENTOS);
for (const o of orc.orcamentos) o.data = hoje; // dentro dos 12 meses
api.cfoFormulario = async () => ({ respostas: structuredClone(RESPOSTAS) });
api.cfoOrcamentos = async () => orc;
api.cfoCambio = async () => CAMBIO;
rodar(async (v) => {
  await telaEstoqueEstrategico(v);
  const t = v.textContent;
  for (const s of ["Estoque estratégico", "Ainda não é hora.", "Dólar hoje (PTAX)", "abaixo da média", "Interruptor Touch TESTE", "Lote sugerido"]) if (!t.includes(s)) throw new Error(`falta: ${s}`);
  v.querySelector("#es-fech").value = "100";
  v.querySelector("#es-fech").dispatchEvent(new Event("input"));
});
