// AVISO COM O NAVEGADOR FECHADO (Web Push): envia alertas ALTO/CRITICO novos para os aparelhos inscritos de quem
// acessa o setor. Chaves VAPID nos segredos do Supabase. Gratuito (servicos de push dos navegadores).
// Regras: robo de teste nao recebe nem dispara aviso real; no maximo 3 avisos por rodada (o resto vira um resumo);
// aparelho que o navegador diz que nao existe mais (404/410) e removido.
// deno-lint-ignore-file no-explicit-any
import { servico } from "./banco.ts";
import { idsTeste } from "./teste.ts";
import { enviarWebPush } from "./webpush.ts";

const RESTRITOS: Record<string, string[]> = { financas: ["direcao", "financas"], pessoas: ["direcao", "pessoas"] };
const podeVer = (papel: string, setor: string) => !RESTRITOS[setor] || RESTRITOS[setor].includes(papel);

export const chavePublica = () => Deno.env.get("VAPID_PUBLIC_KEY") ?? null;
function vapid() {
  const publica = Deno.env.get("VAPID_PUBLIC_KEY"), privada = Deno.env.get("VAPID_PRIVATE_KEY"), assunto = Deno.env.get("VAPID_SUBJECT");
  return publica && privada && assunto ? { publica, privada, assunto } : null;
}

export type Aviso = { titulo: string; corpo: string; href: string; tag: string };
type Inscricao = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string; falhas: number };

/** Envia um aviso a uma inscricao. Devolve "ok", "removida" (aparelho nao existe mais) ou "falha:<status>". */
export async function enviarPush(i: Inscricao, aviso: Aviso): Promise<string> {
  const v = vapid();
  if (!v) return "falha:sem-chaves";
  try {
    const r = await enviarWebPush(i, JSON.stringify(aviso), v);
    if (r.status >= 200 && r.status < 300) {
      await servico(`/rest/v1/push_inscricoes?id=eq.${i.id}`, { method: "PATCH", body: JSON.stringify({ ultimo_envio: new Date().toISOString(), falhas: 0 }) });
      return "ok";
    }
    if (r.status === 404 || r.status === 410) {
      await servico(`/rest/v1/push_inscricoes?id=eq.${i.id}`, { method: "DELETE" }).catch(() => {});
      return "removida";
    }
    console.error("push", r.status, r.corpo);
    await falhou(i);
    return `falha:${r.status}:${r.corpo}`;
  } catch (e) {
    console.error("push", (e as Error).message);
    await falhou(i);
    return `falha:rede:${(e as Error).message.slice(0, 80)}`;
  }
}

async function falhou(i: Inscricao) {
  if (i.falhas + 1 >= 5) await servico(`/rest/v1/push_inscricoes?id=eq.${i.id}`, { method: "DELETE" }).catch(() => {});
  else await servico(`/rest/v1/push_inscricoes?id=eq.${i.id}`, { method: "PATCH", body: JSON.stringify({ falhas: i.falhas + 1 }) }).catch(() => {});
}

/** Alertas ALTO/CRITICO ainda nao avisados -> push para quem acessa o setor. */
export async function avisarAlertasPorPush() {
  if (!vapid()) return { ativo: false };
  const novos: any[] = await servico("/rest/v1/alertas?estado=eq.ativo&severidade=in.(ALTO,CRITICO)&push_enviado_em=is.null&select=id,setor_id,severidade,titulo,registro_id,chave&order=atualizado_em&limit=50");
  if (!novos.length) return { ativo: true, novos: 0, enviados: 0 };
  // marca antes de enviar: nunca avisa duas vezes o mesmo alerta, mesmo que o envio falhe
  await servico(`/rest/v1/alertas?id=in.(${novos.map((a) => a.id).join(",")})`, { method: "PATCH", body: JSON.stringify({ push_enviado_em: new Date().toISOString() }) });
  const testes = await idsTeste();
  const registrosTeste = new Set<string>();
  const comRegistro = novos.filter((a) => a.registro_id).map((a) => a.registro_id);
  if (testes.length && comRegistro.length) {
    for (const r of await servico(`/rest/v1/registros?id=in.(${comRegistro.join(",")})&criado_por=in.(${testes.join(",")})&select=id`)) registrosTeste.add(r.id);
  }
  const reais = novos.filter((a) => !a.registro_id || !registrosTeste.has(a.registro_id));
  if (!reais.length) return { ativo: true, novos: novos.length, enviados: 0 };
  const membros: any[] = await servico("/rest/v1/membros?ativo=is.true&select=user_id,papel&limit=500");
  const inscricoes: Inscricao[] = await servico("/rest/v1/push_inscricoes?select=id,user_id,endpoint,p256dh,auth,falhas&limit=2000");
  const papel = new Map(membros.filter((m) => !testes.includes(m.user_id)).map((m) => [m.user_id, m.papel]));
  let enviados = 0;
  for (const [uid, p] of papel) {
    const minhas = inscricoes.filter((i) => i.user_id === uid);
    if (!minhas.length) continue;
    const meus = reais.filter((a) => podeVer(p as string, a.setor_id));
    if (!meus.length) continue;
    const avisos: Aviso[] = meus.length <= 3
      ? meus.map((a) => ({ titulo: `VEOS · ${a.severidade === "CRITICO" ? "Crítico" : "Alerta"}`, corpo: String(a.titulo).slice(0, 160), href: `#/setor/${a.setor_id}`, tag: `alerta-${a.id}` }))
      : [{ titulo: "VEOS · alertas novos", corpo: `${meus.length} alertas altos ou críticos novos. Abra o VEOS para ver.`, href: "#/radar", tag: "alertas-resumo" }];
    for (const i of minhas) for (const av of avisos) if ((await enviarPush(i, av)) === "ok") enviados++;
  }
  return { ativo: true, novos: novos.length, reais: reais.length, enviados };
}
