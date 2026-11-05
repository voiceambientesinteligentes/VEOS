// Aba Painel do setor: indicadores com valor calculado sozinho (Marketing e Pos-venda) ou LACUNA.
import { api } from "../js/data/api.js";
import { telaSetor } from "../js/ui/views/setor.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const mais = (n) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const REG = {
  marketing: [{ id: "1", tipo: "campanha", estado: "encerrada", titulo: "C", dados: { data_fim: mais(-10), leads_gerados: 20, oportunidades_geradas: 4, investimento_realizado: 2000 }, atualizado_em: mais(-10) }],
  posvenda: [{ id: "2", tipo: "pesquisa_satisfacao", estado: "respondida", titulo: "P", dados: { nota_nps: 10, data_resposta: mais(-5) }, atualizado_em: mais(-5) }, { id: "3", tipo: "pesquisa_satisfacao", estado: "respondida", titulo: "Q", dados: { nota_nps: 2, data_resposta: mais(-6) }, atualizado_em: mais(-6) }],
  vendas: [],
};
api.setor = async () => ({ registros: REG[caso], alertas: [], tarefas: [], historico: [] });
api.contratosSuporte = async () => ({ contratos: [], cobrancas: [], indicadores: { mrr: 2400, contratos_ativos: 2 } });

rodar(async (v) => {
  await telaSetor(v, caso, new AbortController().signal, "painel");
  await new Promise((r) => setTimeout(r, 40));
  const t = v.textContent;
  const exigir = (...xs) => { for (const x of xs) if (!t.includes(x)) throw new Error(`faltou: ${x}`); };
  exigir("Valor atual", "Indicadores");
  if (caso === "marketing") exigir("20 lead(s) em 90 dias", "20% (4 de 20)", "R$ 100,00 por lead", "LACUNA: exige ligar a origem");
  if (caso === "posvenda") exigir("NPS 0 (1 promotor(es), 1 detrator(es), 2 resposta(s))", "amostra pequena", "R$ 2.400,00 por mês (2 contrato(s) ativo(s))", "LACUNA: o chamado guarda só a data");
  if (caso === "vendas") exigir("calculado quando houver dado");
});
