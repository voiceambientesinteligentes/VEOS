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
  painel: () => request("GET", "painel"),
  orcamentos: () => request("GET", "orcamentos"),
  projetos: () => request("GET", "projetos"),
  radar: () => request("GET", "radar"),
  varrer: () => request("POST", "radar/varrer", {}, { "Idempotency-Key": crypto.randomUUID() }),
  setor: (id) => request("GET", `setor/${encodeURIComponent(id)}`),
  criarRegistro: (dados) => request("POST", "registros", dados, { "Idempotency-Key": crypto.randomUUID() }),
  alterarRegistro: (id, dados) => request("POST", `registros/${encodeURIComponent(id)}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  criarTarefa: (dados) => request("POST", "tarefas", dados, { "Idempotency-Key": crypto.randomUUID() }),
  concluirTarefa: (id, estado) => request("POST", `tarefas/${encodeURIComponent(id)}`, { estado }, { "Idempotency-Key": crypto.randomUUID() }),
  dispensarAlerta: (id) => request("POST", `alertas/${encodeURIComponent(id)}`, { estado: "dispensado" }, { "Idempotency-Key": crypto.randomUUID() }),
  projeto: (id) => request("GET", `projetos/${encodeURIComponent(id)}`),
  criarProjeto: (dados) => request("POST", "projetos", dados, { "Idempotency-Key": crypto.randomUUID() }),
  // tipo: fases | recebimentos | compromissos
  lancar: (id, tipo, dados) => request("POST", `projetos/${encodeURIComponent(id)}/${tipo}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  compraProposta: (id, dados) => request("POST", `projetos/${encodeURIComponent(id)}/compra-proposta`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  // Zoho (somente leitura; tokens ficam no servidor)
  zohoStatus: () => request("GET", "zoho/status"),
  zohoConectar: () => request("POST", "zoho/conectar", {}, { "Idempotency-Key": crypto.randomUUID() }),
  zohoDesconectar: () => request("POST", "zoho/desconectar", {}, { "Idempotency-Key": crypto.randomUUID() }),
  zohoRbt12: () => request("GET", "zoho/rbt12"),
  zohoOrcamentos: (busca = "", status = "") => request("GET", `zoho/orcamentos?${new URLSearchParams({ busca, status })}`),
  zohoOrcamento: (id) => request("GET", `zoho/orcamentos/${encodeURIComponent(id)}`),
  zohoEtapas: () => request("GET", "zoho/crm/etapas"),
  zohoSincronizar: () => request("POST", "zoho/sincronizar", {}, { "Idempotency-Key": crypto.randomUUID() }),
  zohoEspelho: () => request("GET", "zoho/espelho"),
  zohoEspelhoLista: (produto, modulo, busca = "", pagina = 1) => request("GET", `zoho/espelho/${encodeURIComponent(produto)}/${encodeURIComponent(modulo)}?${new URLSearchParams({ busca, pagina: String(pagina) })}`),
  zohoEspelhoRegistro: (produto, modulo, id) => request("GET", `zoho/espelho/${encodeURIComponent(produto)}/${encodeURIComponent(modulo)}/${encodeURIComponent(id)}`),
  zohoCampos: (produto, modulo) => request("GET", `zoho/campos/${encodeURIComponent(produto)}/${encodeURIComponent(modulo)}`),
  zohoEscrever: (produto, modulo, id, campos, modificadoEm) =>
    request("POST", `zoho/escrever/${encodeURIComponent(produto)}/${encodeURIComponent(modulo)}${id ? `/${encodeURIComponent(id)}` : ""}`, { campos, modificado_em: modificadoEm ?? null }, { "Idempotency-Key": crypto.randomUUID() }),
  // Fluxo vivo: pedidos, estoque, parcelas, NF
  fluxoResumo: () => request("GET", "fluxo/resumo"),
  fluxoOrcamentosAceitos: () => request("GET", "fluxo/orcamentos-aceitos"),
  fluxoPedidos: (estado = "") => request("GET", `fluxo/pedidos${estado ? `?estado=${encodeURIComponent(estado)}` : ""}`),
  fluxoPedido: (id) => request("GET", `fluxo/pedidos/${encodeURIComponent(id)}`),
  fluxoCriarPedido: (dados) => request("POST", "fluxo/pedidos", dados, { "Idempotency-Key": crypto.randomUUID() }),
  fluxoAcao: (id, acao, dados = {}) => request("POST", `fluxo/pedidos/${encodeURIComponent(id)}/${acao}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  fluxoReceber: (parcelaId, dados) => request("POST", `fluxo/parcelas/${encodeURIComponent(parcelaId)}/receber`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  fluxoAnexo: (pedidoId, dados) => request("POST", `fluxo/pedidos/${encodeURIComponent(pedidoId)}/anexos`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  fluxoAnexoLink: (anexoId) => request("POST", `fluxo/anexos/${encodeURIComponent(anexoId)}/link`, {}, { "Idempotency-Key": crypto.randomUUID() }),
  produtos: (f = {}) => request("GET", `produtos?${new URLSearchParams(Object.entries(f).filter(([, v]) => v !== "" && v !== null && v !== undefined))}`),
  produtosRevisao: () => request("GET", "produtos/revisao"),
  produto: (id) => request("GET", `produtos/${encodeURIComponent(id)}`),
  produtoEditar: (id, dados) => request("POST", `produtos/${encodeURIComponent(id)}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  produtoPreco: (id, dados) => request("POST", `produtos/${encodeURIComponent(id)}/preco`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  produtoVinculo: (vid, dados) => request("POST", `produtos/vinculos/${encodeURIComponent(vid)}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  fluxoProjetos: () => request("GET", "fluxo/projetos"),
  comprasLista: (estado = "") => request("GET", `fluxo/compras${estado ? `?estado=${encodeURIComponent(estado)}` : ""}`),
  comprasFaltas: () => request("GET", "fluxo/compras/faltas"),
  comprasFornecedores: () => request("GET", "fluxo/compras/fornecedores"),
  compra: (id) => request("GET", `fluxo/compras/${encodeURIComponent(id)}`),
  comprasCriar: (dados) => request("POST", "fluxo/compras", dados, { "Idempotency-Key": crypto.randomUUID() }),
  compraAcao: (id, acao, dados = {}) => request("POST", `fluxo/compras/${encodeURIComponent(id)}/${acao}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  contasPagar: (estado = "aberta") => request("GET", `fluxo/contas-pagar?estado=${encodeURIComponent(estado)}`),
  contaPagarCriar: (dados) => request("POST", "fluxo/contas-pagar", dados, { "Idempotency-Key": crypto.randomUUID() }),
  contaPagarAcao: (id, acao, dados = {}) => request("POST", `fluxo/contas-pagar/${encodeURIComponent(id)}/${acao}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  mensagens: (estado = "rascunho") => request("GET", `mensagens?estado=${encodeURIComponent(estado)}`),
  mensagemCriar: (dados) => request("POST", "mensagens", dados, { "Idempotency-Key": crypto.randomUUID() }),
  mensagemMarcar: (id, estado, dados = {}) => request("POST", `mensagens/${encodeURIComponent(id)}/${estado}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  resumo: () => request("GET", "resumo"),
  perguntasDiretores: (f = {}) => request("GET", `diretores/perguntas?${new URLSearchParams(Object.entries(f).filter(([, v]) => v))}`),
  perguntarDiretor: (dados) => request("POST", "diretores/perguntas", dados, { "Idempotency-Key": crypto.randomUUID() }),
  cancelarPergunta: (id) => request("POST", `diretores/perguntas/${encodeURIComponent(id)}/cancelar`, {}, { "Idempotency-Key": crypto.randomUUID() }),
  contaMcp: () => request("POST", "conta/mcp", {}, { "Idempotency-Key": crypto.randomUUID() }),
  contaSairDeTudo: () => request("POST", "conta/sair-de-tudo", {}, { "Idempotency-Key": crypto.randomUUID() }),
  caixaPrevisao: () => request("GET", "fluxo/caixa"),
  fluxoParcelas: (estado = "aberta") => request("GET", `fluxo/parcelas?estado=${encodeURIComponent(estado)}`),
  fluxoEstoque: (busca = "", pagina = 1) => request("GET", `fluxo/estoque?${new URLSearchParams({ busca, pagina: String(pagina) })}`),
  fluxoEstoqueItem: (id) => request("GET", `fluxo/estoque/${encodeURIComponent(id)}`),
  fluxoMovimento: (dados) => request("POST", "fluxo/estoque", dados, { "Idempotency-Key": crypto.randomUUID() }),
  // Biblioteca (memoria institucional e governanca)
  bibListar: (filtros = {}) => request("GET", `biblioteca?${new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== "" && v !== null && v !== undefined))}`),
  bibGovernanca: () => request("GET", "biblioteca/governanca"),
  bibRegistro: (id) => request("GET", `biblioteca/${encodeURIComponent(id)}`),
  bibCriar: (dados) => request("POST", "biblioteca", dados, { "Idempotency-Key": crypto.randomUUID() }),
  bibConsultar: (dados) => request("POST", "biblioteca/consultar", dados, { "Idempotency-Key": crypto.randomUUID() }),
  bibAcao: (id, acao, dados = {}) => request("POST", `biblioteca/${encodeURIComponent(id)}/${acao}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  bibResponderParecer: (pid, dados) => request("POST", `biblioteca/pareceres/${encodeURIComponent(pid)}/responder`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  // Sistema: saude, usuarios e exportacao (direcao)
  sistemaSaude: () => request("GET", "sistema/saude"),
  sistemaMembros: () => request("GET", "sistema/membros"),
  sistemaAcessos: (usuario = "") => request("GET", `sistema/acessos${usuario ? `?usuario=${encodeURIComponent(usuario)}` : ""}`),
  sistemaExportar: (conjunto = "") => request("GET", `sistema/exportar${conjunto ? `/${encodeURIComponent(conjunto)}` : ""}`),
  sistemaConvidar: (dados) => request("POST", "sistema/membros", dados, { "Idempotency-Key": crypto.randomUUID() }),
  sistemaMembro: (id, dados) => request("POST", `sistema/membros/${encodeURIComponent(id)}`, dados, { "Idempotency-Key": crypto.randomUUID() }),
  // Salvar = vigia avalia e o servidor grava orcamento + avisos. Uma chave por clique:
  // se a rede repetir o envio, o servidor nao duplica o registro.
  vigiaOrcamento: (entrada) =>
    request("POST", "orcamentos", { entrada: { ...entrada, id: codigoTeste() } }, { "Idempotency-Key": crypto.randomUUID() }),
};
