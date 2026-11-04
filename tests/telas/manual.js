import { api } from "../js/data/api.js";
import { telaSetor } from "../js/ui/views/setor.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
api.setor = async () => ({ registros: [], alertas: [], tarefas: [], historico: [] });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

rodar(async (v) => {
  if (caso === "marketing" || caso === "vendas") {
    await telaSetor(v, caso, new AbortController().signal, "manual");
    await espera(600);
    const t = v.textContent;
    for (const x of ["Manual de atuação", "Como age em cada pedido", "Métodos e frameworks", "Indicadores que acompanha", "Fontes pesquisadas"]) if (!t.includes(x)) throw new Error(`faltou: ${x}`);
    const busca = v.querySelector('input[type="search"]');
    busca.value = caso === "marketing" ? "campanha arquitetos" : "proposta negociação";
    busca.dispatchEvent(new Event("input"));
    if (!v.textContent.includes("Procedimento(s) mais próximo(s)")) throw new Error("busca no manual nao achou procedimento");
  }
});
