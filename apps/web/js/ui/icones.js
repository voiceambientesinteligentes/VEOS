// Icones de linha (24x24, traco 1.7) do menu do VEOS. Sem bibliotecas externas (a CSP so permite o proprio site).
import { s } from "./dom.js";

const P = {
  hoje: ["M4 6.5h16v13H4z", "M4 10h16", "M8 4v4", "M16 4v4", "M8.5 14l2 2 4-4"],
  vender: ["M4 17l5-5 4 4 7-8", "M15 8h5v5"],
  operacao: ["M3.5 8L12 3.5 20.5 8v8L12 20.5 3.5 16z", "M3.5 8L12 12.5 20.5 8", "M12 12.5v8"],
  financeiro: ["M4 19.5h16", "M6.5 16v-5", "M11 16V7", "M15.5 16v-3.5", "M20 16V9.5"],
  empresa: ["M4 20V8l8-4 8 4v12", "M9 20v-5h6v5", "M8 10.5h.01", "M12 10.5h.01", "M16 10.5h.01"],
  biblioteca: ["M5 4.5h4v15H5z", "M10 4.5h4v15h-4z", "M15.5 5.2l3.6-1 3.6 14.6-3.6 1z"],
  ajustes: ["M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z", "M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.3 3h-4l-.3 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.3 2.7h4l.3-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"],
  orbita: ["M12 14.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z", "M2.5 12a9.5 4.3 0 1 0 19 0 9.5 4.3 0 1 0-19 0", "M18.6 8.6h.01"],
  ia: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"],
  mic: ["M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z", "M5.5 11a6.5 6.5 0 0 0 13 0", "M12 17.5V21", "M8.5 21h7"],
  enviar: ["M12 19V5", "M5.5 11.5L12 5l6.5 6.5"],
  fechar: ["M6 6l12 12", "M18 6L6 18"],
  som: ["M4 9.5h3.5L12 5.5v13l-4.5-4H4z", "M15.5 9a4 4 0 0 1 0 6", "M18 6.5a7.5 7.5 0 0 1 0 11"],
  expandir: ["M14 4h6v6", "M20 4l-7 7", "M10 20H4v-6", "M4 20l7-7"],
  mais: ["M12 5v14", "M5 12h14"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h10"],
  seta: ["M9 6l6 6-6 6"],
};

export function icone(nome, cls = "ico") {
  return s("svg", { viewBox: "0 0 24 24", class: cls, "aria-hidden": "true", fill: "none", stroke: "currentColor", "stroke-width": "1.7", "stroke-linecap": "round", "stroke-linejoin": "round" },
    ...(P[nome] ?? P.mais).map((d) => s("path", { d })));
}
