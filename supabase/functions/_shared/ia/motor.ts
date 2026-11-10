// MOTOR DE RACIOCINIO DOS DIRETORES. Fluxo de uma pergunta da fila:
//   1. reserva a pergunta (um processamento por vez; expira em 4 min se a funcao cair);
//   2. consulta precedentes na Biblioteca ANTES de pensar (registrado, como exige a governanca);
//   3. roda os provedores na ordem (Gemini, Mistral, OpenRouter, Groq, NVIDIA, OpenAI: os que tiverem
//      chave), com as ferramentas do VEOS;
//   4. limpa o Markdown, confere os valores em reais contra os resultados das ferramentas e
//      acrescenta o aviso do que nao foi conferido;
//   5. grava a resposta (rotulada "IA · opiniao, nao decisao") com fontes e procedimento, e a trilha
//      completa em ia_execucoes. Sem provedor ou com falha, a pergunta volta para a fila do Claude Code.
// deno-lint-ignore-file no-explicit-any
import { servico } from "../banco.ts";
import { apenasGratuitos, type Provedor, responderComFallback } from "./provedores.ts";
import { conferirValores, limparMarkdown, montarSistema, numerosDe, rodapeConferencia, termosDaPergunta } from "./texto.ts";
import { levantamentoPrevio, perguntaDeDados, REFAZER_COM_FERRAMENTA, REFAZER_EXECUTANDO } from "./texto.ts";
import { type Contexto, diretorDoSetor, executarFerramenta, ferramentasDoSetor, procedimentosDoSetor } from "./ferramentas.ts";
import { ehAcao, executarAcao, ferramentasDeAcao, membroDoPedido } from "./acoes_ia.ts";
import { pedidoDeAcao } from "../dominio/comandos.js";

// No modo execucao o diretor recebe as ferramentas de acao + so os dados mais uteis (modelo pequeno se perde com muitas).
const DADOS_NA_EXECUCAO = new Set(["consultar_precedentes", "painel_executivo", "pedidos_e_recebiveis", "caixa_e_contas", "previsao_de_caixa", "funil_comercial", "base_comercial", "buscar_orcamentos", "analisar_orcamento", "preco_pela_politica", "metas_comerciais", "canais_e_cadencias"]);
// acoes que contam como "executou" (as de leitura da web sozinhas nao contam)
const ACOES_DE_FATO = /^(criar_|atualizar_|concluir_|preparar_|encontrar_contatos|registrar_ideia)/;

const lista = (v: string | undefined, padrao: string) => (v || padrao).split(",").map((x) => x.trim()).filter(Boolean);

// Provedores conhecidos. Todos menos o Gemini falam o formato da OpenAI (muda o endereco). Cada um so
// entra se a chave estiver nos segredos do Supabase; os modelos podem ser trocados por <ID>_MODELOS.
const CATALOGO_IA: { id: string; nome: string; tipo: "gemini" | "compat"; base?: string; chave: string; modelos: string; gratuito: boolean; nota: string }[] = [
  { id: "gemini", nome: "Gemini (Google AI Studio)", tipo: "gemini", chave: "GEMINI_API_KEY", modelos: "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite", gratuito: true, nota: "nível gratuito: o Google pode usar o conteúdo para melhorar os produtos dele" },
  { id: "mistral", nome: "Mistral (La Plateforme)", tipo: "compat", base: "https://api.mistral.ai/v1", chave: "MISTRAL_API_KEY", modelos: "ministral-14b-2512,ministral-8b-2512", gratuito: true, nota: "plano gratuito sem cartão (só os modelos Ministral; Medium/Small/Large pedem plano pago); uso para treino desligado em Admin → Privacidade (07/10/2026)" },
  { id: "openrouter", nome: "OpenRouter (modelos :free)", tipo: "compat", base: "https://openrouter.ai/api/v1", chave: "OPENROUTER_API_KEY", modelos: "", gratuito: true, nota: "só modelos :free (o VEOS ignora os pagos sem OPENROUTER_PAGO=sim); sem créditos comprados, modelo pago é recusado (402); provedores podem registrar o conteúdo; 50 chamadas por dia" },
  { id: "groq", nome: "Groq", tipo: "compat", base: "https://api.groq.com/openai/v1", chave: "GROQ_API_KEY", modelos: "openai/gpt-oss-120b", gratuito: true, nota: "rápido, mas o limite de tokens por minuto do gratuito é pequeno para perguntas grandes" },
  { id: "nvidia", nome: "NVIDIA NIM", tipo: "compat", base: "https://integrate.api.nvidia.com/v1", chave: "NVIDIA_API_KEY", modelos: "", gratuito: true, nota: "programa de desenvolvedor: confira os termos de uso" },
  { id: "openai", nome: "OpenAI (API paga à parte do ChatGPT)", tipo: "compat", base: "https://api.openai.com/v1", chave: "OPENAI_API_KEY", modelos: "gpt-5-mini", gratuito: false, nota: "cobrança por uso (BIB-0092)" },
];

/** Provedores configurados nos segredos do Supabase (sem expor chaves). Ordem: IA_ORDEM. */
export function provedores(): Provedor[] {
  const env = (k: string) => Deno.env.get(k) ?? "";
  const todos: Record<string, Provedor | null> = {};
  for (const c of CATALOGO_IA) {
    const chave = env(c.chave);
    const pago = env(`${c.id.toUpperCase()}_PAGO`) === "sim";
    const configurados = lista(env(`${c.id.toUpperCase()}_MODELOS`), c.modelos);
    // Sem decisao de pagar (OPENROUTER_PAGO=sim), modelo pago configurado por engano nao entra.
    const modelos = c.id === "openrouter" && !pago ? apenasGratuitos(configurados) : configurados;
    todos[c.id] = chave && modelos.length ? { id: c.id, tipo: c.tipo, base: c.base, rotulo: `${c.nome.replace(/ \(.*\)$/, "")}${c.gratuito && !pago ? " (gratuito)" : ""}`, modelos, chave, gratuito: c.gratuito && !pago } : null;
  }
  return lista(env("IA_ORDEM"), CATALOGO_IA.map((c) => c.id).join(",")).map((id) => todos[id]).filter((x): x is Provedor => Boolean(x));
}

export function situacaoMotores() {
  const ativos = provedores();
  const env = (k: string) => Deno.env.get(k) ?? "";
  return {
    motores: [
      ...CATALOGO_IA.map((c) => {
        const a = ativos.find((p) => p.id === c.id);
        return { id: c.id, nome: c.nome, ativo: Boolean(a), gratuito: a?.gratuito ?? c.gratuito, modelos: a?.modelos ?? [], nota: c.nota, falta: a ? null : env(c.chave) ? `${c.id.toUpperCase()}_MODELOS` : c.chave };
      }),
      { id: "claude-code", nome: "Claude Code (assinatura do fundador, pela fila)", ativo: true, gratuito: true, modelos: [], nota: "responde quando o Fernando pede no VS Code", falta: null },
    ],
    ordem: ativos.map((p) => p.id),
    algum_no_servidor: ativos.length > 0,
    dados_ao_provedor_gratuito: ativos.some((p) => p.gratuito) ? "Nos níveis gratuitos o provedor pode usar o conteúdo enviado (Gemini e modelos :free do OpenRouter; na Mistral o uso para treino foi desligado em 07/10/2026). O VEOS manda clientes só pelo código (sem nome, e-mail, telefone ou endereço), mas números, itens e políticas da VOICE vão no contexto." : null,
  };
}

const hojeBR = () => new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

/** Fontes das acoes (paginas lidas, pesquisa, cadastros) para aparecerem embaixo da resposta. */
function fonteDaAcao(ctx: Contexto, nome: string, args: any, out: any) {
  if (!out || out.erro) return;
  if (nome === "pesquisar_web") ctx.fontes.set(`web:${args?.consulta}`, { titulo: `Pesquisa na web (${out.provedor ?? "web"}): ${String(args?.consulta ?? "").slice(0, 120)}`, natureza: "pesquisa web", url: null });
  else if (nome === "ler_pagina" && out.url) ctx.fontes.set(out.url, { titulo: String(out.titulo || out.url).slice(0, 200), natureza: "página web", url: out.url });
  else if (nome === "encontrar_contatos") for (const e of (out.encontrados ?? []).slice(0, 8)) ctx.fontes.set(e.fonte ?? e.site, { titulo: `${e.nome} (site da empresa)`.slice(0, 200), natureza: "página web", url: e.fonte ?? e.site ?? null });
  else if (/^criar_|^atualizar_|^preparar_email/.test(nome)) ctx.fontes.set(`acao:${nome}`, { titulo: "Ações feitas no VEOS nesta resposta (histórico de cada registro)", natureza: "ação", url: null });
}

/** Resumo automatico do que foi feito (quando o modelo nao escreveu o final). */
function resumoDasAcoes(coletados: { nome: string; args: unknown; texto: string }[]) {
  const linhas: string[] = [];
  for (const x of coletados) {
    if (!ACOES_DE_FATO.test(x.nome)) continue;
    let o: any = {};
    try { o = JSON.parse(x.texto); } catch { /* texto cortado */ }
    const a: any = x.args ?? {};
    if (o?.erro) linhas.push(`• ${x.nome.replace(/_/g, " ")}: não feito (${String(o.erro).slice(0, 140)})`);
    else if (x.nome === "preparar_email") linhas.push(`• E-mail preparado para ${o.para ?? a.para ?? "destinatário a definir"}: ${o.assunto ?? a.assunto ?? ""}`);
    else if (x.nome === "encontrar_contatos") linhas.push(`• Pesquisa de contatos "${a.busca ?? ""}": ${(o.encontrados ?? []).length} empresa(s) com e-mail`);
    else linhas.push(`• ${x.nome.replace(/_/g, " ")}: feito${o?.codigo ? ` (${o.codigo})` : o?.id ? ` (id ${String(o.id).slice(0, 8)})` : ""}`);
  }
  return `RESUMO\nO motor de IA não terminou de escrever a resposta, mas estas ações foram feitas no VEOS:\n\nFEITO\n${linhas.join("\n") || "• nada"}\n\nPARA CONFIRMAR\n• Os e-mails preparados aparecem abaixo com o botão Enviar (e na Caixa de saída).`;
}

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
    // conversa: as trocas anteriores (ate 6, da mais antiga a mais recente) entram antes da pergunta nova
    let historico = "";
    try {
      const [eu0] = await servico(`/rest/v1/perguntas_diretores?id=eq.${perguntaId}&select=conversa_id,criada_em`);
      if (eu0?.conversa_id) {
        const turnos = await servico(`/rest/v1/perguntas_diretores?or=(id.eq.${eu0.conversa_id},conversa_id.eq.${eu0.conversa_id})&criada_em=lt.${encodeURIComponent(eu0.criada_em)}&estado=eq.respondida&select=pergunta,criada_em,respostas:respostas_diretores(resposta,id)&order=criada_em.desc&limit=6`);
        historico = turnos.reverse().map((x: any) => {
          const resp = (x.respostas ?? []).sort((a: any, b: any) => b.id - a.id)[0]?.resposta ?? "(sem resposta)";
          return `${autor?.nome ?? "Pessoa"}: ${x.pergunta}\nVocê (${dir.diretor.nome}): ${String(resp).replace(/\n\nConferência automática do VEOS:[\s\S]*$/, "").slice(0, 1800)}`;
        }).join("\n\n");
      }
    } catch (e) {
      console.error("historico da conversa", e);
    }
    // MODO EXECUCAO: a mensagem pede para FAZER ("ache", "cadastre", "mande"...), ou continua uma execucao com um "pode fazer"
    const curta = reservada.pergunta.trim().split(/\s+/).length <= 10;
    const execucao = pedidoDeAcao(reservada.pergunta) || (curta && /\b(FEITO|PARA CONFIRMAR)\b/.test(historico.slice(-2500)) && /\b(sim|pode|faça|faca|isso|ok|segue|continue|manda|cadastra|prepara)\b/i.test(reservada.pergunta));
    const membro = await membroDoPedido(reservada.autor).catch(() => null);
    const sistema = montarSistema({ diretor: dir.diretor, setorNome: dir.setorNome, hoje: hojeBR(), quem: `${autor?.nome ?? "membro"} (papel: ${ctx.papel})`, gratuito, procedimentos: procedimentosDoSetor(ctx.setor), execucao });
    const pergunta = `${historico ? `CONVERSA ATÉ AQUI (continue a mesma conversa: responda à mensagem nova considerando o que já foi dito; não repita o que já explicou; se a mensagem for curta, como "e isso?" ou "detalhe o item 2", ela se refere ao que veio antes):\n${historico}\n\n` : ""}${historico ? "MENSAGEM NOVA" : execucao ? "PEDIDO" : "PERGUNTA"} (feita no VEOS em ${new Date(reservada.criada_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}${reservada.contexto ? `; referência: ${reservada.contexto}` : ""}):\n${reservada.pergunta}\n\nPRECEDENTES JÁ CONSULTADOS (termos: ${termos}):\n${resumoPrec}\n\n${execucao
      ? "LEMBRE: EXECUTE o pedido com as ferramentas de ação (procure antes de criar; e-mail = preparar_email, a pessoa confirma o envio). Nada de inventar contato ou número. No fim: FEITO / PARA CONFIRMAR / LACUNAS."
      : "LEMBRE: número (percentual, valor, quantidade) só se vier de uma ferramenta chamada nesta resposta ou do histórico acima; para falar de vendas, funil, clientes ou caixa, CHAME a ferramenta antes. Sem dado, escreva LACUNA."}`;

    const resultados: unknown[] = [precedentes];
    const coletados: { nome: string; args: unknown; texto: string }[] = [];
    const doSetor = ferramentasDoSetor(ctx.setor);
    const previstas = levantamentoPrevio(reservada.pergunta, doSetor.map((f) => f.nome), execucao ? 2 : 3);
    const dados = execucao ? doSetor.filter((f) => DADOS_NA_EXECUCAO.has(f.nome) || previstas.some((p) => p.nome === f.nome)) : doSetor;
    const ferramentas = [...dados, ...ferramentasDeAcao(ctx.setor, execucao)];
    // tempo da funcao no plano gratuito: 150 s no total (ferramentas ate ~80-95 s; resposta final ate ~125 s)
    const rodar = (perg: string, prazo: number, limite: number) => responderComFallback(provs, {
      sistema, pergunta: perg, ferramentas,
      maxPassos: execucao ? 10 : 8, prazo, limite,
      executar: async (c) => {
        const out = ehAcao(c.nome) ? await executarAcao(c.nome, c.args, { membro, perguntaId }) : await executarFerramenta(c.nome, c.args, ctx);
        if (ehAcao(c.nome)) fonteDaAcao(ctx, c.nome, c.args, out);
        resultados.push(out);
        coletados.push({ nome: c.nome, args: c.args, texto: JSON.stringify(out).slice(0, 6000) });
        return out;
      },
      dadosLevantados: () => {
        const vistos = new Set<string>();
        const unicos = coletados.filter((x) => { const k = `${x.nome}:${JSON.stringify(x.args)}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
        return unicos.map((x) => `- ${x.nome}(${JSON.stringify(x.args)}) → ${x.texto}`).join("\n").slice(0, 24_000);
      },
    });
    // LEVANTAMENTO PREVIO: os dados do assunto ja entram no pedido (o modelo pequeno interpreta em vez de procurar)
    let previo = "";
    try {
      const alvos = previstas;
      const feitos = await Promise.all(alvos.map(async (a) => {
        try {
          const out = await Promise.race([executarFerramenta(a.nome, a.args, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("demorou")), 15_000))]);
          return { a, out };
        } catch (e) {
          console.error("levantamento previo", a.nome, e);
          return null;
        }
      }));
      const linhas: string[] = [];
      for (const f of feitos) {
        if (!f || (f.out as any)?.erro) continue;
        resultados.push(f.out);
        const texto = JSON.stringify(f.out).slice(0, 6000);
        coletados.push({ nome: f.a.nome, args: f.a.args, texto });
        linhas.push(`- ${f.a.nome} → ${texto}`);
      }
      if (linhas.length) previo = `\n\nDADOS DO VEOS JÁ LEVANTADOS AGORA (resultado real das ferramentas; use-os como base e chame outras ferramentas só para o que faltar; não cite valor que não esteja aqui ou em outra ferramenta):\n${linhas.join("\n")}`;
    } catch (e) {
      console.error("levantamento previo", e);
    }
    const perguntaComDados = pergunta + previo;
    let r = await rodar(perguntaComDados, t0 + (execucao ? 95_000 : 80_000), t0 + 125_000);
    // pergunta de dados respondida sem nenhuma ferramenta: refaz UMA vez exigindo a consulta (se ainda houver tempo)
    if (!execucao && r.ok && coletados.length === 0 && perguntaDeDados(reservada.pergunta) && Date.now() - t0 < 50_000) {
      const r2 = await rodar(perguntaComDados + REFAZER_COM_FERRAMENTA, Date.now() + 40_000, t0 + 140_000);
      r.tentativas.push(...r2.tentativas);
      if (r2.ok && coletados.length > 0) r = { ...r2, tentativas: r.tentativas };
    }
    // execucao em que o modelo so descreveu (nao chamou nenhuma acao): refaz UMA vez mandando executar
    const executou = () => coletados.some((x) => ehAcao(x.nome) && ACOES_DE_FATO.test(x.nome));
    if (execucao && r.ok && !executou() && Date.now() - t0 < 60_000) {
      const r2 = await rodar(perguntaComDados + REFAZER_EXECUTANDO, Date.now() + 50_000, t0 + 140_000);
      r.tentativas.push(...r2.tentativas);
      if (r2.ok && executou()) r = { ...r2, tentativas: r.tentativas };
    }

    // CONFERENCIA ATIVA: se a resposta traz 2+ valores sem origem, refaz UMA vez mandando corrigir (se ainda houver tempo)
    if (!execucao && r.ok && Date.now() - t0 < 70_000) {
      const conh0 = numerosDe(resultados);
      numerosDe(reservada.pergunta, conh0);
      const ruins = conferirValores(limparMarkdown(r.resultado.texto), conh0);
      if (ruins.length >= 2) {
        const r3 = await rodar(`${perguntaComDados}\n\nCORREÇÃO OBRIGATÓRIA: na resposta anterior estes valores NÃO vieram de nenhuma ferramenta nem dos dados acima: ${ruins.slice(0, 8).join(", ")}. Refaça a resposta usando SOMENTE valores presentes nos dados levantados; onde não houver dado, escreva LACUNA em vez de inventar.`, Date.now() + 40_000, t0 + 140_000);
        r.tentativas.push(...r3.tentativas);
        if (r3.ok && conferirValores(limparMarkdown(r3.resultado.texto), numerosDe(resultados, new Set(conh0))).length < ruins.length) r = { ...r3, tentativas: r.tentativas };
      }
    }

    // trilha de cada tentativa (inclusive as que falharam)
    for (const t of r.tentativas) {
      try {
        await servico("/rest/v1/ia_execucoes", { method: "POST", body: JSON.stringify({ pergunta_id: perguntaId, setor_id: ctx.setor, provedor: t.provedor, modelo: t.modelo, ok: t.ok, passos: t.passos, uso: t.uso, ms: t.ms, erro: t.erro ?? null }) });
      } catch (e) {
        console.error("trilha da IA", e);
      }
    }
    // execucao que ja fez coisas mas o modelo nao escreveu o fim: responde com o resumo do que foi feito (nao volta para
    // a fila, para nao repetir as acoes numa nova tentativa)
    if (!r.ok && execucao && executou()) {
      r = { ok: true, provedor: { id: "veos", rotulo: "VEOS (resumo automático)", modelos: [], chave: "", gratuito: true }, resultado: { texto: resumoDasAcoes(coletados), modelo: "resumo das ações", passos: [], uso: { entrada: 0, saida: 0 } }, tentativas: r.tentativas } as any;
    }
    if (!r.ok) {
      const motivo = r.tentativas.map((t) => `${t.provedor}/${t.modelo}: ${t.erro}`).join(" | ").slice(0, 480) || "nenhum provedor respondeu";
      await servico("/rest/v1/rpc/pergunta_ia_liberar", { method: "POST", body: JSON.stringify({ p_id: perguntaId, p_erro: motivo }) });
      return { ok: false, motivo };
    }

    // modo execucao: ids longos (uuid) nao ajudam quem le; somem do texto (ficam no historico de cada registro)
    const texto0 = execucao
      ? limparMarkdown(r.resultado.texto).replace(/\s*\((?:ID|id|Id)s?:?\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/g, "").replace(/\b(?:ID|id|Id):?\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b,?\s*/g, "")
      : limparMarkdown(r.resultado.texto);
    const conhecidos = numerosDe(resultados);
    numerosDe(reservada.pergunta, conhecidos);
    numerosDe(historico, conhecidos);
    numerosDe(resumoPrec, conhecidos);
    // respondeu sem consultar nenhum dado do VEOS e citou numeros: aviso no topo (o modelo pequeno as vezes inventa)
    const semDados = !execucao && coletados.length === 0 && /\d+(?:,\d+)?\s?%|R\$\s?\d/.test(texto0);
    const aviso = semDados ? "ATENÇÃO (conferência do VEOS): nesta resposta o diretor não consultou nenhum dado do VEOS. Percentuais e valores abaixo NÃO são fatos da VOICE: trate como hipótese e peça \"use os dados do VEOS\" para ele refazer com as ferramentas.\n\n" : "";
    const texto = (aviso + texto0 + rodapeConferencia(conferirValores(texto0, conhecidos))).slice(0, 19_500);

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
