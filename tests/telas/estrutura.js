import { CATALOGO } from "../js/data/catalogo.js";
import { telaEstrutura } from "../js/ui/views/estrutura.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1) || "geral";

rodar(async (v) => {
  telaEstrutura(v, new AbortController().signal, caso);
  const t = () => v.textContent;
  if (caso === "geral") {
    for (const s of ["Organograma da VOICE", "Essenciais agora", "Quando crescer"]) if (!t().includes(s)) throw new Error(`falta: ${s}`);
    if (v.querySelectorAll(".eo-setor").length !== CATALOGO.length) throw new Error("um bloco por setor");
    const cargos = CATALOGO.reduce((n, s) => n + s.equipe.length, 0);
    if (v.querySelectorAll(".eo-setor .eo-no").length !== cargos + CATALOGO.length) throw new Error("todos os cargos e diretores no organograma");
    v.querySelector('[data-aba="vendas"]').click();
    if (!t().includes("Gerente comercial")) throw new Error("aba do setor");
  } else if (caso === "acumulo") {
    if (!t().includes("Quem acumula o quê")) throw new Error("titulo acumulo");
    if (!v.querySelectorAll(".pj-topico").length) throw new Error("lista de acumulos");
  } else {
    const s = CATALOGO.find((x) => x.id === caso);
    if (v.querySelectorAll(".eo-cargo").length !== s.equipe.length + 1) throw new Error("cartao para diretor e cada cargo");
    for (const r of ["Todo dia", "Toda semana", "Todo mês", "Decide sozinho", "Leva ao chefe"]) if (!t().includes(r)) throw new Error(`falta: ${r}`);
    // clicar num cargo do organograma abre o cartao dele
    const p = s.equipe.at(-1);
    v.querySelector(`.eo-arvore [data-papel="${p.papel}"]`).click();
    if (!v.querySelector(`#cargo-${s.id}-${p.papel}`).open) throw new Error("clique no organograma abre o cartao");
  }
});
