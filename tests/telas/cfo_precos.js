import { api } from "../js/data/api.js";
import { telaPrecosCfo } from "../js/ui/views/cfo.js";
import { CAMBIO, ORCAMENTOS, PRODUTOS, RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

api.cfoFormulario = async () => ({ respostas: structuredClone(RESPOSTAS) });
api.cfoOrcamentos = async () => ORCAMENTOS;
api.cfoProdutos = async () => structuredClone(PRODUTOS);
api.cfoCambio = async () => CAMBIO;
rodar(async (v) => {
  await telaPrecosCfo(v);
  const t = v.textContent;
  for (const s of ["PRD-T001", "SIMULAÇÃO: Simples Anexo I", "Custo da hora", "Vender por mês (mínimo)", "Faltam", "Dólar usado", "R$ 5,2079", "indicação 10%"]) if (!t.includes(s)) throw new Error(`falta: ${s}`);
  // PRD-T001: fator medido 111,69 / 92,69 = 1,205 -> custo R$ 111,69; imposto simulado Anexo I (RBT12 310.655)
  const linha = [...v.querySelectorAll("tbody tr")].find((tr) => tr.textContent.includes("PRD-T001"));
  if (!linha.textContent.includes("1,205") || !linha.textContent.includes("R$ 111,69")) throw new Error(linha.textContent);
  // 2027 sem aliquota do contador: lacuna, sem preco
  const c = v.querySelector("#cp-cenario");
  c.value = "2027";
  c.dispatchEvent(new Event("change"));
  if (!v.textContent.includes("LACUNA: o contador precisa informar a alíquota de 2027")) throw new Error("2027 deveria ser lacuna");
  c.value = "2026";
  c.dispatchEvent(new Event("change"));
  v.querySelector("#cp-busca").value = "projetor";
  v.querySelector("#cp-busca").dispatchEvent(new Event("input"));
  if ([...v.querySelectorAll("tbody tr")].filter((tr) => tr.textContent.includes("PRD-")).length !== 1) throw new Error("filtro");
});
