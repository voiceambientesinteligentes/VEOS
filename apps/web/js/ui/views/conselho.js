// Conselho consultivo: os 9 diretores (personas ficticias com metodos reais),
// cada um ligado ao seu setor. Base para a IA responder na voz de cada um no futuro.
import { CATALOGO } from "../../data/catalogo.js";
import { h, panel, stamp } from "../dom.js";

export function telaConselho(root) {
  root.append(
    panel({ title: "Conselho consultivo da VOICE", subtitle: "Nove diretores especialistas, cada um responsável por um setor. São personas fictícias que aplicam métodos consagrados; as metas que propõem só valem depois da sua aprovação." },
      h("div", { class: "grade-cartoes conselho" }, CATALOGO.map((s) => {
        const d = s.diretor;
        return h("a", { class: "panel panel-tight conselho-cartao", href: `#/setor/${s.id}/diretor` },
          h("div", { class: "row" }, stamp(s.sigla, "live"), h("span", { class: "field-hint" }, s.nome)),
          h("p", { class: "conselho-nome" }, d.nome),
          h("p", { class: "conselho-titulo" }, d.titulo),
          h("p", { class: "conselho-perfil" }, d.perfil),
          h("p", { class: "field-hint" }, (d.metodos || []).slice(0, 3).map((m) => m.nome).join(" · ")));
      }))),
  );
}
