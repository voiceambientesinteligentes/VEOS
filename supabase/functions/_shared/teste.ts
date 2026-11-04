// Separacao entre dados reais e dados dos robos de teste (usuarios @veos-teste.invalid).
// Os testes automaticos (locais e do GitHub Actions) gravam registros, clientes e orcamentos de
// verdade no banco; para quem usa o VEOS de verdade, esses dados nao aparecem (a empresa comeca do
// zero). O robo continua vendo os proprios dados (os testes conferem o que gravaram).
import type { Membro } from "./banco.ts";
import { servico } from "./banco.ts";

export const ehTeste = (eu: Pick<Membro, "email">) => /@veos-teste\.invalid$/i.test(eu.email ?? "");

let cache: { em: number; ids: string[] } | null = null;
/** Ids dos usuarios TESTE (cache de 5 min na instancia da funcao). */
export async function idsTeste(): Promise<string[]> {
  if (cache && Date.now() - cache.em < 300_000) return cache.ids;
  const r = await servico("/rest/v1/rpc/usuarios_teste", { method: "POST", body: "{}" }).catch(() => null);
  const ids = (Array.isArray(r) ? r : []).map((x: unknown) => (typeof x === "string" ? x : (x as Record<string, string>)?.usuarios_teste)).filter(Boolean) as string[];
  cache = { em: Date.now(), ids };
  return ids;
}

/** Filtro PostgREST por autor: real ve so o que nao e de robo; robo ve so o que e de robo. */
export async function filtroAutor(eu: Pick<Membro, "email">, coluna = "criado_por"): Promise<string> {
  const ids = await idsTeste();
  if (!ids.length) return ehTeste(eu) ? `&${coluna}=is.null` : "";
  return `&${coluna}=${ehTeste(eu) ? "in" : "not.in"}.(${ids.join(",")})`;
}
