// Tela Integracoes: painel do MCP remoto (link do ChatGPT/Claude): sem link, criar (URL aparece uma vez) e listar/revogar.
import { telaIntegracoes } from "../js/ui/views/integracoes.js";
import { api } from "../js/data/api.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
let links = caso === "com" ? [{ id: "11111111-1111-1111-1111-111111111111", rotulo: "ChatGPT do celular", escopo: "completo", criado_em: "2026-11-10T10:00:00Z", expira_em: "2027-02-08T10:00:00Z", ultimo_uso: null, usos: 0 }] : [];
const criados = [], revogados = [];
api.zohoStatus = async () => ({ conectado: false, configurado: false, produtos: [], escopos: [] });
api.entrevista = async () => ({ link: null, progresso: { respondidas: 0, total: 70, porcentagem: 0, nao_sei: 0, faltam_obrigatorias: [] } });
api.mcpRemoto = async () => ({ links, chamadas: caso === "com" && links[0] ? [{ em: "2026-11-10T11:00:00Z", link_id: links[0].id, ferramenta: "veos_radar", rota: "radar", ok: true, detalhe: null }] : [] });
api.mcpRemotoLink = async (c) => { criados.push(c); links = [{ id: "22222222-2222-2222-2222-222222222222", rotulo: c.rotulo, escopo: c.escopo, criado_em: "2026-11-10T10:00:00Z", expira_em: "2027-02-08T10:00:00Z", ultimo_uso: null, usos: 0 }]; return { url: "https://x.supabase.co/functions/v1/mcp/SEGREDO_DE_TESTE_0123456789abcdefghijklmnopq", escopo: c.escopo, expira_em: "2027-02-08T10:00:00Z", aviso: "Este link aparece uma única vez." }; };
api.mcpRemotoRevogar = async (id) => { revogados.push(id); links = []; };
const espera = () => new Promise((r) => setTimeout(r, 80));
const exige = (v, ...xs) => { for (const x of xs) if (!v.textContent.includes(x)) throw new Error(`faltou: ${x}`); };

rodar(async (v) => {
  await telaIntegracoes(v, { papel: "direcao", nome: "Fernando TESTE" });
  await espera();
  exige(v, "MCP do VEOS", "ChatGPT e Claude como o dono");
  if (caso === "com") {
    exige(v, "ChatGPT do celular", "Consulta e cadastro", "veos_radar");
    globalThis.confirm = () => true;
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Revogar").click();
    await espera();
    if (revogados[0] !== "11111111-1111-1111-1111-111111111111") throw new Error("revogar nao chamou a API com o id");
    exige(v, "Nenhum link ativo");
    return;
  }
  exige(v, "Nenhum link ativo");
  const sel = v.querySelector('select[aria-label="O que o link pode fazer"]');
  sel.value = "consulta";
  v.querySelector('input[aria-label="Nome do link"]').value = "Claude";
  [...v.querySelectorAll("button")].find((b) => b.textContent === "Criar link").click();
  await espera();
  if (criados[0]?.escopo !== "consulta" || criados[0]?.rotulo !== "Claude") throw new Error("criar nao enviou escopo/rotulo");
  exige(v, "SEGREDO_DE_TESTE_0123456789", "Este link aparece uma única vez", "Só consulta", "Claude");
});
