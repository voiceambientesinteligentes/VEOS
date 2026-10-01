// Copia de seguranca do VEOS: todas as tabelas e visoes publicas (pela API, paginado pela chave
// primaria), os arquivos do Storage e a lista de logins, num JSON compactado e CRIPTOGRAFADO
// (scripts/lib/cofre.mjs). Fica de fora: tokens de integracao (refaz-se conectando o Zoho de novo).
// Imprime so contagens. Uso (GitHub Actions semanal ou local):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... BACKUP_SENHA=... node scripts/backup.mjs [pasta]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cifrar } from "./lib/cofre.mjs";

const URL_BASE = process.env.SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY, SENHA = process.env.BACKUP_SENHA;
if (!URL_BASE || !SERVICE) throw new Error("defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
if (!SENHA || SENHA.length < 10) throw new Error("defina BACKUP_SENHA (minimo 10 caracteres)");
const PASTA = process.argv[2] ?? "backup";
const FORA = new Set(["integracoes", "oauth_estados"]); // segredos e estados temporarios
const PAGINA = 1000, MAX_ARQUIVOS = 300 * 1024 * 1024;
const cab = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

async function get(path, extra = {}) {
  const r = await fetch(`${URL_BASE}${path}`, { headers: { ...cab, ...extra } });
  if (!r.ok) throw new Error(`${path.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r;
}

// tabelas e chaves primarias pela descricao OpenAPI do PostgREST
const api = await (await get("/rest/v1/", { Accept: "application/openapi+json" })).json();
const tabelas = Object.entries(api.definitions ?? {}).filter(([nome]) => !FORA.has(nome)).map(([nome, def]) => ({
  nome,
  pk: Object.entries(def.properties ?? {}).filter(([, p]) => /<pk\/>/.test(p.description ?? "")).map(([c]) => c),
}));

const saida = { versao: 1, gerado_em: new Date().toISOString(), origem: URL_BASE, tabelas: {}, arquivos: [], usuarios: [] };
const resumo = [];
for (const t of tabelas) {
  const ordem = t.pk.length ? `&order=${t.pk.map((c) => `${c}.asc`).join(",")}` : "";
  const linhas = [];
  for (let offset = 0; ; offset += PAGINA) {
    const lote = await (await get(`/rest/v1/${encodeURIComponent(t.nome)}?select=*${ordem}&limit=${PAGINA}&offset=${offset}`)).json();
    linhas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  saida.tabelas[t.nome] = linhas;
  resumo.push(`${t.nome}: ${linhas.length}`);
}

// arquivos do Storage (anexos privados)
let bytes = 0;
const buckets = await (await get("/storage/v1/bucket")).json();
async function listar(bucket, prefixo) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/list/${bucket}`, { method: "POST", headers: { ...cab, "Content-Type": "application/json" }, body: JSON.stringify({ prefix: prefixo, limit: 1000, offset: 0 }) });
  if (!r.ok) throw new Error(`listar ${bucket}: ${r.status}`);
  const itens = await r.json();
  for (const it of itens) {
    const caminho = prefixo ? `${prefixo}/${it.name}` : it.name;
    if (!it.id) { await listar(bucket, caminho); continue; } // pasta
    const conteudo = Buffer.from(await (await get(`/storage/v1/object/${bucket}/${caminho.split("/").map(encodeURIComponent).join("/")}`)).arrayBuffer());
    bytes += conteudo.length;
    if (bytes > MAX_ARQUIVOS) throw new Error("arquivos acima de 300 MB: rever o backup");
    saida.arquivos.push({ bucket, caminho, tipo: it.metadata?.mimetype ?? null, base64: conteudo.toString("base64") });
  }
}
for (const b of buckets) await listar(b.id, "");

// logins (para refazer membros em caso de restauracao); sem senhas, que o Supabase nao expoe
const users = await (await get("/auth/v1/admin/users?per_page=1000")).json();
saida.usuarios = (users.users ?? []).map((u) => ({ id: u.id, email: u.email, criado_em: u.created_at, ultimo_acesso: u.last_sign_in_at ?? null }));

mkdirSync(PASTA, { recursive: true });
const nome = `veos-backup-${saida.gerado_em.slice(0, 10)}.veosbk`;
const cifrado = cifrar(Buffer.from(JSON.stringify(saida)), SENHA);
writeFileSync(join(PASTA, nome), cifrado);
console.log(`${tabelas.length} tabelas/visoes · ${saida.arquivos.length} arquivo(s) · ${saida.usuarios.length} login(s)`);
console.log(resumo.join(" | "));
console.log(`gravado: ${join(PASTA, nome)} (${(cifrado.length / 1048576).toFixed(1)} MB, criptografado)`);
