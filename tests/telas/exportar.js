import { api } from "../js/data/api.js";
import { telaExportar } from "../js/ui/views/sistema.js";
import { rodar } from "./_kit.js";

const CONJ = [["pedidos", "Pedidos"], ["parcelas", "Parcelas"], ["estoque", "Estoque (saldos)"], ["biblioteca", "Biblioteca"]];
api.sistemaExportar = async (c = "") => c
  ? { conjunto: c, nome: c, colunas: ["numero", "cliente_nome", "valor_total"], linhas: [{ numero: "PED-00001", cliente_nome: "Cliente TESTE; Ltda", valor_total: "1500.00" }], truncado: false }
  : { conjuntos: CONJ.map(([id, nome]) => ({ id, nome })) };
const baixados = [];

rodar(async (v) => {
  await telaExportar(v, (nome, conteudo) => baixados.push([nome, conteudo]));
  if (v.querySelectorAll("li").length !== 4) throw new Error("conjuntos ausentes");
  if (location.hash !== "#baixar") return;
  v.querySelector("li button").click();
  await new Promise((r) => setTimeout(r, 80));
  const [nome, csv] = baixados[0] ?? [];
  if (!/^veos-pedidos-\d{4}-\d{2}-\d{2}\.csv$/.test(nome)) throw new Error("nome " + nome);
  if (csv !== "﻿numero;cliente_nome;valor_total\r\nPED-00001;\"Cliente TESTE; Ltda\";1500,00\r\n") throw new Error("csv " + JSON.stringify(csv));
  if (!v.textContent.includes("1 linha(s) exportada(s)")) throw new Error("sem confirmacao");
});
