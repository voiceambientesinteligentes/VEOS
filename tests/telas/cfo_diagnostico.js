import { api } from "../js/data/api.js";
import { telaDiagnosticoCfo } from "../js/ui/views/cfo.js";
import { ORCAMENTOS, RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

api.cfoFormulario = async () => ({ respostas: structuredClone(RESPOSTAS) });
api.cfoOrcamentos = async () => ORCAMENTOS;
rodar(async (v) => {
  await telaDiagnosticoCfo(v);
  const t = v.textContent;
  for (const s of ["Diagnóstico dos orçamentos", "2 orçamentos aceitos", "Mão de obra listada e depois tirada no desconto", "Item com custo entregue a preço zero", "Valor fechado numa linha só", "SIMULAÇÃO de impostos", "EST-T002"]) if (!t.includes(s)) throw new Error(`falta: ${s}`);
  if (t.includes("EST-T003")) throw new Error("recusado não entra");
});
