// Tela: contexto VOICE_360 - lista fixa de politicas oficiais (hash/status) ou
// resumo portatil NAO CANONICO, e o documento de consolidacao revisavel. Nada e
// escrito, promovido ou reclassificado no cofre.

import { api } from "../../data/api.js";
import { errorNotice, h, method, panel, stamp, table } from "../dom.js";

const tone = (estado) => (/^IMPLEMENTADO -/.test(estado) ? "ok" : /PARCIAL|PENDENTE|NAO DEFINIDA/.test(estado) ? "warn" : /NAO/.test(estado) ? "risk" : "neutral");

export async function renderVoice360(root) {
  root.append(h("header", { class: "view-head" }, h("div", null, h("span", { class: "eyebrow" }, "Contexto · VOICE_360"), h("h1", null, "Políticas e consolidação"), h("p", null, "Somente a lista fixa de políticas oficiais ativas é conferida. Derivados em rascunho não são lidos nem promovidos."))));
  let c;
  try {
    c = await api.voice360();
  } catch (e) {
    root.append(errorNotice(e.message));
    return;
  }
  const oficial = c.modo.startsWith("POLITICAS OFICIAIS");
  root.append(
    h(
      "div",
      { class: "stack" },
      panel(
        { title: "Políticas oficiais", subtitle: c.aviso, actions: stamp(oficial ? "Hash conferido" : "Resumo não canônico", oficial ? "ok" : "warn") },
        table({
          head: ["Política", "Presente", "Status (frontmatter)", "SHA-256", "Registro V1.1"],
          rows: c.politicas.map((p) => [
            h("span", null, p.nome, h("br"), h("span", { class: "hash" }, p.caminho)),
            p.presente ? "sim" : "não",
            p.status || "—",
            p.sha256 ? h("span", { class: "hash" }, `${p.sha256.slice(0, 16)}…`) : "—",
            "confere_registro_v11" in p ? (p.confere_registro_v11 === null ? "—" : p.confere_registro_v11 ? "confere" : "NÃO confere") : "—",
          ]),
        }),
        method("Resumo das regras citadas (portátil, NÃO canônico)", ...c.resumo_regras),
      ),
      panel(
        { title: c.consolidacao.titulo, subtitle: c.consolidacao.status },
        table({ caption: "Funções implementadas e fontes", head: ["Função", "Implementação", "Fontes", "Estado"], rows: c.consolidacao.funcoes.map((f) => [f.funcao, h("span", { class: "hash" }, f.implementacao), f.fontes.join("; "), stamp(f.estado, tone(f.estado))]) }),
        table({ caption: "Dependências (externas ao código)", head: ["Dependência", "Tipo", "Estado"], rows: c.consolidacao.dependencias.map((d) => [d.item, d.tipo, stamp(d.estado, tone(d.estado))]) }),
      ),
    ),
  );
}
