// Busca global (Ctrl+K ou "/"): telas do menu, pedidos, Biblioteca e orcamentos do Zoho.
// So mostra o que o perfil ja acessa (as listas vem da mesma API, com as mesmas permissoes).
import { api } from "../data/api.js";
import { buscar } from "../domain/busca.js";
import { clear, h } from "./dom.js";

let dialogo = null;

function itensDoMenu(nav) {
  return [...nav.querySelectorAll("a.nav-link")].map((a) => ({
    titulo: a.querySelector(".nav-text")?.textContent ?? a.textContent, href: a.getAttribute("href"), tipo: "Tela",
    extra: a.closest(".nav-group")?.querySelector(".nav-label")?.textContent ?? "",
  }));
}

async function itensRemotos(q, fontes) {
  const res = await Promise.allSettled([
    fontes.pedidos ??= api.fluxoPedidos().then((d) => d.pedidos.map((p) => ({ titulo: `${p.numero} · ${p.cliente_nome}`, extra: `pedido ${p.estado} ${p.orcamento_numero ?? ""}`, href: `#/pedidos/${p.id}`, tipo: "Pedido" }))),
    api.bibListar({ busca: q }).then((d) => d.registros.slice(0, 8).map((r) => ({ titulo: `${r.codigo} · ${r.titulo}`, extra: `${r.tipo} ${r.estado}`, href: `#/biblioteca/r/${r.id}`, tipo: "Biblioteca" }))),
    api.zohoEspelhoLista("books", "estimates", q, 1).then((d) => d.linhas.slice(0, 6).map((l) => ({ titulo: `${l.campos?.estimate_number ?? l.nome} · ${l.campos?.customer_name ?? ""}`, extra: "orçamento proposta", href: `#/propostas/${l.id}`, tipo: "Orçamento" }))),
  ]);
  return res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

export function abrirBusca(nav) {
  if (dialogo?.open) return;
  const entrada = h("input", { class: "input", type: "search", placeholder: "Buscar telas, pedidos, Biblioteca, orçamentos…", "aria-label": "Buscar no VEOS", autocomplete: "off" });
  const lista = h("ul", { class: "list-plain busca-lista", role: "listbox", "aria-label": "Resultados" });
  const dica = h("p", { class: "field-hint" }, "↑ ↓ para escolher · Enter para abrir · Esc para fechar");
  dialogo = h("dialog", { class: "busca-dialogo", "aria-label": "Busca global" }, entrada, lista, dica);
  document.body.append(dialogo);
  const menu = itensDoMenu(nav);
  const fontes = {};
  let atuais = [], sel = 0, versao = 0, t;
  const ir = (i) => { if (!i) return; dialogo.close(); location.hash = i.href; };
  const pintar = () => {
    clear(lista).append(...(atuais.length ? atuais.map((i, k) => {
      const li = h("li", { role: "option", "aria-selected": String(k === sel), class: `busca-item${k === sel ? " is-sel" : ""}` }, h("span", { class: "busca-tipo" }, i.tipo), h("span", null, i.titulo));
      li.addEventListener("click", () => ir(i));
      return li;
    }) : [h("li", { class: "field-hint" }, entrada.value.trim() ? "Nada encontrado." : "Digite para buscar.")]));
  };
  const atualizar = async () => {
    const q = entrada.value.trim(), v = ++versao;
    atuais = buscar(q, menu, 8);
    sel = 0;
    pintar();
    if (q.length < 3) return;
    const remotos = await itensRemotos(q, fontes);
    if (v !== versao) return;
    atuais = buscar(q, [...menu, ...remotos], 14);
    pintar();
  };
  entrada.addEventListener("input", () => { clearTimeout(t); t = setTimeout(atualizar, 200); });
  entrada.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, atuais.length - 1); pintar(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); pintar(); }
    else if (e.key === "Enter") { e.preventDefault(); ir(atuais[sel]); }
  });
  dialogo.addEventListener("close", () => { dialogo.remove(); dialogo = null; });
  dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });
  dialogo.showModal();
  pintar();
  entrada.focus();
  return dialogo;
}

export function ligarAtalhos(nav) {
  window.addEventListener("keydown", (e) => {
    const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "") || document.activeElement?.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrirBusca(nav); }
    else if (e.key === "/" && !digitando) { e.preventDefault(); abrirBusca(nav); }
  });
}
