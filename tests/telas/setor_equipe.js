// Aba Equipe da pagina do setor: organograma + cartoes de cargo com a agenda.
import { api } from "../js/data/api.js";
import { CATALOGO } from "../js/data/catalogo.js";
import { telaSetor } from "../js/ui/views/setor.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
api.setor = async () => ({ registros: [], alertas: [], tarefas: [], historico: [] });

rodar(async (v) => {
  await telaSetor(v, caso, new AbortController().signal, "equipe");
  const s = CATALOGO.find((x) => x.id === caso);
  const t = v.textContent;
  for (const x of ["Organograma do setor", "Cargos e atividades", "Todo dia", "Toda semana", "Todo mês", "estrutura da empresa inteira"]) if (!t.includes(x)) throw new Error(`faltou: ${x}`);
  if (v.querySelectorAll(".eo-arvore .eo-no").length !== s.equipe.length + 1) throw new Error("organograma incompleto");
  for (const p of s.equipe) if (!t.includes(p.nome)) throw new Error(`cargo ausente: ${p.nome}`);
});
