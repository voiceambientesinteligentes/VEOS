// Completa os campos VAZIOS do Formulario do CFO com media de mercado, marcados como ESTIMADO
// (dados._estimados), numa nova versao de cada secao (o historico guarda a anterior). Nunca troca
// valor informado pelo fundador. Autor: membro inativo "Claude (estimativa do VEOS)", para o
// historico mostrar quem preencheu. Depois roda o vigia do caixa (alerta CAIXA_CFO_VALORES_ESTIMADOS).
// Uso: node scripts/online.mjs scripts/estimativas-cfo.mjs [--aplicar]   (sem --aplicar so mostra)
import { completarComEstimativas } from "../apps/web/js/domain/formulario_cfo.js";

const URL_BASE = process.env.SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const aplicar = process.argv.includes("--aplicar");
const EMAIL = "claude-estimativa@veos-sistema.invalid";

const linhas = await (await fetch(`${URL_BASE}/rest/v1/formulario_respostas?formulario=eq.cfo&select=secao,dados&order=id.desc&limit=300`, { headers: admin })).json();
const respostas = {};
for (const l of linhas) if (!respostas[l.secao]) respostas[l.secao] = { dados: l.dados };
const novas = completarComEstimativas(respostas);
for (const [secao, dados] of Object.entries(novas)) {
  console.log(`${secao}: ${Object.entries(dados._estimados ?? {}).map(([k, e]) => `${k} = ${e.valor}`).join(", ") || "(só conversão do formato antigo)"}`);
}
if (!aplicar) { console.log("\n(simulação: use --aplicar para gravar)"); process.exit(0); }

const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, email_confirm: true, ban_duration: "876000h" }) })).json();
await fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Claude (estimativa do VEOS)", papel: "direcao", ativo: false }) });
for (const [secao, dados] of Object.entries(novas)) {
  const r = await fetch(`${URL_BASE}/rest/v1/formulario_respostas`, { method: "POST", headers: admin, body: JSON.stringify({ formulario: "cfo", secao, dados, autor: user.id }) });
  if (!r.ok) throw new Error(`${secao}: ${r.status} ${await r.text()}`);
}
console.log(`\n${Object.keys(novas).length} seção(ões) gravadas (nova versão; a anterior fica no histórico).`);
