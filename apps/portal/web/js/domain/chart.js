// Dominio: modelo geometrico do grafico de caixa 30/60/90 (sem DOM).
// Os valores exibidos continuam vindo do servidor como texto; numeros aqui
// servem apenas para posicionar pontos.

import { toNumber } from "./format.js";

export function niceStep(range, targetTicks = 4) {
  if (!(range > 0)) return 1;
  const raw = range / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

export function cashSeries(saldo, linhas) {
  return [{ x: 0, value: saldo }, ...linhas.map((l) => ({ x: l.horizonte, value: l.saldo_final }))];
}

export function cashChartModel({ saldo, corrente, cenario }, { width = 640, height = 260, pad = { t: 16, r: 16, b: 32, l: 72 } } = {}) {
  const a = cashSeries(saldo, corrente);
  const b = cenario ? cashSeries(saldo, cenario) : null;
  const vals = [...a, ...(b || [])].map((p) => toNumber(p.value));
  let min = Math.min(0, ...vals);
  let max = Math.max(0, ...vals);
  if (min === max) max = min + 1;
  const step = niceStep(max - min);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const xMax = Math.max(...a.map((p) => p.x), 1);
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const sx = (x) => pad.l + (x / xMax) * iw;
  const sy = (v) => pad.t + (1 - (v - min) / (max - min)) * ih;
  const pts = (s) => s.map((p) => ({ ...p, cx: sx(p.x), cy: sy(toNumber(p.value)) }));
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push({ value: v, y: sy(v) });
  return {
    width,
    height,
    pad,
    min,
    max,
    ticks,
    zeroY: sy(0),
    xTicks: a.map((p) => ({ x: sx(p.x), label: p.x === 0 ? "hoje" : `${p.x}d` })),
    a: pts(a),
    b: b ? pts(b) : null,
    baseline: pad.t + ih,
  };
}

export function pathFor(points) {
  return points.map((p, i) => `${i ? "L" : "M"}${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`).join(" ");
}

export function areaFor(points, baseY) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${pathFor(points)} L${last.cx.toFixed(1)} ${baseY.toFixed(1)} L${first.cx.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

export function compactBRL(v) {
  const n = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (n >= 1e6) return `${sign}${(n / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (n >= 1e3) return `${sign}${Math.round(n / 1e3)} mil`;
  return `${sign}${Math.round(n)}`;
}
