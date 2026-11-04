// Vigia do CAIXA REAL (setor Financas, alertas CAIXA_*): o CFO avisa sozinho, com regra e fonte, quando
//   - o caixa projetado fica negativo nas proximas 4 semanas (CRITICO);
//   - o saldo de hoje esta abaixo da reserva da Politica (meta sec.12: 3 meses de custos fixos);
//   - uma conta esta sem extrato ha mais de 7 dias (o saldo e o DRE ficam velhos);
//   - ha lancamentos sem categoria ha mais de 7 dias (o fechamento do mes fica incompleto);
//   - nenhuma conta bancaria foi cadastrada (o caixa real nao existe para o VEOS).
// Mesma sincronizacao dos outros vigias: cria, atualiza, reativa e resolve sozinho.
import { servico } from "./banco.ts";
import { brl, sincronizarAlertas } from "./fluxo_vigia.ts";
import { contasComSaldo, dadosSemanas, hojeSP, somaDias } from "./caixa_dados.ts";
import { projetar, reserva } from "./dominio/caixa13.js";
import { parametros, valoresEstimados } from "./dominio/formulario_cfo.js";

type Sev = "INFO" | "MEDIO" | "ALTO" | "CRITICO";
const FONTE = "Caixa real do VEOS (extrato importado, contas a pagar, parcelas e recorrentes)";
const dataBR = (iso: string) => String(iso).slice(0, 10).split("-").reverse().join("/");
const CAMINHO = "Ferramentas do CFO → Caixa e extrato";

export async function vigiarCaixa(agora = Date.now()) {
  const hoje = hojeSP();
  const [contas, semanas, semCategoria] = await Promise.all([
    contasComSaldo(),
    dadosSemanas(13),
    servico(`/rest/v1/movimentos_bancarios?categoria=is.null&data=lt.${somaDias(hoje, -7)}&select=id,valor&limit=5000`),
  ]);
  // deno-lint-ignore no-explicit-any
  const alvos = new Map<string, any>();
  const add = (a: { chave: string; sentinela: string; severidade: Sev; titulo: string; mensagem: string; tarefa?: string }) =>
    alvos.set(a.chave, { chave: a.chave, setor: "financas", sentinela: a.sentinela, severidade: a.severidade, titulo: a.titulo, mensagem: a.mensagem, fonte: FONTE, notificar: ["CFO"], rascunhos: [],
      tarefas: a.tarefa ? [{ titulo: a.tarefa.slice(0, 240), papel: "CFO", prazo: hoje }] : [] });

  // Formulario do CFO: valores estimados pelo VEOS (media de mercado) que o fundador precisa ajustar
  const linhasForm = await servico("/rest/v1/formulario_respostas?formulario=eq.cfo&select=secao,dados&order=id.desc&limit=300").catch(() => []);
  const respostas: Record<string, { dados: unknown }> = {};
  for (const l of linhasForm) if (!respostas[l.secao]) respostas[l.secao] = { dados: l.dados };
  const estimados = valoresEstimados(respostas);
  if (estimados.length) {
    add({ chave: "CAIXA_CFO_VALORES_ESTIMADOS", sentinela: "CAIXA_CFO_VALORES_ESTIMADOS", severidade: "MEDIO", titulo: `Formulário do CFO: ${estimados.length} valor(es) estimado(s) para ajustar`,
      mensagem: `Para o preço e a condição de pagamento funcionarem, o VEOS preencheu com média de mercado: ${estimados.map((e) => `${e.rotulo} = ${e.valor}`).join("; ")}. Ajuste conforme a realidade da VOICE (ou confirme) em Ferramentas do CFO → Formulário do CFO.`,
      tarefa: "Ajustar (ou confirmar) os valores estimados no Formulário do CFO" });
  }
  const pForm = Object.keys(respostas).length ? parametros(respostas) : null;
  if (pForm && pForm.produtividade !== null && pForm.produtividade >= 95) {
    const real = pForm.hora?.custoHora ? Math.round((pForm.hora.custoHora * pForm.produtividade) / 70) : null;
    add({ chave: "CAIXA_CFO_PRODUTIVIDADE_ALTA", sentinela: "CAIXA_CFO_PRODUTIVIDADE_ALTA", severidade: "MEDIO", titulo: `Produtividade da equipe informada em ${pForm.produtividade}%`,
      mensagem: `Produtividade de ${pForm.produtividade}% supõe que toda hora paga vira hora vendida (sem deslocamento, preparação, espera ou retrabalho). Em obra, a pesquisa indica 60–75%. ${real ? `Com 70%, o custo da hora iria de R$ ${pForm.hora.custoHora} para cerca de R$ ${real}, e o preço da mão de obra subiria na mesma proporção. ` : ""}Revise em Formulário do CFO → Equipe (jornada e perdas por dia).`,
      tarefa: "Revisar a produtividade da equipe no Formulário do CFO" });
  }

  const ativas = contas.filter((k: { ativa: boolean }) => k.ativa);
  if (!ativas.length) {
    add({ chave: "CAIXA_SEM_CONTAS", sentinela: "CAIXA_SEM_CONTAS", severidade: "INFO", titulo: "Caixa real ainda não existe no VEOS",
      mensagem: `Nenhuma conta bancária cadastrada: sem extrato, o VEOS não sabe o saldo, não fecha o mês (DRE) nem projeta as 13 semanas. Cadastre as contas da empresa e importe o extrato OFX em ${CAMINHO}.`,
      tarefa: "Cadastrar as contas da empresa e importar o extrato" });
  }
  for (const k of ativas) {
    const ate = k.ultimo_extrato?.periodo_ate ?? null;
    if (!ate || ate < somaDias(hoje, -7)) {
      add({ chave: `CAIXA_EXTRATO_DESATUALIZADO:${k.id}`, sentinela: "CAIXA_EXTRATO_DESATUALIZADO", severidade: "MEDIO", titulo: `Extrato desatualizado: ${k.nome}`,
        mensagem: ate ? `O último extrato importado de ${k.nome} vai até ${dataBR(ate)}. Saldo, conciliação e fechamento dependem do extrato em dia (rotina proposta: conciliação semanal, PL-049).` : `${k.nome} não tem nenhum extrato importado. Importe o OFX em ${CAMINHO}.`,
        tarefa: `Importar o extrato de ${k.nome}` });
    }
  }
  if (semCategoria.length) {
    const total = semCategoria.reduce((s: number, m: { valor: number }) => s + Math.abs(Number(m.valor)), 0);
    add({ chave: "CAIXA_SEM_CATEGORIA", sentinela: "CAIXA_SEM_CATEGORIA", severidade: "MEDIO", titulo: `${semCategoria.length} lançamento(s) do extrato sem categoria há mais de 7 dias`,
      mensagem: `Movimentação de ${brl(total)} sem classificação no plano de contas: o fechamento do mês (DRE) fica incompleto. Classifique em ${CAMINHO} (marque "lembrar" para os próximos).`,
      tarefa: "Classificar os lançamentos do extrato" });
  }

  const res = reserva({ recorrentes: semanas.recorrentes, fixosFormulario: semanas.impostos?.fixos_formulario ?? null });
  const f = projetar({ hoje, semanas: semanas.semanas, saldos: semanas.saldos, parcelas: semanas.parcelas, contas: semanas.contas, impostos: semanas.impostos, entradasRealizadasMes: semanas.entradas_realizadas_mes, reservaMeta: res.meta });
  if (f.saldoHoje !== null) {
    const negativa = f.semanas.find((s: { n: number; saldo_final: number | null }) => s.n <= 4 && s.saldo_final !== null && s.saldo_final < 0);
    if (negativa) {
      add({ chave: "CAIXA_NEGATIVO_4_SEMANAS", sentinela: "CAIXA_NEGATIVO_4_SEMANAS", severidade: "CRITICO", titulo: `Caixa projetado negativo na semana ${negativa.n} (${dataBR(negativa.inicio)})`,
        mensagem: `Pelo fluxo de 13 semanas (saldo real ${brl(f.saldoHoje)}, parcelas a receber, contas a pagar e imposto estimado), o caixa chega a ${brl(negativa.saldo_final)} na semana de ${dataBR(negativa.inicio)}. Antes de pagar ou comprar: cobrar atrasados (${brl(f.atrasadas.receber)}), negociar prazos ou rever a retirada. Decisão de crédito/antecipação é do fundador.`,
        tarefa: "Rever o fluxo de 13 semanas e decidir como cobrir o caixa" });
    }
    if (res.meta && f.saldoHoje < res.meta) {
      add({ chave: "CAIXA_ABAIXO_RESERVA", sentinela: "CAIXA_ABAIXO_RESERVA", severidade: f.saldoHoje < res.meta / 3 ? "ALTO" : "MEDIO", titulo: `Saldo abaixo da reserva da Política (${(f.saldoHoje / (res.fixosMes ?? 1)).toFixed(1).replace(".", ",")} mês(es) de fixos)`,
        mensagem: `Saldo de hoje ${brl(f.saldoHoje)} contra a meta de ${brl(res.meta)} (3 × ${brl(res.fixosMes ?? 0)} de custos fixos, ${res.origem}). Política V1 sec.12: a reserva é META e faturamento futuro não a substitui.` });
    }
  }
  return await sincronizarAlertas("CAIXA_", alvos, agora);
}
