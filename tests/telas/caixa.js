import { api } from "../js/data/api.js";
import { telaCaixa, telaFechamento, telaFluxo13, telaIndicadores, telaRecorrentes } from "../js/ui/views/caixa.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
const vazio = caso === "vazio";
const C1 = "11111111-1111-1111-1111-111111111111", C2 = "22222222-2222-2222-2222-222222222222", M1 = "33333333-3333-3333-3333-333333333333", M2 = "44444444-4444-4444-4444-444444444444";
const PLANO = [["1.1", "Recebimentos de clientes (pedidos)", "receita", "entrada"], ["2.1", "Impostos sobre vendas (DAS/Simples)", "deducao", "saida"], ["3.1", "Compra de equipamentos e materiais (projetos)", "custo_variavel", "saida"], ["4.2", "Aluguel, condomínio e energia", "despesa_fixa", "saida"], ["4.3", "Contador", "despesa_fixa", "saida"], ["5.1", "Retirada / pró-labore do sócio", "retirada", "saida"], ["6.1", "Juros, multas e tarifas bancárias", "financeiro", "saida"], ["8.1", "Transferência entre contas da empresa", "transferencia", "ambas"]]
  .map(([codigo, nome, grupo, natureza]) => ({ codigo, nome, grupo, natureza, ativo: true }));
const enviados = [];
const OFX = "OFXHEADER:100\nCHARSET:1252\n\n<OFX><BANKACCTFROM><BANKID>0341<ACCTID>98765-4</BANKACCTFROM><BANKTRANLIST>\n<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261001<TRNAMT>2500.00<FITID>T1<MEMO>PIX RECEBIDO TESTE</STMTTRN>\n<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261002<TRNAMT>-12.90<FITID>T2<MEMO>TARIFA TESTE</STMTTRN>\n</BANKTRANLIST><LEDGERBAL><BALAMT>12487.10<DTASOF>20261002</LEDGERBAL></OFX>";
Object.assign(api, {
  caixaContas: async () => ({ hoje: "2026-10-05", contas: vazio ? [] : [
    { id: C1, nome: "Conta TESTE", banco: "Banco TESTE", final_conta: "1234", tipo: "corrente", ativa: true, saldo_hoje: 12487.1, ancora_em: "2026-10-02", ancora_origem: "extrato", sem_categoria: 1, ultimo_extrato: { periodo_ate: "2026-10-02" } },
    { id: C2, nome: "Aplicação TESTE", banco: null, final_conta: null, tipo: "aplicacao", ativa: true, saldo_hoje: null, ancora_em: null, ancora_origem: null, sem_categoria: 0, ultimo_extrato: null }] }),
  caixaPlano: async () => ({ plano: PLANO }),
  caixaSugestoes: async () => ({ sugestoes: vazio ? [] : [{ movimento_id: M1, tipo: "parcela", alvo_id: "p1", dias: 1, unica: true, alvo: { pedido: "PED-00001", numero: 1, vencimento: "2026-10-02", valor: 2500 } }] }),
  caixaMovimentos: async () => ({ movimentos: vazio ? [] : [
    { id: M1, conta_id: C1, data: "2026-10-01", valor: 2500, descricao: "PIX RECEBIDO TESTE", categoria: null, classificado_por: null },
    { id: M2, conta_id: C1, data: "2026-10-02", valor: -12.9, descricao: "TARIFA TESTE", categoria: "6.1", classificado_por: "regra" }] }),
  caixaImportar: async (id, d) => { enviados.push(["importar", id, d]); return { novas: d.linhas.length, repetidas: 0 }; },
  caixaClassificar: async (id, d) => { enviados.push(["classificar", id, d]); return { ok: true, outros_classificados: 0 }; },
  caixaConciliar: async () => ({ ok: true }), caixaAplicarSugestoes: async () => ({ conciliadas: 1, erros: [] }), caixaCriarConta: async () => ({ id: C1 }), caixaCriarCategoria: async () => ({}),
  caixaRecorrentes: async () => ({ recorrentes: vazio ? [] : [
    { id: "r1", descricao: "Contador TESTE", fornecedor: "Escritório TESTE", plano_conta: "4.3", valor: 450, dia_vencimento: 10, inicio: "2026-10-01", parcelas: null, ativa: true, origem: "manual", proxima: { vencimento: "2026-10-10" } },
    { id: "r2", descricao: "Parcela: Banco TESTE", fornecedor: "Banco TESTE", plano_conta: "6.2", valor: 900, dia_vencimento: 5, inicio: "2026-10-01", parcelas: 12, ativa: true, origem: "formulario:dividas", proxima: null }] }),
  caixaSalvarRecorrente: async () => ({ id: "r1" }), caixaImportarRecorrentes: async () => ({ criadas: 2, observacao: "ok" }),
  caixaSemanas: async () => ({ hoje: "2026-10-05", semanas: 13, entradas_realizadas_mes: 2500, saldos: vazio ? [] : [{ nome: "Conta TESTE", saldo: 12487.1 }, { nome: "Aplicação TESTE", saldo: null }],
    parcelas: vazio ? [] : [{ vencimento: "2026-10-15", valor: 20000, pedido: "PED-00001", numero: 2 }, { vencimento: "2026-09-10", valor: 3000, pedido: "PED-00000", numero: 3 }],
    contas: vazio ? [] : [{ vencimento: "2026-10-10", valor: 450, descricao: "Contador TESTE", plano_conta: "4.3" }, { vencimento: "2026-10-25", valor: 40000, descricao: "Fornecedor TESTE", plano_conta: "3.1" }],
    recorrentes: [{ plano_conta: "4.3", valor: 450 }, { plano_conta: "4.2", valor: 2500 }], impostos: { aliquota_media_pct: 6.5, origem: "SIMULAÇÃO: teste", fixos_formulario: null, retirada_formulario: 6000 } }),
  caixaFechamento: async (mes) => ({ mes, plano: PLANO, saldo_inicio: [{ saldo: 10000 }], saldo_fim: [{ saldo: 12487.1 }], notas: [], contas_competencia: [{ valor: 450 }], impostos: { aliquota_media_pct: 6.5, origem: "SIMULAÇÃO" },
    movimentos: vazio ? [] : [{ valor: 2500, categoria: "1.1" }, { valor: -12.9, categoria: "6.1" }] }),
  caixaIndicadores: async () => ({ hoje: "2026-10-05", resumo_mensal: vazio ? [] : [{ mes: "2026-09", grupo: "receita", entradas: 40000 }, { mes: "2026-09", grupo: "custo_variavel", saidas: -22000 }, { mes: "2026-09", grupo: "despesa_fixa", saidas: -9000 }],
    parcelas: [{ vencimento: "2026-08-01", valor: 3000, estado: "aberta" }], contas_abertas: [{ vencimento: "2026-10-10", valor: 450 }], vendas: [{ total: 50000, cliente: "CLI-1", data: "2026-09-01" }],
    saldos: [{ nome: "Conta TESTE", saldo: vazio ? null : 12487.1 }], recorrentes: [{ plano_conta: "4.2", valor: 3000 }], alertas_exposicao: 0, impostos: { fixos_formulario: null } }),
  cfoFormulario: async () => ({ respostas: {} }), cfoOrcamentos: async () => ({ orcamentos: [], rbt12: null }),
});
const telas = { caixa: telaCaixa, vazio: telaCaixa, recorrentes: telaRecorrentes, fluxo: telaFluxo13, fechamento: telaFechamento, indicadores: telaIndicadores };
rodar(async (v) => {
  await telas[caso](v);
  const t = v.textContent;
  const exige = (...trechos) => { for (const x of trechos) if (!t.includes(x)) throw new Error(`faltou: ${x}`); };
  if (caso === "caixa") {
    exige("Saldo hoje", "Sem saldo", "Conciliar as 1 sugestões únicas", "PIX RECEBIDO TESTE", "Plano de contas gerencial");
    const input = v.querySelector("#cx-arquivo");
    const dt = new DataTransfer();
    dt.items.add(new File([OFX], "teste.ofx", { type: "application/x-ofx" }));
    input.files = dt.files;
    input.dispatchEvent(new Event("change"));
    for (let i = 0; i < 30 && !v.textContent.includes("Importar 2 lançamento(s)"); i++) await new Promise((r) => setTimeout(r, 100));
    if (!v.textContent.includes("Importar 2 lançamento(s)")) throw new Error(`prévia do OFX não apareceu: ${input.files?.length} arquivo(s); ${v.querySelector("#cx-arquivo")?.closest("section")?.textContent.slice(0, 300)}`);
    [...v.querySelectorAll("button")].find((b) => b.textContent.startsWith("Importar 2")).click();
    await new Promise((r) => setTimeout(r, 300));
    const imp = enviados.find((e) => e[0] === "importar");
    if (!imp || imp[2].linhas.length !== 2 || imp[2].saldo_final !== 12487.1) throw new Error(`importação: ${JSON.stringify(enviados)}`);
  }
  if (caso === "vazio") exige("Nenhuma conta ainda");
  if (caso === "recorrentes") exige("Contador TESTE", "12 parcela(s)", "Reserva da Política", "Trazer do Formulário do CFO");
  if (caso === "fluxo") exige("Saldo hoje", "Semana a semana", "NEGATIVO", "fora da projeção", "Reserva da Política");
  if (caso === "fechamento") exige("DRE gerencial pelo caixa", "Margem de contribuição", "Resultado de caixa");
  if (caso === "indicadores") exige("Margem operacional", "Inadimplência", "Reserva de caixa em meses", "Meta:");
});
