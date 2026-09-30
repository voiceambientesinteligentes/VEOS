// Varredura das sentinelas: le os registros TESTE, roda o motor por setor e sincroniza
// a tabela de alertas (novos, reativados, atualizados, resolvidos) e as tarefas geradas.
// Alerta dispensado pela direcao continua dispensado enquanto a condicao persistir.
import { servico } from "../banco.ts";
import { type Alerta, avaliarSetor, type Registro, type Setor } from "./motor.ts";

type Linha = { id: string; chave: string; estado: string; titulo: string; mensagem: string };

const dia = (t: number) => new Date(t).toISOString().slice(0, 10);

export async function varrer(catalogo: Setor[], setores: string[] | null, origem: string, agora = Date.now()) {
  const inicio = Date.now();
  const alvo = catalogo.filter((s) => !setores || setores.includes(s.id));
  const ids = alvo.map((s) => s.id);
  if (!ids.length) return { novos: 0, resolvidos: 0, ativos: 0 };
  const lista = ids.join(",");
  const [registros, existentes]: [Registro[], (Linha & { setor_id: string })[]] = await Promise.all([
    servico(`/rest/v1/registros?ambiente=eq.TESTE&setor_id=in.(${lista})&select=id,setor_id,tipo,titulo,estado,responsavel,prazo,valor::text,criado_em,atualizado_em,dados&limit=5000`),
    servico(`/rest/v1/alertas?setor_id=in.(${lista})&select=id,chave,estado,titulo,mensagem,setor_id&limit=5000`),
  ]);

  const desejados = new Map<string, Alerta>();
  for (const s of alvo) {
    const doSetor = registros.filter((r) => (r as unknown as { setor_id: string }).setor_id === s.id);
    for (const a of avaliarSetor(s, doSetor, agora)) desejados.set(a.chave, a);
  }
  const porChave = new Map(existentes.map((e) => [e.chave, e]));

  const inserir: Record<string, unknown>[] = [];
  const reativar: [Linha, Alerta][] = [];
  const atualizar: [Linha, Alerta][] = [];
  const tarefas: Record<string, unknown>[] = [];
  const tarefasDe = (a: Alerta) =>
    a.tarefas.forEach((t, i) => tarefas.push({
      setor_id: a.setor, titulo: t.titulo.slice(0, 240), papel: t.papel, prazo: t.prazo, origem: a.sentinela,
      registro_id: a.registro_id, chave: `${a.chave}:${i}:${dia(agora)}`,
    }));
  const linha = (a: Alerta) => ({
    chave: a.chave, setor_id: a.setor, sentinela: a.sentinela, severidade: a.severidade, titulo: a.titulo.slice(0, 300),
    mensagem: a.mensagem.slice(0, 2000), fonte: a.fonte, registro_id: a.registro_id, rascunhos: a.rascunhos, notificar: a.notificar,
  });

  for (const a of desejados.values()) {
    const e = porChave.get(a.chave);
    if (!e) { inserir.push(linha(a)); tarefasDe(a); }
    else if (e.estado === "resolvido") { reativar.push([e, a]); tarefasDe(a); }
    else if (e.estado === "ativo" && (e.titulo !== a.titulo || e.mensagem !== a.mensagem)) atualizar.push([e, a]);
  }
  const resolver = existentes.filter((e) => e.estado === "ativo" && !desejados.has(e.chave)).map((e) => e.id);

  const agoraIso = new Date(agora).toISOString();
  if (inserir.length) {
    await servico("/rest/v1/alertas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(inserir) });
  }
  for (const [e, a] of [...reativar, ...atualizar]) {
    await servico(`/rest/v1/alertas?id=eq.${e.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...linha(a), estado: "ativo", atualizado_em: agoraIso, resolvido_em: null }),
    });
  }
  if (resolver.length) {
    await servico(`/rest/v1/alertas?id=in.(${resolver.join(",")})`, {
      method: "PATCH", body: JSON.stringify({ estado: "resolvido", resolvido_em: agoraIso, atualizado_em: agoraIso }),
    });
  }
  if (tarefas.length) {
    await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(tarefas) });
  }
  const resumo = { novos: inserir.length + reativar.length, resolvidos: resolver.length, ativos: [...desejados.keys()].filter((k) => porChave.get(k)?.estado !== "dispensado").length };
  await servico("/rest/v1/varreduras", {
    method: "POST",
    body: JSON.stringify({ origem, alertas_ativos: resumo.ativos, novos: resumo.novos, resolvidos: resumo.resolvidos, ms: Date.now() - inicio }),
  });
  return resumo;
}
