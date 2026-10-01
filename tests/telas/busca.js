import { api } from "../js/data/api.js";
import { abrirBusca } from "../js/ui/busca_global.js";
import { h } from "../js/ui/dom.js";
import { rodar } from "./_kit.js";

Object.assign(api, {
  fluxoPedidos: async () => ({ pedidos: [{ id: "p1", numero: "PED-00012", cliente_nome: "Cliente TESTE Ltda", estado: "confirmado", orcamento_numero: "EST-1" }] }),
  bibListar: async () => ({ registros: [{ id: "b1", codigo: "BIB-0045", titulo: "O fundador exerce a CEO TESTE", tipo: "decisao", estado: "vigente" }] }),
  zohoEspelhoLista: async () => ({ linhas: [] }),
});
const nav = h("nav", null,
  h("div", { class: "nav-group" }, h("span", { class: "nav-label" }, "Operação"), h("a", { class: "nav-link", href: "#/pedidos" }, h("span", { class: "nav-text" }, "Pedidos"))),
  h("div", { class: "nav-group" }, h("span", { class: "nav-label" }, "Sistema"), h("a", { class: "nav-link", href: "#/sistema/saude" }, h("span", { class: "nav-text" }, "Saúde do sistema"))));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

rodar(async (v) => {
  v.append(h("p", null, "Tela de fundo TESTE"));
  const d = abrirBusca(nav);
  const entrada = d.querySelector("input");
  entrada.value = "saude";
  entrada.dispatchEvent(new Event("input"));
  await espera(300);
  if (!d.textContent.includes("Saúde do sistema")) throw new Error("menu nao encontrado");
  entrada.value = "cliente teste";
  entrada.dispatchEvent(new Event("input"));
  await espera(400);
  if (!d.textContent.includes("PED-00012 · Cliente TESTE Ltda")) throw new Error("pedido nao encontrado: " + d.textContent);
  entrada.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  await espera(50);
  if (location.hash !== "#/pedidos/p1" || d.open) throw new Error("Enter nao abriu o pedido");
  history.replaceState(null, "", location.pathname);
});
