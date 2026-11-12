// FERRAMENTAS DE ACAO da IA do VEOS (modo execucao: "ache", "cadastre", "mande", "agende"...). Sao as MESMAS do MCP
// (apps/web/js/domain/mcp.js), executadas pelas MESMAS rotas da API com o membro que pediu: permissoes, validacoes e
// regras iguais as da tela. A IA NUNCA envia nem paga: o e-mail sai como rascunho e o VEOS mostra "Enviar" para a
// pessoa confirmar (clique ou "confirmo"); convite de agenda com convidados nao e criado aqui.
// Minimizacao (provedores gratuitos podem guardar o que recebem): e-mail, telefone, documento e endereco de clientes
// e registros nao vao ao modelo; para escrever a um cliente a IA passa cliente_id/registro_id e o servidor completa o
// endereco e o {{primeiro_nome}}. Contatos de EMPRESAS achados na web (publicos) vao.
// deno-lint-ignore-file no-explicit-any
import { criarMcp } from "../dominio/mcp.js";
import { CATALOGO } from "../setores/catalogo.ts";
import { rotearComMembro } from "../../api/roteador.ts";
import { HttpError, type Membro, servico } from "../banco.ts";
import { RegraError } from "../regras/vigia.ts";
import type { DefFerramenta, Esquema } from "./provedores.ts";

const { FERRAMENTAS: MCP } = criarMcp({ manualDiretor: () => ({}), catalogo: CATALOGO as unknown as unknown[] });
const POR_NOME = new Map<string, any>(MCP.map((f: any) => [f.name, f]));

// leitura da web: para todos os diretores, inclusive quando so pedem opiniao
const LEITURA_SEMPRE = ["veos_pesquisar_web", "veos_ler_pagina"];
// execucao: o basico de qualquer setor + o que e do setor
const BASE = ["veos_tipos_de_registro", "veos_registros", "veos_criar_registro", "veos_atualizar_registro", "veos_criar_tarefa", "veos_concluir_tarefa", "veos_preparar_email", "veos_buscar_produtos", "veos_caixa_de_saida", "veos_registrar_ideia_ou_proposta"];
const POR_SETOR: Record<string, string[]> = {
  direcao: ["veos_encontrar_contatos", "veos_clientes", "veos_criar_cliente", "veos_criar_orcamento_rascunho", "veos_criar_conta_a_pagar", "veos_fornecedores", "veos_emails_recebidos", "veos_ler_conversa_email", "veos_agenda", "veos_criar_evento"],
  vendas: ["veos_encontrar_contatos", "veos_clientes", "veos_criar_cliente", "veos_criar_orcamento_rascunho", "veos_emails_recebidos", "veos_ler_conversa_email", "veos_agenda", "veos_criar_evento"],
  marketing: ["veos_encontrar_contatos", "veos_clientes"],
  financas: ["veos_clientes", "veos_criar_conta_a_pagar", "veos_fornecedores", "veos_criar_fornecedor"],
  operacoes: ["veos_encontrar_contatos", "veos_fornecedores", "veos_criar_fornecedor"],
  tecnologia: ["veos_encontrar_contatos"],
  posvenda: ["veos_clientes", "veos_criar_contrato_suporte", "veos_agenda", "veos_criar_evento"],
  pessoas: [],
  secretaria: ["veos_encontrar_contatos", "veos_clientes", "veos_fornecedores", "veos_emails_recebidos", "veos_ler_conversa_email", "veos_agenda", "veos_criar_evento"],
};
// nunca pela IA do VEOS (so a pessoa, na tela ou confirmando)
const PROIBIDAS = /enviar|pagar|aceitar|responder_pergunta|perguntas_pendentes|manual_diretor|consultar_precedentes/;

const DESCRICAO_IA: Record<string, string> = {
  veos_preparar_email: "Prepara um E-MAIL na caixa de saída (rascunho). O VEOS mostra o e-mail com o botão Enviar para a pessoa confirmar: você NUNCA envia nem diz que enviou. Destino: para (e-mail de EMPRESA achado na web) OU cliente_id OU registro_id (o VEOS completa o endereço; escreva {{primeiro_nome}} no texto). Prospecção: tipo=prospeccao e alvo={nome, site, tipo_parceiro, telefone}: o VEOS cadastra a empresa como parceiro prospectado (o follow-up começa sozinho) e acrescenta a linha de 'sair'. Um e-mail por destinatário, 1:1, curto e personalizado. O e-mail sai com o visual da VOICE (logotipo, botão do WhatsApp e assinatura com telefone e site): não escreva telefone, site nem assinatura longa no texto (termine com um fecho curto, ex.: 'Abraço,'). Produto do catálogo no e-mail: ache o código com veos_buscar_produtos e passe produtos=[{codigo, destaque}] (destaque = 1 frase com o benefício para o cliente): o VEOS põe um cartão com a foto e o nome. Não escreva o código no texto. Para responder uma conversa do Gmail use responder_a (thread_id).",
  veos_criar_evento: "Cria um compromisso na agenda do Google da VOICE (horário de Brasília, ex.: 2026-11-12T15:00). Por aqui só SEM convidados; para convidar alguém, prepare um e-mail com o convite (a pessoa confirma).",
};

/** Esquema aceito por Gemini e pelos compativeis com OpenAI: sem additionalProperties; objeto livre vira texto JSON. */
export function adaptarEsquema(e: any): Esquema {
  const { additionalProperties: _a, ...r } = e ?? {};
  if (r.type === "object") {
    const props = r.properties ?? {};
    if (!Object.keys(props).length) return { type: "string", description: `${r.description ?? "objeto"} — escreva como JSON, ex.: {"campo":"valor"}` };
    const out: Esquema = { type: "object", properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, adaptarEsquema(v)])) };
    if (r.description) out.description = r.description;
    if (r.required?.length) out.required = r.required;
    return out;
  }
  if (r.type === "array") return { type: "array", ...(r.description ? { description: r.description } : {}), items: adaptarEsquema(r.items ?? { type: "string" }) };
  const out: Esquema = { type: r.type ?? "string" };
  if (r.description) out.description = r.description;
  if (r.enum) out.enum = r.enum;
  return out;
}

/** Argumentos do modelo -> formato do MCP (objeto que veio como texto JSON e parseado; numero vira texto quando o esquema pede). */
function normalizarArgs(schema: any, args: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args ?? {})) {
    const p = schema?.properties?.[k];
    if (!p) continue;
    if ((p.type === "object" || p.type === "array") && typeof v === "string") {
      try { out[k] = JSON.parse(v); } catch { out[k] = v; }
    } else if (p.type === "string" && (typeof v === "number" || typeof v === "boolean")) out[k] = String(v);
    else out[k] = v;
  }
  return out;
}

export const nomeNaIA = (n: string) => n.replace(/^veos_/, "");
export const ehAcao = (nome: string) => POR_NOME.has(`veos_${nome}`);

const ESCREVE = /^veos_(criar_|atualizar_|concluir_|preparar_|registrar_|enviar_|rascunho_)/;

/** Ferramentas oferecidas ao diretor: execucao = todas as do setor; opiniao = so as de leitura (web, registros, caixa, agenda). */
export function ferramentasDeAcao(setor: string, execucao: boolean): DefFerramenta[] {
  const todas = [...LEITURA_SEMPRE, ...BASE, ...(POR_SETOR[setor] ?? [])];
  const nomes = execucao ? todas : todas.filter((n) => !ESCREVE.test(n));
  return [...new Set(nomes)].map((n) => POR_NOME.get(n)).filter((f) => f && !PROIBIDAS.test(f.name))
    .map((f) => ({ nome: nomeNaIA(f.name), descricao: (DESCRICAO_IA[f.name] ?? f.description).replace(/veos_/g, ""), parametros: adaptarEsquema(f.inputSchema) }));
}

// ---------------------------------------------------------------- minimizacao e tamanho
const CONTATO = new Set(["email", "telefone", "documento", "cpf", "cnpj", "endereco", "endereco_obra", "whatsapp", "celular", "contato_telefone", "contato_email", "chave_acesso"]);
function semContatoPessoal(v: any, prof = 0): any {
  if (prof > 6 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => semContatoPessoal(x, prof + 1));
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (CONTATO.has(k)) { if (x) out[`tem_${k}`] = true; continue; }
    out[k] = semContatoPessoal(x, prof + 1);
  }
  return out;
}
function minimizar(nome: string, d: any) {
  if (["veos_clientes", "veos_registros", "veos_criar_cliente", "veos_criar_registro", "veos_atualizar_registro", "veos_fornecedores"].includes(nome)) return semContatoPessoal(d);
  if (nome === "veos_caixa_de_saida") {
    return { mensagens: (d?.mensagens ?? []).slice(0, 30).map((m: any) => ({ id: m.id, canal: m.canal, tipo: m.tipo, estado: m.estado, para: m.destinatario ? String(m.destinatario).replace(/^[^@]+@/, "…@") : null, assunto: m.assunto, trecho: String(m.corpo ?? "").slice(0, 200), criado_em: m.criado_em, enviada_em: m.enviada_em, respondida_em: m.respondida_em, resposta_trecho: m.resposta_trecho ? String(m.resposta_trecho).slice(0, 200) : null })) };
  }
  if (nome === "veos_preparar_email") return { id: d?.id, repetido: d?.repetido, para: d?.destinatario ?? null, assunto: d?.assunto, tipo: d?.tipo, registro_id: d?.registro_id, parceiro: d?.parceiro, produtos: d?.produtos, envio: d?.envio, falta_destinatario: d?.falta_destinatario };
  return d;
}

/** Corta as maiores listas ate o JSON caber no limite (o modelo pequeno se perde com respostas enormes). */
export function encolher(d: any, limite = 12_000): any {
  let s = JSON.stringify(d ?? null);
  if (s.length <= limite || d === null || typeof d !== "object" || Array.isArray(d)) return s.length <= limite ? d : { texto: s.slice(0, limite), truncado: true };
  const copia = JSON.parse(s);
  const truncado: Record<string, { total: number; mostrados: number }> = {};
  for (let volta = 0; volta < 30 && s.length > limite; volta++) {
    const listas = Object.entries(copia).filter(([, v]) => Array.isArray(v) && (v as unknown[]).length > 1).sort((a, b) => JSON.stringify(b[1]).length - JSON.stringify(a[1]).length);
    if (!listas.length) break;
    const [k, v] = listas[0] as [string, unknown[]];
    truncado[k] = { total: truncado[k]?.total ?? v.length, mostrados: Math.ceil(v.length / 2) };
    copia[k] = v.slice(0, truncado[k].mostrados);
    s = JSON.stringify({ ...copia, truncado });
  }
  return s.length <= limite ? { ...copia, ...(Object.keys(truncado).length ? { truncado } : {}) } : { texto: s.slice(0, limite), truncado: true };
}

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Membro ativo que fez o pedido (com o e-mail do login: robos de teste ficam separados dos dados reais). */
export async function membroDoPedido(userId: string): Promise<Membro | null> {
  const [m] = await servico(`/rest/v1/membros?user_id=eq.${encodeURIComponent(userId)}&ativo=is.true&select=user_id,nome,papel,cargo`);
  if (!m) return null;
  let email = "ia@veos";
  try {
    const u = await servico(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
    if (u?.email) email = String(u.email);
  } catch (e) { console.error("e-mail do membro", e); }
  return { ...m, email } as Membro;
}

/** Executa a ferramenta de acao pelas rotas da API, como o membro. Erro de regra volta como {erro} para o modelo corrigir. */
export async function executarAcao(nome: string, args: Record<string, unknown>, ctx: { membro: Membro | null; perguntaId: string }) {
  const f = POR_NOME.get(`veos_${nome}`);
  if (!f) throw new Error(`ferramenta inexistente: ${nome}`);
  if (PROIBIDAS.test(f.name)) return { erro: "esta ação é só da pessoa, pela tela" };
  if (!ctx.membro) return { erro: "quem pediu não tem acesso ativo ao VEOS: nada foi feito" };
  const a = normalizarArgs(f.inputSchema, args);
  if (f.name === "veos_criar_evento") { a.confirmado = false; a.convidados = []; }
  const faltando = (f.inputSchema.required ?? []).filter((k: string) => a[k] === undefined || a[k] === null || a[k] === "");
  if (faltando.length) return { erro: `faltou: ${faltando.join(", ")}` };
  try {
    if (f.local) return encolher(f.local(a));
    let [metodo, rota, corpo] = f.rota(a) as [string, string, any];
    if (f.name === "veos_preparar_email" && corpo) corpo = { ...corpo, origem: `ia:${ctx.perguntaId}` };
    const bruto = corpo === undefined ? undefined : JSON.stringify(corpo);
    const chave = (await sha256(`${ctx.perguntaId}|${f.name}|${bruto ?? rota}`)).slice(0, 40); // repetir a mesma chamada nao duplica
    const req = new Request(`https://interno.invalid/functions/v1/api/${rota}`, {
      method: metodo, body: bruto,
      headers: { "Content-Type": "application/json", "X-VEOS-Origem": `ia:${ctx.perguntaId}`.slice(0, 60), ...(metodo === "POST" ? { "Idempotency-Key": chave } : {}) },
    });
    return encolher(minimizar(f.name, await rotearComMembro(req, rota.split("?")[0].replace(/\/$/, ""), ctx.membro)));
  } catch (e) {
    if (e instanceof HttpError || e instanceof RegraError) return { erro: e.message };
    const msg = (e as Error)?.message ?? "falha";
    if (/inválid|invalid|faltou|obrigat|rota fora|setor/i.test(msg)) return { erro: msg };
    throw e;
  }
}
