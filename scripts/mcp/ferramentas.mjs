// Ferramentas do MCP do VEOS e o tratador JSON-RPC (sem E/S: testavel). Cada ferramenta chama a
// MESMA API do site com a sessao do usuario: permissoes e regras do banco valem igual. Escritas
// so criam o que a governanca permite a qualquer membro (ideia, proposta, rascunho, tarefa);
// decisao/politica, aprovacao e envio continuam humanos, pela tela.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buscar, buscarSolto } from "../../apps/web/js/domain/busca.js";

const SETORES = ["direcao", "financas", "vendas", "marketing", "operacoes", "tecnologia", "posvenda", "pessoas", "secretaria"];
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "../..");
const lerJson = (f) => JSON.parse(readFileSync(join(RAIZ, f), "utf8"));

/** Manual de atuacao do diretor (local, sem rede). Com "pedido": os procedimentos mais proximos + o essencial. */
export function manualDiretor({ setor, pedido }) {
  if (!SETORES.includes(setor)) throw new Error(`setor invalido; use: ${SETORES.join(", ")}`);
  const s = lerJson(`setores/${setor}.json`);
  const arq = `setores/manuais/${setor}.json`;
  if (!existsSync(join(RAIZ, arq))) return { diretor: s.diretor, aviso: "manual ainda nao pesquisado: use o perfil, metodos e principios do diretor" };
  const m = lerJson(arq);
  const base = { diretor: { titulo: s.diretor.titulo, nome: s.diretor.nome, perfil: s.diretor.perfil, principios: s.diretor.principios, limites: s.diretor.limites }, resumo: m.resumo,
    regras_do_veos: "Persona ficticia. Precedente orienta, nao autoriza (consulte veos_consultar_precedentes). Nao invente meta, alcada, politica nem regime tributario: registre como ideia/proposta. Diferencie fato, opiniao, inferencia e hipotese." };
  if (!pedido) return { ...base, competencias: m.competencias, frameworks: m.frameworks.map((f) => ({ nome: f.nome, autor_ou_origem: f.autor_ou_origem, quando_usar: f.quando_usar })), procedimentos: m.procedimentos.map((p) => p.pedido), indicadores: m.indicadores, rotinas: m.rotinas, armadilhas: m.armadilhas, aplicacao_voice: m.aplicacao_voice };
  const itens = m.procedimentos.map((p, i) => ({ titulo: p.pedido, extra: [...(p.passos ?? []), p.entregavel].join(" "), i }));
  const exatos = buscar(pedido, itens, 3);
  const achados = (exatos.length ? exatos : buscarSolto(pedido, itens, 3)).map((a) => m.procedimentos[a.i]);
  return { ...base, pedido, procedimentos: achados.length ? achados : m.procedimentos.slice(0, 3), aviso: achados.length ? undefined : "nenhum procedimento com essas palavras: veja os primeiros e adapte",
    frameworks_relacionados: buscarSolto(pedido, m.frameworks.map((f, i) => ({ titulo: f.nome, extra: `${f.quando_usar} ${f.como_aplicar.join(" ")}`, i })), 3).map((a) => m.frameworks[a.i]),
    indicadores: m.indicadores, armadilhas: m.armadilhas };
}

const obj = (props, req = []) => ({ type: "object", properties: props, required: req, additionalProperties: false });
const str = (description, extra = {}) => ({ type: "string", description, ...extra });

export const FERRAMENTAS = [
  { name: "veos_manual_diretor", description: "Manual de atuação do diretor de um setor (profissional sênior: competências, métodos, procedimentos passo a passo, indicadores, erros a evitar, fontes). Use ANTES de agir como diretor: com 'pedido', devolve os procedimentos mais próximos do que foi pedido.",
    inputSchema: obj({ setor: str("setor", { enum: SETORES }), pedido: str("o que o fundador pediu (opcional)") }, ["setor"]), local: manualDiretor },
  { name: "veos_radar", description: "Alertas ativos e tarefas abertas dos setores que o usuário acessa.", inputSchema: obj({}), rota: () => ["GET", "radar"] },
  { name: "veos_resumo_do_dia", description: "Resumo do dia por setor: alertas novos, tarefas atrasadas, mensagens a enviar.", inputSchema: obj({}), rota: () => ["GET", "resumo"] },
  { name: "veos_painel", description: "Painel executivo (direção e finanças): vendas aceitas, faturado, caixa, funil do CRM, alertas.", inputSchema: obj({}), rota: () => ["GET", "painel"] },
  { name: "veos_saude", description: "Saúde do sistema (direção e tecnologia): banco, sincronização do Zoho, agendamentos, alertas SIS.", inputSchema: obj({}), rota: () => ["GET", "sistema/saude"] },
  { name: "veos_consultar_precedentes", description: "OBRIGATÓRIO antes de recomendar ou executar algo relevante: consulta decisões, políticas, aprendizados e propostas da Biblioteca (a consulta fica registrada). Precedente orienta, não autoriza.",
    inputSchema: obj({ termos: str("palavras-chave (ex.: desconto margem)"), setor: str("id do setor (opcional)"), referencia: str("objeto relacionado, ex.: pedido:<id> (opcional)") }, ["termos"]),
    rota: (a) => ["POST", "biblioteca/consultar", { termos: a.termos, setor: a.setor, referencia: a.referencia, contexto: "mcp" }] },
  { name: "veos_biblioteca_listar", description: "Lista registros da Biblioteca por área (decisoes, aprendizados, referencias, politicas, revisoes) e busca.",
    inputSchema: obj({ area: str("área", { enum: ["decisoes", "aprendizados", "referencias", "politicas", "revisoes"] }), busca: str("texto (opcional)") }, ["area"]),
    rota: (a) => ["GET", `biblioteca?${new URLSearchParams({ area: a.area, ...(a.busca ? { busca: a.busca } : {}) })}`] },
  { name: "veos_biblioteca_registro", description: "Registro completo da Biblioteca (versões, fontes, pareceres, histórico).", inputSchema: obj({ id: str("uuid do registro") }, ["id"]), rota: (a) => ["GET", `biblioteca/${encodeURIComponent(a.id)}`] },
  { name: "veos_registrar_ideia_ou_proposta", description: "Registra uma IDEIA ou PROPOSTA na Biblioteca (nunca decisão: frase solta não vira decisão). Use para sugestões que dependem de aprovação.",
    inputSchema: obj({ tipo: str("ideia ou proposta", { enum: ["ideia", "proposta"] }), titulo: str("título"), conteudo: str("o que, por que, evidências e riscos"), assuntos: { type: "array", items: { type: "string" } } }, ["tipo", "titulo", "conteudo"]),
    rota: (a) => ["POST", "biblioteca", { tipo: a.tipo, titulo: a.titulo, conteudo: `${a.conteudo}\n\n(Registrado pelo Claude Code via MCP.)`, assuntos: a.assuntos ?? [] }] },
  { name: "veos_pedidos", description: "Lista pedidos (opcional: estado rascunho/confirmado/entregue/faturado/concluido/cancelado).", inputSchema: obj({ estado: str("estado (opcional)") }),
    rota: (a) => ["GET", `fluxo/pedidos${a.estado ? `?estado=${encodeURIComponent(a.estado)}` : ""}`] },
  { name: "veos_pedido", description: "Pedido completo: itens, estoque, parcelas, NF, caixa (V1.1), compras, horas, margem orçada x realizada.", inputSchema: obj({ id: str("uuid do pedido") }, ["id"]), rota: (a) => ["GET", `fluxo/pedidos/${encodeURIComponent(a.id)}`] },
  { name: "veos_faltas_e_compras", description: "Faltas de estoque dos pedidos e o que já está em compra.", inputSchema: obj({}), rota: () => ["GET", "fluxo/compras/faltas"] },
  { name: "veos_previsao_caixa", description: "Previsão de caixa (entradas − saídas) de 2 meses atrás a 6 à frente (direção e finanças).", inputSchema: obj({}), rota: () => ["GET", "fluxo/caixa"] },
  { name: "veos_criar_tarefa", description: "Cria uma tarefa num setor (aparece no Radar).", inputSchema: obj({ setor: str("id do setor"), titulo: str("o que fazer"), prazo: str("AAAA-MM-DD (opcional)") }, ["setor", "titulo"]),
    rota: (a) => ["POST", "tarefas", { setor: a.setor, titulo: a.titulo, prazo: a.prazo ?? null }] },
  { name: "veos_rascunho_mensagem", description: "Guarda um rascunho na caixa de saída (e-mail ou WhatsApp). O VEOS não envia: uma pessoa revisa e envia.",
    inputSchema: obj({ canal: str("email ou whatsapp", { enum: ["email", "whatsapp"] }), corpo: str("texto"), destinatario: str("e-mail ou telefone (opcional)"), assunto: str("assunto (opcional)"), setor_id: str("setor (opcional)") }, ["canal", "corpo"]),
    rota: (a) => ["POST", "mensagens", { canal: a.canal, corpo: a.corpo, destinatario: a.destinatario, assunto: a.assunto, setor_id: a.setor_id, origem: "manual" }] },
];

const INSTRUCOES = "VEOS da VOICE Ambientes Inteligentes. Para agir como um diretor (CEO, CFO, CMO...), leia antes veos_manual_diretor com o pedido. Antes de recomendar ou executar algo relevante, use veos_consultar_precedentes. Precedente orienta, não autoriza. Não deduza regime tributário, alçada, meta ou política: registre como ideia/proposta. Diferencie fato, opinião, inferência e hipótese. Nada é enviado a clientes pelo VEOS.";

/** Trata uma mensagem JSON-RPC. chamar(metodo, rota, corpo) -> dados da API (ou lanca erro). */
export async function responder(msg, chamar) {
  const ok = (result) => ({ jsonrpc: "2.0", id: msg.id, result });
  if (msg.id === undefined || msg.id === null) return null; // notificacao
  switch (msg.method) {
    case "initialize":
      return ok({ protocolVersion: msg.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "veos", version: "1.0.0" }, instructions: INSTRUCOES });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: FERRAMENTAS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const f = FERRAMENTAS.find((x) => x.name === msg.params?.name);
      if (!f) return { jsonrpc: "2.0", id: msg.id, error: { code: -32602, message: `ferramenta desconhecida: ${msg.params?.name}` } };
      const args = msg.params?.arguments ?? {};
      const faltando = (f.inputSchema.required ?? []).filter((k) => args[k] === undefined || args[k] === "");
      if (faltando.length) return ok({ content: [{ type: "text", text: `Faltou: ${faltando.join(", ")}` }], isError: true });
      try {
        if (f.local) return ok({ content: [{ type: "text", text: JSON.stringify(f.local(args), null, 1).slice(0, 60000) }] });
        const [metodo, rota, corpo] = f.rota(args);
        const dados = await chamar(metodo, rota, corpo);
        return ok({ content: [{ type: "text", text: JSON.stringify(dados, null, 1).slice(0, 60000) }] });
      } catch (e) {
        return ok({ content: [{ type: "text", text: `Erro do VEOS: ${e.message}` }], isError: true });
      }
    }
    default:
      return { jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `método não suportado: ${msg.method}` } };
  }
}
