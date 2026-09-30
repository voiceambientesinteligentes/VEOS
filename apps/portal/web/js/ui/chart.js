// Apresentacao: grafico SVG de caixa 30/60/90 (corrente x cenario).

import { areaFor, cashChartModel, compactBRL, pathFor } from "../domain/chart.js";
import { formatBRL } from "../domain/format.js";
import { h, s } from "./dom.js";

export function cashChart(data, { title = "Saldo projetado (TESTE)" } = {}) {
  const m = cashChartModel(data);
  const svg = s(
    "svg",
    { class: "chart", viewBox: `0 0 ${m.width} ${m.height}`, role: "img", "aria-labelledby": "cash-chart-title cash-chart-desc" },
    s("title", { id: "cash-chart-title", text: title }),
    s("desc", {
      id: "cash-chart-desc",
      text:
        "Corrente: " + m.a.map((p) => `${p.x === 0 ? "hoje" : p.x + " dias"} ${formatBRL(p.value)}`).join("; ") +
        (m.b ? ". Cenário: " + m.b.map((p) => `${p.x === 0 ? "hoje" : p.x + " dias"} ${formatBRL(p.value)}`).join("; ") : ""),
    }),
    s("defs", null, s("linearGradient", { id: "veos-grad-a", x1: "0", y1: "0", x2: "0", y2: "1" }, s("stop", { offset: "0%", "stop-color": "#c9a54c", "stop-opacity": "0.22" }), s("stop", { offset: "100%", "stop-color": "#c9a54c", "stop-opacity": "0" }))),
    m.ticks.map((t) => [
      s("line", { class: "grid", x1: m.pad.l, x2: m.width - m.pad.r, y1: t.y, y2: t.y }),
      s("text", { class: "tick", x: m.pad.l - 10, y: t.y + 4, "text-anchor": "end", text: compactBRL(t.value) }),
    ]),
    m.xTicks.map((t) => s("text", { class: "tick", x: t.x, y: m.height - 10, "text-anchor": "middle", text: t.label })),
    s("line", { class: "zero", x1: m.pad.l, x2: m.width - m.pad.r, y1: m.zeroY, y2: m.zeroY }),
    s("path", { class: "area-a", d: areaFor(m.a, m.zeroY) }),
    s("path", { class: "series-a", d: pathFor(m.a) }),
    m.b ? s("path", { class: "series-b", d: pathFor(m.b) }) : null,
    m.a.map((p) => s("circle", { class: "pt-a", cx: p.cx, cy: p.cy, r: 4 })),
    m.b ? m.b.map((p) => s("circle", { class: "pt-b", cx: p.cx, cy: p.cy, r: 3.5 })) : null,
  );
  const legend = h(
    "div",
    { class: "legend", "aria-hidden": "true" },
    h("span", null, h("i"), "Corrente"),
    m.b ? h("span", null, h("i", { class: "b" }), "Cenário (simulação)") : null,
    h("span", null, "Linha tracejada vermelha: saldo zero"),
  );
  return h("figure", { class: "stack-s" }, svg, legend);
}
