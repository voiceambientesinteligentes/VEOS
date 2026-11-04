// Pagina Hoje: prioridades do dia (alertas graves + tarefas vencidas/de hoje), atalhos e numeros.
import { api } from "../js/data/api.js";
import { prioridades, telaHoje } from "../js/ui/views/hoje.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1) || "cheio";
const hoje = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const RADAR = caso === "vazio" ? { alertas: [], tarefas: [], setores: [] } : {
  alertas: [{ id: "a1", setor_id: "financas", severidade: "MEDIO", titulo: "Formulário do CFO: 10 valores estimados para ajustar", mensagem: "TESTE" },
    { id: "a2", setor_id: "vendas", severidade: "CRITICO", titulo: "Lead TESTE sem resposta há 2 horas", mensagem: "TESTE" },
    { id: "a3", setor_id: "marketing", severidade: "INFO", titulo: "Info TESTE que não aparece", mensagem: "TESTE" }],
  tarefas: [{ id: "t1", setor_id: "financas", titulo: "Revisar a produtividade TESTE", prazo: hoje }, { id: "t2", setor_id: "vendas", titulo: "Tarefa TESTE futura", prazo: "2099-01-01" },
    { id: "t3", setor_id: "vendas", titulo: "Ligar para o cliente TESTE", prazo: "2020-01-01" }],
  setores: ["financas", "vendas", "marketing"],
};
const feitas = [];
Object.assign(api, {
  radar: async () => RADAR, concluirTarefa: async (id) => { feitas.push(id); return { id }; },
  comercialOrcamentos: async () => ({ orcamentos: caso === "vazio" ? [] : [{ estado: "enviado", valor_total: "12000" }, { estado: "rascunho", valor_total: "8000" }, { estado: "aceito", valor_total: "5000" }] }),
  setores: async () => ({ setores: [{ id: "vendas", sigla: "CSO", nome: "Comercial", descricao: "TESTE" }, { id: "financas", sigla: "CFO", nome: "Finanças", descricao: "TESTE" }], diretores: [{ setor_id: "vendas", sigla: "CSO", nome: "Diretor TESTE" }] }),
  fluxoPedidos: async () => ({ pedidos: caso === "vazio" ? [] : [{ estado: "confirmado", valor_total: "5000" }] }),
});

rodar(async (v) => {
  await telaHoje(v, { nome: "Fernando TESTE", papel: "direcao" });
  const t = v.textContent;
  for (const x of ["Fernando", "Para fazer hoje", "Agora na VOICE", "Contato que chegou", "Orçamento", "Começar a operar"]) if (!t.includes(x)) throw new Error(`falta: ${x}`);
  if (v.querySelectorAll(".hj-orbita .orbita-no").length !== 2) throw new Error("orbita na pagina inicial com os setores");
  if (!v.querySelector(".hj-ia .ia-microfone") || !v.querySelector("#ia-texto")) throw new Error("IA VEOS na pagina inicial");
  if (caso === "vazio") { if (!t.includes("Tudo em dia.")) throw new Error("vazio"); return; }
  const itens = [...v.querySelectorAll(".hj-item strong")].map((e) => e.textContent);
  if (itens[0] !== "Lead TESTE sem resposta há 2 horas") throw new Error(`crítico primeiro: ${itens}`);
  if (itens.includes("Info TESTE que não aparece") || itens.includes("Tarefa TESTE futura")) throw new Error("info e tarefa futura não entram");
  if (itens.length !== 4) throw new Error(`4 prioridades: ${itens}`);
  if (!t.includes("R$ 20.000,00")) throw new Error("valor em aberto (rascunho + enviado)");
  v.querySelector(".hj-tarefa button").click();
  await new Promise((r) => setTimeout(r, 20));
  if (!feitas.length || !v.querySelector(".hj-feito")) throw new Error("marcar feita");
  if (prioridades({ alertas: [], tarefas: [] }).total !== 0) throw new Error("dominio");
});
