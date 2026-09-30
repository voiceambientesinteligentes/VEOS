// Apresentacao: construcao de DOM sem innerHTML. Texto sempre via textContent
// (createTextNode), atributos via setAttribute.

const SVG_NS = "http://www.w3.org/2000/svg";

function apply(el, attrs) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k === "text") el.textContent = String(v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value" && "value" in el) el.value = v;
    else if (k === "checked" || k === "disabled" || k === "selected") el[k] = Boolean(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  apply(el, attrs);
  append(el, children);
  return el;
}

export function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null) continue;
    if (k === "text") el.textContent = String(v);
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

export function pill(text, tone) {
  return h("span", { class: `pill tone-${tone || "neutral"}` }, h("span", { class: "dot", "aria-hidden": "true" }), text);
}

export function testTag() {
  return h("span", { class: "tag tag-test", title: "Dado sintético de teste" }, "TESTE");
}

export function simTag() {
  return h("span", { class: "tag tag-sim", title: "Resultado de simulação, não oficial" }, "SIMULAÇÃO");
}

export function panel({ title, subtitle, accent, actions } = {}, ...children) {
  return h(
    "section",
    { class: `panel${accent ? " panel-accent" : ""}` },
    title || actions
      ? h("div", { class: "panel-head" }, h("div", null, title ? h("h2", { class: "h3-like" }, title) : null, subtitle ? h("p", null, subtitle) : null), actions || null)
      : null,
    children,
  );
}

export function table({ caption, head, rows, align = [] }) {
  return h(
    "div",
    { class: "table-wrap" },
    h(
      "table",
      { class: "table" },
      caption ? h("caption", null, caption) : null,
      h("thead", null, h("tr", null, head.map((c, i) => h("th", { scope: "col", class: align[i] === "r" ? "r" : null }, c)))),
      h("tbody", null, rows.length ? rows.map((r) => h("tr", null, r.map((c, i) => h("td", { class: align[i] === "r" ? "r num" : null }, c)))) : h("tr", null, h("td", { colspan: head.length, class: "muted" }, "Sem linhas."))),
    ),
  );
}

export function stamp(text, tone) {
  return h("span", { class: `stamp tone-${tone || "neutral"}` }, text);
}

export function stat(label, figure, context) {
  return h("div", { class: "panel panel-tight stat" }, h("span", { class: "stat-label" }, label), h("span", { class: "stat-figure" }, figure), context ? h("span", { class: "stat-context" }, context) : null);
}

// Metodologia/fonte sempre disponivel, mas recolhida para nao poluir a tela.
export function method(summary, ...lines) {
  return h("details", { class: "method" }, h("summary", null, summary), h("div", null, lines.filter(Boolean).map((l) => (l instanceof Node ? l : h("span", null, l)))));
}

export function field(id, label, control, hint) {
  return h("div", { class: "field" }, h("label", { class: "field-label", for: id }, label), control, hint ? h("span", { class: "field-hint" }, hint) : null);
}

export function errorNotice(message) {
  return h("p", { class: "notice notice-risk", role: "alert" }, message);
}
