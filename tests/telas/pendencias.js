import { telaPendencias } from "../js/ui/views/pendencias.js";
import { DIRETORES } from "../js/data/pendencias_projeto.js";
import { rodar } from "./_kit.js";

rodar(async (v) => {
  telaPendencias(v, new AbortController().signal);
  const t = () => v.textContent;
  for (const s of ["Linha de fluxo", "CFO", "CEO", "Próximos passos", "Esperando você"]) if (!t().includes(s)) throw new Error(`falta: ${s}`);
  if (v.querySelectorAll(".pj-no").length !== DIRETORES.length) throw new Error("nos do fluxo");
  if (DIRETORES[0].id !== "financas") throw new Error("o financeiro deve ser o primeiro");
  // cada aba de diretor abre e lista topicos com passos
  for (const d of DIRETORES) {
    v.querySelector(`[data-aba="${d.id}"]`).click();
    if (!t().includes(d.nome)) throw new Error(`aba ${d.id}`);
  }
  // filtro "Todos" mostra todos os topicos do ultimo diretor
  const f = v.querySelector("#pj-filtro");
  f.value = "todos"; f.dispatchEvent(new Event("change"));
  if (v.querySelectorAll(".pj-topico").length !== DIRETORES.at(-1).topicos.length) throw new Error("filtro todos");
  v.querySelector('[data-aba="quem"]').click();
  if (!t().includes("Fernando") || !t().includes("Contador")) throw new Error("quem precisa agir");
});
