// Acrescenta procedimentos novos aos manuais dos diretores (setores/manuais/<id>.json). Idempotente: pula o que
// ja existe (pelo texto do pedido). Depois rode: node scripts/gerar-catalogo.mjs
// Uso: node scripts/manuais/acrescentar-procedimentos.mjs
import { readFileSync, writeFileSync } from "node:fs";

const NOVOS = {
  vendas: [{
    pedido: "Como está o funil hoje? O que precisa de atenção primeiro?",
    perguntas_antes: [
      "Qual período olhar (hoje, semana ou mês) e só oportunidades abertas ou também leads novos?",
      "Existe meta oficial para o período? Se não, é lacuna e preciso registrar.",
      "Os registros estão atualizados (próximo passo e data em cada oportunidade)?",
    ],
    passos: [
      "Consultar o funil no VEOS (ferramenta funil_comercial) e separar leads, oportunidades por etapa e valor em aberto",
      "Listar o que está parado: lead novo sem resposta (regra COM_LEAD_SEM_RESPOSTA) e oportunidade sem atualização (COM_OPORTUNIDADE_PARADA)",
      "Conferir se cada oportunidade aberta tem próximo passo, data do próximo passo e decisor identificado",
      "Ordenar a atenção: primeiro lead sem resposta, depois negociações perto de fechar, depois as paradas",
      "Apontar a etapa onde mais oportunidades travam usando só números do VEOS; sem histórico suficiente para taxa de conversão, escrever LACUNA",
      "Fechar com no máximo 3 ações, cada uma com responsável e data",
    ],
    entregavel: "Resumo do funil (leads, oportunidades por etapa, valor em aberto), lista do que está parado, gargalo apontado ou LACUNA, e 3 ações com responsável e data.",
    criterios_de_qualidade: [
      "Todo número vem do VEOS e traz a fonte; o que não está registrado aparece como LACUNA",
      "Separa fato registrado de estimativa",
      "Nenhuma taxa de conversão ou meta inventada",
    ],
    quando_escalar: "Se houver lead de arquiteto parceiro sem resposta há mais de um dia ou nenhuma oportunidade em negociação, avisar a direção no mesmo dia.",
    ferramentas_veos: ["funil_comercial", "base_comercial", "canais_e_cadencias", "metas_comerciais"],
  }],
  operacoes: [{
    pedido: "Vou abrir uma obra nova: o que registro no VEOS e confiro na primeira semana?",
    perguntas_antes: [
      "O pedido já foi gerado a partir do orçamento aceito e a entrada está registrada?",
      "Há itens de prazo longo ou importados que ainda não têm compra aberta?",
      "Quem é o responsável da obra e quem acumula enquanto o cargo não tem pessoa?",
    ],
    passos: [
      "Conferir no VEOS (Operação → Pedidos) o pedido da obra: itens, parcelas, valor e o estoque reservado",
      "Ver as faltas de estoque do pedido e abrir as compras necessárias, começando pelos itens de prazo longo",
      "Conferir o caixa do pedido (recebido x compromissos) antes de comprar: exposição acima de 10% do contrato exige autorização da direção",
      "Registrar o responsável, o cronograma por fases e as restrições conhecidas (acesso, obra civil, prazo do arquiteto)",
      "Marcar o kickoff com cliente e arquiteto e registrar a data",
      "Na semana 1, revisar o que ficou pendente: compras sem previsão de entrega, restrição sem dono, parcela de entrada não recebida",
    ],
    entregavel: "Obra aberta no VEOS com pedido conferido, compras iniciadas, responsável, cronograma por fases, restrições e data de kickoff registrados.",
    criterios_de_qualidade: [
      "Itens de prazo longo identificados no primeiro dia",
      "Nenhuma compra emitida sem olhar o caixa do pedido",
      "Toda restrição tem dono e data",
    ],
    quando_escalar: "Entrada não recebida, exposição de caixa acima de 10% do contrato ou prazo do cliente incompatível com o prazo de importação: avisar a direção e o Financeiro antes de comprometer a equipe.",
    ferramentas_veos: [],
  }],
  tecnologia: [{
    pedido: "O Wi-Fi da casa do cliente está lento ou cai. Como diagnostico?",
    perguntas_antes: [
      "Desde quando, em que cômodos e em quais aparelhos (celular, TV, câmeras, automação)?",
      "Mudou algo recente: roteador, provedor, obra, aparelhos novos?",
      "Temos o as-built da rede e o acesso remoto autorizado pelo cliente?",
    ],
    passos: [
      "Separar se é lentidão da internet (provedor) ou da rede interna: testar com cabo direto no roteador principal",
      "Conferir no as-built a posição dos pontos de acesso, o canal e a largura de cada um e se há sobreposição com vizinhos",
      "Verificar alimentação (PoE/nobreak), cabeamento e firmware dos pontos de acesso e do roteador",
      "Checar se muitos aparelhos IoT estão na mesma rede da família e se a segmentação (VLAN IoT/câmeras/convidados) está como o padrão da VOICE",
      "Corrigir uma coisa por vez (canal, potência, posição, firmware) com plano de reversão, e medir antes e depois",
      "Monitorar 48–72 h, atualizar o as-built e avisar o cliente",
    ],
    entregavel: "Causa registrada com evidência (medição antes e depois), correção aplicada, as-built atualizado e retorno ao cliente.",
    criterios_de_qualidade: [
      "Causa baseada em medição, não em tentativa",
      "Uma mudança por vez e com reversão possível",
      "As-built atualizado",
    ],
    quando_escalar: "Se a rede carrega fechadura, alarme ou câmeras (segurança física e dados pessoais), se exigir trocar equipamento fora da garantia ou se o problema se repetir em várias obras (revisar o padrão de rede).",
    ferramentas_veos: [],
  }],
};

for (const [id, procs] of Object.entries(NOVOS)) {
  const caminho = `setores/manuais/${id}.json`;
  const manual = JSON.parse(readFileSync(caminho, "utf8"));
  let novos = 0;
  for (const p of procs) {
    if (manual.procedimentos.some((x) => x.pedido === p.pedido)) continue;
    manual.procedimentos.push(p);
    novos++;
  }
  if (novos) writeFileSync(caminho, `${JSON.stringify(manual, null, 1)}\n`);
  console.log(`${id}: ${novos} procedimento(s) novo(s), total ${manual.procedimentos.length}`);
}
