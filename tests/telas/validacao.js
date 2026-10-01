import { api } from "../js/data/api.js";
import { telaValidacao } from "../js/ui/views/validacao.js";
import { rodar } from "./_kit.js";

const criados = [];
let n = 50;
api.bibCriar = async (d) => { criados.push(d); return { id: "00000000-0000-0000-0000-0000000000" + n, codigo: `BIB-00${n++}` }; };
window.confirm = () => true;
localStorage.removeItem("veos.validacao");

rodar(async (v) => {
  telaValidacao(v);
  if (location.hash !== "#registrar") return;
  const passos = v.querySelectorAll("ol > li");
  passos[0].querySelectorAll("button")[0].click(); // login: funcionou
  passos[1].querySelectorAll("button")[1].click(); // celular: falhou
  const btn = [...v.querySelectorAll("button")].find((b) => b.textContent === "Registrar na Biblioteca");
  btn.click(); // sem descricao -> recusa
  await new Promise((r) => setTimeout(r, 50));
  if (!v.textContent.includes("Descreva o que falhou")) throw new Error("falha sem descricao foi aceita");
  const obs = passos[1].querySelector("textarea");
  obs.value = "menu nao fechou TESTE";
  obs.dispatchEvent(new Event("input"));
  btn.click();
  await new Promise((r) => setTimeout(r, 100));
  if (criados.length !== 2 || criados[0].tipo !== "incidente" || criados[1].tipo !== "referencia") throw new Error("registros errados: " + JSON.stringify(criados.map((c) => c.tipo)));
  if (!criados[1].conteudo.includes("BIB-0050")) throw new Error("referencia sem o incidente");
  if (!v.textContent.includes("Registrado: BIB-0051")) throw new Error("sem confirmacao");
});
