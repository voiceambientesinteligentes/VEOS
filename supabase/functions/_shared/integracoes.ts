// Integracoes com segredo (ponte do Gmail/Agenda, chaves de pesquisa na web): leitura e gravacao CIFRADA em
// integracoes_segredos (so o servidor le). Nunca devolver o conteudo ao navegador.
// deno-lint-ignore-file no-explicit-any
import { servico } from "./banco.ts";
import { cifrar, decifrar } from "./cifra.ts";

export type Integracao = { id: string; dados: Record<string, any>; conta: string | null; situacao: string; detalhe: string | null; conectado_em: string | null; conectado_por: string | null; atualizado_em: string | null };

const cache = new Map<string, { em: number; v: Integracao | null }>();

export async function lerIntegracao(id: string, { semCache = false } = {}): Promise<Integracao | null> {
  const c = cache.get(id);
  if (!semCache && c && Date.now() - c.em < 60_000) return c.v;
  const [r] = await servico(`/rest/v1/integracoes_segredos?id=eq.${encodeURIComponent(id)}&select=id,cifrado,conta,situacao,detalhe,conectado_em,conectado_por,atualizado_em`);
  let v: Integracao | null = null;
  if (r) {
    let dados: Record<string, any> = {};
    try { dados = JSON.parse(await decifrar(r.cifrado)); } catch (e) { console.error("integracao: nao decifrou", id, e); }
    v = { id: r.id, dados, conta: r.conta, situacao: r.situacao, detalhe: r.detalhe, conectado_em: r.conectado_em, conectado_por: r.conectado_por, atualizado_em: r.atualizado_em };
  }
  cache.set(id, { em: Date.now(), v });
  return v;
}

export async function gravarIntegracao(id: string, dados: Record<string, unknown>, extra: { conta?: string | null; situacao?: string; detalhe?: string | null; usuario?: string | null } = {}) {
  const linha = {
    id, cifrado: await cifrar(JSON.stringify(dados)), conta: extra.conta ?? null, situacao: extra.situacao ?? "aguardando", detalhe: extra.detalhe ?? null,
    conectado_por: extra.usuario ?? null, conectado_em: extra.situacao === "conectado" ? new Date().toISOString() : null, atualizado_em: new Date().toISOString(),
  };
  await servico("/rest/v1/integracoes_segredos?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(linha) });
  cache.delete(id);
}

export async function marcarIntegracao(id: string, situacao: string, detalhe: string | null) {
  await servico(`/rest/v1/integracoes_segredos?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ situacao, detalhe: detalhe?.slice(0, 300) ?? null, atualizado_em: new Date().toISOString() }) });
  cache.delete(id);
}

export async function apagarIntegracao(id: string) {
  await servico(`/rest/v1/integracoes_segredos?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  cache.delete(id);
}

/** Registro de acao externa (pesquisa, leitura de pagina, e-mail, agenda). Nunca derruba a resposta. */
export async function registrarAcao(usuario: string | null, acao: string, detalhe: string | null, ok = true, origem: string | null = null) {
  try {
    await servico("/rest/v1/acoes_registro", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ usuario, acao, detalhe: detalhe?.slice(0, 300) ?? null, ok, origem: origem?.slice(0, 60) ?? null }) });
  } catch (e) {
    console.error("registro de acao", e);
  }
}

/** Quantas vezes a pessoa fez a acao na ultima hora (para limitar abuso e gasto de cota). */
export async function usosNaHora(usuario: string, acao: string, max: number) {
  const desde = new Date(Date.now() - 3_600_000).toISOString();
  const r = await servico(`/rest/v1/acoes_registro?usuario=eq.${usuario}&acao=eq.${acao}&em=gt.${encodeURIComponent(desde)}&select=id&limit=${max + 1}`);
  return r.length as number;
}
