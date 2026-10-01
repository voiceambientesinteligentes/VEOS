import { api } from "../js/data/api.js";
import { telaIndependencia } from "../js/ui/views/independencia.js";
import { rodar } from "./_kit.js";

api.zohoEspelho = async () => ({ produtos: ["books", "crm", "projects"], sync: [], ultima_rodada: null,
  contagens: [{ produto: "books", modulo: "items", total: 534 }, { produto: "books", modulo: "estimates", total: 171 }, { produto: "crm", modulo: "Deals", total: 8 }] });
rodar(async (v) => {
  await telaIndependencia(v);
  if (!v.textContent.includes("Depende do Zoho") || !v.textContent.includes("Roteiro para desligar")) throw new Error("mapa incompleto");
});
