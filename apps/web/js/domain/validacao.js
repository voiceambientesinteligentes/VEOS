// Validacao real guiada: roteiro que o Fernando executa logado no site, passo a passo.
// Cada passo diz o que fazer e o que deve acontecer. O resultado (funcionou / falhou /
// nao se aplica + observacao) vira registro na Biblioteca: falha = incidente aberto;
// o resumo da rodada = referencia (evidencia interna). Nada e marcado como ok sozinho.

export const ROTEIRO = [
  { id: "login", area: "Acesso", titulo: "Entrar pelo link do e-mail", fazer: "Saia, peça o link de acesso com seu e-mail e clique no link recebido.", esperado: "A Órbita abre com o seu e-mail no rodapé do menu." },
  { id: "celular", area: "Acesso", titulo: "Abrir no celular", fazer: "Abra o site no celular, entre e navegue pelo menu (botão ☰).", esperado: "O menu abre e fecha; nenhuma tela tem rolagem para o lado." },
  { id: "zoho-conexao", area: "Zoho", titulo: "Conexão com o Zoho", fazer: "Abra Integrações. Se houver aviso de permissões novas: Desconectar e Conectar Zoho.", esperado: "Aparece Conectado e Leitura e edição." },
  { id: "zoho-espelho", area: "Zoho", titulo: "Espelho do Zoho", fazer: "Abra Zoho Books → Contatos, busque um cliente e abra a ficha. Faça o mesmo em Zoho CRM → Negócios.", esperado: "Os campos aparecem como no Zoho e a lista mostra a última sincronização." },
  { id: "zoho-editar", area: "Zoho", titulo: "Editar no Zoho pelo VEOS", fazer: "Na ficha de um contato de teste, edite um campo sem impacto (ex.: observações) e salve.", esperado: "O VEOS confirma; no próprio Zoho o campo mudou. Nada foi excluído." },
  { id: "negociacao", area: "Comercial", titulo: "Negociação ao Vivo", fazer: "Importe um orçamento do Zoho, aplique um desconto e veja margem, faixa e alçada.", esperado: "Os números fecham com a sua conta; a alçada pedida segue a Política V1." },
  { id: "precedentes", area: "Comercial", titulo: "Precedentes na negociação", fazer: "Ainda na Negociação, salve como proposta.", esperado: "O VEOS mostra os precedentes consultados e a proposta aparece no Comercial." },
  { id: "pedido", area: "Operação", titulo: "Criar pedido", fazer: "Em Pedidos, crie um pedido de um orçamento aceito de teste e defina as parcelas.", esperado: "O pedido só é criado se as parcelas somarem o total." },
  { id: "estoque", area: "Operação", titulo: "Reserva de estoque", fazer: "Confirme o pedido e abra o item no Estoque.", esperado: "A reserva aparece no item; faltando saldo, aparece o alerta de estoque insuficiente." },
  { id: "entrega-nf", area: "Operação", titulo: "Entrega e nota fiscal", fazer: "Marque a entrega e registre a NF emitida manualmente.", esperado: "O estoque baixa e a NF não pode passar do total do pedido." },
  { id: "recebimento", area: "Financeiro", titulo: "Receber parcelas", fazer: "Em Recebimentos, registre o recebimento das parcelas do pedido de teste.", esperado: "A última parcela conclui o pedido; a previsão do mês muda." },
  { id: "contrato", area: "Documentos", titulo: "Contrato em PDF", fazer: "No pedido, abra Contrato, cole as cláusulas e imprima/salve em PDF.", esperado: "O PDF sai com dados do pedido, cliente, itens e parcelas, sem cortes." },
  { id: "anexo", area: "Documentos", titulo: "Anexo PDF no pedido", fazer: "Envie um PDF ao pedido e depois abra o anexo.", esperado: "O anexo abre (link temporário de 5 minutos)." },
  { id: "cancelar", area: "Operação", titulo: "Cancelar o pedido de teste", fazer: "Se o pedido de teste não deve ficar, cancele-o informando o motivo.", esperado: "O pedido fica cancelado com o motivo no histórico; reservas são liberadas." },
  { id: "biblioteca", area: "Biblioteca", titulo: "Decidir uma proposta", fazer: "Em Biblioteca → Revisões, abra uma proposta em consulta, leia a recomendação e aprove, ajuste ou rejeite.", esperado: "A decisão exige confirmação e motivo; o histórico registra quem e quando." },
  { id: "radar", area: "Radar", titulo: "Alertas e tarefas", fazer: "Abra o Radar e conclua uma tarefa.", esperado: "A tarefa sai da lista; os alertas mostram setor, regra e fonte." },
  { id: "saude", area: "Sistema", titulo: "Saúde do sistema", fazer: "Abra Sistema → Saúde do sistema.", esperado: "Última sincronização do Zoho recente e nenhum erro sem explicação." },
];

export const RESULTADOS = { ok: "Funcionou", falhou: "Falhou", na: "Não se aplica" };

/** Resumo da rodada. Falha sem observacao e invalida (o erro precisa ser descrito). */
export function resumoValidacao(respostas, roteiro = ROTEIRO) {
  const linhas = roteiro.map((p) => ({ ...p, ...(respostas[p.id] ?? {}) }));
  const conta = (r) => linhas.filter((l) => l.resultado === r).length;
  const problemas = linhas.filter((l) => l.resultado === "falhou" && !(l.obs ?? "").trim()).map((l) => `Descreva o que falhou em "${l.titulo}".`);
  const pendentes = linhas.filter((l) => !l.resultado).length;
  const texto = linhas.map((l) => `- [${l.resultado ? RESULTADOS[l.resultado] : "Pendente"}] ${l.area} · ${l.titulo}${(l.obs ?? "").trim() ? ` — ${l.obs.trim()}` : ""}`).join("\n");
  return { total: linhas.length, ok: conta("ok"), falhou: conta("falhou"), na: conta("na"), pendentes, problemas, falhas: linhas.filter((l) => l.resultado === "falhou"), texto };
}
