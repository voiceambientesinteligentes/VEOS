// MOTOR DE RACIOCINIO DOS DIRETORES. Fluxo de uma pergunta da fila:
//   1. reserva a pergunta (um processamento por vez; expira em 4 min se a funcao cair);
//   2. consulta precedentes na Biblioteca ANTES de pensar (registrado, como exige a governanca);
//   3. roda o provedor (Gemini gratuito -> OpenAI se houver chave), com as ferramentas do VEOS;
//   4. limpa o Markdown, confere os valores em reais contra os resultados das ferramentas e
//      acrescenta o aviso do que nao foi conferido;
//   5. grava a resposta (rotulada "IA · opiniao, nao decisao") com fontes e procedimento, e a trilha
//      completa em ia_execucoes. Sem provedor ou com falha, a pergunta volta para a fila do Claude Code.
// deno-lint-ignore-file no-explicit-any
import { servico } from "../banco.ts";
import { type Provedor, responderComFallback } from "./provedores.ts";
import { conferirValores, limparMarkdown, montarSistema, numerosDe, rodapeConferencia, termosDaPergunta } from "./texto.ts";
import { type Contexto, diretorDoSetor, executarFerramenta, ferramentasDoSetor, procedimentosDoSetor } from "./ferramentas.ts";

const lista = (v: string | undefined, padrao: string) => (v || padrao).split(",").map((x) => x.trim()).filter(Boolean);

/** Provedores configurados nos segredos do Supabase (sem expor chaves). Ordem: IA_ORDEM. */
export function provedores(): Provedor[] {
  const env = (k: string) => Deno.env.get(k) ?? "";
  const todos: Record<string, Provedor | null> = {
    gemini: env("GEMINI_API_KEY") ? { id: "gemini", rotulo: env("GEMINI_PAGO") === "sim" ? "Gemini" : "Gemini (chave gratuita)", modelos: lista(env("GEMINI_MODELOS"), "gemini-3.8-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-2.5-flash"), chave: env("GEMINI_API_KEY"), gratuito: env("GEMINI_PAGO") !== "sim" } : null,
    openai: env("OPENAI_API_KEY") ? { id: "openai", rotulo: "OpenAI", modelos: lista(env("OPENAI_MODELOS"), "gpt-5-mini"), chave: env("OPENAI_API_KEY"), gratuito: false } : null,
  };
  return lista(env("IA_ORDEM"), "gemini,openai").map((id) => todos[id]).filter((x): x is Provedor => Boolean(x));
}

export function situacaoMotores() {
  const ativos = provedores();
  return {
    motores: [
      { id: "gemini", nome: "Gemini (Google AI Studio)", ativo: ativos.some((p) => p.id === "gemini"), gratuito: ativos.find((p) => p.id === "gemini")?.gratuito ?? true, modelos: ativos.find((p) => p.id === "gemini")?.modelos ?? [] },
      { id: "openai", nome: "OpenAI (API paga à parte do ChatGPT)", ativo: ativos.some((p) => p.id === "openai"), gratuito: false, modelos: ativos.find((p) => p.id === "openai")?.modelos ?? [] },
      { id: "claude-code", nome: "Claude Code (assinatura do fundador, pela fila)", ativo: true, gratuito: true, modelos: [] },
    ],
    algum_no_servidor: ativos.length > 0,
    dados_ao_provedor_gratuito: ativos.some((p) => p.gratuito) ? "No plano gratuito do Gemini o Google pode usar o conteúdo enviado para melhorar os produtos dele. O VEOS manda clientes só pelo código (sem nome, e-mail, telefone ou endereço), mas números, itens e políticas da VOICE vão no contexto." : null,
  };
}

const hojeBR = () => new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

/** Processa uma pergunta pendente. Nunca lanca: falha volta a pergunta para a fila com o motivo. */
export async function responderPergunta(perguntaId: string) {
  const provs = provedores();
  if (!provs.length) return { ok: false, motivo: "sem provedor configurado" };
  let reservada: any = null;
  try {
    reservada = await servico("/rest/v1/rpc/pergunta_ia_reservar", { method: "POST", body: JSON.stringify({ p_id: perguntaId }) });
  } catch (e) {
    console.error("reserva da pergunta", e);
  }
  if (!reservada) return { ok: false, motivo: "pergunta não está pendente ou já está sendo analisada" };
  const t0 = Date.now();
  try {
    const [autor] = await servico(`/rest/v1/membros?user_id=eq.${reservada.autor}&select=user_id,nome,papel`);
    const dir = diretorDoSetor(reservada.setor_id);
    if (!dir) throw new Error(`setor sem diretor: ${reservada.setor_id}`);
    const ctx: Contexto = { usuario: reservada.autor, papel: autor?.papel ?? "sem_papel", setor: reservada.setor_id, perguntaId, fontes: new Map(), bib: new Map(), procedimentos: new Set(), cache: new Map() };

    // Governanca: precedentes ANTES de pensar (consulta registrada na Biblioteca).
    const termos = termosDaPergunta(reservada.pergunta) || reservada.setor_id;
    let precedentes: any = { considerados: [] };
    try {
      precedentes = await executarFerramenta("consultar_precedentes", { termos }, ctx);
    } catch (e) {
      console.error("precedentes", e);
    }
    const resumoPrec = (precedentes.considerados ?? []).slice(0, 15).map((c: any) => `- ${c.codigo} (${c.tipo}, ${c.estado}${c.vale_como_regra ? ", VALE como regra" : ""}): ${c.titulo}`).join("\n") || "- nenhum precedente encontrado com esses termos";

    const gratuito = provs.some((p) => p.gratuito);
    const sistema = montarSistema({ diretor: dir.diretor, setorNome: dir.setorNome, hoje: hojeBR(), quem: `${autor?.nome ?? "membro"} (papel: ${ctx.papel})`, gratuito, procedimentos: procedimentosDoSetor(ctx.setor) });
    const pergunta = `PERGUNTA (feita no VEOS em ${new Date(reservada.criada_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}${reservada.contexto ? `; referência: ${reservada.contexto}` : ""}):\n${reservada.pergunta}\n\nPRECEDENTES JÁ CONSULTADOS (termos: ${termos}):\n${resumoPrec}`;

    const resultados: unknown[] = [precedentes];
    const ferramentas = ferramentasDoSetor(ctx.setor);
    const r = await responderComFallback(provs, {
      sistema, pergunta, ferramentas,
      maxPassos: 8, prazo: Date.now() + 85_000,
      executar: async (c) => {
        const out = await executarFerramenta(c.nome, c.args, ctx);
        resultados.push(out);
        return out;
      },
    });

    // trilha de cada tentativa (inclusive as que falharam)
    for (const t of r.tentativas) {
      try {
        await servico("/rest/v1/ia_execucoes", { method: "POST", body: JSON.stringify({ pergunta_id: perguntaId, setor_id: ctx.setor, provedor: t.provedor, modelo: t.modelo, ok: t.ok, passos: t.passos, uso: t.uso, ms: t.ms, erro: t.erro ?? null }) });
      } catch (e) {
        console.error("trilha da IA", e);
      }
    }
    if (!r.ok) {
      const motivo = r.tentativas.map((t) => `${t.provedor}/${t.modelo}: ${t.erro}`).join(" | ").slice(0, 480) || "nenhum provedor respondeu";
      await servico("/rest/v1/rpc/pergunta_ia_liberar", { method: "POST", body: JSON.stringify({ p_id: perguntaId, p_erro: motivo }) });
      return { ok: false, motivo };
    }

    const texto0 = limparMarkdown(r.resultado.texto);
    const conhecidos = numerosDe(resultados);
    numerosDe(reservada.pergunta, conhecidos);
    const texto = (texto0 + rodapeConferencia(conferirValores(texto0, conhecidos))).slice(0, 19_500);

    // fontes: ferramentas usadas + registros da Biblioteca citados na resposta
    for (const [cod, b] of ctx.bib) if (texto.includes(cod)) ctx.fontes.set(cod, { titulo: `${cod} · ${b.titulo}`.slice(0, 200), natureza: `${b.tipo} ${b.estado}`.slice(0, 30), url: null });
    const fontes = [...ctx.fontes.values()].slice(0, 20).map((f) => ({ titulo: f.titulo.slice(0, 200), url: f.url && /^https?:\/\//.test(f.url) ? f.url.slice(0, 400) : null, natureza: f.natureza.slice(0, 30) }));
    const procedimento = [...ctx.procedimentos].join(" · ").slice(0, 300) || null;
    const motor = `${r.provedor.rotulo} · ${r.resultado.modelo}`.slice(0, 80);

    // a pergunta pode ter sido cancelada ou respondida pelo Claude Code enquanto o motor pensava
    const [atual] = await servico(`/rest/v1/perguntas_diretores?id=eq.${perguntaId}&select=estado`);
    if (atual?.estado !== "pendente") return { ok: false, motivo: `pergunta ficou ${atual?.estado ?? "inexistente"} durante a análise` };
    await servico("/rest/v1/rpc/pergunta_responder", { method: "POST", body: JSON.stringify({ p: { pergunta_id: perguntaId, resposta: texto, procedimento, fontes, motor, usuario: null } }) });
    return { ok: true, motor, ms: Date.now() - t0 };
  } catch (e) {
    const msg = (e as Error).message ?? "falha";
    console.error("motor de IA", e);
    try {
      await servico("/rest/v1/rpc/pergunta_ia_liberar", { method: "POST", body: JSON.stringify({ p_id: perguntaId, p_erro: `falha interna: ${msg}` }) });
    } catch { /* nada a fazer */ }
    return { ok: false, motivo: msg };
  }
}

// Supabase Edge Runtime: tarefa em segundo plano depois da resposta HTTP.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

/** Dispara a analise sem segurar a requisicao (a tela acompanha pela lista). */
export function dispararAnalise(perguntaId: string) {
  const tarefa = responderPergunta(perguntaId).catch((e) => console.error("motor de IA", e));
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(tarefa);
  return tarefa;
}
