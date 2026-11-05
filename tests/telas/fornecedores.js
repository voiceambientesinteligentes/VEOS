// Fornecedores proprios: lista, cadastro e ficha, com a API simulada (dados TESTE). Cada caso e um hash.
import { api } from "../js/data/api.js";
import { telaFornecedor, telaFornecedores } from "../js/ui/views/fornecedores.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1) || "lista";
const F = { id: "11111111-1111-1111-1111-111111111111", codigo: "FOR-00001", nome: "Distribuidora TESTE de Áudio", documento: "12323599000183", categoria: "importacao", contato_nome: "Marcos", telefone: "4733334444",
  email: "vendas@teste.invalid", cidade: "Itajaí", uf: "SC", prazo_pagamento_dias: 28, prazo_entrega_dias: 7, condicao: "30% na compra, saldo em 28 dias", zoho_vendor_id: null, estado: "ativo", criado_em: "2026-11-05T10:00:00Z", observacao: null };
const salvos = [];
Object.assign(api, {
  fornecedores: async () => ({ fornecedores: caso === "lista-vazia" ? [] : [F] }),
  fornecedor: async () => ({ fornecedor: F, compras: [{ id: "c1", numero: "COM-00001", estado: "recebida", valor_total: "5000.00", previsao_entrega: "2026-11-12", criado_em: "2026-11-05T10:00:00Z" }],
    contas: [{ id: "k1", numero: "CP-1", descricao: "Compra COM-00001 parcela 1", vencimento: "2026-12-03", valor: "3500.00", estado: "aberta" }], historico: [{ acao: "criado", detalhe: {}, em: "2026-11-05T10:00:00Z" }] }),
  fornecedorSalvar: async (d, id) => { salvos.push({ d, id }); return { id: F.id, codigo: "FOR-00002" }; },
});

rodar(async (v) => {
  const t = () => v.textContent;
  const exigir = (...xs) => { for (const x of xs) if (!t().includes(x)) throw new Error(`falta: ${x}`); };
  if (caso === "lista") {
    await telaFornecedores(v);
    exigir("Fornecedores", "FOR-00001", "Distribuidora TESTE de Áudio", "Importação", "28 dias");
  } else if (caso === "lista-vazia") {
    await telaFornecedores(v);
    exigir("Nenhum fornecedor cadastrado ainda.");
  } else if (caso === "ficha") {
    await telaFornecedor(v, F.id);
    exigir("FOR-00001", "12.323.599/0001-83", "(47) 3333-4444", "COM-00001", "A pagar (em aberto)", "R$", "Compra COM-00001 parcela 1", "Prazo de pagamento");
  } else if (caso === "novo") {
    await telaFornecedores(v);
    [...v.querySelectorAll("button")].find((b) => b.textContent === "+ Novo fornecedor").click();
    if (!v.querySelector("#fo-nome")) throw new Error("formulário não abriu");
    v.querySelector("form button[type=submit]").click();
    await new Promise((r) => setTimeout(r, 20));
    exigir("Informe o nome do fornecedor.");
    v.querySelector("#fo-nome").value = "Fornecedor Novo TESTE";
    v.querySelector("#fo-pag").value = "30";
    v.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));
    await new Promise((r) => setTimeout(r, 30));
    if (salvos.length !== 1 || salvos[0].d.nome !== "Fornecedor Novo TESTE" || salvos[0].d.prazo_pagamento_dias !== "30") throw new Error(`payload errado ${JSON.stringify(salvos)}`);
  }
});
