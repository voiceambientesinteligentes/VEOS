import { api } from "../js/data/api.js";
import { telaUsuarios } from "../js/ui/views/usuarios.js";
import { rodar } from "./_kit.js";

const EU = "00000000-0000-0000-0000-000000000001";
const enviados = [];
const membros = [
  { user_id: EU, nome: "Fernando TESTE", papel: "direcao", email: "fernando@teste.invalid", ativo: true, exige_mfa: false, ultimo_acesso: "2026-10-01T10:00:00Z", mfa: false, bloqueado: false, autoridades: ["fundador", "ceo"], teste: false },
  { user_id: "00000000-0000-0000-0000-000000000002", nome: "Ana TESTE", papel: "financas", email: "ana@teste.invalid", ativo: true, exige_mfa: true, ultimo_acesso: null, mfa: true, bloqueado: false, autoridades: [], teste: false },
  { user_id: "00000000-0000-0000-0000-000000000003", nome: "Bruno TESTE", papel: "posvenda", email: "bruno@teste.invalid", ativo: false, exige_mfa: false, ultimo_acesso: "2026-09-30T10:00:00Z", mfa: false, bloqueado: true, autoridades: [], teste: false },
  { user_id: "00000000-0000-0000-0000-000000000004", nome: "Usuario TESTE automatizado", papel: "vendas", email: "teste@veos-teste.invalid", ativo: true, exige_mfa: false, ultimo_acesso: null, mfa: false, bloqueado: false, autoridades: [], teste: true },
];
api.sistemaMembros = async () => ({
  papeis: ["direcao", "financas", "operacoes", "tecnologia", "marketing", "vendas", "secretaria", "posvenda", "pessoas"], membros, eu: EU,
  historico: [{ user_id: membros[2].user_id, nome: "Bruno TESTE", acao: "desativado", de: null, para: null, motivo: "TESTE saiu", por: EU, por_nome: "Fernando TESTE", em: "2026-10-01T09:00:00Z" },
    { user_id: membros[1].user_id, nome: "Ana TESTE", acao: "papel", de: "vendas", para: "financas", motivo: null, por: EU, por_nome: "Fernando TESTE", em: "2026-10-01T08:00:00Z" }],
});
api.sistemaConvidar = async (d) => { enviados.push(["convidar", d]); return { ok: true }; };
api.sistemaMembro = async (id, d) => { enviados.push([id, d]); return { ok: true }; };
window.prompt = () => "TESTE motivo";
const espera = () => new Promise((r) => setTimeout(r, 80));

rodar(async (v) => {
  await telaUsuarios(v);
  const t = v.textContent;
  if (t.includes("Usuario TESTE automatizado")) throw new Error("usuario TESTE deveria ficar oculto");
  if (!t.includes("Direção sem MFA: Fernando TESTE")) throw new Error("aviso de MFA da direcao ausente");
  if (!t.includes("Fundador") || !t.includes("CEO") || !t.includes("Desativado") || !t.includes("MFA exigido")) throw new Error("autoridades/estado ausentes");
  if (location.hash === "#convidar") {
    v.querySelector("#conv-nome").value = "Nova TESTE";
    v.querySelector("#conv-email").value = "nova@teste.invalid";
    v.querySelector("#conv-papel").value = "marketing";
    v.querySelector("form").requestSubmit();
    await espera();
    if (JSON.stringify(enviados[0]) !== JSON.stringify(["convidar", { nome: "Nova TESTE", email: "nova@teste.invalid", papel: "marketing" }])) throw new Error(JSON.stringify(enviados));
    if (!v.textContent.includes("O VEOS não envia convite sozinho")) throw new Error("sem orientacao apos convite");
  }
  if (location.hash === "#desativar") {
    const cartao = [...v.querySelectorAll("li")].find((li) => li.textContent.includes("Ana TESTE"));
    [...cartao.querySelectorAll("button")].find((b) => b.textContent === "Desativar").click();
    await espera();
    const euCartao = [...v.querySelectorAll("li")].find((li) => li.textContent.includes("Fernando TESTE"));
    if (![...euCartao.querySelectorAll("button")].find((b) => b.textContent === "Desativar").disabled) throw new Error("pode desativar a si mesmo");
    if (enviados[0][1].acao !== "desativar" || enviados[0][1].motivo !== "TESTE motivo") throw new Error(JSON.stringify(enviados));
  }
});
