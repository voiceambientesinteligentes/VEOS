// Operacao comercial do zero: montador de orcamento, ficha do orcamento, clientes, captacao e
// "Comecar a operar", com a API simulada (dados TESTE). Cada caso e um hash.
import { api } from "../js/data/api.js";
import { telaCliente, telaClientes } from "../js/ui/views/clientes.js";
import { telaNovoOrcamento, telaOrcamentoFicha, telaOrcamentos } from "../js/ui/views/orcamento.js";
import { telaContatoRapido, telaConteudo, telaProspeccao } from "../js/ui/views/captacao.js";
import { telaOperar } from "../js/ui/views/operar.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1) || "montador";
const CLI = { id: "11111111-1111-1111-1111-111111111111", codigo: "CLI-00001", tipo: "pf", nome: "Cliente TESTE Silva", telefone: "47999998888", email: "teste@veos-teste.invalid", cidade: "Itajaí", uf: "SC", origem: "instagram", aceita_contato: true, estado: "ativo", criado_em: "2026-11-04T10:00:00Z" };
const PROD = [
  { id: "22222222-2222-2222-2222-222222222222", codigo: "PRD-0001", nome: "Interruptor inteligente TESTE", marca: "X", modelo: "4 teclas", unidade: "un", custo_ultimo: 180, preco_venda: null, foto: null },
  { id: "33333333-3333-3333-3333-333333333333", codigo: "PRD-0002", nome: "Access point TESTE", unidade: "un", custo_ultimo: 900, preco_venda: 2400, foto: null },
];
const ORC = { id: "44444444-4444-4444-4444-444444444444", numero: "ORV-00007", versao: 2, serie: "s", cliente_id: CLI.id, cliente_nome: CLI.nome, referencia: null, condicao: "40% na assinatura, 60% na entrega", estado: "enviado", valor_total: "12800.00", desconto: "200.00",
  validade: "2026-11-20", prazo_execucao: "30 dias", enviado_em: "2026-11-04T12:00:00Z", criado_em: "2026-11-04T11:00:00Z", resumo: { mc_politica: 41.2, faixa: "VERDE", alcada: "FLUXO NORMAL" } };
const ITENS = [{ ordem: 1, secao: "Sala", tipo: "produto", nome: "Interruptor inteligente TESTE", quantidade: "4", unidade: "un", preco_unit: "800.00", custo_unit: "217.00", produto_id: PROD[0].id },
  { ordem: 2, secao: "Sala", tipo: "servico", nome: "Programação e configuração", quantidade: "10", unidade: "h", preco_unit: "980.00", custo_unit: "80.00" }];
const FORM = { respostas: { impostos: { dados: { aliquota_produto_pct: "6", aliquota_servico_pct: "6" } } } };
const salvos = [];
Object.assign(api, {
  cfoFormulario: async () => FORM, cfoOrcamentos: async () => ({ rbt12: { valor: 300000 }, orcamentos: [] }),
  cfoFaturamento: async () => ({ rbt12: { valor: 300000 } }), cfoProdutos: async () => ({ produtos: [] }), cfoCambio: async () => ({ serie: [] }),
  produtos: async () => ({ total: PROD.length, produtos: PROD }),
  clientes: async () => ({ clientes: caso === "clientes-vazio" ? [] : [CLI] }),
  cliente: async () => ({ cliente: CLI, orcamentos: [ORC], pedidos: [], oportunidades: [], historico: [{ acao: "criado", detalhe: {}, em: "2026-11-04T10:00:00Z" }] }),
  clienteSalvar: async (d) => ({ id: CLI.id, codigo: "CLI-00002", ...d }),
  comercialOrcamentos: async () => ({ orcamentos: [ORC, { ...ORC, id: "55555555-5555-5555-5555-555555555555", numero: "ORV-00008", versao: 1, estado: "aceito", pedido_id: "66666666-6666-6666-6666-666666666666" }] }),
  comercialOrcamento: async () => ({ orcamento: ORC, itens: ITENS, cliente: CLI, historico: [{ acao: "enviado", detalhe: {}, em: "2026-11-04T12:00:00Z" }], versoes: [{ id: ORC.id, versao: 2, estado: "enviado", valor_total: "12800.00", criado_em: ORC.criado_em }, { id: "x", versao: 1, estado: "substituido", valor_total: "13000.00", criado_em: ORC.criado_em }] }),
  comercialOrcamentoCriar: async (p) => { salvos.push(p); return { id: ORC.id, numero: "ORV-00009", versao: 1 }; },
  retomarLista: async () => ({ orcamentos: [{ zoho_id: "9001", numero: "EST-000123", data: "2026-05-02", status: "draft", cliente: "Cliente TESTE antigo", total: 45000, retomado: null }] }),
  setor: async (id) => ({ setor: id, registros: id === "vendas" ? [{ id: "r1", tipo: "parceiro", titulo: "Studio TESTE", estado: "prospectado", dados: { escritorio: "Studio TESTE", contato: "Marina", nivel: "A", ultimo_contato: "2026-11-04" } }, { id: "r2", tipo: "lead", titulo: "Lead TESTE", estado: "novo", dados: {} }] : [], tarefas: [], alertas: [] }),
  criarRegistro: async (r) => ({ id: "r9", ...r, cadencia: { toques_gerados: 1, rascunhos: 1 } }),
});

rodar(async (v) => {
  const t = () => v.textContent;
  const exigir = (...xs) => { for (const x of xs) if (!t().includes(x)) throw new Error(`falta: ${x}`); };
  if (caso === "montador") {
    await telaNovoOrcamento(v, { clienteId: CLI.id });
    await new Promise((r) => setTimeout(r, 50));
    exigir("1. Cliente", "Cliente TESTE Silva", "Interruptor inteligente TESTE", "sugerido pela Política V1", "preço de tabela", "Conferência do CFO");
    // adiciona um produto e um servico; a margem aparece
    v.querySelector(".orc-produto button").click();
    [...v.querySelectorAll("button")].find((b) => b.textContent.startsWith("+ Programação"))?.click();
    exigir("Geral", "Total ao cliente");
    // o servico entra sem preco/custo (sem custo-hora): avisa e nao calcula margem inventada
    if (!/sem custo|Faltam/.test(t())) throw new Error("deveria avisar o item de serviço sem custo");
    // preenche custo e preco do servico
    const linhas = v.querySelectorAll(".orc-tabela tbody tr");
    const inputs = linhas[1].querySelectorAll("input");
    inputs[2].value = "200"; inputs[2].dispatchEvent(new Event("input"));
    inputs[3].value = "80"; inputs[3].dispatchEvent(new Event("input"));
    exigir("MC ", "Alçada");
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Salvar orçamento").click();
    await new Promise((r) => setTimeout(r, 30));
    if (salvos.length !== 1) throw new Error("não salvou");
    const p = salvos[0];
    if (p.cliente_id !== CLI.id || p.itens.length !== 2 || p.itens[0].produto_id !== PROD[0].id) throw new Error(`payload errado ${JSON.stringify(p).slice(0, 200)}`);
    if (!(Number(p.itens[0].preco_unit) > 0)) throw new Error("produto sem preço sugerido");
  } else if (caso === "montador-sem-cliente") {
    await telaNovoOrcamento(v, {});
    if (!v.querySelector("#orc-cli-busca")) throw new Error("busca de cliente");
    exigir("+ Cadastrar cliente novo", "Nenhum item ainda");
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Salvar orçamento").click();
    exigir("Escolha ou cadastre o cliente.", "Inclua pelo menos um item.");
    [...v.querySelectorAll("button")].find((b) => b.textContent === "+ Cadastrar cliente novo").click();
    if (!v.querySelector("#cl-nome")) throw new Error("formulário de cliente");
  } else if (caso === "ficha") {
    await telaOrcamentoFicha(v, ORC.id);
    exigir("ORV-00007 · versão 2", "Enviado ao cliente", "Proposta em PDF e envio", "Cliente aceitou → gerar pedido", "Cliente recusou", "Nova versão (editar)", "v1", "Substituído", "MC (Política V1)");
  } else if (caso === "lista") {
    await telaOrcamentos(v, "veos");
    exigir("ORV-00007 v2", "Aceito", "Em aberto", "+ Novo orçamento");
  } else if (caso === "zoho") {
    await telaOrcamentos(v, "zoho");
    exigir("Retomar orçamentos antigos do Zoho", "EST-000123", "Retomar");
  } else if (caso === "clientes" || caso === "clientes-vazio") {
    await telaClientes(v);
    exigir("Clientes", caso === "clientes" ? "CLI-00001" : "Nenhum cliente cadastrado ainda");
    [...v.querySelectorAll("button")].find((b) => b.textContent === "+ Novo cliente").click();
    exigir("Cadastrar cliente", "LGPD");
    v.querySelector("form.form-cliente").dispatchEvent(new Event("submit", { cancelable: true }));
    exigir("Informe o nome do cliente.");
  } else if (caso === "cliente") {
    await telaCliente(v, CLI.id);
    exigir("Cliente TESTE Silva", "CLI-00001", "+ Novo orçamento", "+ Oportunidade no funil", "ORV-00007", "Abrir WhatsApp", "(47) 99999-8888");
    [...v.querySelectorAll("button")].find((b) => b.textContent === "+ Oportunidade no funil").click();
    if (v.querySelector("#f-oportunidade-cliente_ref")?.value !== "CLI-00001") throw new Error("oportunidade não veio ligada ao cliente");
  } else if (caso === "contato") {
    await telaContatoRapido(v);
    exigir("Contato rápido", "Registrar contato");
    v.querySelector("#ct-nome").value = "Lead TESTE"; v.querySelector("#ct-tel").value = "47999990000";
    v.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));
    await new Promise((r) => setTimeout(r, 30));
    exigir("Contato registrado", "Já é projeto: cadastrar como cliente e orçar");
  } else if (caso === "prospeccao") {
    await telaProspeccao(v);
    exigir("Prospecção ativa", "Google Maps", "Studio TESTE", "Mensagem 1:1", "Cuidados");
  } else if (caso === "conteudo") {
    await telaConteudo(v);
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Gerar calendário").click();
    exigir("Levar os 12 posts ao Marketing", "Copiar legenda", "#automacaoresidencial", "Rotina do Instagram");
  } else if (caso === "operar") {
    await telaOperar(v);
    exigir("etapas com movimento", "Próximo passo", "Preparar (uma vez)", "Trazer cliente", "Vender", "Entregar e receber", "Contato rápido", "Novo orçamento");
  }
});
