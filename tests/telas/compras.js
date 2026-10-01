import { api } from "../js/data/api.js";
import { telaCompra, telaCompras, telaContasPagar, telaNovaCompra } from "../js/ui/views/compras.js";
import { telaPedido, telaRecebimentos } from "../js/ui/views/fluxo.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
const PED = "11111111-1111-1111-1111-111111111111", COM = "22222222-2222-2222-2222-222222222222";
const enviados = [];
const FALTAS = [{ pedido_id: PED, numero: "PED-00001", cliente_nome: "Cliente TESTE", item_id: "900", nome: "Central TESTE", falta: "5", em_compra: "0", compras: null, custo_zoho: "480" },
  { pedido_id: PED, numero: "PED-00001", cliente_nome: "Cliente TESTE", item_id: "901", nome: "Sensor TESTE", falta: "2", em_compra: "2", compras: "COM-00002", custo_zoho: null }];
const COMPRA = { id: COM, numero: "COM-00002", fornecedor_nome: "Fornecedor TESTE", estado: "parcial", valor_total: "2400.00", previsao_entrega: "2026-09-25", criado_em: "2026-09-20T10:00:00Z", observacao: null, pedido: { id: PED, numero: "PED-00001", cliente_nome: "Cliente TESTE" } };
Object.assign(api, {
  comprasLista: async () => ({ compras: [COMPRA, { ...COMPRA, id: "33333333-3333-3333-3333-333333333333", numero: "COM-00003", estado: "recebida", pedido: null, previsao_entrega: null }] }),
  comprasFaltas: async () => ({ faltas: FALTAS }),
  comprasFornecedores: async () => ({ fornecedores: [{ nome: "Fornecedor TESTE", zoho_id: "77" }] }),
  comprasCriar: async (d) => { enviados.push(d); return { id: COM, numero: "COM-00009" }; },
  compra: async () => ({ compra: COMPRA, itens: [{ id: "i1", ordem: 1, item_id: "900", nome: "Central TESTE", quantidade: "5", recebido: "3", custo_unit: "480" }],
    contas: [{ id: "k1", numero: 1, vencimento: "2026-10-01", valor: "1200", estado: "paga" }, { id: "k2", numero: 2, vencimento: "2026-11-10", valor: "1200", estado: "aberta" }],
    historico: [{ acao: "criada", detalhe: {}, em: "2026-09-20T10:00:00Z", membro: { nome: "Fernando TESTE" } }] }),
  compraAcao: async (id, acao, d) => { enviados.push([acao, d]); return { estado: "recebida", reservas_completadas: ["PED-00001"] }; },
  contasPagar: async (estado) => ({ contas: estado === "aberta" ? [
    { id: "k2", descricao: "COM-00002 parcela 2", fornecedor: "Fornecedor TESTE", categoria: "compra", vencimento: "2026-09-01", valor: "1200", estado: "aberta", compra_id: COM, compra: { id: COM, numero: "COM-00002" }, pedido: null },
    { id: "k3", descricao: "Frete TESTE", fornecedor: "Transportadora TESTE", categoria: "frete", vencimento: "2027-01-10", valor: "150", estado: "aberta", compra_id: null, compra: null, pedido: { id: PED, numero: "PED-00001" } }] : [] }),
  contaPagarCriar: async (d) => { enviados.push(d); return { id: "k9" }; },
  caixaPrevisao: async () => ({ mes_atual: "2026-10", entradas_vencidas: "500", saidas_vencidas: "1200",
    meses: ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"].map((mes, i) => ({ mes, entradas_previstas: i > 1 ? 3000 : 0, entradas_realizadas: i < 3 ? 2000 : 0, saidas_previstas: i === 3 ? 1200 : 0, saidas_realizadas: i === 2 ? 1350 : 0 })) }),
  fluxoResumo: async () => ({ pedidos: {}, a_receber: "9000.00", vencido: "500.00", faturado_mes: "0.00", recebido_mes: "2000.00", estoque_valor: "1440.00", previsao: [], mes: "2026-10" }),
  fluxoParcelas: async () => ({ parcelas: [] }),
  fluxoPedido: async () => ({ pedido: { id: PED, numero: "PED-00001", cliente_nome: "Cliente TESTE", orcamento_numero: "EST-1", estado: "confirmado", valor_total: "5000", custo_total: "2500", criado_em: "2026-09-20T10:00:00Z" },
    itens: [{ item_id: "900", nome: "Central TESTE", tipo: "produto", quantidade: 5, preco_unit: 1000, custo_unit: 500, reservado_pedido: 3, estoque: { fisico: 3, reservado: 3 } }],
    parcelas: [], notas: [], historico: [], anexos: [],
    caixa: { recebido: "R$ 0,00", compromissos: "R$ 2.400,00", posicao: "-R$ 2.400,00", exposicao: "R$ 2.400,00", pct: "48,00%", gatilho: "ACIONADO", contas: 2, fonte: "Política V1.1 sec.4-9" },
    compras: [{ id: COM, numero: "COM-00002", fornecedor_nome: "Fornecedor TESTE", estado: "parcial", valor_total: "2400.00" }] }),
});
window.prompt = (msg, padrao) => padrao ?? "TESTE";
window.confirm = () => true;
const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));

rodar(async (v) => {
  if (caso === "lista") {
    await telaCompras(v);
    const t = v.textContent;
    if (!t.includes("Coberta") || !t.includes("Atrasada") || !t.includes("COM-00003")) throw new Error("lista incompleta");
  }
  if (caso === "nova") {
    history.replaceState(null, "", `#nova?pedido=${PED}`);
    await telaNovaCompra(v);
    if (v.querySelectorAll("tbody tr input[type=checkbox]").length !== 1) throw new Error("so a falta sem compra deveria aparecer");
    v.querySelector("#nc-forn").value = "Fornecedor TESTE";
    const venc = v.querySelector("#nc-venc");
    venc.value = "2026-10-20";
    v.querySelector("#nc-nparc").value = "2";
    venc.dispatchEvent(new Event("input"));
    if (!v.textContent.includes("R$ 2.400,00")) throw new Error("total 5 x 480 ausente");
    v.querySelector("form").requestSubmit();
    await espera();
    const d = enviados[0];
    if (!d || d.pedido_id !== PED || d.fornecedor_zoho_id !== "77" || d.parcelas.length !== 2 || d.parcelas[1].valor !== "1200.00" || d.itens[0].custo_unit !== "480.00") throw new Error(JSON.stringify(d));
    history.replaceState(null, "", "#nova");
  }
  if (caso === "detalhe") {
    await telaCompra(v, COM);
    const b = [...v.querySelectorAll("button")].find((x) => x.textContent === "Registrar recebimento");
    b.click();
    await espera();
    if (JSON.stringify(enviados[0]) !== JSON.stringify(["receber", { itens: [{ ordem: 1, quantidade: "2" }] }])) throw new Error(JSON.stringify(enviados));
    if (!v.textContent.includes("Reservas completadas: PED-00001")) throw new Error("sem aviso de reserva");
  }
  if (caso === "contas") {
    await telaContasPagar(v);
    const t = v.textContent;
    if (!t.includes("Vencida") || !t.includes("COM-00002") || !t.includes("PED-00001")) throw new Error("contas incompletas");
    if ([...v.querySelectorAll("tr")].find((tr) => tr.textContent.includes("COM-00002 parcela"))?.textContent.includes("Cancelar")) throw new Error("parcela de compra nao se cancela avulsa");
  }
  if (caso === "recebimentos") {
    await telaRecebimentos(v);
    if (!v.querySelector(".grafico-legenda") || !v.textContent.includes("Acumulado a partir de hoje")) throw new Error("previsao de caixa ausente");
  }
  if (caso === "pedido") {
    await telaPedido(v, PED, { papel: "direcao" });
    const t = v.textContent;
    if (!t.includes("Caixa do pedido (Política V1.1)") || !t.includes("exige autorização expressa da direção") || !t.includes("Comprar o que falta")) throw new Error("caixa do pedido ausente");
  }
});
