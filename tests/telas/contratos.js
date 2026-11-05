// Contratos de suporte (receita recorrente): lista, cadastro e ficha, com a API simulada (dados TESTE).
import { api } from "../js/data/api.js";
import { telaContrato, telaContratos } from "../js/ui/views/contratos.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1) || "lista";
const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const mais = (n) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const C = { id: "11111111-1111-1111-1111-111111111111", codigo: "SUP-00001", cliente_id: null, cliente_nome: "Família TESTE", descricao: "Suporte mensal TESTE", valor_mensal: "1200.00", dia_vencimento: 10, inicio: "2026-01-10", fim: null, estado: "ativo", observacao: null, criado_em: "2026-01-01T10:00:00Z" };
const COB = [
  { id: "c1", contrato_id: C.id, competencia: `${mais(-40).slice(0, 7)}-01`, vencimento: mais(-10), valor: "1200.00", estado: "aberta" },
  { id: "c2", contrato_id: C.id, competencia: `${mais(20).slice(0, 7)}-01`, vencimento: mais(20), valor: "1200.00", estado: "aberta" },
  { id: "c3", contrato_id: C.id, competencia: "2026-09-01", vencimento: "2026-09-10", valor: "1200.00", estado: "recebida", recebido_em: "2026-09-10", valor_recebido: "1200.00" },
];
const salvos = [];
Object.assign(api, {
  contratosSuporte: async () => ({ contratos: caso === "lista-vazia" ? [] : [C], cobrancas: caso === "lista-vazia" ? [] : COB }),
  contratoSuporte: async () => ({ contrato: C, cobrancas: COB, historico: [{ acao: "criado", detalhe: {}, em: "2026-01-01T10:00:00Z" }] }),
  contratoSuporteSalvar: async (d) => { salvos.push(d); return { id: C.id, codigo: "SUP-00002" }; },
  clientes: async () => ({ clientes: [{ id: "99999999-9999-9999-9999-999999999999", nome: "Cliente TESTE Silva" }] }),
});

rodar(async (v) => {
  const t = () => v.textContent;
  const exigir = (...xs) => { for (const x of xs) if (!t().includes(x)) throw new Error(`falta: ${x}`); };
  if (caso === "lista") {
    await telaContratos(v);
    exigir("Receita mensal recorrente", "R$ 1.200,00", "SUP-00001", "Família TESTE", "Cobranças atrasadas", "1");
  } else if (caso === "lista-vazia") {
    await telaContratos(v);
    exigir("Nenhum contrato de suporte cadastrado ainda.", "R$ 0,00");
  } else if (caso === "ficha") {
    await telaContrato(v, C.id);
    exigir("SUP-00001", "Cobranças mensais", "atrasada", "a receber", "recebida em", "Marcar recebida", "Suspender", "Reajustar valor", "Encerrar");
  } else if (caso === "novo") {
    await telaContratos(v);
    [...v.querySelectorAll("button")].find((b) => b.textContent === "+ Novo contrato").click();
    v.querySelector("form button[type=submit]").click();
    await new Promise((r) => setTimeout(r, 20));
    exigir("Informe o cliente.", "Informe o valor mensal");
    v.querySelector("#ct-cliente").value = "Cliente TESTE Silva";
    v.querySelector("#ct-desc").value = "Suporte mensal";
    v.querySelector("#ct-valor").value = "1.500,50";
    v.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));
    await new Promise((r) => setTimeout(r, 30));
    const s = salvos[0];
    if (!s || s.valor_mensal !== "1500.50" || s.cliente_id !== "99999999-9999-9999-9999-999999999999") throw new Error(`payload errado ${JSON.stringify(salvos)}`);
  }
});
