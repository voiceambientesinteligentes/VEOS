import { api } from "../js/data/api.js";
import { telaPlano } from "../js/ui/views/estrategia.js";
import { PLANO } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

const mudancas = [];
const criados = [];
const dados = structuredClone(PLANO);
window.confirm = () => true;
api.plano = async () => structuredClone(dados);
api.planoMudar = async (id, d) => { mudancas.push({ id, ...d }); const i = dados.itens.find((x) => x.id === id); if (d.estado) i.estado = d.estado; return { ok: true }; };
api.planoCriar = async (d) => { criados.push(d); return { id: "x", codigo: "PL-004" }; };
const espera = () => new Promise((r) => setTimeout(r, 80));
rodar(async (v) => {
  await telaPlano(v);
  const t = v.textContent;
  for (const s of ["Plano da VOICE", "Dias 1 a 30 · Estancar e enxergar", "Meses 4 a 6 · Crescer", "Fluxo de caixa semanal TESTE", "Alvo (proposta)", "Aguardando sua decisão", "Histórico (1)"]) if (!t.includes(s)) throw new Error(`falta: ${s}`);
  // aprovar um item
  const item = v.querySelector("#item-PL-001");
  [...item.querySelectorAll("button")].find((b) => b.textContent === "Aprovar").click();
  await espera();
  if (mudancas[0]?.estado !== "aprovado") throw new Error(JSON.stringify(mudancas));
  // aprovar em lote (sobrou 1 proposto na fase: botao de lote so aparece com 2+)
  if ([...v.querySelectorAll("button")].some((b) => /Aprovar os \d+ propostos/.test(b.textContent))) throw new Error("lote com 1 item");
  // filtro por area
  v.querySelector("#pl-area").value = "operacoes";
  v.querySelector("#pl-area").dispatchEvent(new Event("change"));
  if (v.querySelectorAll(".plano-item").length !== 1) throw new Error("filtro");
});
