// Grafico de barras mensais (SVG, sem bibliotecas). Barras finas com topo arredondado presas a
// linha de base, grade discreta, legenda quando ha 2+ series, dica por mes (hover/foco) e a
// mesma informacao em tabela. Valor ausente (null) = sem barra e "—" (lacuna, nao zero).
// Cores: classes .serie-1/.serie-2 (paleta validada para o fundo escuro em setores.css).
import { h, s, table } from "./dom.js";
import { escala, rotuloMes } from "../domain/painel.js";

export { escala, rotuloMes };

function barra(x, y0, largura, altura, classe) {
  const r = Math.min(4, largura / 2, altura);
  const y = y0 - altura;
  return s("path", { class: classe, d: `M${x},${y0} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${y0} Z` });
}

export function barrasMensais({ titulo, meses, series, formatar, compacto = (v) => formatar(v) }) {
  // largura interna proxima da real: o texto do eixo fica com ~11 px no celular e no computador
  const estreito = (globalThis.innerWidth ?? 1200) < 640;
  const W = estreito ? 340 : 900, H = estreito ? 200 : 230, esq = 52, dir = 6, topo = 12, base = 28;
  const vals = series.flatMap((se) => se.valores.filter((v) => v !== null && v !== undefined).map(Number));
  const { topo: maxEixo, marcas } = escala(Math.max(0, ...vals));
  const larguraGrupo = (W - esq - dir) / meses.length;
  const gap = 2, larguraBarra = Math.max(3, Math.min(18, (larguraGrupo * 0.7 - gap * (series.length - 1)) / series.length));
  const y = (v) => topo + (H - topo - base) * (1 - v / maxEixo);
  const y0 = H - base;
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "grafico", role: "img", "aria-label": titulo },
    marcas.map((m) => [s("line", { x1: esq, x2: W - dir, y1: y(m), y2: y(m), class: "grafico-grade" }),
      s("text", { x: esq - 6, y: y(m) + 4, class: "grafico-eixo", "text-anchor": "end" }, compacto(m))]),
    s("line", { x1: esq, x2: W - dir, y1: y0, y2: y0, class: "grafico-base" }),
    meses.map((mes, i) => {
      const x0 = esq + i * larguraGrupo + (larguraGrupo - (larguraBarra * series.length + gap * (series.length - 1))) / 2;
      const dica = `${rotuloMes(mes)}\n${series.map((se) => `${se.nome}: ${se.valores[i] === null || se.valores[i] === undefined ? "—" : formatar(se.valores[i])}`).join("\n")}`;
      return s("g", { class: "grafico-mes", tabindex: "0", "aria-label": dica.replace(/\n/g, "; ") },
        s("title", null, dica),
        s("rect", { x: esq + i * larguraGrupo, y: topo, width: larguraGrupo, height: H - topo - base + 4, class: "grafico-alvo" }),
        series.map((se, k) => {
          const v = se.valores[i];
          return v > 0 ? barra(x0 + k * (larguraBarra + gap), y0, larguraBarra, Math.max(1, y0 - y(Number(v))), `serie-${k + 1}`) : null;
        }),
        !estreito || i % 2 === (meses.length - 1) % 2 ? s("text", { x: esq + (i + 0.5) * larguraGrupo, y: H - 8, class: "grafico-eixo", "text-anchor": "middle" }, rotuloMes(mes)) : null);
    }));
  return h("figure", { class: "grafico-fig" },
    series.length > 1 ? h("div", { class: "grafico-legenda" }, series.map((se, k) => h("span", { class: "grafico-legenda-item" }, h("span", { class: `grafico-chave serie-${k + 1}-bg`, "aria-hidden": "true" }), se.nome))) : null,
    svg,
    h("details", { class: "method" }, h("summary", null, "Ver em tabela"),
      table({ caption: titulo, head: ["Mês", ...series.map((se) => se.nome)], align: ["", ...series.map(() => "r")],
        rows: meses.map((m, i) => [rotuloMes(m), ...series.map((se) => (se.valores[i] === null || se.valores[i] === undefined ? "—" : formatar(se.valores[i])))]) })));
}
