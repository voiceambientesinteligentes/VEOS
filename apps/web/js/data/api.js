// Unica camada HTTP do VEOS online: chama a Edge Function "api" com o token do login.
// Mantem a interface usada pelas telas do portal local (ex.: api.vigiaOrcamento).
import { token } from "../auth.js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config.js";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, rota, body, headers = {}) {
  const t = await token();
  if (!t) throw new ApiError(401, "Sessão expirada. Entre novamente.");
  const r = await fetch(`${SUPABASE_URL}/functions/v1/api/${rota}`, {
    method,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, dados.erro || `Erro ${r.status}`);
  return dados;
}

const codigoTeste = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `ORC-TESTE-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

export const api = {
  me: () => request("GET", "me"),
  setores: () => request("GET", "setores"),
  orcamentos: () => request("GET", "orcamentos"),
  // Salvar = vigia avalia e o servidor grava orcamento + avisos. Uma chave por clique:
  // se a rede repetir o envio, o servidor nao duplica o registro.
  vigiaOrcamento: (entrada) =>
    request("POST", "orcamentos", { entrada: { ...entrada, id: codigoTeste() } }, { "Idempotency-Key": crypto.randomUUID() }),
};
