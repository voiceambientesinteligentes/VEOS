// Roda um teste online (tests/online/*.mjs) com as chaves do projeto obtidas pela CLI do
// Supabase (ja logada), sem imprimi-las. Uso: node scripts/online.mjs tests/online/e2e_api.mjs [args]
import { execSync, spawnSync } from "node:child_process";

const REF = "vkrwxvnfstvriibjwuvw";
const arquivo = process.argv[2];
if (!arquivo) throw new Error("informe o arquivo de teste");
const env = { ...process.env };
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const saida = execSync(`${npx} -y supabase@2.118.0 projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const chaves = JSON.parse(saida.slice(saida.indexOf("[")));
  const por = (n) => chaves.find((k) => k.name === n)?.api_key;
  Object.assign(env, { SUPABASE_URL: `https://${REF}.supabase.co`, SUPABASE_ANON_KEY: por("anon"), SUPABASE_SERVICE_ROLE_KEY: por("service_role") });
}
const exe = arquivo.endsWith(".py") ? "python" : process.execPath;
const r = spawnSync(exe, [arquivo, ...process.argv.slice(3)], { env, stdio: "inherit" });
process.exit(r.status ?? 1);
