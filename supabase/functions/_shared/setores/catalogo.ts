// GERADO por scripts/gerar-catalogo.mjs a partir de setores/*.json - nao editar a mao.
export const CATALOGO = [
 {
  "id": "direcao",
  "sigla": "CEO",
  "nome": "Direção Geral",
  "missao": "Dar rumo, ritmo e disciplina à VOICE: poucas prioridades claras por trimestre, decisões de alçada tomadas rápido e registradas, riscos sob controle e crescimento que preserve margem e caixa conforme a Política de Saúde Financeira.",
  "cor": "gold",
  "diretor": {
   "titulo": "Diretora Geral (CEO)",
   "nome": "Helena Vasconcellos",
   "perfil": "Persona fictícia. Executiva com trajetória em empresas de engenharia e integração de sistemas para o mercado de alto padrão, acostumada a conduzir empresas de serviço por projeto na passagem de fundador-operador para gestão por sistema. Estilo calmo, direto e orientado a números: cobra clareza de dono, prazo e medida antes de discutir opinião.",
   "especialidades": [
    "Planejamento estratégico trimestral e anual para empresas de projeto",
    "Governança de alçadas e registro de decisões",
    "Gestão de riscos operacionais, financeiros e reputacionais",
    "Condução da reunião semanal de direção com os diretores de setor",
    "Leitura integrada de margem, caixa e capacidade de execução"
   ],
   "metodos": [
    {
     "nome": "EOS / Traction (V/TO, Rocks, Scorecard, Reunião Nível 10, IDS)",
     "autor": "Gino Wickman",
     "uso": "Visão da VOICE em uma página (V/TO), 3 a 7 Rocks trimestrais por diretor, scorecard semanal de 5 a 15 números e a reunião semanal de 90 minutos com os diretores, em que a maior parte do tempo vai para identificar, discutir e resolver (IDS) os problemas da lista."
    },
    {
     "nome": "OKR (Objetivos e Resultados-Chave)",
     "autor": "John Doerr (Measure What Matters), a partir de Andy Grove",
     "uso": "Usado para metas anuais que atravessam setores, por exemplo: elevar o ticket médio rumo aos R$ 100 mil desejados pela política sem sacrificar margem, com resultados-chave mensuráveis por setor."
    },
    {
     "nome": "Balanced Scorecard",
     "autor": "Robert Kaplan e David Norton",
     "uso": "Garante que as metas cubram as quatro perspectivas: financeira (margem, caixa, reserva), clientes e parceiros (satisfação, arquitetos indicadores), processos (obra no prazo, retrabalho) e aprendizado (certificações técnicas, pessoas)."
    },
    {
     "nome": "Gestão de riscos com matriz probabilidade × impacto",
     "autor": "ABNT NBR ISO 31000",
     "uso": "Registro de riscos com dono, nível, plano de tratamento e data de revisão; riscos altos e críticos passam pela reunião de direção."
    },
    {
     "nome": "Registro de decisões (decision log)",
     "autor": "Prática de governança corporativa",
     "uso": "Toda exceção à Política de Saúde Financeira vira um registro com responsável pela autorização, justificativa, impacto financeiro conhecido e data, como exige a Política V1 sec.14."
    }
   ],
   "principios": [
    "Exceção não deve se transformar em regra (Política V1 sec.14).",
    "A aprovação comercial de um projeto não substitui sua aprovação financeira (Política V1 sec.14).",
    "Crescimento de faturamento não pode ocorrer às custas da saúde financeira (Política V1 sec.1).",
    "Poucas prioridades por trimestre, cada uma com um único dono.",
    "Problema que aparece no scorecard vai para a lista de IDS, não para o corredor.",
    "Posição corrente e pro forma de caixa nunca se misturam na mesma conversa (Política V1.1 sec.10)."
   ],
   "como_aconselha": "Responde em tom sereno e objetivo, sempre começando pelo número e pela regra aplicável (citando a seção da política quando existir), depois pelas opções e pela recomendação. Separa claramente o que é política aprovada do que é proposta dela, e termina com dono, prazo e o que precisa ser registrado.",
   "perguntas_chave": [
    "Qual é a margem de contribuição final deste projeto depois do desconto, pela fórmula da Política V1 sec.4?",
    "A exposição de caixa do projeto, no estado corrente e no pro forma, passa de 10% do valor do contrato?",
    "Quem é o dono desta prioridade e qual número mostra que ela foi cumprida no fim do trimestre?",
    "Esta exceção está virando regra? Quantas aprovamos parecidas nos últimos 90 dias?",
    "Qual o impacto desta decisão na capacidade de obra e na agenda dos técnicos certificados?",
    "Que parceiro ou arquiteto está por trás desta oportunidade e quanto do faturamento já depende dele?"
   ],
   "limites": [
    "Não altera a Política de Saúde Financeira sozinha: mudanças exigem nova versão formal, preservando o histórico (Política V1 sec.15).",
    "Não aprova exceção de margem, desconto ou exposição sem justificativa e impacto financeiro registrados (Política V1 sec.14).",
    "Não assume compromisso que leve a exposição pro forma acima de 10% sem análise do CFO (Política V1.1 sec.10).",
    "Decisões societárias, trabalhistas e tributárias relevantes são validadas com contador e advogado antes de executadas."
   ]
  },
  "equipe": [
   {
    "papel": "assessor_estrategia",
    "nome": "Assessor de estratégia e prioridades",
    "reporta_a": "CEO",
    "responsabilidades": [
     "Manter a V/TO da VOICE e o quadro de metas e Rocks trimestrais de todos os setores",
     "Preparar a pauta e o scorecard da reunião semanal de direção",
     "Cobrar atualização semanal de status das metas junto aos donos",
     "Consolidar o relatório trimestral de metas para a revisão de planejamento"
    ],
    "indicadores": [
     "rocks_no_prazo",
     "scorecard_no_alvo"
    ]
   },
   {
    "papel": "relator_direcao",
    "nome": "Relator de decisões da direção",
    "reporta_a": "CEO",
    "responsabilidades": [
     "Registrar cada decisão e cada pedido de alçada com tipo, justificativa, autorizador e impacto financeiro",
     "Garantir que exceções da política tenham o registro completo exigido pela Política V1 sec.14",
     "Redigir a ata da reunião de direção e distribuir as tarefas decididas",
     "Controlar o prazo de resposta dos pedidos de alçada"
    ],
    "indicadores": [
     "excecoes_registradas",
     "tempo_decisao_alcada"
    ]
   },
   {
    "papel": "gestor_riscos",
    "nome": "Gestor de riscos e controles",
    "reporta_a": "CEO",
    "responsabilidades": [
     "Manter o registro de riscos com dono, nível e plano de tratamento",
     "Conduzir a revisão mensal de riscos com os diretores",
     "Acompanhar riscos típicos da VOICE: atraso de obra do cliente, dependência de um arquiteto, importação e câmbio de equipamentos, técnico-chave único por marca, segurança da informação de clientes"
    ],
    "indicadores": [
     "riscos_criticos_sem_plano"
    ]
   },
   {
    "papel": "analista_indicadores",
    "nome": "Analista de indicadores da direção",
    "reporta_a": "CEO",
    "responsabilidades": [
     "Montar o painel mensal consolidado a partir dos setores (Financeiro, Comercial, Operações, Pós-venda, Pessoas)",
     "Acompanhar margem operacional, reserva de caixa e participação de projetos abaixo de 30% de margem no faturamento",
     "Sinalizar desvios para a lista de IDS da reunião semanal"
    ],
    "indicadores": [
     "faturamento_abaixo_margem",
     "margem_operacional",
     "reserva_caixa_meses",
     "scorecard_no_alvo"
    ]
   }
  ],
  "processos": [
   {
    "id": "planejamento_estrategico",
    "nome": "Planejamento e desdobramento de metas",
    "descricao": "Ciclo EOS adaptado à VOICE: visão em uma página, metas anuais (com OKR quando atravessam setores) e Rocks de 90 dias por diretor, acompanhados semanalmente.",
    "etapas": [
     {
      "id": "visao",
      "nome": "Revisar a visão (V/TO)",
      "responsavel": "assessor_estrategia",
      "criterio_saida": "V/TO atualizada com foco de nicho (automação premium), metas de 3 anos e de 1 ano aprovadas pela CEO"
     },
     {
      "id": "metas_anuais",
      "nome": "Definir metas anuais",
      "responsavel": "assessor_estrategia",
      "criterio_saida": "Metas anuais registradas cobrindo as quatro perspectivas do Balanced Scorecard, cada uma com dono e número"
     },
     {
      "id": "rocks",
      "nome": "Definir Rocks trimestrais",
      "responsavel": "assessor_estrategia",
      "criterio_saida": "3 a 7 Rocks por diretor registrados como meta, com data limite no fim do trimestre"
     },
     {
      "id": "acompanhamento",
      "nome": "Acompanhar semanalmente",
      "responsavel": "assessor_estrategia",
      "criterio_saida": "Status no prazo/em risco atualizado toda semana antes da reunião de direção"
     },
     {
      "id": "fechamento_trimestre",
      "nome": "Fechar o trimestre",
      "responsavel": "assessor_estrategia",
      "criterio_saida": "Cada Rock marcado como concluído ou descartado, com aprendizado registrado"
     }
    ]
   },
   {
    "id": "decisao_alcada",
    "nome": "Decisão de alçada e exceções à política",
    "descricao": "Fluxo para tudo o que a Política de Saúde Financeira reserva à direção: margem entre 25% e 29,99%, margem abaixo de 25%, desconto acima de 2%, desconto que leve a margem abaixo de 30%, exposição de caixa ou pro forma acima de 10% do valor do contrato e projeto abaixo do ticket desejado com exceção registrada.",
    "etapas": [
     {
      "id": "pedido",
      "nome": "Pedido de alçada",
      "responsavel": "relator_direcao",
      "criterio_saida": "Decisão registrada com tipo, projeto, margem ou exposição calculada e justificativa"
     },
     {
      "id": "analise_financeira",
      "nome": "Análise financeira",
      "responsavel": "relator_direcao",
      "criterio_saida": "CFO confirmou margem pela fórmula da Política V1 sec.4 e, quando aplicável, exposição corrente e pro forma pela Política V1.1; impacto financeiro preenchido"
     },
     {
      "id": "decisao",
      "nome": "Decisão da direção",
      "responsavel": "relator_direcao",
      "criterio_saida": "Decisão aprovada ou reprovada com autorizador identificado e data"
     },
     {
      "id": "comunicacao",
      "nome": "Comunicação e acompanhamento",
      "responsavel": "relator_direcao",
      "criterio_saida": "Setores envolvidos avisados e data de revisão definida quando a decisão tem condição"
     }
    ]
   },
   {
    "id": "gestao_riscos",
    "nome": "Gestão de riscos",
    "descricao": "Identificar, avaliar, tratar e monitorar riscos com matriz probabilidade × impacto, segundo a ISO 31000.",
    "etapas": [
     {
      "id": "identificar",
      "nome": "Identificar",
      "responsavel": "gestor_riscos",
      "criterio_saida": "Risco registrado com categoria, descrição e dono"
     },
     {
      "id": "avaliar",
      "nome": "Avaliar",
      "responsavel": "gestor_riscos",
      "criterio_saida": "Probabilidade, impacto e nível preenchidos"
     },
     {
      "id": "tratar",
      "nome": "Tratar",
      "responsavel": "gestor_riscos",
      "criterio_saida": "Plano de mitigação com ações e data de próxima revisão"
     },
     {
      "id": "monitorar",
      "nome": "Monitorar",
      "responsavel": "gestor_riscos",
      "criterio_saida": "Risco revisado na data prevista; encerrado quando deixa de existir"
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "meta",
    "nome": "Meta / Rock",
    "descricao": "Meta anual, Rock trimestral ou OKR da VOICE, com dono, número-alvo e prazo. O título diz o resultado esperado (ex.: 'Fechar 3 projetos acima de R$ 100 mil com margem ≥ 35% no 4º trimestre').",
    "responsavel": "assessor_estrategia",
    "estados": [
     "rascunho",
     "no_prazo",
     "em_risco",
     "atrasada",
     "concluida",
     "descartada"
    ],
    "estado_inicial": "rascunho",
    "estados_finais": [
     "concluida",
     "descartada"
    ],
    "campos": [
     {
      "id": "tipo_meta",
      "rotulo": "Tipo",
      "tipo": "opcao",
      "opcoes": [
       "Meta anual",
       "Rock trimestral",
       "OKR - objetivo",
       "OKR - resultado-chave"
      ],
      "obrigatorio": true
     },
     {
      "id": "setor",
      "rotulo": "Setor dono",
      "tipo": "opcao",
      "opcoes": [
       "Direção Geral",
       "Financeiro",
       "Comercial",
       "Marketing",
       "Operações",
       "Tecnologia",
       "Pós-venda",
       "Administrativo e Pessoas",
       "Secretaria"
      ],
      "obrigatorio": true
     },
     {
      "id": "perspectiva",
      "rotulo": "Perspectiva (Balanced Scorecard)",
      "tipo": "opcao",
      "opcoes": [
       "Financeira",
       "Clientes e parceiros",
       "Processos internos",
       "Aprendizado e crescimento"
      ],
      "obrigatorio": true
     },
     {
      "id": "periodo",
      "rotulo": "Período (ex.: 2026-T4)",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "medida",
      "rotulo": "Como será medido",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "valor_alvo",
      "rotulo": "Valor-alvo",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "valor_atual",
      "rotulo": "Valor atual",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "data_limite",
      "rotulo": "Data limite",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "status_politica",
      "rotulo": "Origem da meta",
      "tipo": "opcao",
      "opcoes": [
       "POLITICA",
       "PROPOSTA"
      ],
      "obrigatorio": true
     },
     {
      "id": "observacoes",
      "rotulo": "Observações e aprendizados",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "decisao",
    "nome": "Decisão / alçada",
    "descricao": "Decisão da direção ou pedido de alçada previsto na política. Todo registro de exceção guarda responsável pela autorização, justificativa, impacto financeiro conhecido e a decisão (Política V1 sec.14).",
    "responsavel": "relator_direcao",
    "estados": [
     "solicitada",
     "em_analise",
     "aprovada",
     "reprovada",
     "cancelada"
    ],
    "estado_inicial": "solicitada",
    "estados_finais": [
     "aprovada",
     "reprovada",
     "cancelada"
    ],
    "campos": [
     {
      "id": "tipo_decisao",
      "rotulo": "Tipo de decisão",
      "tipo": "opcao",
      "opcoes": [
       "Margem entre 25% e 29,99%",
       "Margem abaixo de 25% (extraordinária)",
       "Desconto acima de 2% e até 5%",
       "Desconto acima de 5% (excepcional)",
       "Desconto que leva margem abaixo de 30%",
       "Exposição de caixa acima de 10%",
       "Exposição pro forma acima de 10%",
       "Projeto abaixo do ticket desejado",
       "Decisão estratégica",
       "Outra"
      ],
      "obrigatorio": true
     },
     {
      "id": "projeto_ref",
      "rotulo": "Projeto / cliente relacionado",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "margem_pct",
      "rotulo": "Margem de contribuição final (%)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "desconto_pct",
      "rotulo": "Desconto concedido (%)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "exposicao_pct",
      "rotulo": "Exposição de caixa (%) — informar se corrente ou pro forma",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "justificativa",
      "rotulo": "Justificativa",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "impacto_financeiro",
      "rotulo": "Impacto financeiro conhecido (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "autorizador",
      "rotulo": "Responsável pela autorização",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "data_decisao",
      "rotulo": "Data da decisão",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "condicoes",
      "rotulo": "Condições e data de revisão",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "risco",
    "nome": "Risco",
    "descricao": "Risco relevante para a VOICE, avaliado por probabilidade × impacto, com dono e plano de tratamento.",
    "responsavel": "gestor_riscos",
    "estados": [
     "identificado",
     "avaliado",
     "em_tratamento",
     "monitorado",
     "aceito",
     "encerrado"
    ],
    "estado_inicial": "identificado",
    "estados_finais": [
     "encerrado"
    ],
    "campos": [
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "Financeiro / caixa",
       "Obra e cronograma do cliente",
       "Técnico / integração de sistemas",
       "Fornecedor, importação e câmbio",
       "Pessoas-chave e certificações",
       "Comercial / concentração em cliente ou arquiteto",
       "Reputacional",
       "Legal e contratual",
       "Segurança da informação e LGPD"
      ],
      "obrigatorio": true
     },
     {
      "id": "probabilidade",
      "rotulo": "Probabilidade",
      "tipo": "opcao",
      "opcoes": [
       "Baixa",
       "Média",
       "Alta"
      ],
      "obrigatorio": true
     },
     {
      "id": "impacto",
      "rotulo": "Impacto",
      "tipo": "opcao",
      "opcoes": [
       "Baixo",
       "Médio",
       "Alto"
      ],
      "obrigatorio": true
     },
     {
      "id": "nivel",
      "rotulo": "Nível (matriz)",
      "tipo": "opcao",
      "opcoes": [
       "Baixo",
       "Médio",
       "Alto",
       "Crítico"
      ],
      "obrigatorio": true
     },
     {
      "id": "dono_risco",
      "rotulo": "Dono do risco",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "plano_mitigacao",
      "rotulo": "Plano de tratamento",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "sinal_alerta",
      "rotulo": "Sinal de alerta (o que indica que está acontecendo)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "proxima_revisao",
      "rotulo": "Próxima revisão",
      "tipo": "data",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "frente",
    "nome": "Frente de trabalho",
    "descricao": "Iniciativa em andamento da empresa (projeto interno, parceria, estrutura) com próxima ação, progresso e prazo. Visão do painel de frentes.",
    "responsavel": "assessor_estrategia",
    "estados": [
     "pendente",
     "planejada",
     "em_andamento",
     "concluida",
     "cancelada"
    ],
    "estado_inicial": "pendente",
    "estados_finais": [
     "concluida",
     "cancelada"
    ],
    "campos": [
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "prioridade",
      "rotulo": "Prioridade",
      "tipo": "opcao",
      "opcoes": [
       "Alta",
       "Média",
       "Baixa"
      ],
      "obrigatorio": true
     },
     {
      "id": "descricao",
      "rotulo": "Descrição",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "proxima_acao",
      "rotulo": "Próxima ação",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "progresso",
      "rotulo": "Progresso (%)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "dono",
      "rotulo": "Dono da frente (pessoa)",
      "tipo": "texto",
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "reuniao_direcao_semanal",
    "nome": "Reunião semanal de direção (formato Nível 10)",
    "frequencia": "semanal",
    "responsavel": "CEO",
    "passos": [
     "Abertura: uma boa notícia pessoal e uma profissional de cada diretor (5 min)",
     "Scorecard: cada dono diz se seu número está no alvo ou fora; o que estiver fora vai para a lista de IDS (5 min)",
     "Rocks: no prazo ou fora do prazo, sem discussão (5 min)",
     "Destaques de clientes, parceiros e equipe (5 min)",
     "Tarefas da semana anterior: feita ou não feita (5 min)",
     "IDS: resolver os problemas mais importantes, começando por pedidos de alçada pendentes (60 min)",
     "Conclusão: recapitular tarefas, registrar decisões e dar nota à reunião (5 min)"
    ]
   },
   {
    "id": "fila_alcadas",
    "nome": "Revisão da fila de alçadas",
    "frequencia": "semanal",
    "responsavel": "relator_direcao",
    "passos": [
     "Listar decisões em 'solicitada' e 'em_analise'",
     "Confirmar com o CFO margem final (Política V1 sec.4) e exposição corrente/pro forma (Política V1.1) de cada pedido",
     "Levar à CEO os pedidos prontos para decisão",
     "Registrar autorizador, data e impacto financeiro nas decisões tomadas"
    ]
   },
   {
    "id": "acompanhamento_setores",
    "nome": "Conversa individual com os diretores de setor",
    "frequencia": "quinzenal",
    "responsavel": "CEO",
    "passos": [
     "Revisar metas e Rocks do setor",
     "Ouvir bloqueios e necessidades de decisão",
     "Checar indicadores do setor fora do alvo",
     "Combinar próximos passos e registrar tarefas"
    ]
   },
   {
    "id": "conselho_mensal",
    "nome": "Reunião mensal de saúde da empresa (conselho consultivo com os diretores)",
    "frequencia": "mensal",
    "responsavel": "CEO",
    "passos": [
     "Receber do Financeiro o fechamento do mês e os indicadores da Política V1 sec.13",
     "Checar margem operacional frente à meta inicial de 12% a 15% ou superior (Política V1 sec.13)",
     "Checar reserva de caixa frente a 3 meses de custos fixos (Política V1 sec.12)",
     "Checar se projetos abaixo de 30% de margem passaram de 10% do faturamento do período (Política V1 sec.13)",
     "Revisar exceções aprovadas no mês e decidir se algum padrão está virando regra (Política V1 sec.14)",
     "Registrar decisões e encaminhar tarefas"
    ]
   },
   {
    "id": "revisao_riscos",
    "nome": "Revisão mensal de riscos",
    "frequencia": "mensal",
    "responsavel": "gestor_riscos",
    "passos": [
     "Atualizar probabilidade e impacto dos riscos abertos",
     "Cobrar planos de tratamento de riscos altos e críticos",
     "Incluir riscos novos trazidos pelos setores (obras, fornecedores, pessoas, parceiros)",
     "Levar os riscos críticos para a reunião de direção"
    ]
   },
   {
    "id": "planejamento_trimestral",
    "nome": "Planejamento trimestral",
    "frequencia": "trimestral",
    "responsavel": "CEO",
    "passos": [
     "Fechar os Rocks do trimestre (concluída ou descartada) e registrar aprendizados",
     "Revisar V/TO e metas anuais; no último trimestre do ano, definir as metas do ano seguinte",
     "Definir 3 a 7 Rocks por diretor para o próximo trimestre",
     "Revisar o scorecard semanal (manter de 5 a 15 números)",
     "Avaliar se algum parâmetro da política merece revisão formal a partir de dados reais (Política V1 sec.15)"
    ]
   }
  ],
  "indicadores": [
   {
    "id": "rocks_no_prazo",
    "nome": "Rocks concluídos no trimestre",
    "formula": "Rocks concluídos no trimestre / Rocks definidos no trimestre × 100",
    "meta": "≥ 80%",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "scorecard_no_alvo",
    "nome": "Números do scorecard no alvo",
    "formula": "Números do scorecard semanal no alvo / total de números do scorecard × 100",
    "meta": "≥ 80% das semanas com ao menos 80% dos números no alvo",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "excecoes_registradas",
    "nome": "Exceções com registro completo",
    "formula": "Decisões de exceção com autorizador, justificativa, impacto financeiro e data preenchidos / total de exceções decididas × 100",
    "meta": "100% (Política V1 sec.14)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "tempo_decisao_alcada",
    "nome": "Tempo de resposta de alçada",
    "formula": "Média de dias entre a criação do pedido de alçada e a data da decisão",
    "meta": "≤ 2 dias úteis",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "faturamento_abaixo_margem",
    "nome": "Faturamento de projetos abaixo de 30% de margem",
    "formula": "Faturamento de projetos com margem de contribuição < 30% / faturamento total do período × 100",
    "meta": "≤ 10% do faturamento no período (Política V1 sec.13)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "margem_operacional",
    "nome": "Margem operacional da empresa",
    "formula": "Resultado operacional / receita líquida × 100 (a política fixa a meta; o detalhamento da fórmula é PROPOSTA a validar com o contador)",
    "meta": "12% a 15% ou superior (Política V1 sec.13)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "reserva_caixa_meses",
    "nome": "Reserva de caixa em meses de custo fixo",
    "formula": "Reserva financeira disponível / custo fixo médio mensal",
    "meta": "≥ 3 meses (Política V1 sec.12)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "riscos_criticos_sem_plano",
    "nome": "Riscos altos ou críticos sem plano",
    "formula": "Quantidade de riscos de nível Alto ou Crítico, não encerrados, sem plano de tratamento",
    "meta": "0",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   }
  ],
  "sentinelas": [
   {
    "id": "DIR_ALCADA_PARADA",
    "titulo": "Pedido de alçada sem decisão",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "decisao",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "solicitada",
        "em_analise"
       ]
      }
     ],
     "dias": 2,
     "data_campo": "atualizado_em"
    },
    "mensagem": "O pedido de alçada '{{titulo}}' está sem movimentação há {{dias}} dias. Projeto e cliente esperam resposta; a política exige decisão expressa da direção.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Levar pedido de alçada à CEO com análise do CFO",
      "papel": "relator_direcao",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "pedido_analise_cfo"
     },
     {
      "tipo": "notificar",
      "para": "CEO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (EOS/Traction, IDS semanal); alçada definida na Política V1 sec.8 e sec.9"
   },
   {
    "id": "DIR_APROVACAO_SEM_AUTORIZADOR",
    "titulo": "Exceção aprovada sem responsável pela autorização",
    "severidade": "ALTO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "decisao",
     "campo": "autorizador",
     "filtros": [
      {
       "campo": "estado",
       "igual": "aprovada"
      }
     ]
    },
    "mensagem": "A decisão '{{titulo}}' foi aprovada sem o responsável pela autorização registrado.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Registrar quem autorizou a exceção",
      "papel": "relator_direcao",
      "prazo_dias": 1
     }
    ],
    "fonte": "Política V1 sec.14"
   },
   {
    "id": "DIR_EXCECAO_SEM_IMPACTO",
    "titulo": "Exceção sem impacto financeiro conhecido",
    "severidade": "ALTO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "decisao",
     "campo": "impacto_financeiro",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "em_analise",
        "aprovada"
       ]
      },
      {
       "campo": "tipo_decisao",
       "nao_em": [
        "Decisão estratégica",
        "Outra"
       ]
      }
     ]
    },
    "mensagem": "A exceção '{{titulo}}' não tem impacto financeiro registrado. Sem esse número a direção não deve decidir.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Calcular e registrar o impacto financeiro da exceção com o CFO",
      "papel": "relator_direcao",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "pedido_analise_cfo"
     }
    ],
    "fonte": "Política V1 sec.14"
   },
   {
    "id": "DIR_EXCECOES_RECORRENTES",
    "titulo": "Exceções de margem ou desconto se repetindo",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "decisao",
     "filtros": [
      {
       "campo": "estado",
       "igual": "aprovada"
      },
      {
       "campo": "tipo_decisao",
       "em": [
        "Margem entre 25% e 29,99%",
        "Margem abaixo de 25% (extraordinária)",
        "Desconto acima de 2% e até 5%",
        "Desconto acima de 5% (excepcional)",
        "Desconto que leva margem abaixo de 30%"
       ]
      }
     ],
     "janela_dias": 90,
     "data_campo": "data_decisao",
     "operador": ">=",
     "valor": 3
    },
    "mensagem": "{{total}} exceções de margem ou desconto aprovadas nos últimos 90 dias. Verificar se a exceção está virando regra.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Incluir análise das exceções recorrentes na próxima reunião de direção",
      "papel": "analista_indicadores",
      "prazo_dias": 7
     },
     {
      "tipo": "notificar",
      "para": "CEO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (limite de 3 em 90 dias a calibrar); princípio da Política V1 sec.14"
   },
   {
    "id": "DIR_META_EM_RISCO_PARADA",
    "titulo": "Meta em risco sem atualização",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "meta",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "em_risco",
        "atrasada"
       ]
      }
     ],
     "dias": 7,
     "data_campo": "atualizado_em"
    },
    "mensagem": "A meta '{{titulo}}' está em risco ou atrasada e não é atualizada há {{dias}} dias.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Cobrar plano de recuperação do dono da meta e levar à lista de IDS",
      "papel": "assessor_estrategia",
      "prazo_dias": 2
     },
     {
      "tipo": "rascunho",
      "modelo": "cobranca_meta"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (EOS/Traction, revisão semanal de Rocks)"
   },
   {
    "id": "DIR_META_VENCENDO",
    "titulo": "Meta perto da data limite",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "meta",
     "campo": "data_limite",
     "filtros": [
      {
       "campo": "estado",
       "nao_em": [
        "rascunho"
       ]
      }
     ],
     "antecedencia_dias": 14
    },
    "mensagem": "A meta '{{titulo}}' vence em até 14 dias (ou já venceu) e ainda não foi concluída.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Confirmar com o dono se a meta será concluída ou descartada",
      "papel": "assessor_estrategia",
      "prazo_dias": 3
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (EOS/Traction, Rocks de 90 dias)"
   },
   {
    "id": "DIR_RISCO_SEM_PLANO",
    "titulo": "Risco alto ou crítico sem plano de tratamento",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "risco",
     "campo": "plano_mitigacao",
     "filtros": [
      {
       "campo": "nivel",
       "em": [
        "Alto",
        "Crítico"
       ]
      },
      {
       "campo": "estado",
       "diferente": "encerrado"
      }
     ]
    },
    "mensagem": "O risco '{{titulo}}' é de nível alto ou crítico e não tem plano de tratamento.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Definir plano de tratamento com o dono do risco",
      "papel": "gestor_riscos",
      "prazo_dias": 3
     },
     {
      "tipo": "notificar",
      "para": "CEO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (ABNT NBR ISO 31000, matriz probabilidade × impacto)"
   },
   {
    "id": "DIR_RISCO_REVISAO_VENCIDA",
    "titulo": "Revisão de risco vencida",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "risco",
     "campo": "proxima_revisao",
     "filtros": [],
     "antecedencia_dias": 0
    },
    "mensagem": "A revisão do risco '{{titulo}}' está vencida.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Revisar probabilidade, impacto e plano do risco",
      "papel": "gestor_riscos",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "revisao_risco"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (ABNT NBR ISO 31000, monitoramento e análise crítica)"
   },
   {
    "id": "DIR_FRENTE_SEM_PROXIMA_ACAO",
    "titulo": "Frente sem próxima ação",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "frente",
     "campo": "proxima_acao",
     "filtros": []
    },
    "mensagem": "A frente '{{titulo}}' não tem próxima ação definida. Frente sem próximo passo concreto tende a parar.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Definir a próxima ação de '{{titulo}}'",
      "papel": "assessor_estrategia",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — GTD (David Allen): todo projeto precisa de uma próxima ação física definida"
   },
   {
    "id": "DIR_FRENTE_PRAZO",
    "titulo": "Frente vencendo ou vencida",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "frente",
     "campo": "prazo",
     "filtros": [],
     "antecedencia_dias": 3
    },
    "mensagem": "A frente '{{titulo}}' vence em {{dias}} dia(s) ou já venceu e não está concluída.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Revisar prazo e plano de '{{titulo}}' com a CEO",
      "papel": "assessor_estrategia",
      "prazo_dias": 0
     },
     {
      "tipo": "notificar",
      "para": "CEO"
     }
    ],
    "fonte": "PROPOSTA — campos do painel legado VOICE Gerenciamento de Frentes, adequados ao VEOS"
   },
   {
    "id": "DIR_FRENTE_PARADA",
    "titulo": "Frente em andamento parada",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "frente",
     "filtros": [
      {
       "campo": "estado",
       "igual": "em_andamento"
      }
     ],
     "dias": 14,
     "data_campo": "atualizado_em"
    },
    "mensagem": "A frente '{{titulo}}' está em andamento, mas sem atualização há {{dias}} dias.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Atualizar progresso e próxima ação de '{{titulo}}'",
      "papel": "assessor_estrategia",
      "prazo_dias": 2
     }
    ],
    "fonte": "PROPOSTA — cadência quinzenal de revisão de iniciativas (EOS/Traction: Rocks)"
   }
  ],
  "modelos": [
   {
    "id": "pauta_reuniao_direcao",
    "tipo": "documento",
    "assunto": "Pauta da reunião semanal de direção",
    "corpo": "REUNIÃO SEMANAL DE DIREÇÃO — VOICE Ambientes Inteligentes\nResponsável: {{responsavel}}\n\n1. Abertura (5 min): uma boa notícia pessoal e uma profissional por diretor.\n2. Scorecard (5 min): cada dono informa no alvo / fora do alvo. Fora do alvo vai para IDS.\n3. Rocks (5 min): no prazo / fora do prazo.\n4. Destaques de clientes, arquitetos parceiros e equipe (5 min).\n5. Tarefas da semana anterior (5 min): feita / não feita.\n6. IDS (60 min): pedidos de alçada pendentes primeiro; depois os três problemas mais importantes da lista.\n7. Conclusão (5 min): tarefas combinadas, decisões registradas, nota da reunião de 1 a 10."
   },
   {
    "id": "ata_decisao",
    "tipo": "documento",
    "assunto": "Registro de decisão — {{titulo}}",
    "corpo": "REGISTRO DE DECISÃO DA DIREÇÃO\nDecisão: {{titulo}}\nTipo: {{tipo_decisao}}\nProjeto/cliente: {{projeto_ref}}\nMargem de contribuição final (%): {{margem_pct}}\nDesconto (%): {{desconto_pct}}\nExposição de caixa (%), indicar CORRENTE ou PRO FORMA: {{exposicao_pct}}\nJustificativa: {{justificativa}}\nImpacto financeiro conhecido: {{impacto_financeiro}}\nResponsável pela autorização: {{autorizador}}\nData: {{data_decisao}}\nCondições e revisão: {{condicoes}}\n\nRegistro exigido pela Política de Saúde Financeira V1 sec.14. A aprovação comercial não substitui a aprovação financeira."
   },
   {
    "id": "pedido_analise_cfo",
    "tipo": "email",
    "assunto": "Análise financeira para decisão de alçada — {{titulo}}",
    "corpo": "Olá, CFO.\n\nPreciso da análise financeira para o pedido de alçada '{{titulo}}' (projeto: {{projeto_ref}}).\n\nPor favor, confirme:\n1. Margem de contribuição final pela fórmula oficial (Política V1 sec.4), já com o desconto e a provisão de risco de 2%;\n2. Exposição de caixa corrente e, se houver compra proposta, a exposição pro forma (Política V1.1), identificando cada estado;\n3. Impacto financeiro da exceção em reais.\n\nA decisão está parada há {{dias}} dias. Obrigado,\n{{responsavel}}"
   },
   {
    "id": "cobranca_meta",
    "tipo": "whatsapp",
    "assunto": "Meta em risco",
    "corpo": "Olá! A meta '{{titulo}}' está marcada como em risco e sem atualização há {{dias}} dias. Pode me mandar até amanhã: número atual, o que está travando e o plano para recuperar? Vou levar para o IDS da reunião de direção. Obrigado! — {{responsavel}}"
   },
   {
    "id": "revisao_risco",
    "tipo": "email",
    "assunto": "Revisão do risco — {{titulo}}",
    "corpo": "Olá,\n\nChegou a data de revisão do risco '{{titulo}}'. Por favor, atualize:\n- probabilidade e impacto atuais;\n- o que foi feito do plano de tratamento;\n- se o sinal de alerta apareceu;\n- nova data de revisão ou proposta de encerramento.\n\nRiscos altos e críticos vão para a reunião de direção.\n{{responsavel}}"
   }
  ],
  "documentos": [
   "Visão em uma página da VOICE (V/TO)",
   "Quadro de metas anuais e Rocks trimestrais por setor",
   "Scorecard semanal da direção (5 a 15 números)",
   "Registro de decisões e exceções à Política de Saúde Financeira",
   "Registro de riscos com matriz probabilidade × impacto",
   "Política de Saúde Financeira V1 e clarificação V1.1 (04 - PADROES)",
   "Ata da reunião mensal de saúde da empresa"
  ],
  "relacoes": [
   {
    "setor": "financas",
    "fluxo": "Recebe o fechamento mensal, os indicadores da Política V1 sec.13 e a análise de margem e exposição para cada pedido de alçada; devolve decisões registradas."
   },
   {
    "setor": "vendas",
    "fluxo": "Recebe pedidos de desconto acima de 2%, margem abaixo de 30% e projetos abaixo do ticket desejado; devolve decisão com justificativa registrada."
   },
   {
    "setor": "operacoes",
    "fluxo": "Recebe pedidos de compra que elevam a exposição pro forma acima de 10% e riscos de obra; devolve autorização ou reprovação."
   },
   {
    "setor": "pessoas",
    "fluxo": "Recebe indicadores de pessoas, certificações e riscos de pessoas-chave; devolve metas de capacitação e decisões de estrutura."
   },
   {
    "setor": "marketing",
    "fluxo": "Recebe decisões sobre projetos-vitrine e sacrifício de margem classificado como investimento de marketing (Política V1 sec.8)."
   },
   {
    "setor": "tecnologia",
    "fluxo": "Recebe riscos técnicos e de segurança da informação; devolve prioridades trimestrais."
   },
   {
    "setor": "posvenda",
    "fluxo": "Recebe indicadores de satisfação, retrabalho e garantia para a revisão da política (Política V1 sec.15)."
   },
   {
    "setor": "secretaria",
    "fluxo": "Apoia agenda, convocação e distribuição das atas da reunião de direção."
   }
  ],
  "fontes": [
   {
    "titulo": "Política de Saúde Financeira da VOICE — V1 (sec.1, 2, 3, 4, 8, 9, 12, 13, 14, 15)",
    "tipo": "norma",
    "ref": "04 - PADROES/VOICE - Politica de Saude Financeira - V1.md"
   },
   {
    "titulo": "Política de Saúde Financeira da VOICE — V1.1, clarificação de posição e exposição de caixa (sec.9, 10)",
    "tipo": "norma",
    "ref": "04 - PADROES/VOICE - Politica de Saude Financeira - V1.1 - Clarificacao de posicao e exposicao de caixa.md"
   },
   {
    "titulo": "Traction / EOS — Level 10 Meeting",
    "tipo": "metodo",
    "ref": "https://www.eosworldwide.com/level-10-meeting"
   },
   {
    "titulo": "Measure What Matters (OKR) — John Doerr",
    "tipo": "livro",
    "ref": "Doerr, J. Measure What Matters. Portfolio, 2018"
   },
   {
    "titulo": "The Balanced Scorecard — Kaplan e Norton",
    "tipo": "livro",
    "ref": "Kaplan, R.; Norton, D. The Balanced Scorecard. HBS Press, 1996"
   },
   {
    "titulo": "ABNT NBR ISO 31000 — Gestão de riscos",
    "tipo": "norma",
    "ref": "ABNT NBR ISO 31000:2018"
   },
   {
    "titulo": "Skill risk-assessment (matriz e registro de riscos)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/operations/skills/risk-assessment/SKILL.md"
   },
   {
    "titulo": "Skill status-report (status, riscos e decisões necessárias)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/operations/skills/status-report/SKILL.md"
   },
   {
    "titulo": "Skill legal-risk-assessment (severidade × probabilidade e escalonamento)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/legal/skills/legal-risk-assessment/SKILL.md"
   },
   {
    "titulo": "Skill business-pulse (painel executivo de pequena empresa)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/business-pulse/SKILL.md"
   }
  ]
 },
 {
  "id": "financas",
  "sigla": "CFO",
  "nome": "Financeiro",
  "missao": "Proteger margem e caixa da VOICE: pagar e receber no prazo, com documento fiscal correto e comprovante bancário, conciliar tudo, fechar o mês em até 5 dias úteis e entregar à direção os indicadores da Política de Saúde Financeira.",
  "cor": "cyan",
  "diretor": {
   "titulo": "Diretor Financeiro (CFO)",
   "nome": "Ricardo Menezes Prado",
   "perfil": "Persona fictícia. Controller com experiência em empresas de engenharia e integração que vendem por projeto, com recebimento em parcelas atreladas a fases de obra. Metódico e conservador com caixa, explica números em linguagem de dono e não aceita decisão sem conta feita.",
   "especialidades": [
    "Fluxo de caixa semanal de 13 semanas e necessidade de caixa em 30, 60 e 90 dias",
    "Contas a pagar com conferência de três vias (pedido, recebimento e nota)",
    "Régua de cobrança discreta para clientes de alto padrão",
    "Conciliação bancária e fechamento mensal",
    "Margem de contribuição e exposição de caixa por projeto conforme a Política V1/V1.1"
   ],
   "metodos": [
    {
     "nome": "Fluxo de caixa de 13 semanas",
     "autor": "Prática de tesouraria e reestruturação (13-week cash flow)",
     "uso": "Projeção semanal rolante de entradas (parcelas de projeto, contratos de suporte) e saídas (fornecedores, folha, impostos, custos fixos), sempre partindo do saldo bancário real e separando o que é recebível agendado do que é valor efetivamente recebido (Política V1.1 sec.5)."
    },
    {
     "nome": "Fechamento mensal em D+5",
     "autor": "Prática de controladoria (checklist de close por dia útil)",
     "uso": "Pré-fechamento nos últimos dias do mês, conciliação bancária e de contas a pagar/receber em D+1 e D+2, revisão de variações em D+3, pacote de indicadores em D+4 e fechamento travado em D+5."
    },
    {
     "nome": "Conciliação bancária com classificação de diferenças",
     "autor": "Prática contábil",
     "uso": "Toda diferença classificada como temporária (depósito em trânsito, compensação), ajuste necessário (tarifa, juros, lançamento duplicado) ou em investigação, com dono e prazo."
    },
    {
     "nome": "Conferência de três vias e dois portões de aprovação",
     "autor": "Prática de contas a pagar",
     "uso": "Nota do fornecedor conferida contra pedido e recebimento do equipamento; aprovar o lançamento e aprovar o pagamento são decisões separadas; nada é pago automaticamente e duplicidades são checadas antes."
    },
    {
     "nome": "Aging de recebíveis e régua de cobrança",
     "autor": "Prática de crédito e cobrança",
     "uso": "Lembrete cordial antes do vencimento, contato no D+1, reforço no D+7 e escalonamento ao CFO no D+15, com tom ajustado ao histórico de pagamento de cada cliente."
    }
   ],
   "principios": [
    "Nota fiscal não comprova pagamento nem recebimento: só o extrato ou comprovante bancário liquida um título.",
    "Recebíveis agendados não reduzem a exposição corrente (Política V1.1 sec.5).",
    "Estado corrente e estado pro forma nunca se misturam em um relatório (Política V1.1 sec.10).",
    "A VOICE não financia a obra do cliente com caixa próprio como prática normal (Política V1 sec.10).",
    "Faturamento futuro não substitui a reserva de 3 meses de custos fixos (Política V1 sec.12).",
    "Custos fixos não são rateados arbitrariamente nos projetos (Política V1 sec.7).",
    "Nenhum número é inventado: o que falta é apontado como faltando."
   ],
   "como_aconselha": "Responde com o número primeiro, a regra da política que se aplica em seguida (com a seção) e a recomendação por último. Deixa explícito se fala do estado corrente ou pro forma, e marca como PROPOSTA tudo que a política não define. Evita jargão com a direção e mostra a conta.",
   "perguntas_chave": [
    "Qual é o saldo bancário real hoje e o que vence nas próximas duas semanas?",
    "Quanto do que chamamos de 'a receber' já está vencido e com quem?",
    "Esta compra de equipamentos está coberta pelo que o cliente já pagou nesta fase (Política V1 sec.10)?",
    "A reserva cobre 3 meses de custos fixos médios (Política V1 sec.12)?",
    "Todas as notas do mês têm XML arquivado e título financeiro vinculado?",
    "Algum cliente ou arquiteto concentra parte grande demais do faturamento?"
   ],
   "limites": [
    "Não autoriza exceção de margem, desconto acima de 2% ou exposição acima de 10%: calcula e encaminha à direção (Política V1 sec.8, sec.9; V1.1 sec.9).",
    "Não altera regras da política; propõe recalibração com dados reais (Política V1 sec.13 e sec.15).",
    "Não define enquadramento tributário, retenções nem obrigações acessórias: valida com o contador.",
    "Não paga título sem aprovação separada do lançamento e não paga automaticamente título recorrente."
   ]
  },
  "equipe": [
   {
    "papel": "analista_pagar",
    "nome": "Analista de contas a pagar",
    "reporta_a": "CFO",
    "responsabilidades": [
     "Registrar títulos a pagar de fornecedores, prestadores, impostos, folha e custos fixos",
     "Conferir nota contra pedido e recebimento (três vias) e checar duplicidade antes de lançar",
     "Montar a proposta semanal de pagamentos para aprovação do CFO",
     "Liquidar títulos somente com comprovante bancário anexado"
    ],
    "indicadores": [
     "recebiveis_pagaveis"
    ]
   },
   {
    "papel": "analista_receber",
    "nome": "Analista de contas a receber e cobrança",
    "reporta_a": "CFO",
    "responsabilidades": [
     "Registrar títulos a receber fora das parcelas de projeto (contratos de suporte e monitoramento, assistências avulsas, revendas)",
     "Enviar lembretes antes do vencimento e conduzir a régua de cobrança com tom adequado ao cliente de alto padrão",
     "Baixar recebimentos somente pelo extrato bancário",
     "Informar o Comercial e a direção sobre clientes com atraso recorrente"
    ],
    "indicadores": [
     "inadimplencia",
     "recebiveis_pagaveis",
     "concentracao"
    ]
   },
   {
    "papel": "analista_fiscal",
    "nome": "Analista fiscal e de documentos",
    "reporta_a": "CFO",
    "responsabilidades": [
     "Receber, conferir e arquivar XML e PDF de notas emitidas e recebidas (NF-e, NFS-e, CT-e)",
     "Vincular cada nota ao título financeiro e, quando houver, ao projeto",
     "Tratar divergências com fornecedores e enviar ao contador a documentação do mês"
    ],
    "indicadores": [
     "faturamento_receita"
    ]
   },
   {
    "papel": "controller",
    "nome": "Controller",
    "reporta_a": "CFO",
    "responsabilidades": [
     "Conciliar bancos e contas a pagar/receber",
     "Manter o fluxo de caixa de 13 semanas e a necessidade de caixa em 30/60/90 dias",
     "Conduzir o fechamento mensal e montar o pacote de indicadores da Política V1 sec.13",
     "Calcular a reserva de caixa frente a 3 meses de custos fixos"
    ],
    "indicadores": [
     "margem_contribuicao",
     "margem_operacional",
     "ticket_medio",
     "exposicao_projetos",
     "necessidade_caixa_reserva",
     "faturamento_abaixo_margem"
    ]
   }
  ],
  "processos": [
   {
    "id": "contas_pagar",
    "nome": "Contas a pagar",
    "descricao": "Do documento do fornecedor ao pagamento conciliado, com dois portões de aprovação (lançamento e pagamento). Compromissos de projeto continuam nas telas de projeto; este fluxo registra o título financeiro.",
    "etapas": [
     {
      "id": "recepcao",
      "nome": "Recepção do documento",
      "responsavel": "analista_fiscal",
      "criterio_saida": "Nota com XML e PDF registrada; duplicidade verificada por número, emitente e valor"
     },
     {
      "id": "conferencia",
      "nome": "Conferência de três vias",
      "responsavel": "analista_pagar",
      "criterio_saida": "Nota confere com pedido e recebimento, ou divergência aberta com o fornecedor"
     },
     {
      "id": "lancamento",
      "nome": "Lançamento e aprovação do título",
      "responsavel": "analista_pagar",
      "criterio_saida": "Título registrado com vencimento, categoria e projeto (se houver) e aprovado pelo CFO"
     },
     {
      "id": "agendamento",
      "nome": "Aprovação do pagamento e agendamento",
      "responsavel": "analista_pagar",
      "criterio_saida": "Pagamento incluído na proposta semanal aprovada e agendado no banco"
     },
     {
      "id": "liquidacao",
      "nome": "Liquidação e conciliação",
      "responsavel": "controller",
      "criterio_saida": "Comprovante bancário vinculado e lançamento conciliado com o extrato"
     }
    ]
   },
   {
    "id": "contas_receber_cobranca",
    "nome": "Contas a receber e cobrança",
    "descricao": "Títulos a receber fora das parcelas de projeto e régua de cobrança discreta, adequada a clientes de alto padrão e ao relacionamento com arquitetos parceiros.",
    "etapas": [
     {
      "id": "emissao",
      "nome": "Emissão",
      "responsavel": "analista_receber",
      "criterio_saida": "Título registrado com vencimento e nota fiscal emitida e vinculada"
     },
     {
      "id": "lembrete",
      "nome": "Lembrete antes do vencimento",
      "responsavel": "analista_receber",
      "criterio_saida": "Lembrete cordial enviado 3 dias antes do vencimento"
     },
     {
      "id": "cobranca",
      "nome": "Régua de cobrança",
      "responsavel": "analista_receber",
      "criterio_saida": "Contatos no D+1 e D+7 registrados; no D+15 o caso sobe ao CFO"
     },
     {
      "id": "baixa",
      "nome": "Baixa pelo extrato",
      "responsavel": "analista_receber",
      "criterio_saida": "Recebimento identificado no extrato e comprovante referenciado no título"
     }
    ]
   },
   {
    "id": "fechamento_mensal",
    "nome": "Fechamento mensal",
    "descricao": "Fechamento em até 5 dias úteis, com conciliação, pacote de indicadores da Política V1 sec.13 e parecer para a direção.",
    "etapas": [
     {
      "id": "pre_fechamento",
      "nome": "Pré-fechamento",
      "responsavel": "controller",
      "criterio_saida": "Pendências de notas, comprovantes e lançamentos listadas nos últimos 2 dias úteis do mês"
     },
     {
      "id": "conciliacao",
      "nome": "Conciliação (D+1 a D+2)",
      "responsavel": "controller",
      "criterio_saida": "Bancos, contas a pagar e contas a receber conciliados; diferenças classificadas"
     },
     {
      "id": "indicadores",
      "nome": "Indicadores (D+3 a D+4)",
      "responsavel": "controller",
      "criterio_saida": "Os 15 indicadores da Política V1 sec.13 calculados e comparados às metas"
     },
     {
      "id": "fechado",
      "nome": "Fechamento e envio (D+5)",
      "responsavel": "controller",
      "criterio_saida": "Mês travado, parecer escrito e pacote enviado à direção e ao contador"
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "conta",
    "nome": "Conta a pagar / a receber",
    "descricao": "Título financeiro que não é parcela de projeto nem compromisso de projeto (esses já vivem em tabelas próprias do VEOS): custos fixos, folha, impostos, fornecedores, prestadores, contratos de suporte e monitoramento, assistências avulsas. Liquida somente com comprovante bancário.",
    "responsavel": "analista_pagar",
    "estados": [
     "aberta",
     "aprovada",
     "agendada",
     "em_cobranca",
     "liquidada",
     "renegociada",
     "cancelada"
    ],
    "estado_inicial": "aberta",
    "estados_finais": [
     "liquidada",
     "renegociada",
     "cancelada"
    ],
    "campos": [
     {
      "id": "natureza",
      "rotulo": "Natureza",
      "tipo": "opcao",
      "opcoes": [
       "A pagar",
       "A receber"
      ],
      "obrigatorio": true
     },
     {
      "id": "contraparte",
      "rotulo": "Fornecedor / cliente",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "Custo fixo (aluguel, estrutura, softwares gerais)",
       "Folha, pró-labore e encargos",
       "Impostos e tributos",
       "Fornecedor de equipamentos",
       "Instalador ou serviço de terceiros",
       "Frete, viagem e logística",
       "Tarifas bancárias, cartão e antecipação",
       "Receita de contrato de suporte ou monitoramento",
       "Receita de assistência ou serviço avulso",
       "Outros"
      ],
      "obrigatorio": true
     },
     {
      "id": "vencimento",
      "rotulo": "Vencimento",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "projeto_ref",
      "rotulo": "Projeto relacionado (se houver)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "documento_ref",
      "rotulo": "Nota fiscal vinculada (número)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "forma",
      "rotulo": "Forma de pagamento",
      "tipo": "opcao",
      "opcoes": [
       "PIX",
       "Boleto",
       "Transferência",
       "Cartão",
       "Débito automático",
       "Outro"
      ],
      "obrigatorio": false
     },
     {
      "id": "data_liquidacao",
      "rotulo": "Data da liquidação (extrato)",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "comprovante_ref",
      "rotulo": "Comprovante bancário (link ou identificador)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "historico_cobranca",
      "rotulo": "Histórico de cobrança",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "documento_fiscal",
    "nome": "Documento fiscal",
    "descricao": "Nota fiscal emitida ou recebida, com XML e PDF arquivados. Nota fiscal não comprova pagamento: todo documento aponta para o título financeiro correspondente.",
    "responsavel": "analista_fiscal",
    "estados": [
     "recebido",
     "em_conferencia",
     "divergente",
     "escriturado",
     "cancelado"
    ],
    "estado_inicial": "recebido",
    "estados_finais": [
     "escriturado",
     "cancelado"
    ],
    "campos": [
     {
      "id": "tipo_documento",
      "rotulo": "Tipo",
      "tipo": "opcao",
      "opcoes": [
       "NF-e (produto)",
       "NFS-e (serviço)",
       "CT-e (frete)",
       "Nota de devolução",
       "Nota de importação",
       "Outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "sentido",
      "rotulo": "Emitida ou recebida",
      "tipo": "opcao",
      "opcoes": [
       "Emitida pela VOICE",
       "Recebida de fornecedor"
      ],
      "obrigatorio": true
     },
     {
      "id": "numero",
      "rotulo": "Número / série",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "emitente_destinatario",
      "rotulo": "Emitente ou destinatário",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "data_emissao",
      "rotulo": "Data de emissão",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "chave_acesso",
      "rotulo": "Chave de acesso",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "xml_ref",
      "rotulo": "XML arquivado (link ou caminho)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "pdf_ref",
      "rotulo": "PDF / DANFE arquivado (link ou caminho)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "conta_ref",
      "rotulo": "Título financeiro vinculado",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "projeto_ref",
      "rotulo": "Projeto relacionado (se houver)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "divergencia",
      "rotulo": "Descrição da divergência",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "fechamento",
    "nome": "Fechamento mensal",
    "descricao": "Um registro por competência, com conciliação, os indicadores da Política V1 sec.13 e o parecer do CFO para a direção.",
    "responsavel": "controller",
    "estados": [
     "aberto",
     "em_conciliacao",
     "em_revisao",
     "fechado"
    ],
    "estado_inicial": "aberto",
    "estados_finais": [
     "fechado"
    ],
    "campos": [
     {
      "id": "competencia",
      "rotulo": "Competência (AAAA-MM)",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "data_limite",
      "rotulo": "Data limite (5º dia útil)",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_fechamento",
      "rotulo": "Data em que foi fechado",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "conciliacao_bancaria",
      "rotulo": "Conciliação bancária",
      "tipo": "opcao",
      "opcoes": [
       "Concluída sem diferença",
       "Concluída com diferenças explicadas",
       "Pendente"
      ],
      "obrigatorio": false
     },
     {
      "id": "diferenca_nao_explicada",
      "rotulo": "Diferença não explicada (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "faturamento",
      "rotulo": "Faturamento (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "receita_liquida",
      "rotulo": "Receita líquida (R$) — Política V1 sec.4",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "margem_consolidada_pct",
      "rotulo": "Margem de contribuição consolidada (%)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "margem_operacional_pct",
      "rotulo": "Margem operacional (%)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "ticket_medio",
      "rotulo": "Ticket médio dos projetos vendidos (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "prazo_medio_recebimento",
      "rotulo": "Prazo médio de recebimento (dias)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "inadimplencia_pct",
      "rotulo": "Inadimplência (% da receita)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "contas_receber_total",
      "rotulo": "Contas a receber em aberto (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "contas_pagar_total",
      "rotulo": "Contas a pagar em aberto (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "necessidade_caixa_30",
      "rotulo": "Necessidade de caixa 30 dias (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "necessidade_caixa_60",
      "rotulo": "Necessidade de caixa 60 dias (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "necessidade_caixa_90",
      "rotulo": "Necessidade de caixa 90 dias (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "custo_fixo_medio",
      "rotulo": "Custo fixo médio mensal (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "reserva_caixa",
      "rotulo": "Reserva financeira disponível (R$)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "falta_para_reserva",
      "rotulo": "Falta para a reserva de 3 meses (R$) = máx(0; 3 × custo fixo médio − reserva)",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "concentracao_cliente_pct",
      "rotulo": "Maior cliente (% do faturamento)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "concentracao_parceiro_pct",
      "rotulo": "Maior parceiro/arquiteto (% do faturamento)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "abaixo_margem_pct",
      "rotulo": "Faturamento de projetos abaixo de 30% de margem (%)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "parecer",
      "rotulo": "Parecer do CFO",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "cobranca_diaria",
    "nome": "Régua de cobrança e baixa pelo extrato",
    "frequencia": "diaria",
    "responsavel": "analista_receber",
    "passos": [
     "Importar ou conferir o extrato bancário do dia",
     "Baixar recebimentos identificados no extrato, com comprovante referenciado",
     "Enviar lembretes de títulos que vencem em 3 dias",
     "Executar a régua (D+1, D+7) e escalar ao CFO títulos com 15 dias de atraso",
     "Antes de cobrar, verificar se o cliente pagou nos últimos dias para não cobrar quem já pagou"
    ]
   },
   {
    "id": "fluxo_caixa_13_semanas",
    "nome": "Atualização do fluxo de caixa de 13 semanas",
    "frequencia": "semanal",
    "responsavel": "controller",
    "passos": [
     "Partir do saldo bancário real da segunda-feira (nunca de saldo presumido)",
     "Lançar entradas previstas: parcelas de projeto (das telas de projeto) e contas a receber, ajustadas pelo atraso médio de cada cliente",
     "Lançar saídas: contas a pagar, compromissos de projeto, folha, impostos e custos fixos",
     "Comparar a semana anterior com o realizado e explicar as diferenças",
     "Destacar semanas com saldo projetado abaixo da reserva e a necessidade de caixa em 30/60/90 dias",
     "Rotular a projeção como estado corrente; simulações de compra entram separadas como pro forma (Política V1.1 sec.10)"
    ]
   },
   {
    "id": "proposta_pagamentos",
    "nome": "Proposta semanal de pagamentos",
    "frequencia": "semanal",
    "responsavel": "analista_pagar",
    "passos": [
     "Listar títulos a pagar que vencem até a próxima semana e os já vencidos",
     "Checar duplicidades e créditos de fornecedor antes de propor",
     "Informar o total que sairá da conta e o saldo após os pagamentos",
     "Obter aprovação do CFO (portão de pagamento, separado da aprovação do lançamento)",
     "Agendar no banco e marcar os títulos como agendados"
    ]
   },
   {
    "id": "notas_semana",
    "nome": "Conferência semanal de notas fiscais",
    "frequencia": "semanal",
    "responsavel": "analista_fiscal",
    "passos": [
     "Baixar XML e PDF das notas recebidas e emitidas na semana",
     "Conferir notas de fornecedor contra pedido e recebimento",
     "Vincular cada nota ao título financeiro e ao projeto",
     "Abrir divergência com o fornecedor quando houver diferença de preço, quantidade ou dados cadastrais"
    ]
   },
   {
    "id": "fechamento_mensal",
    "nome": "Fechamento mensal em D+5",
    "frequencia": "mensal",
    "responsavel": "controller",
    "passos": [
     "Pré-fechamento: listar notas sem XML, títulos sem comprovante e lançamentos pendentes",
     "D+1/D+2: conciliar bancos, contas a pagar e contas a receber",
     "D+3: revisar variações relevantes contra o mês anterior",
     "D+4: calcular os 15 indicadores da Política V1 sec.13 e a reserva de caixa (sec.12)",
     "D+5: travar o mês, escrever o parecer e enviar o pacote à direção e ao contador",
     "Só atualizar o fluxo de 13 semanas depois do fechamento aprovado"
    ]
   },
   {
    "id": "painel_direcao",
    "nome": "Painel de saúde financeira para a direção",
    "frequencia": "mensal",
    "responsavel": "CFO",
    "passos": [
     "Apresentar indicadores fora da meta da Política V1 sec.13",
     "Mostrar projetos com exposição acima de 10% (tela de exposição V1.1) e cobertura por fase (V1 sec.10)",
     "Mostrar exceções aprovadas no mês e seu impacto financeiro",
     "Propor recalibrações somente como PROPOSTA, com dados reais (Política V1 sec.15)"
    ]
   }
  ],
  "indicadores": [
   {
    "id": "faturamento_receita",
    "nome": "Faturamento e receita líquida",
    "formula": "Faturamento = valor bruto faturado no período. Receita líquida = valor bruto vendido − descontos e abatimentos − impostos incidentes diretamente sobre a venda (Política V1 sec.4)",
    "meta": "Acompanhar contra o plano anual da direção (meta de valor: PROPOSTA)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "margem_contribuicao",
    "nome": "Margem de contribuição por projeto e consolidada",
    "formula": "Margem de contribuição = receita líquida − custos diretos e variáveis (incluindo provisão de risco de 2%); MC% = MC / receita líquida × 100 (Política V1 sec.4, 5 e 6). Consolidada = soma das MC / soma das receitas líquidas do período",
    "meta": "Alvo ≥ 35%; mínimo para aprovação normal 30% (Política V1 sec.3)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "margem_operacional",
    "nome": "Margem operacional",
    "formula": "Resultado operacional / receita líquida × 100 (detalhamento da fórmula é PROPOSTA a validar com o contador)",
    "meta": "12% a 15% ou superior (Política V1 sec.13)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "ticket_medio",
    "nome": "Ticket médio",
    "formula": "Valor dos projetos completos vendidos no período / quantidade de projetos completos vendidos",
    "meta": "Desejado ≥ R$ 100.000,00; é meta, não bloqueio (Política V1 sec.2)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "recebiveis_pagaveis",
    "nome": "Contas a receber, contas a pagar e prazo médio de recebimento",
    "formula": "Saldos em aberto por faixa de atraso (a vencer, 1–15, 16–30, 31–60, > 60 dias). Prazo médio de recebimento = média ponderada pelo valor dos dias entre emissão e recebimento efetivo",
    "meta": "Prazo médio ≤ 30 dias e nenhum título a pagar vencido sem negociação (PROPOSTA; indicadores exigidos pela Política V1 sec.13)",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "inadimplencia",
    "nome": "Inadimplência",
    "formula": "Valores vencidos há mais de 30 dias e não recebidos / receita do período × 100 (corte de 30 dias é PROPOSTA)",
    "meta": "< 2% da receita (Política V1 sec.13)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "exposicao_projetos",
    "nome": "Exposição de caixa por projeto",
    "formula": "Exposição = máx(0; compromissos/desembolsos assumidos − valores efetivamente recebidos); Exposição % = exposição / valor do contrato × 100 (Política V1.1 sec.7 e 9). Calculada na tela de exposição do VEOS",
    "meta": "Preferencialmente zero; acima de 10% do valor do contrato exige autorização expressa da direção (Política V1.1 sec.9)",
    "frequencia": "semanal",
    "status": "POLITICA"
   },
   {
    "id": "necessidade_caixa_reserva",
    "nome": "Necessidade de caixa em 30, 60 e 90 dias e reserva",
    "formula": "Saídas previstas − entradas previstas em cada janela, a partir do saldo bancário real; reserva em meses = reserva disponível / custo fixo médio mensal",
    "meta": "Reserva ≥ 3 meses de custos fixos médios (Política V1 sec.12 e sec.13)",
    "frequencia": "semanal",
    "status": "POLITICA"
   },
   {
    "id": "concentracao",
    "nome": "Concentração por cliente e por parceiro/arquiteto",
    "formula": "Faturamento dos 12 meses do maior cliente (e do maior parceiro indicador) / faturamento total dos 12 meses × 100",
    "meta": "Maior cliente ≤ 20% e maior parceiro ≤ 30% (PROPOSTA; indicadores exigidos pela Política V1 sec.13)",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "faturamento_abaixo_margem",
    "nome": "Projetos abaixo da margem mínima normal",
    "formula": "Faturamento de projetos com margem de contribuição < 30% / faturamento total do período × 100",
    "meta": "≤ 10% do faturamento no período (Política V1 sec.13)",
    "frequencia": "mensal",
    "status": "POLITICA"
   }
  ],
  "sentinelas": [
   {
    "id": "FIN_PAGAR_VENCENDO",
    "titulo": "Conta a pagar vencendo sem agendamento",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "conta",
     "campo": "vencimento",
     "filtros": [
      {
       "campo": "natureza",
       "igual": "A pagar"
      },
      {
       "campo": "estado",
       "em": [
        "aberta",
        "aprovada"
       ]
      }
     ],
     "antecedencia_dias": 3
    },
    "mensagem": "A conta '{{titulo}}' vence em até 3 dias (ou já venceu) e ainda não foi agendada.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Incluir na proposta de pagamentos e obter aprovação do CFO",
      "papel": "analista_pagar",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (contas a pagar com dois portões de aprovação)"
   },
   {
    "id": "FIN_RECEBER_VENCIDO",
    "titulo": "Conta a receber vencida",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "conta",
     "campo": "vencimento",
     "filtros": [
      {
       "campo": "natureza",
       "igual": "A receber"
      },
      {
       "campo": "estado",
       "em": [
        "aberta",
        "aprovada",
        "agendada"
       ]
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "O título '{{titulo}}' venceu e não consta recebimento no extrato. Iniciar a régua de cobrança.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Confirmar no extrato e iniciar cobrança (D+1)",
      "papel": "analista_receber",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "cobranca_vencido"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (aging de recebíveis e régua de cobrança)"
   },
   {
    "id": "FIN_COBRANCA_PARADA",
    "titulo": "Cobrança sem avanço",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "conta",
     "filtros": [
      {
       "campo": "estado",
       "igual": "em_cobranca"
      }
     ],
     "dias": 7,
     "data_campo": "atualizado_em"
    },
    "mensagem": "A cobrança de '{{titulo}}' está sem movimentação há {{dias}} dias. Escalar ao CFO.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Reforçar cobrança e registrar retorno do cliente",
      "papel": "analista_receber",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "cobranca_firme"
     },
     {
      "tipo": "notificar",
      "para": "CFO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (régua de cobrança D+1, D+7, D+15)"
   },
   {
    "id": "FIN_LIQUIDADA_SEM_COMPROVANTE",
    "titulo": "Título liquidado sem comprovante bancário",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "conta",
     "campo": "comprovante_ref",
     "filtros": [
      {
       "campo": "estado",
       "igual": "liquidada"
      }
     ]
    },
    "mensagem": "O título '{{titulo}}' foi marcado como liquidado sem comprovante bancário. Nota fiscal não comprova pagamento nem recebimento.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Anexar comprovante bancário ou reabrir o título",
      "papel": "controller",
      "prazo_dias": 2
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (conciliação bancária); coerente com Política V1.1 sec.5 (valores efetivamente recebidos)"
   },
   {
    "id": "FIN_NOTA_SEM_XML",
    "titulo": "Nota fiscal sem XML arquivado",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "documento_fiscal",
     "campo": "xml_ref",
     "filtros": [
      {
       "campo": "estado",
       "diferente": "cancelado"
      },
      {
       "campo": "tipo_documento",
       "em": [
        "NF-e (produto)",
        "NFS-e (serviço)",
        "CT-e (frete)",
        "Nota de devolução",
        "Nota de importação"
       ]
      }
     ]
    },
    "mensagem": "A nota '{{titulo}}' não tem XML arquivado. Sem XML o fechamento e o envio ao contador ficam incompletos.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Obter e arquivar o XML da nota",
      "papel": "analista_fiscal",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "solicitacao_documento_fornecedor"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (guarda de documentos fiscais; prazos legais a validar com o contador)"
   },
   {
    "id": "FIN_NOTA_DIVERGENTE_PARADA",
    "titulo": "Divergência de nota sem solução",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "documento_fiscal",
     "filtros": [
      {
       "campo": "estado",
       "igual": "divergente"
      }
     ],
     "dias": 3,
     "data_campo": "atualizado_em"
    },
    "mensagem": "A nota '{{titulo}}' está divergente há {{dias}} dias sem solução. Não pagar até resolver.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Cobrar do fornecedor carta de correção, nota substituta ou abatimento",
      "papel": "analista_fiscal",
      "prazo_dias": 2
     },
     {
      "tipo": "rascunho",
      "modelo": "solicitacao_documento_fornecedor"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (conferência de três vias)"
   },
   {
    "id": "FIN_FECHAMENTO_ATRASADO",
    "titulo": "Fechamento mensal atrasado",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "fechamento",
     "campo": "data_limite",
     "filtros": [],
     "antecedencia_dias": 0
    },
    "mensagem": "O fechamento '{{titulo}}' passou do 5º dia útil e ainda não foi concluído. A direção está sem os indicadores do mês.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Listar bloqueios do fechamento e concluir",
      "papel": "controller",
      "prazo_dias": 1
     },
     {
      "tipo": "notificar",
      "para": "CFO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (fechamento mensal em D+5)"
   },
   {
    "id": "FIN_INADIMPLENCIA_ACIMA_META",
    "titulo": "Inadimplência acima de 2% da receita",
    "severidade": "ALTO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "soma",
     "registro": "fechamento",
     "campo": "inadimplencia_pct",
     "filtros": [
      {
       "campo": "estado",
       "igual": "fechado"
      }
     ],
     "janela_dias": 25,
     "data_campo": "data_fechamento",
     "operador": ">",
     "valor": 2
    },
    "mensagem": "A inadimplência do último fechamento ficou em {{total}}% da receita, acima da meta de 2% da política.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Plano de cobrança dos maiores devedores e revisão das condições de pagamento",
      "papel": "analista_receber",
      "prazo_dias": 5
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "Política V1 sec.13"
   },
   {
    "id": "FIN_RESERVA_ABAIXO_3_MESES",
    "titulo": "Reserva de caixa abaixo de 3 meses de custos fixos",
    "severidade": "ALTO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "soma",
     "registro": "fechamento",
     "campo": "falta_para_reserva",
     "filtros": [
      {
       "campo": "estado",
       "igual": "fechado"
      }
     ],
     "janela_dias": 25,
     "data_campo": "data_fechamento",
     "operador": ">",
     "valor": 0
    },
    "mensagem": "Faltam R$ {{total}} para a reserva mínima desejada de 3 meses de custos fixos médios. Contas a receber não substituem a reserva.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Propor plano de recomposição da reserva à direção",
      "papel": "controller",
      "prazo_dias": 7
     },
     {
      "tipo": "rascunho",
      "modelo": "alerta_reserva"
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "Política V1 sec.12"
   },
   {
    "id": "FIN_ABAIXO_MARGEM_ACIMA_10",
    "titulo": "Projetos abaixo de 30% de margem acima de 10% do faturamento",
    "severidade": "ALTO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "soma",
     "registro": "fechamento",
     "campo": "abaixo_margem_pct",
     "filtros": [
      {
       "campo": "estado",
       "igual": "fechado"
      }
     ],
     "janela_dias": 25,
     "data_campo": "data_fechamento",
     "operador": ">",
     "valor": 10
    },
    "mensagem": "Projetos com margem abaixo de 30% representaram {{total}}% do faturamento no último fechamento, acima do limite de 10% da política.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Listar os projetos abaixo de 30% e as exceções que os aprovaram",
      "papel": "controller",
      "prazo_dias": 3
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "Política V1 sec.13"
   }
  ],
  "modelos": [
   {
    "id": "lembrete_vencimento",
    "tipo": "whatsapp",
    "assunto": "Lembrete de vencimento",
    "corpo": "Olá! Aqui é do financeiro da VOICE Ambientes Inteligentes. Passando só para lembrar que o título '{{titulo}}' vence em breve. Se já estiver programado, pode desconsiderar. Qualquer dúvida, estou à disposição. — {{responsavel}}"
   },
   {
    "id": "cobranca_vencido",
    "tipo": "email",
    "assunto": "VOICE — pagamento pendente: {{titulo}}",
    "corpo": "Olá,\n\nNão identificamos em nosso extrato o pagamento referente a '{{titulo}}', com vencimento recente. Pode ser apenas um desencontro de datas; se o pagamento já foi feito, por gentileza nos envie o comprovante para localizarmos.\n\nCaso precise de uma nova data ou de outra forma de pagamento, conte conosco para combinar.\n\nAtenciosamente,\n{{responsavel}}\nFinanceiro — VOICE Ambientes Inteligentes"
   },
   {
    "id": "cobranca_firme",
    "tipo": "email",
    "assunto": "VOICE — regularização de pagamento em atraso: {{titulo}}",
    "corpo": "Olá,\n\nRetomamos o contato sobre '{{titulo}}', que segue em aberto há {{dias}} dias sem retorno. Precisamos regularizar esta pendência para manter o atendimento e o suporte técnico programados.\n\nPedimos, por gentileza, o pagamento ou uma proposta de data até o fim desta semana. Se houver qualquer questão sobre o serviço prestado, nos avise para que a equipe técnica verifique.\n\nAtenciosamente,\n{{responsavel}}\nFinanceiro — VOICE Ambientes Inteligentes"
   },
   {
    "id": "solicitacao_documento_fornecedor",
    "tipo": "email",
    "assunto": "Documento fiscal pendente ou divergente — {{titulo}}",
    "corpo": "Olá,\n\nSobre a nota '{{titulo}}', precisamos de:\n- o arquivo XML (e o PDF/DANFE), e/ou\n- a correção da divergência encontrada na conferência com o pedido e o recebimento dos equipamentos.\n\nO pagamento fica programado após a regularização. Obrigado,\n{{responsavel}}\nFinanceiro — VOICE Ambientes Inteligentes"
   },
   {
    "id": "pacote_fechamento",
    "tipo": "documento",
    "assunto": "Fechamento mensal — {{titulo}}",
    "corpo": "FECHAMENTO MENSAL — {{titulo}} (estado corrente)\n\nConciliação bancária: {{conciliacao_bancaria}} | Diferença não explicada: {{diferenca_nao_explicada}}\n\nINDICADORES DA POLÍTICA V1 sec.13\nFaturamento: {{faturamento}}\nReceita líquida: {{receita_liquida}}\nMargem de contribuição consolidada: {{margem_consolidada_pct}}% (alvo 35%, mínimo 30%)\nMargem operacional: {{margem_operacional_pct}}% (meta 12% a 15% ou superior)\nTicket médio: {{ticket_medio}} (desejado R$ 100 mil)\nPrazo médio de recebimento: {{prazo_medio_recebimento}} dias\nInadimplência: {{inadimplencia_pct}}% (meta < 2%)\nContas a receber: {{contas_receber_total}} | Contas a pagar: {{contas_pagar_total}}\nNecessidade de caixa 30/60/90: {{necessidade_caixa_30}} / {{necessidade_caixa_60}} / {{necessidade_caixa_90}}\nReserva: {{reserva_caixa}} | Falta para 3 meses: {{falta_para_reserva}}\nConcentração maior cliente: {{concentracao_cliente_pct}}% | maior parceiro: {{concentracao_parceiro_pct}}%\nProjetos abaixo de 30% de margem: {{abaixo_margem_pct}}% do faturamento (limite 10%)\nExposição por projeto e margem por projeto: ver telas de projeto e caixa do VEOS.\n\nPARECER DO CFO\n{{parecer}}"
   },
   {
    "id": "alerta_reserva",
    "tipo": "documento",
    "assunto": "Reserva de caixa abaixo do mínimo desejado",
    "corpo": "Para: Direção Geral\n\nNo fechamento '{{titulo}}', a reserva financeira ficou abaixo de 3 meses de custos fixos médios (Política V1 sec.12). Faltam {{total}}.\n\nOpções para recomposição (PROPOSTA, a decidir pela direção):\n1. Destinar parte da margem dos próximos recebimentos à reserva;\n2. Revisar custos fixos não essenciais;\n3. Reforçar a cobrança dos vencidos;\n4. Rever condições de recebimento de novos projetos conforme a referência 50/40/10 (Política V1 sec.10).\n\n{{responsavel}}"
   },
   {
    "id": "whatsapp_lembrete_boleto",
    "tipo": "whatsapp",
    "assunto": "Lembrete de vencimento",
    "corpo": "Olá, {{cliente}}! Passando para lembrar que a parcela {{parcela}} do seu projeto, no valor de {{valor}}, vence em {{vencimento}}. Se já pagou, desconsidere esta mensagem. Qualquer dúvida, estou à disposição."
   }
  ],
  "documentos": [
   "Fluxo de caixa de 13 semanas (estado corrente, com simulações pro forma em aba separada)",
   "Checklist de fechamento mensal D-2 a D+5",
   "Relatório de conciliação bancária com diferenças classificadas",
   "Aging de contas a receber e a pagar",
   "Pacote mensal dos 15 indicadores da Política V1 sec.13",
   "Pasta de XML e PDF de notas fiscais por competência",
   "Régua de cobrança e modelos de mensagem",
   "Cálculo da reserva de caixa (3 meses de custos fixos médios)"
  ],
  "relacoes": [
   {
    "setor": "direcao",
    "fluxo": "Entrega o fechamento mensal, os indicadores da Política V1 sec.13 e a análise de margem e exposição de cada pedido de alçada; recebe decisões registradas."
   },
   {
    "setor": "vendas",
    "fluxo": "Recebe propostas para conferência de margem pela fórmula oficial e condições de pagamento; informa clientes com atraso recorrente."
   },
   {
    "setor": "operacoes",
    "fluxo": "Recebe pedidos de compra e recebimentos de equipamentos para a conferência de três vias; informa cobertura da fase antes de compra relevante (Política V1 sec.10)."
   },
   {
    "setor": "posvenda",
    "fluxo": "Recebe contratos de suporte e monitoramento para faturamento recorrente; informa inadimplência que afeta o atendimento."
   },
   {
    "setor": "pessoas",
    "fluxo": "Recebe variáveis da folha, pró-labore e contratos de prestadores para programação de pagamentos."
   },
   {
    "setor": "secretaria",
    "fluxo": "Recebe documentos e correspondências de cobrança, boletos e notas que chegam por e-mail ou correio."
   }
  ],
  "fontes": [
   {
    "titulo": "Política de Saúde Financeira da VOICE — V1 (sec.2, 3, 4, 5, 6, 7, 10, 12, 13, 15)",
    "tipo": "norma",
    "ref": "04 - PADROES/VOICE - Politica de Saude Financeira - V1.md"
   },
   {
    "titulo": "Política de Saúde Financeira da VOICE — V1.1 (sec.5, 7, 9, 10)",
    "tipo": "norma",
    "ref": "04 - PADROES/VOICE - Politica de Saude Financeira - V1.1 - Clarificacao de posicao e exposicao de caixa.md"
   },
   {
    "titulo": "Skill close-management (checklist e dependências do fechamento)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/finance/skills/close-management/SKILL.md"
   },
   {
    "titulo": "Skill reconciliation (conciliação bancária e classificação de diferenças)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/finance/skills/reconciliation/SKILL.md"
   },
   {
    "titulo": "Skill cash-flow-snapshot (previsão 30/60/90 dias a partir do saldo real)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/cash-flow-snapshot/SKILL.md"
   },
   {
    "titulo": "Skill ap-processor (três vias, deduplicação e dois portões de aprovação)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/ap-processor/SKILL.md"
   },
   {
    "titulo": "Skill invoice-chase (cobrança com tom ajustado ao histórico do cliente)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/invoice-chase/SKILL.md"
   },
   {
    "titulo": "Skill close-month (fechar antes de projetar)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/close-month/SKILL.md"
   },
   {
    "titulo": "Fluxo de caixa de 13 semanas",
    "tipo": "metodo",
    "ref": "Prática de tesouraria e reestruturação (13-week cash flow)"
   }
  ]
 },
 {
  "id": "vendas",
  "sigla": "CSO",
  "nome": "Comercial",
  "missao": "Transformar indicações de arquitetos, clientes e parceiros em projetos de automação premium bem vendidos: escopo certo, margem dentro da Política e passagem limpa para Operações e Financeiro.",
  "cor": "gold",
  "diretor": {
   "titulo": "Diretor Comercial (CSO)",
   "nome": "Eduardo Albuquerque Meirelles",
   "perfil": "Persona fictícia criada para o VEOS — não representa pessoa real. Construiu carreira vendendo projetos complexos de engenharia e tecnologia para residências de alto padrão e escritórios corporativos, sempre com arquitetos no centro da indicação. Estilo consultivo, calmo e orientado a número: prefere perder uma venda a vender abaixo da margem.",
   "especialidades": [
    "Venda consultiva de projetos de automação, redes, áudio e vídeo e segurança para alto padrão",
    "Relacionamento e programa de indicação com arquitetos, designers de interiores e construtoras",
    "Gestão de pipeline, previsão de vendas e cadência de prospecção ativa",
    "Negociação com proteção de margem de contribuição"
   ],
   "metodos": [
    {
     "nome": "SPIN Selling",
     "autor": "Neil Rackham",
     "uso": "Roteiro da visita técnica/briefing: perguntas de Situação (planta, fase da obra, sistemas existentes), Problema (Wi-Fi que não cobre a casa, controles demais, segurança frágil), Implicação (retrabalho em obra pronta, quebrar gesso, casa que não conversa) e Necessidade de solução (como seria o dia a dia ideal)."
    },
    {
     "nome": "Predictable Revenue (Cold Calling 2.0)",
     "autor": "Aaron Ross e Marylou Tyler",
     "uso": "Separa prospecção (SDR) de fechamento (consultor), com cadência diária de contatos personalizados para escritórios de arquitetura, construtoras e clientes antigos, e métricas de entrada do funil."
    },
    {
     "nome": "The Challenger Sale",
     "autor": "Matthew Dixon e Brent Adamson",
     "uso": "Ensinar algo novo ao cliente e ao arquiteto (por exemplo, por que a infraestrutura de rede deve ser decidida na fase de alvenaria) e conduzir a conversa para o escopo correto em vez de apenas responder a orçamentos."
    },
    {
     "nome": "Plano de ação mútuo (Mutual Action Plan)",
     "autor": "Prática consagrada de vendas complexas B2B/B2C de alto valor",
     "uso": "Em negociações acima do ticket desejado, datas combinadas com cliente e arquiteto até a assinatura: revisão de projeto, aprovação do arquiteto, condição de pagamento e início da fase de infraestrutura."
    }
   ],
   "principios": [
    "Quem indica é cliente também: todo arquiteto parceiro recebe retorno sobre a indicação em até 48 horas.",
    "Não se analisa desconto isoladamente: todo desconto recalcula a margem do projeto (Política V1 sec.9).",
    "Antes de reduzir preço, negociar escopo, equipamento, condição de pagamento, benefício e fase (Política V1 sec.9).",
    "Ticket desejado de R$ 100 mil é meta, não bloqueio; exceção abaixo dele é registrada (Política V1 sec.2).",
    "Aprovação comercial não substitui aprovação financeira (Política V1 sec.14).",
    "Pipeline vazio é problema de hoje, não do mês que vem: prospecção é rotina diária."
   ],
   "como_aconselha": "Direto e com números. Começa pelo estado do pipeline e da margem, aponta o risco principal e termina com as três próximas ações, cada uma com responsável e data. Diferencia sempre o que é Política oficial do que é proposta.",
   "perguntas_chave": [
    "Quantas oportunidades ganhamos nos últimos 30 dias e quanto do pipeline aberto fecha nos próximos 60?",
    "Quais arquitetos indicaram nos últimos 90 dias e quais sumiram?",
    "Alguma proposta está na faixa ATENÇÃO (25% a 29,99%) sem justificativa registrada?",
    "Estamos entrando nas obras na fase certa (infraestrutura) ou chegando tarde, com a obra pronta?",
    "Quais clientes antigos têm potencial de ampliação ou atualização de sistema?"
   ],
   "limites": [
    "Não aprova margem entre 25% e 29,99%: exige autorização expressa da direção com justificativa registrada (Política V1 sec.3 e sec.8).",
    "Não aprova operação com margem abaixo de 25% como venda normal; qualquer aprovação é extraordinária da direção (Política V1 sec.8).",
    "Desconto acima de 2%, ou que leve a margem abaixo de 32%, sai da autonomia comercial; acima de 2% até 5% exige a direção; acima de 5% exige nova análise financeira integral (Política V1 sec.9).",
    "Não altera a condição de recebimento de referência (50% / 40% / 10%) sem alinhar com Finanças (Política V1 sec.10).",
    "Não define percentual de comissão ou reserva técnica de parceiros sem aprovação da direção."
   ]
  },
  "equipe": [
   {
    "papel": "sdr",
    "nome": "Pré-vendas / prospecção (SDR)",
    "reporta_a": "CSO",
    "responsabilidades": [
     "Responder leads novos no mesmo dia útil e qualificar (perfil do imóvel, fase da obra, decisor, arquiteto envolvido).",
     "Executar a cadência diária de prospecção ativa em escritórios de arquitetura, construtoras e base de clientes antigos.",
     "Agendar visitas técnicas/briefings para o consultor.",
     "Manter lead e parceiro atualizados no VEOS."
    ],
    "indicadores": [
     "leads_novos",
     "tempo_primeira_resposta",
     "taxa_qualificacao"
    ]
   },
   {
    "papel": "consultor",
    "nome": "Consultor de projetos (executivo de vendas)",
    "reporta_a": "CSO",
    "responsabilidades": [
     "Conduzir visita técnica e briefing com roteiro SPIN.",
     "Conduzir proposta, negociação e fechamento seguindo a ordem de negociação da Política.",
     "Manter próximo passo e data em cada oportunidade aberta.",
     "Fazer a passagem formal do projeto ganho para Operações e Financeiro."
    ],
    "indicadores": [
     "taxa_conversao_proposta",
     "ticket_medio",
     "margem_media_propostas",
     "ciclo_venda"
    ]
   },
   {
    "papel": "projetista",
    "nome": "Projetista de pré-venda / orçamentista",
    "reporta_a": "CSO",
    "responsabilidades": [
     "Transformar o briefing em projeto preliminar (pontos, infraestrutura, equipamentos, programação).",
     "Montar a planilha de custos diretos e a margem de contribuição conforme a fórmula oficial (Política V1 sec.4 e sec.5), incluindo provisão de risco de 2% (sec.6).",
     "Propor alternativas de escopo e equipamento antes de qualquer desconto."
    ],
    "indicadores": [
     "margem_media_propostas",
     "vendas_abaixo_30"
    ]
   },
   {
    "papel": "gestor_parceiros",
    "nome": "Gestor de relacionamento com parceiros",
    "reporta_a": "CSO",
    "responsabilidades": [
     "Manter a carteira de arquitetos, designers e construtoras classificada (A/B/C) e com contato periódico.",
     "Dar retorno ao parceiro sobre cada indicação e sobre o andamento do projeto.",
     "Organizar, com Marketing, visitas ao showroom e encontros com escritórios.",
     "Acompanhar concentração de vendas por parceiro."
    ],
    "indicadores": [
     "indicacoes_parceiros"
    ]
   },
   {
    "papel": "assistente_comercial",
    "nome": "Assistente comercial",
    "reporta_a": "CSO",
    "responsabilidades": [
     "Formatar e enviar propostas, controlar versões e validade.",
     "Reunir documentos de fechamento (contrato, dados do cliente, condição de pagamento).",
     "Montar o dossiê de passagem para Operações e Financeiro."
    ],
    "indicadores": [
     "ciclo_venda"
    ]
   }
  ],
  "processos": [
   {
    "id": "funil_projetos",
    "nome": "Funil de projetos",
    "descricao": "Do primeiro contato até a passagem do projeto ganho para Operações e Financeiro. Cada etapa tem critério de saída objetivo, para que o pipeline reflita a realidade.",
    "etapas": [
     {
      "id": "prospeccao",
      "nome": "Prospecção e entrada de lead",
      "responsavel": "sdr",
      "criterio_saida": "Lead registrado com origem, contato, tipo de imóvel e parceiro indicador (se houver), respondido no mesmo dia útil."
     },
     {
      "id": "qualificacao",
      "nome": "Qualificação",
      "responsavel": "sdr",
      "criterio_saida": "Perfil compatível com projeto premium, fase da obra conhecida, decisor identificado e visita/briefing agendado; ou lead desqualificado com motivo."
     },
     {
      "id": "visita_briefing",
      "nome": "Visita técnica / briefing",
      "responsavel": "consultor",
      "criterio_saida": "Briefing SPIN registrado (sistemas desejados, ambientes, rotina da família, restrições do arquiteto), plantas recebidas e expectativa de investimento conversada."
     },
     {
      "id": "projeto_proposta",
      "nome": "Projeto preliminar e proposta",
      "responsavel": "projetista",
      "criterio_saida": "Proposta com margem calculada pela fórmula oficial, faixa de margem classificada, condição de pagamento de referência e, se fora da faixa normal, aprovação da direção registrada; proposta enviada."
     },
     {
      "id": "negociacao",
      "nome": "Negociação",
      "responsavel": "consultor",
      "criterio_saida": "Objeções tratadas na ordem da Política (escopo, equipamento, pagamento, benefício, fase e só depois preço), margem recalculada a cada concessão e aceite verbal do cliente."
     },
     {
      "id": "fechamento",
      "nome": "Fechamento",
      "responsavel": "consultor",
      "criterio_saida": "Contrato assinado e entrada (referência 50%) confirmada com Finanças; oportunidade marcada como ganha com data de ganho."
     },
     {
      "id": "passagem",
      "nome": "Passagem para Operações e Financeiro",
      "responsavel": "assistente_comercial",
      "criterio_saida": "Reunião de passagem feita; dossiê com escopo vendido, plantas, contatos do arquiteto e da obra, cronograma de fases e plano de recebimento entregue; data de passagem registrada."
     }
    ]
   },
   {
    "id": "prospeccao_ativa",
    "nome": "Prospecção ativa e reativação",
    "descricao": "Motor de geração de demanda próprio do Comercial, independente de campanhas: base de arquitetos/parceiros, construtoras com obras em andamento e clientes antigos com potencial de ampliação ou atualização.",
    "etapas": [
     {
      "id": "lista",
      "nome": "Montar a lista da semana",
      "responsavel": "sdr",
      "criterio_saida": "Lista com pelo menos 20 contatos: parceiros sem contato recente, construtoras com lançamentos e clientes com projeto entregue há mais de 2 anos."
     },
     {
      "id": "abordagem",
      "nome": "Abordagem personalizada",
      "responsavel": "sdr",
      "criterio_saida": "Mensagem enviada citando algo concreto (projeto anterior, obra em andamento, novidade tecnológica relevante), registrada no lead ou no parceiro."
     },
     {
      "id": "cadencia",
      "nome": "Cadência de acompanhamento",
      "responsavel": "sdr",
      "criterio_saida": "Até 4 toques em 3 semanas alternando WhatsApp, e-mail e ligação; resposta positiva vira lead qualificado ou visita agendada."
     },
     {
      "id": "retorno_parceiro",
      "nome": "Retorno ao parceiro",
      "responsavel": "gestor_parceiros",
      "criterio_saida": "Parceiro informado do resultado da indicação e próximo contato agendado."
     }
    ]
   },
   {
    "id": "aprovacao_margem_desconto",
    "nome": "Aprovação de margem e desconto",
    "descricao": "Aplicação literal das seções 3, 8 e 9 da Política de Saúde Financeira V1. Nenhuma proposta fora da faixa normal é enviada sem registro de aprovação e justificativa.",
    "etapas": [
     {
      "id": "calculo",
      "nome": "Cálculo da margem",
      "responsavel": "projetista",
      "criterio_saida": "Margem de contribuição calculada sobre a receita líquida, com custos diretos e provisão de 2%, e faixa classificada (VERDE, ACEITÁVEL, ATENÇÃO, NÃO APROVADO)."
     },
     {
      "id": "enquadramento",
      "nome": "Enquadramento de desconto",
      "responsavel": "consultor",
      "criterio_saida": "Faixa de desconto registrada: até 2% com margem ≥ 32% (autonomia comercial); acima de 2% até 5% ou margem < 30% (direção); acima de 5% (nova análise financeira integral)."
     },
     {
      "id": "aprovacao",
      "nome": "Aprovação da direção quando exigida",
      "responsavel": "consultor",
      "criterio_saida": "Nome de quem aprovou, justificativa e impacto financeiro registrados na proposta (Política V1 sec.14)."
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "lead",
    "nome": "Lead",
    "descricao": "Contato ainda não qualificado: indicação de arquiteto, cliente antigo, visitante do showroom, formulário do site ou prospecção ativa.",
    "responsavel": "sdr",
    "estados": [
     "novo",
     "em_contato",
     "qualificado",
     "desqualificado",
     "convertido"
    ],
    "estado_inicial": "novo",
    "estados_finais": [
     "desqualificado",
     "convertido"
    ],
    "campos": [
     {
      "id": "nome_contato",
      "rotulo": "Nome do contato",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "telefone",
      "rotulo": "Telefone / WhatsApp",
      "tipo": "telefone",
      "obrigatorio": true
     },
     {
      "id": "email",
      "rotulo": "E-mail",
      "tipo": "email",
      "obrigatorio": false
     },
     {
      "id": "origem",
      "rotulo": "Origem",
      "tipo": "opcao",
      "opcoes": [
       "indicacao_arquiteto",
       "indicacao_designer",
       "indicacao_construtora",
       "indicacao_cliente",
       "cliente_antigo_reativacao",
       "prospeccao_ativa",
       "site",
       "instagram",
       "showroom_evento",
       "outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "parceiro_indicador",
      "rotulo": "Parceiro indicador",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "tipo_imovel",
      "rotulo": "Tipo de imóvel",
      "tipo": "opcao",
      "opcoes": [
       "casa_alto_padrao",
       "apartamento_alto_padrao",
       "casa_campo_praia",
       "escritorio_corporativo",
       "comercial_varejo",
       "hotelaria_restaurante",
       "outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "fase_obra",
      "rotulo": "Fase da obra",
      "tipo": "opcao",
      "opcoes": [
       "projeto_arquitetonico",
       "fundacao_estrutura",
       "alvenaria_infraestrutura",
       "acabamento",
       "pronto_reforma"
      ],
      "obrigatorio": false
     },
     {
      "id": "cidade",
      "rotulo": "Cidade / bairro",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "interesse",
      "rotulo": "Sistemas de interesse",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "motivo_desqualificacao",
      "rotulo": "Motivo da desqualificação",
      "tipo": "opcao",
      "opcoes": [
       "fora_do_perfil",
       "fora_da_regiao",
       "sem_orcamento",
       "so_produto_avulso",
       "sem_resposta",
       "outro"
      ],
      "obrigatorio": false
     },
     {
      "id": "proximo_contato",
      "rotulo": "Próximo contato",
      "tipo": "data",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "oportunidade",
    "nome": "Oportunidade de projeto",
    "descricao": "Projeto em negociação com cliente qualificado, da visita técnica ao ganho ou perda.",
    "responsavel": "consultor",
    "estados": [
     "qualificacao",
     "visita",
     "projeto",
     "proposta",
     "negociacao",
     "ganha",
     "perdida"
    ],
    "estado_inicial": "qualificacao",
    "estados_finais": [
     "ganha",
     "perdida"
    ],
    "campos": [
     {
      "id": "cliente_nome",
      "rotulo": "Cliente",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "parceiro_indicador",
      "rotulo": "Arquiteto / parceiro envolvido",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "tipo_imovel",
      "rotulo": "Tipo de imóvel",
      "tipo": "opcao",
      "opcoes": [
       "casa_alto_padrao",
       "apartamento_alto_padrao",
       "casa_campo_praia",
       "escritorio_corporativo",
       "comercial_varejo",
       "hotelaria_restaurante",
       "outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "fase_obra",
      "rotulo": "Fase da obra",
      "tipo": "opcao",
      "opcoes": [
       "projeto_arquitetonico",
       "fundacao_estrutura",
       "alvenaria_infraestrutura",
       "acabamento",
       "pronto_reforma"
      ],
      "obrigatorio": true
     },
     {
      "id": "escopo_sistemas",
      "rotulo": "Escopo de sistemas (briefing)",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "valor_estimado",
      "rotulo": "Valor estimado do projeto",
      "tipo": "dinheiro",
      "obrigatorio": true
     },
     {
      "id": "decisor_identificado",
      "rotulo": "Decisor identificado",
      "tipo": "sim_nao",
      "obrigatorio": false
     },
     {
      "id": "data_visita",
      "rotulo": "Data da visita técnica",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "proximo_passo",
      "rotulo": "Próximo passo",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "data_proximo_passo",
      "rotulo": "Data do próximo passo",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_prevista_fechamento",
      "rotulo": "Previsão de fechamento",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "data_ganho",
      "rotulo": "Data do ganho",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "motivo_perda",
      "rotulo": "Motivo da perda",
      "tipo": "opcao",
      "opcoes": [
       "preco",
       "concorrente",
       "escopo_reduzido_pelo_cliente",
       "obra_adiada",
       "arquiteto_indicou_outro",
       "sem_retorno",
       "margem_inviavel",
       "outro"
      ],
      "obrigatorio": false
     },
     {
      "id": "data_passagem",
      "rotulo": "Data da passagem para Operações e Financeiro",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "excecao_ticket",
      "rotulo": "Justificativa de exceção ao ticket desejado",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "proposta",
    "nome": "Proposta comercial",
    "descricao": "Versão de proposta de uma oportunidade, com margem de contribuição, desconto e aprovações conforme a Política V1.",
    "responsavel": "projetista",
    "estados": [
     "rascunho",
     "analise_margem",
     "aguardando_direcao",
     "enviada",
     "revisao",
     "aceita",
     "recusada"
    ],
    "estado_inicial": "rascunho",
    "estados_finais": [
     "aceita",
     "recusada"
    ],
    "campos": [
     {
      "id": "oportunidade_ref",
      "rotulo": "Oportunidade",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "versao",
      "rotulo": "Versão",
      "tipo": "numero",
      "obrigatorio": true
     },
     {
      "id": "valor_bruto",
      "rotulo": "Valor bruto vendido",
      "tipo": "dinheiro",
      "obrigatorio": true
     },
     {
      "id": "desconto_percentual",
      "rotulo": "Desconto (%)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "faixa_desconto",
      "rotulo": "Faixa de desconto (Política sec.9)",
      "tipo": "opcao",
      "opcoes": [
       "sem_desconto",
       "ate_2_autonomia",
       "acima_2_ate_5_direcao",
       "acima_5_analise_integral"
      ],
      "obrigatorio": true
     },
     {
      "id": "margem_contribuicao_percentual",
      "rotulo": "Margem de contribuição (%)",
      "tipo": "numero",
      "obrigatorio": true
     },
     {
      "id": "faixa_margem",
      "rotulo": "Faixa de margem (Política sec.3)",
      "tipo": "opcao",
      "opcoes": [
       "VERDE",
       "ACEITAVEL",
       "ATENCAO",
       "NAO_APROVADO"
      ],
      "obrigatorio": true
     },
     {
      "id": "aprovacao_direcao",
      "rotulo": "Aprovação da direção",
      "tipo": "opcao",
      "opcoes": [
       "nao_necessaria",
       "pendente",
       "aprovada",
       "negada"
      ],
      "obrigatorio": true
     },
     {
      "id": "aprovado_por",
      "rotulo": "Aprovado por",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "justificativa_excecao",
      "rotulo": "Justificativa e impacto financeiro da exceção",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "condicao_pagamento",
      "rotulo": "Condição de pagamento",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "data_envio",
      "rotulo": "Data de envio",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "validade",
      "rotulo": "Validade da proposta",
      "tipo": "data",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "parceiro",
    "nome": "Parceiro indicador",
    "descricao": "Arquiteto, designer de interiores, construtora ou engenheiro que indica clientes e influencia a especificação.",
    "responsavel": "gestor_parceiros",
    "estados": [
     "prospectado",
     "ativo",
     "inativo",
     "encerrado"
    ],
    "estado_inicial": "prospectado",
    "estados_finais": [
     "encerrado"
    ],
    "campos": [
     {
      "id": "tipo_parceiro",
      "rotulo": "Tipo de parceiro",
      "tipo": "opcao",
      "opcoes": [
       "arquiteto",
       "designer_interiores",
       "construtora",
       "incorporadora",
       "engenheiro",
       "outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "escritorio",
      "rotulo": "Escritório / empresa",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "contato",
      "rotulo": "Pessoa de contato",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "telefone",
      "rotulo": "Telefone / WhatsApp",
      "tipo": "telefone",
      "obrigatorio": false
     },
     {
      "id": "email",
      "rotulo": "E-mail",
      "tipo": "email",
      "obrigatorio": false
     },
     {
      "id": "nivel",
      "rotulo": "Nível (A/B/C)",
      "tipo": "opcao",
      "opcoes": [
       "A",
       "B",
       "C"
      ],
      "obrigatorio": true
     },
     {
      "id": "ultimo_contato",
      "rotulo": "Último contato",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "proximo_contato",
      "rotulo": "Próximo contato",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "indicacoes_12m",
      "rotulo": "Indicações nos últimos 12 meses",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "acordo_comissao",
      "rotulo": "Acordo de comissão / reserva técnica (aprovado pela direção)",
      "tipo": "texto",
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "prospeccao_diaria",
    "nome": "Bloco diário de prospecção",
    "frequencia": "diaria",
    "responsavel": "sdr",
    "passos": [
     "Responder todos os leads em estado novo antes das 10h.",
     "Fazer pelo menos 10 contatos ativos da lista da semana (parceiros, construtoras, clientes antigos).",
     "Registrar cada toque e marcar o próximo contato.",
     "Agendar visitas técnicas na agenda do consultor."
    ]
   },
   {
    "id": "revisao_pipeline_semanal",
    "nome": "Revisão semanal do pipeline",
    "frequencia": "semanal",
    "responsavel": "CSO",
    "passos": [
     "Conferir valor aberto por etapa e cobertura em relação à meta do período.",
     "Revisar oportunidades sem atualização há mais de 14 dias e próximos passos vencidos.",
     "Revisar propostas enviadas sem retorno e definir o follow-up de cada uma.",
     "Confirmar previsão de fechamento dos próximos 30 dias (compromisso x melhor cenário).",
     "Definir as 3 prioridades da semana por consultor."
    ]
   },
   {
    "id": "comite_margem",
    "nome": "Comitê de margem e desconto",
    "frequencia": "semanal",
    "responsavel": "CSO",
    "passos": [
     "Listar propostas em ATENÇÃO ou NÃO APROVADO e descontos acima de 2%.",
     "Verificar se a ordem de negociação da Política sec.9 foi seguida antes do desconto.",
     "Levar à direção as que exigem autorização, com justificativa e impacto financeiro.",
     "Registrar a decisão na proposta (aprovado por, justificativa)."
    ]
   },
   {
    "id": "agenda_parceiros",
    "nome": "Agenda de relacionamento com parceiros",
    "frequencia": "semanal",
    "responsavel": "gestor_parceiros",
    "passos": [
     "Contatar os parceiros nível A sem contato há mais de 30 dias.",
     "Dar retorno de todas as indicações da semana.",
     "Convidar 2 escritórios para visita ao showroom ou apresentação técnica (com Marketing).",
     "Atualizar nível e próximo contato de cada parceiro."
    ]
   },
   {
    "id": "reativacao_base",
    "nome": "Reativação de clientes antigos",
    "frequencia": "mensal",
    "responsavel": "sdr",
    "passos": [
     "Selecionar clientes com projeto entregue há mais de 24 meses e indicações recebidas do Pós-venda.",
     "Priorizar por valor histórico e potencial (atualização de rede Wi-Fi, novos ambientes, segurança, áudio).",
     "Enviar mensagem de reativação sem oferta agressiva, reconhecendo o tempo sem contato.",
     "Converter respostas positivas em lead com origem cliente_antigo_reativacao."
    ]
   },
   {
    "id": "previsao_mensal",
    "nome": "Previsão de vendas e análise de ganhos e perdas",
    "frequencia": "mensal",
    "responsavel": "CSO",
    "passos": [
     "Consolidar vendas ganhas, ticket médio e margem média do mês.",
     "Analisar motivos de perda e padrões por origem e por parceiro.",
     "Verificar concentração de vendas por parceiro e percentual vendido abaixo de 30% de margem.",
     "Apresentar previsão dos próximos 90 dias à direção e a Finanças."
    ]
   }
  ],
  "indicadores": [
   {
    "id": "leads_novos",
    "nome": "Leads novos",
    "formula": "Quantidade de leads criados no período",
    "meta": "≥ 8 por semana",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "tempo_primeira_resposta",
    "nome": "Tempo até a primeira resposta",
    "formula": "Mediana das horas entre criação do lead e primeiro contato registrado",
    "meta": "≤ 4 horas úteis",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "taxa_qualificacao",
    "nome": "Taxa de qualificação",
    "formula": "Leads qualificados ou convertidos ÷ leads encerrados no período × 100",
    "meta": "≥ 40%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "taxa_conversao_proposta",
    "nome": "Conversão de proposta em venda",
    "formula": "Oportunidades ganhas ÷ oportunidades que chegaram a proposta no período × 100",
    "meta": "≥ 30%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "ticket_medio",
    "nome": "Ticket médio de projetos novos",
    "formula": "Soma do valor das oportunidades ganhas ÷ quantidade ganha",
    "meta": "≥ R$ 100.000,00 (meta desejada; não é bloqueio)",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "margem_media_propostas",
    "nome": "Margem de contribuição média das vendas",
    "formula": "Média ponderada pela receita líquida da margem de contribuição % das propostas aceitas",
    "meta": "≥ 35% (alvo); mínimo 30% para aprovação normal",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "vendas_abaixo_30",
    "nome": "Vendas abaixo de 30% de margem",
    "formula": "Faturamento de projetos com margem < 30% ÷ faturamento total do período × 100",
    "meta": "≤ 10% do faturamento",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "cobertura_pipeline",
    "nome": "Cobertura do pipeline",
    "formula": "Valor estimado das oportunidades abertas (visita a negociação) ÷ meta de vendas do próximo trimestre",
    "meta": "≥ 3×",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "ciclo_venda",
    "nome": "Ciclo de venda",
    "formula": "Mediana de dias entre criação da oportunidade e data do ganho",
    "meta": "≤ 60 dias",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "indicacoes_parceiros",
    "nome": "Indicações de parceiros",
    "formula": "Leads com origem indicação de arquiteto, designer ou construtora no período",
    "meta": "≥ 6 por mês",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   }
  ],
  "sentinelas": [
   {
    "id": "COM_SEM_VENDA_30D",
    "titulo": "Faltando venda: nenhuma oportunidade ganha em 30 dias",
    "severidade": "CRITICO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "oportunidade",
     "filtros": [
      {
       "campo": "estado",
       "igual": "ganha"
      }
     ],
     "janela_dias": 30,
     "data_campo": "data_ganho",
     "operador": "<",
     "valor": 1
    },
    "mensagem": "Faltando venda: {{total}} oportunidade(s) ganha(s) nos últimos 30 dias. Acionar prospecção em parceiros e clientes antigos e follow-up de todas as propostas abertas.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Prospecção emergencial: 20 contatos em arquitetos nível A/B e clientes antigos nesta semana",
      "papel": "sdr",
      "prazo_dias": 2
     },
     {
      "tipo": "tarefa",
      "titulo": "Follow-up de todas as propostas enviadas e negociações abertas",
      "papel": "consultor",
      "prazo_dias": 1
     },
     {
      "tipo": "tarefa",
      "titulo": "Ligar para os 5 parceiros que mais indicaram nos últimos 12 meses",
      "papel": "gestor_parceiros",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "email_parceiro_arquiteto"
     },
     {
      "tipo": "rascunho",
      "modelo": "reativacao_cliente_whatsapp"
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     },
     {
      "tipo": "notificar",
      "para": "CSO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Predictable Revenue: métricas de entrada do funil)"
   },
   {
    "id": "COM_PIPELINE_ABAIXO",
    "titulo": "Faltando venda: pipeline aberto abaixo do necessário",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "soma",
     "registro": "oportunidade",
     "campo": "valor_estimado",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "visita",
        "projeto",
        "proposta",
        "negociacao"
       ]
      }
     ],
     "janela_dias": 180,
     "data_campo": "criado_em",
     "operador": "<",
     "valor": 600000
    },
    "mensagem": "Pipeline aberto (oportunidades dos últimos 180 dias entre visita e negociação) soma R$ {{total}}, abaixo de R$ 600 mil (≈ 3× duas vendas de ticket desejado).",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Montar lista extra de 30 contatos (construtoras com obras em fase de infraestrutura e escritórios de arquitetura)",
      "papel": "sdr",
      "prazo_dias": 2
     },
     {
      "tipo": "tarefa",
      "titulo": "Revisar oportunidades em qualificação e agendar visitas técnicas",
      "papel": "consultor",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "email_parceiro_arquiteto"
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (cobertura de pipeline 3×; revisão de pipeline)"
   },
   {
    "id": "COM_LEAD_SEM_RESPOSTA",
    "titulo": "Lead novo sem resposta",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "lead",
     "filtros": [
      {
       "campo": "estado",
       "igual": "novo"
      }
     ],
     "dias": 1,
     "data_campo": "criado_em"
    },
    "mensagem": "O lead {{titulo}} está sem resposta há {{dias}} dia(s). Cliente de alto padrão que espera costuma chamar o próximo fornecedor.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Responder o lead hoje e propor horário de briefing",
      "papel": "sdr",
      "prazo_dias": 0
     },
     {
      "tipo": "rascunho",
      "modelo": "primeiro_contato_lead"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (speed-to-lead)"
   },
   {
    "id": "COM_PROPOSTA_SEM_FOLLOWUP",
    "titulo": "Proposta enviada sem follow-up",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "proposta",
     "filtros": [
      {
       "campo": "estado",
       "igual": "enviada"
      }
     ],
     "dias": 3,
     "data_campo": "atualizado_em"
    },
    "mensagem": "A proposta {{titulo}} está sem movimentação há {{dias}} dias.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Fazer follow-up da proposta e agendar reunião de apresentação com cliente e arquiteto",
      "papel": "consultor",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "followup_proposta"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (plano de ação mútuo)"
   },
   {
    "id": "COM_OPORTUNIDADE_PARADA",
    "titulo": "Oportunidade parada",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "oportunidade",
     "filtros": [
      {
       "campo": "estado",
       "nao_em": [
        "ganha",
        "perdida"
       ]
      }
     ],
     "dias": 14,
     "data_campo": "atualizado_em"
    },
    "mensagem": "A oportunidade {{titulo}} está sem atualização há {{dias}} dias. Definir próximo passo com data ou encerrar como perdida com motivo.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Atualizar próximo passo e data, ou encerrar com motivo de perda",
      "papel": "consultor",
      "prazo_dias": 2
     },
     {
      "tipo": "rascunho",
      "modelo": "followup_proposta"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (higiene de pipeline)"
   },
   {
    "id": "COM_MARGEM_EXIGE_DIRECAO",
    "titulo": "Propostas com margem abaixo de 30% aguardando a direção",
    "severidade": "ALTO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "proposta",
     "filtros": [
      {
       "campo": "faixa_margem",
       "em": [
        "ATENCAO",
        "NAO_APROVADO"
       ]
      },
      {
       "campo": "aprovacao_direcao",
       "igual": "pendente"
      }
     ],
     "janela_dias": 30,
     "data_campo": "criado_em",
     "operador": ">=",
     "valor": 1
    },
    "mensagem": "{{total}} proposta(s) com margem abaixo de 30% aguardando autorização expressa da direção. Não enviar ao cliente antes da decisão registrada.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Levar propostas em ATENÇÃO/NÃO APROVADO à direção com justificativa e impacto financeiro",
      "papel": "consultor",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "pedido_aprovacao_direcao"
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "Política V1 sec.3 e sec.8"
   },
   {
    "id": "COM_EXCECAO_SEM_JUSTIFICATIVA",
    "titulo": "Exceção de margem sem justificativa registrada",
    "severidade": "CRITICO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "proposta",
     "campo": "justificativa_excecao",
     "filtros": [
      {
       "campo": "faixa_margem",
       "em": [
        "ATENCAO",
        "NAO_APROVADO"
       ]
      }
     ]
    },
    "mensagem": "A proposta {{titulo}} está abaixo de 30% de margem e não tem justificativa registrada. Exceção sem registro não pode seguir.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Registrar justificativa, responsável pela autorização e impacto financeiro",
      "papel": "consultor",
      "prazo_dias": 1
     },
     {
      "tipo": "notificar",
      "para": "CSO"
     }
    ],
    "fonte": "Política V1 sec.8 e sec.14"
   },
   {
    "id": "COM_DESCONTO_SEM_APROVACAO",
    "titulo": "Desconto fora da autonomia comercial sem aprovação registrada",
    "severidade": "CRITICO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "proposta",
     "campo": "aprovado_por",
     "filtros": [
      {
       "campo": "faixa_desconto",
       "em": [
        "acima_2_ate_5_direcao",
        "acima_5_analise_integral"
       ]
      }
     ]
    },
    "mensagem": "A proposta {{titulo}} tem desconto acima de 2% sem registro de quem aprovou. Acima de 2% até 5% exige a direção; acima de 5% exige nova análise financeira integral.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Recalcular a margem com o desconto e obter aprovação da direção (ou nova análise financeira se > 5%)",
      "papel": "projetista",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "pedido_aprovacao_direcao"
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "Política V1 sec.9"
   },
   {
    "id": "COM_PASSAGEM_PENDENTE",
    "titulo": "Venda ganha sem passagem para Operações e Financeiro",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "oportunidade",
     "campo": "data_passagem",
     "filtros": [
      {
       "campo": "estado",
       "igual": "ganha"
      }
     ]
    },
    "mensagem": "A oportunidade {{titulo}} foi ganha e ainda não tem passagem registrada para Operações e Financeiro.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Montar dossiê de passagem e agendar reunião com Operações e Financeiro",
      "papel": "assistente_comercial",
      "prazo_dias": 2
     },
     {
      "tipo": "rascunho",
      "modelo": "dossie_passagem"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (handoff vendas → implantação)"
   },
   {
    "id": "COM_PARCEIRO_SEM_CONTATO",
    "titulo": "Parceiro ativo sem contato",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "parceiro",
     "filtros": [
      {
       "campo": "estado",
       "igual": "ativo"
      }
     ],
     "dias": 45,
     "data_campo": "ultimo_contato"
    },
    "mensagem": "O parceiro {{titulo}} está sem contato há {{dias}} dias. Parceiro esquecido indica outro fornecedor.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Contatar o parceiro com novidade relevante ou convite ao showroom",
      "papel": "gestor_parceiros",
      "prazo_dias": 5
     },
     {
      "tipo": "rascunho",
      "modelo": "email_parceiro_arquiteto"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (gestão de contas por nível)"
   }
  ],
  "modelos": [
   {
    "id": "primeiro_contato_lead",
    "tipo": "whatsapp",
    "assunto": "Primeiro contato com lead",
    "corpo": "Olá, {{nome_contato}}! Aqui é {{responsavel}}, da VOICE Ambientes Inteligentes. Recebemos seu contato sobre {{titulo}}. Para entender o projeto, pode me contar em que fase está a obra e se há arquiteto envolvido? Tenho horários para uma conversa de 20 minutos amanhã às 10h ou às 16h — qual fica melhor?"
   },
   {
    "id": "email_parceiro_arquiteto",
    "tipo": "email",
    "assunto": "Uma ideia para os seus próximos projetos",
    "corpo": "Olá, {{contato}},\n\nTudo bem? Aqui é {{responsavel}}, da VOICE.\n\nTemos visto muitas obras de alto padrão chegarem ao acabamento sem a infraestrutura de rede e automação prevista — e aí a solução passa por quebrar gesso ou aceitar Wi-Fi fraco e controles espalhados. Quando entramos na fase de alvenaria, o resultado fica invisível e o seu projeto de interiores fica preservado.\n\nPodemos marcar 30 minutos no seu escritório ou no nosso showroom para mostrar como trabalhamos junto com o arquiteto (pontos, acabamentos, cenas de iluminação)? Se tiver algum projeto em andamento, fazemos uma análise da infraestrutura sem compromisso.\n\nUm abraço,\n{{responsavel}}\nVOICE Ambientes Inteligentes"
   },
   {
    "id": "reativacao_cliente_whatsapp",
    "tipo": "whatsapp",
    "assunto": "Reativação de cliente antigo",
    "corpo": "Olá, {{nome_contato}}! Aqui é {{responsavel}}, da VOICE. Faz um tempo que não conversamos e queria saber como está a casa: rede, som, câmeras e automação funcionando do jeito que você gosta? Muita coisa evoluiu desde a instalação (Wi-Fi mais rápido, integração com assistentes, segurança). Se fizer sentido, agendo uma visita rápida de revisão sem custo para ver o que vale atualizar."
   },
   {
    "id": "followup_proposta",
    "tipo": "email",
    "assunto": "Proposta VOICE — {{titulo}}",
    "corpo": "Olá,\n\nRetomo a proposta {{titulo}} para confirmarmos os próximos passos. Posso apresentar o projeto a você e ao arquiteto em uma reunião de 40 minutos, revisando ambiente por ambiente e ajustando escopo e fases se necessário.\n\nSugestão de agenda: (1) revisão do escopo; (2) cronograma alinhado à obra; (3) condição de pagamento; (4) data de início da infraestrutura.\n\nQual dia desta semana funciona melhor?\n\n{{responsavel}}\nVOICE Ambientes Inteligentes"
   },
   {
    "id": "roteiro_briefing_spin",
    "tipo": "roteiro",
    "assunto": "Roteiro de visita técnica / briefing (SPIN)",
    "corpo": "SITUAÇÃO: fase da obra, plantas, arquiteto responsável, moradores e rotina, sistemas existentes (rede, som, câmeras, acesso).\nPROBLEMA: o que incomoda hoje ou na casa anterior? Wi-Fi, excesso de controles, segurança, conforto térmico e luminoso.\nIMPLICAÇÃO: o que acontece se a infraestrutura não for prevista agora (retrabalho, quebra de acabamento, limitações futuras)? Qual o custo de conviver com isso?\nNECESSIDADE: como seria um dia perfeito na casa? O que precisa acontecer ao chegar, ao dormir, ao viajar?\nFECHAMENTO DA VISITA: expectativa de investimento, decisores, prazo da obra e próximo passo com data."
   },
   {
    "id": "pedido_aprovacao_direcao",
    "tipo": "documento",
    "assunto": "Pedido de aprovação da direção — {{titulo}}",
    "corpo": "Proposta: {{titulo}}\nResponsável: {{responsavel}}\nValor bruto: {{valor_bruto}}\nDesconto: {{desconto_percentual}}% (faixa {{faixa_desconto}})\nMargem de contribuição: {{margem_contribuicao_percentual}}% (faixa {{faixa_margem}})\nAlternativas já tentadas (Política sec.9): escopo, equipamento, condição de pagamento, benefício, fase.\nJustificativa (Política sec.8): {{justificativa_excecao}}\nImpacto financeiro estimado: \nDecisão da direção / aprovado por: "
   },
   {
    "id": "dossie_passagem",
    "tipo": "documento",
    "assunto": "Passagem de projeto ganho — {{titulo}}",
    "corpo": "Cliente: {{cliente_nome}}\nArquiteto/parceiro: {{parceiro_indicador}}\nFase da obra: {{fase_obra}}\nEscopo vendido: {{escopo_sistemas}}\nProposta aceita (versão, valor, margem): \nCondição de recebimento (referência 50% / 40% / 10%, Política sec.10): \nContatos da obra e do arquiteto: \nCompromissos assumidos com o cliente (prazos, acabamentos, marcas): \nRiscos conhecidos: \nResponsável comercial: {{responsavel}}"
   },
   {
    "id": "whatsapp_pos_fechamento",
    "tipo": "whatsapp",
    "assunto": "Pós-fechamento: dados para o contrato",
    "corpo": "Olá, {{cliente}}! Que alegria seguir com a VOICE no seu projeto. Para prepararmos o contrato, pode me enviar:\n\n• Nome completo ou razão social\n• CPF ou CNPJ\n• Endereço do cliente\n• Endereço da obra\n• E-mail para receber o contrato\n\nQualquer dúvida, estou por aqui. Obrigado!"
   },
   {
    "id": "whatsapp_planta_baixa",
    "tipo": "whatsapp",
    "assunto": "Pedido de planta baixa",
    "corpo": "Olá, {{cliente}}! Para desenharmos a automação sob medida, precisamos da planta baixa do imóvel (PDF ou DWG) e, se houver, do projeto de interiores e do luminotécnico. Se preferir, falamos direto com o seu arquiteto. Pode nos enviar por aqui?"
   },
   {
    "id": "whatsapp_followup_orcamento",
    "tipo": "whatsapp",
    "assunto": "Acompanhamento do orçamento",
    "corpo": "Olá, {{cliente}}! Tudo bem? Passando para saber se conseguiu avaliar a proposta {{referencia}} que enviamos. Posso esclarecer algum ponto ou ajustar algo no escopo? Fico à disposição."
   },
   {
    "id": "whatsapp_agendamento_visita",
    "tipo": "whatsapp",
    "assunto": "Agendamento de visita técnica",
    "corpo": "Olá, {{cliente}}! Gostaríamos de agendar uma visita técnica para conhecer o espaço e entender como você quer viver a casa. Qual destes horários fica melhor: {{opcao_1}} ou {{opcao_2}}? A visita leva cerca de 1 hora."
   },
   {
    "id": "whatsapp_boas_vindas",
    "tipo": "whatsapp",
    "assunto": "Boas-vindas ao cliente",
    "corpo": "Olá, {{cliente}}! Seja muito bem-vindo(a) à VOICE Ambientes Inteligentes. A partir de agora, {{responsavel}} acompanha o seu projeto e manda as atualizações de cada fase. Estamos felizes em fazer parte da sua casa."
   },
   {
    "id": "whatsapp_envio_contrato",
    "tipo": "whatsapp",
    "assunto": "Envio do contrato",
    "corpo": "Olá, {{cliente}}! Enviamos o contrato do seu projeto para o e-mail {{email}}. Confira com calma; se estiver tudo certo, é só assinar e nos retornar. Se tiver qualquer dúvida sobre escopo, prazos ou pagamento, me chame por aqui."
   }
  ],
  "documentos": [
   "Roteiro de briefing SPIN",
   "Planilha de margem de contribuição (fórmula oficial Política V1 sec.4 a sec.6)",
   "Modelo de proposta comercial VOICE",
   "Checklist de fechamento (contrato, dados do cliente, condição de pagamento)",
   "Dossiê de passagem para Operações e Financeiro",
   "Registro de exceção de margem/desconto"
  ],
  "relacoes": [
   {
    "setor": "marketing",
    "fluxo": "Recebe leads de campanhas, eventos e showroom; devolve qualidade dos leads, motivos de perda e cases candidatos."
   },
   {
    "setor": "financas",
    "fluxo": "Envia propostas para validação de margem, exceções e condição de recebimento; recebe confirmação da entrada para marcar o ganho."
   },
   {
    "setor": "operacoes",
    "fluxo": "Entrega o dossiê de passagem do projeto ganho; recebe viabilidade técnica e prazos de execução para a proposta."
   },
   {
    "setor": "posvenda",
    "fluxo": "Recebe indicações e oportunidades de ampliação/upsell de clientes da base; informa o que foi vendido e prometido."
   },
   {
    "setor": "direcao",
    "fluxo": "Solicita autorização de margem abaixo de 30% e descontos acima de 2%; reporta previsão e alertas de falta de venda."
   }
  ],
  "fontes": [
   {
    "titulo": "Política de Saúde Financeira da VOICE — V1 (sec.2, 3, 8, 9, 10, 14)",
    "tipo": "norma",
    "ref": "04 - PADROES/VOICE - Politica de Saude Financeira - V1.md"
   },
   {
    "titulo": "Skill pipeline-review",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/sales/skills/pipeline-review/SKILL.md"
   },
   {
    "titulo": "Skill lead-triage",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/sales/skills/lead-triage/SKILL.md"
   },
   {
    "titulo": "Skill close-plan (plano de ação mútuo)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/sales/skills/close-plan/SKILL.md"
   },
   {
    "titulo": "Skill handle-objection",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/sales/skills/handle-objection/SKILL.md"
   },
   {
    "titulo": "Skill reactivate (reativação de clientes)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/reactivate/SKILL.md"
   },
   {
    "titulo": "Skill speed-to-lead",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/speed-to-lead/SKILL.md"
   },
   {
    "titulo": "SPIN Selling — Neil Rackham",
    "tipo": "livro",
    "ref": "https://blog.hubspot.com/sales/spin-selling-the-ultimate-guide"
   },
   {
    "titulo": "Predictable Revenue — Aaron Ross e Marylou Tyler",
    "tipo": "livro",
    "ref": "https://predictablerevenue.com/blog/15-minute-summary-of-predictable-revenue/"
   },
   {
    "titulo": "The Challenger Sale — Matthew Dixon e Brent Adamson",
    "tipo": "livro",
    "ref": "The Challenger Sale (Portfolio/Penguin, 2011)"
   }
  ]
 },
 {
  "id": "marketing",
  "sigla": "CMO",
  "nome": "Marketing",
  "missao": "Fazer da VOICE a referência em ambientes inteligentes de alto padrão para clientes e arquitetos, com marca discreta e sofisticada, cases autorizados e geração constante de leads qualificados para o Comercial.",
  "cor": "cyan",
  "diretor": {
   "titulo": "Diretora de Marketing (CMO)",
   "nome": "Camila Arantes Rocha",
   "perfil": "Persona fictícia criada para o VEOS — não representa pessoa real. Vem do marketing de marcas de design, mobiliário e arquitetura de alto padrão, onde aprendeu que o luxo se comunica com experiência, discrição e prova. Estilo editorial e analítico: cada peça precisa servir à marca e gerar conversa comercial.",
   "especialidades": [
    "Posicionamento de marca premium e comunicação discreta para alto padrão",
    "Programas de relacionamento com arquitetos, designers e construtoras",
    "Produção de cases e conteúdo com autorização e respeito à privacidade do cliente",
    "Eventos, showroom e experiências de marca",
    "Mensuração de campanhas e integração marketing–vendas"
   ],
   "metodos": [
    {
     "nome": "StoryBrand (SB7)",
     "autor": "Donald Miller",
     "uso": "O cliente e o arquiteto são os heróis; a VOICE é a guia. Toda peça segue personagem → problema (casa que não conversa, tecnologia aparente, Wi-Fi fraco) → guia → plano (briefing, projeto, instalação invisível, suporte) → chamada para ação (visita ao showroom) → fracasso evitado → sucesso (casa que funciona sem pensar)."
    },
    {
     "nome": "Jobs-to-be-Done",
     "autor": "Clayton Christensen",
     "uso": "Mapeia o 'trabalho' que o cliente contrata: tranquilidade ao viajar, receber bem, conforto sem controles, proteger a família; e o trabalho do arquiteto: preservar a estética do projeto e não ter problemas na obra. Os pilares de conteúdo derivam desses trabalhos."
    },
    {
     "nome": "Planejamento de campanha com objetivo mensurável",
     "autor": "Prática consolidada (brief de campanha: objetivo, público, mensagens, canais, calendário, métricas)",
     "uso": "Toda campanha nasce com público definido, meta de leads e oportunidades, orçamento e data de análise."
    },
    {
     "nome": "Acordo de nível de serviço marketing–vendas",
     "autor": "Prática consolidada de alinhamento marketing e vendas (smarketing)",
     "uso": "Marketing se compromete com volume e qualidade de leads; Comercial se compromete a responder no mesmo dia e devolver o resultado de cada lead."
    }
   ],
   "principios": [
    "Luxo é discrição: nenhuma imagem, endereço ou nome de cliente é publicado sem autorização registrada.",
    "O arquiteto é coautor: todo case credita o escritório parceiro quando ele autorizar.",
    "Mostrar experiência, não equipamento: menos caixas e marcas, mais cenas de vida.",
    "Todo conteúdo passa pela revisão de marca antes de publicar.",
    "Marketing é medido por oportunidades geradas e receita influenciada, não por curtidas."
   ],
   "como_aconselha": "Com clareza editorial: propõe a mensagem central, o público e o canal, mostra o número que importa e aponta o risco de marca. Sempre separa o que é meta proposta do que já está aprovado.",
   "perguntas_chave": [
    "Quantas oportunidades do Comercial vieram de ações de Marketing neste trimestre?",
    "Quais arquitetos participaram de alguma ação nossa nos últimos 90 dias?",
    "Quais projetos entregues podem virar case e já temos autorização por escrito?",
    "A mensagem das peças está falando da vida do cliente ou de equipamento?",
    "Qual evento ou experiência no showroom vamos fazer nos próximos 60 dias?"
   ],
   "limites": [
    "Não publica case, foto ou vídeo de cliente sem autorização registrada e respeitando as restrições definidas pelo cliente.",
    "Não aprova orçamento de campanha ou evento acima do planejado sem a direção.",
    "Não promete preço, desconto ou condição comercial em peças — isso é do Comercial dentro da Política V1.",
    "Não firma parceria de cobranding ou patrocínio sem a direção."
   ]
  },
  "equipe": [
   {
    "papel": "coord_marketing",
    "nome": "Coordenador(a) de marketing",
    "reporta_a": "CMO",
    "responsabilidades": [
     "Planejar campanhas e calendário editorial.",
     "Garantir revisão de marca e autorização de imagem antes de toda publicação.",
     "Conduzir a reunião mensal com o Comercial sobre leads e resultados."
    ],
    "indicadores": [
     "leads_gerados",
     "oportunidades_marketing",
     "receita_influenciada"
    ]
   },
   {
    "papel": "produtor_conteudo",
    "nome": "Produtor(a) de conteúdo",
    "reporta_a": "CMO",
    "responsabilidades": [
     "Produzir textos, roteiros, fotos e vídeos de cases e conteúdos educativos.",
     "Captar autorizações e restrições do cliente junto com o Pós-venda.",
     "Manter o banco de imagens com o status de autorização de cada item."
    ],
    "indicadores": [
     "publicacoes_semana",
     "cases_publicados"
    ]
   },
   {
    "papel": "analista_performance",
    "nome": "Analista de performance e dados",
    "reporta_a": "CMO",
    "responsabilidades": [
     "Medir leads, custo por lead e conversão por campanha e canal.",
     "Registrar resultados de campanhas e eventos no VEOS.",
     "Preparar o relatório mensal de performance."
    ],
    "indicadores": [
     "custo_por_lead",
     "taxa_lead_oportunidade",
     "leads_gerados"
    ]
   },
   {
    "papel": "eventos_parcerias",
    "nome": "Eventos, showroom e relacionamento com arquitetos",
    "reporta_a": "CMO",
    "responsabilidades": [
     "Organizar cafés técnicos, visitas guiadas ao showroom e presença em mostras de decoração.",
     "Fazer o follow-up de convidados e repassar interessados ao Comercial.",
     "Apoiar o gestor de parceiros do Comercial no programa de arquitetos."
    ],
    "indicadores": [
     "arquitetos_engajados",
     "comparecimento_eventos"
    ]
   }
  ],
  "processos": [
   {
    "id": "ciclo_campanha",
    "nome": "Ciclo de campanha",
    "descricao": "Do brief à análise de resultado, com metas de leads e oportunidades definidas antes da veiculação.",
    "etapas": [
     {
      "id": "brief",
      "nome": "Brief",
      "responsavel": "coord_marketing",
      "criterio_saida": "Objetivo mensurável, público (cliente final, arquiteto, construtora ou base), mensagem central StoryBrand, canais, orçamento e data de análise registrados."
     },
     {
      "id": "producao",
      "nome": "Produção",
      "responsavel": "produtor_conteudo",
      "criterio_saida": "Peças prontas, revisadas quanto à marca e com autorização de imagem conferida."
     },
     {
      "id": "veiculacao",
      "nome": "Veiculação",
      "responsavel": "analista_performance",
      "criterio_saida": "Campanha ativa com rastreamento de origem dos leads (UTM, formulário ou código de convite)."
     },
     {
      "id": "analise",
      "nome": "Análise e aprendizado",
      "responsavel": "analista_performance",
      "criterio_saida": "Leads, oportunidades, custo realizado e aprendizados registrados até 7 dias após o encerramento."
     }
    ]
   },
   {
    "id": "producao_case",
    "nome": "Produção de case autorizado",
    "descricao": "Transforma um projeto entregue em case de marca somente com autorização registrada do cliente e, quando houver, do arquiteto.",
    "etapas": [
     {
      "id": "selecao",
      "nome": "Seleção do candidato",
      "responsavel": "coord_marketing",
      "criterio_saida": "Projeto entregue, cliente satisfeito (indicação do Pós-venda) e potencial de marca avaliado."
     },
     {
      "id": "autorizacao",
      "nome": "Autorização",
      "responsavel": "produtor_conteudo",
      "criterio_saida": "Termo de autorização assinado com escopo (fotos, vídeo, nome, localização) e restrições registradas; crédito do arquiteto autorizado ou não."
     },
     {
      "id": "producao",
      "nome": "Sessão e produção",
      "responsavel": "produtor_conteudo",
      "criterio_saida": "Fotos e textos produzidos respeitando as restrições (sem fachada, endereço, rostos ou itens pessoais quando vetados)."
     },
     {
      "id": "aprovacao_cliente",
      "nome": "Aprovação do cliente",
      "responsavel": "produtor_conteudo",
      "criterio_saida": "Cliente (e arquiteto, se creditado) aprovou a versão final por escrito."
     },
     {
      "id": "publicacao",
      "nome": "Publicação e uso comercial",
      "responsavel": "coord_marketing",
      "criterio_saida": "Case publicado nos canais autorizados e entregue ao Comercial para uso em propostas."
     }
    ]
   },
   {
    "id": "programa_arquitetos",
    "nome": "Programa de relacionamento com arquitetos",
    "descricao": "Agenda recorrente de experiências para escritórios de arquitetura e design: conteúdo técnico útil, visitas ao showroom e encontros, em conjunto com o gestor de parceiros do Comercial.",
    "etapas": [
     {
      "id": "planejamento",
      "nome": "Planejamento trimestral",
      "responsavel": "eventos_parcerias",
      "criterio_saida": "Calendário de eventos do trimestre, lista de convidados por nível (A/B/C) e tema técnico de cada encontro."
     },
     {
      "id": "convite",
      "nome": "Convite e confirmação",
      "responsavel": "eventos_parcerias",
      "criterio_saida": "Convites enviados com 15 dias de antecedência e confirmações registradas."
     },
     {
      "id": "realizacao",
      "nome": "Realização",
      "responsavel": "eventos_parcerias",
      "criterio_saida": "Evento realizado, presença registrada, interesses anotados."
     },
     {
      "id": "follow_up",
      "nome": "Follow-up e repasse",
      "responsavel": "eventos_parcerias",
      "criterio_saida": "Agradecimento enviado em até 2 dias úteis e interessados repassados ao Comercial."
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "campanha",
    "nome": "Campanha",
    "descricao": "Ação planejada com objetivo, público, canais, orçamento e metas de leads e oportunidades.",
    "responsavel": "coord_marketing",
    "estados": [
     "planejada",
     "em_producao",
     "ativa",
     "encerrada",
     "analisada",
     "cancelada"
    ],
    "estado_inicial": "planejada",
    "estados_finais": [
     "analisada",
     "cancelada"
    ],
    "campos": [
     {
      "id": "objetivo",
      "rotulo": "Objetivo",
      "tipo": "opcao",
      "opcoes": [
       "gerar_leads",
       "relacionamento_arquitetos",
       "reativar_base",
       "lancamento_solucao",
       "reconhecimento_marca",
       "evento_showroom"
      ],
      "obrigatorio": true
     },
     {
      "id": "publico",
      "rotulo": "Público",
      "tipo": "opcao",
      "opcoes": [
       "cliente_final_alto_padrao",
       "arquitetos_designers",
       "construtoras_incorporadoras",
       "base_clientes",
       "corporativo"
      ],
      "obrigatorio": true
     },
     {
      "id": "mensagem_central",
      "rotulo": "Mensagem central (StoryBrand)",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "canais",
      "rotulo": "Canais",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "orcamento",
      "rotulo": "Orçamento aprovado",
      "tipo": "dinheiro",
      "obrigatorio": true
     },
     {
      "id": "investimento_realizado",
      "rotulo": "Investimento realizado",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "data_inicio",
      "rotulo": "Início",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_fim",
      "rotulo": "Término",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "meta_leads",
      "rotulo": "Meta de leads",
      "tipo": "numero",
      "obrigatorio": true
     },
     {
      "id": "leads_gerados",
      "rotulo": "Leads gerados",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "oportunidades_geradas",
      "rotulo": "Oportunidades geradas (Comercial)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "aprendizados",
      "rotulo": "Aprendizados",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "conteudo",
    "nome": "Conteúdo",
    "descricao": "Peça editorial ou de mídia social (post, reel, artigo, newsletter, material técnico para arquitetos).",
    "responsavel": "produtor_conteudo",
    "estados": [
     "ideia",
     "producao",
     "revisao_marca",
     "aprovado",
     "publicado",
     "arquivado"
    ],
    "estado_inicial": "ideia",
    "estados_finais": [
     "publicado",
     "arquivado"
    ],
    "campos": [
     {
      "id": "formato",
      "rotulo": "Formato",
      "tipo": "opcao",
      "opcoes": [
       "post",
       "carrossel",
       "reel_video",
       "artigo_blog",
       "newsletter",
       "guia_tecnico_arquitetos",
       "apresentacao"
      ],
      "obrigatorio": true
     },
     {
      "id": "canal",
      "rotulo": "Canal",
      "tipo": "opcao",
      "opcoes": [
       "instagram",
       "linkedin",
       "site_blog",
       "email",
       "youtube",
       "whatsapp_lista",
       "material_impresso"
      ],
      "obrigatorio": true
     },
     {
      "id": "pilar",
      "rotulo": "Pilar de conteúdo",
      "tipo": "opcao",
      "opcoes": [
       "tecnologia_invisivel",
       "conforto_e_experiencia",
       "seguranca_e_tranquilidade",
       "parceria_com_arquitetura",
       "bastidores_e_engenharia",
       "cases"
      ],
      "obrigatorio": true
     },
     {
      "id": "data_publicacao",
      "rotulo": "Data de publicação",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "imagem_de_cliente",
      "rotulo": "Usa imagem ou dados de cliente?",
      "tipo": "opcao",
      "opcoes": [
       "nao",
       "sim"
      ],
      "obrigatorio": true
     },
     {
      "id": "autorizacao_ref",
      "rotulo": "Referência da autorização (case ou termo)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "revisado_por",
      "rotulo": "Revisão de marca feita por",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "link",
      "rotulo": "Link publicado",
      "tipo": "texto",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "case",
    "nome": "Case de projeto",
    "descricao": "Projeto entregue transformado em história de marca, somente com autorização registrada do cliente.",
    "responsavel": "produtor_conteudo",
    "estados": [
     "candidato",
     "aguardando_autorizacao",
     "producao",
     "aprovacao_cliente",
     "publicado",
     "descartado"
    ],
    "estado_inicial": "candidato",
    "estados_finais": [
     "publicado",
     "descartado"
    ],
    "campos": [
     {
      "id": "cliente_nome",
      "rotulo": "Cliente (uso interno)",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "arquiteto_parceiro",
      "rotulo": "Arquiteto / escritório",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "sistemas_entregues",
      "rotulo": "Sistemas entregues",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "autorizacao_publicacao",
      "rotulo": "Autorização do cliente",
      "tipo": "opcao",
      "opcoes": [
       "pendente",
       "autorizado_com_identificacao",
       "autorizado_sem_identificacao",
       "negado"
      ],
      "obrigatorio": true
     },
     {
      "id": "documento_autorizacao",
      "rotulo": "Termo de autorização (link/arquivo)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "data_autorizacao",
      "rotulo": "Data da autorização",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "restricoes",
      "rotulo": "Restrições do cliente",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "credito_arquiteto",
      "rotulo": "Crédito ao arquiteto",
      "tipo": "opcao",
      "opcoes": [
       "autorizado",
       "nao_autorizado",
       "sem_arquiteto"
      ],
      "obrigatorio": false
     },
     {
      "id": "data_sessao",
      "rotulo": "Data da sessão de fotos/vídeo",
      "tipo": "data",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "evento",
    "nome": "Evento / experiência",
    "descricao": "Café técnico com arquitetos, visita guiada ao showroom, lançamento ou presença em mostra de decoração.",
    "responsavel": "eventos_parcerias",
    "estados": [
     "planejado",
     "convites_enviados",
     "realizado",
     "follow_up_concluido",
     "cancelado"
    ],
    "estado_inicial": "planejado",
    "estados_finais": [
     "follow_up_concluido",
     "cancelado"
    ],
    "campos": [
     {
      "id": "tipo_evento",
      "rotulo": "Tipo",
      "tipo": "opcao",
      "opcoes": [
       "cafe_tecnico_arquitetos",
       "visita_guiada_showroom",
       "workshop_tecnico",
       "lancamento",
       "mostra_decoracao",
       "evento_clientes"
      ],
      "obrigatorio": true
     },
     {
      "id": "data_evento",
      "rotulo": "Data do evento",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "local",
      "rotulo": "Local",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "orcamento",
      "rotulo": "Orçamento",
      "tipo": "dinheiro",
      "obrigatorio": true
     },
     {
      "id": "convidados",
      "rotulo": "Convidados",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "presentes",
      "rotulo": "Presentes",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "leads_gerados",
      "rotulo": "Leads / interessados repassados",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "data_follow_up",
      "rotulo": "Prazo do follow-up",
      "tipo": "data",
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "pauta_semanal",
    "nome": "Pauta semanal de conteúdo",
    "frequencia": "semanal",
    "responsavel": "coord_marketing",
    "passos": [
     "Revisar o calendário da semana e conteúdos em produção e revisão de marca.",
     "Conferir autorização de toda peça que usa imagem ou dado de cliente.",
     "Definir pelo menos 2 publicações por pilar prioritário.",
     "Registrar publicações realizadas com link."
    ]
   },
   {
    "id": "calendario_editorial",
    "nome": "Calendário editorial do mês",
    "frequencia": "mensal",
    "responsavel": "coord_marketing",
    "passos": [
     "Escolher o tema do mês a partir dos trabalhos (JTBD) do cliente e do arquiteto.",
     "Distribuir conteúdos por pilar e canal.",
     "Encaixar cases autorizados e o próximo evento.",
     "Validar o calendário com a CMO."
    ]
   },
   {
    "id": "reuniao_marketing_comercial",
    "nome": "Reunião marketing–comercial",
    "frequencia": "mensal",
    "responsavel": "CMO",
    "passos": [
     "Revisar leads gerados por origem e o retorno do Comercial sobre cada um.",
     "Levantar objeções recorrentes para transformar em conteúdo.",
     "Receber do Comercial e do Pós-venda os projetos candidatos a case.",
     "Ajustar metas do mês seguinte."
    ]
   },
   {
    "id": "relatorio_performance",
    "nome": "Relatório mensal de performance",
    "frequencia": "mensal",
    "responsavel": "analista_performance",
    "passos": [
     "Consolidar leads, oportunidades, custo por lead e receita influenciada por campanha e canal.",
     "Comparar com o mês anterior e com a meta.",
     "Listar o que funcionou, o que não funcionou e 3 recomendações priorizadas.",
     "Enviar à CMO e à direção."
    ]
   },
   {
    "id": "agenda_eventos",
    "nome": "Planejamento de eventos e showroom",
    "frequencia": "trimestral",
    "responsavel": "eventos_parcerias",
    "passos": [
     "Definir pelo menos 2 encontros com arquitetos e 1 experiência para clientes no trimestre.",
     "Montar lista de convidados com o gestor de parceiros do Comercial.",
     "Aprovar orçamento de cada evento com a CMO.",
     "Reservar data do showroom e fornecedores."
    ]
   },
   {
    "id": "revisao_marca",
    "nome": "Revisão de marca e mensagem",
    "frequencia": "trimestral",
    "responsavel": "CMO",
    "passos": [
     "Revisar o BrandScript (SB7) e os pilares de conteúdo.",
     "Auditar amostra de peças publicadas quanto a tom, termos e promessas.",
     "Atualizar guia de estilo e banco de imagens autorizadas."
    ]
   }
  ],
  "indicadores": [
   {
    "id": "leads_gerados",
    "nome": "Leads gerados por Marketing",
    "formula": "Soma de leads registrados em campanhas e eventos no mês",
    "meta": "≥ 20 por mês",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "taxa_lead_oportunidade",
    "nome": "Conversão de lead em oportunidade",
    "formula": "Oportunidades geradas ÷ leads gerados por Marketing × 100",
    "meta": "≥ 25%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "oportunidades_marketing",
    "nome": "Oportunidades com origem em Marketing",
    "formula": "Soma de oportunidades geradas registradas nas campanhas do período",
    "meta": "≥ 5 por mês",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "custo_por_lead",
    "nome": "Custo por lead",
    "formula": "Investimento realizado ÷ leads gerados",
    "meta": "Acompanhar tendência; teto a definir após 3 meses de histórico",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "receita_influenciada",
    "nome": "Receita influenciada",
    "formula": "Valor das vendas ganhas cujo lead passou por campanha, evento ou conteúdo de Marketing",
    "meta": "≥ 30% da receita de projetos novos",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "arquitetos_engajados",
    "nome": "Arquitetos engajados",
    "formula": "Escritórios distintos que participaram de evento, visita ao showroom ou receberam material técnico com retorno nos últimos 90 dias",
    "meta": "≥ 15 por trimestre",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "comparecimento_eventos",
    "nome": "Comparecimento em eventos",
    "formula": "Presentes ÷ convidados × 100",
    "meta": "≥ 50%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "cases_publicados",
    "nome": "Cases publicados com autorização",
    "formula": "Cases em estado publicado no período",
    "meta": "≥ 2 por trimestre",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "publicacoes_semana",
    "nome": "Frequência de publicação",
    "formula": "Conteúdos publicados por semana",
    "meta": "≥ 3 por semana",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   }
  ],
  "sentinelas": [
   {
    "id": "MKT_CASE_SEM_AUTORIZACAO",
    "titulo": "Case avançando sem termo de autorização",
    "severidade": "CRITICO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "case",
     "campo": "documento_autorizacao",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "producao",
        "aprovacao_cliente",
        "publicado"
       ]
      }
     ]
    },
    "mensagem": "O case {{titulo}} está em produção ou publicado sem termo de autorização registrado. Suspender uso até regularizar.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Suspender uso do case e obter termo de autorização assinado",
      "papel": "produtor_conteudo",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "pedido_autorizacao_case"
     },
     {
      "tipo": "notificar",
      "para": "CMO"
     }
    ],
    "fonte": "PROPOSTA — LGPD (Lei 13.709/2018) e direito de imagem; regra da direção: publicar case só com autorização registrada"
   },
   {
    "id": "MKT_CONTEUDO_CLIENTE_SEM_AUTORIZACAO",
    "titulo": "Conteúdo com imagem de cliente sem autorização vinculada",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "conteudo",
     "campo": "autorizacao_ref",
     "filtros": [
      {
       "campo": "imagem_de_cliente",
       "igual": "sim"
      },
      {
       "campo": "estado",
       "nao_em": [
        "arquivado"
       ]
      }
     ]
    },
    "mensagem": "O conteúdo {{titulo}} usa imagem ou dado de cliente e não tem autorização vinculada.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Vincular a autorização do case/termo ou retirar a imagem do cliente",
      "papel": "produtor_conteudo",
      "prazo_dias": 1
     },
     {
      "tipo": "notificar",
      "para": "coord_marketing"
     }
    ],
    "fonte": "PROPOSTA — LGPD (Lei 13.709/2018) e boa prática de brand review"
   },
   {
    "id": "MKT_CONTEUDO_SEM_REVISAO",
    "titulo": "Conteúdo perto da data sem aprovação de marca",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "conteudo",
     "campo": "data_publicacao",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "ideia",
        "producao",
        "revisao_marca"
       ]
      }
     ],
     "antecedencia_dias": 2
    },
    "mensagem": "O conteúdo {{titulo}} vence para publicação em até 2 dias e ainda não foi aprovado na revisão de marca.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Concluir revisão de marca ou reprogramar a publicação",
      "papel": "coord_marketing",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (brand review antes de publicar)"
   },
   {
    "id": "MKT_POUCAS_PUBLICACOES",
    "titulo": "Poucas publicações na semana",
    "severidade": "INFO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "conteudo",
     "filtros": [
      {
       "campo": "estado",
       "igual": "publicado"
      }
     ],
     "janela_dias": 7,
     "data_campo": "data_publicacao",
     "operador": "<",
     "valor": 2
    },
    "mensagem": "Apenas {{total}} conteúdo(s) publicado(s) nos últimos 7 dias.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Publicar conteúdo de estoque aprovado (cases, bastidores ou guia técnico)",
      "papel": "produtor_conteudo",
      "prazo_dias": 2
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (consistência de calendário editorial)"
   },
   {
    "id": "MKT_LEADS_ABAIXO_META",
    "titulo": "Faltando lead: campanhas geraram poucos leads no mês",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "soma",
     "registro": "campanha",
     "campo": "leads_gerados",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "ativa",
        "encerrada",
        "analisada"
       ]
      }
     ],
     "janela_dias": 30,
     "data_campo": "atualizado_em",
     "operador": "<",
     "valor": 20
    },
    "mensagem": "Campanhas atualizadas nos últimos 30 dias somam {{total}} leads, abaixo da meta proposta de 20 por mês. O Comercial depende desse volume.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Montar ação rápida de geração de leads (convite ao showroom para base e arquitetos)",
      "papel": "coord_marketing",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "convite_showroom_arquitetos"
     },
     {
      "tipo": "notificar",
      "para": "CMO"
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (acordo de nível de serviço marketing–vendas)"
   },
   {
    "id": "MKT_CAMPANHA_SEM_ANALISE",
    "titulo": "Campanha encerrada sem análise",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "campanha",
     "filtros": [
      {
       "campo": "estado",
       "igual": "encerrada"
      }
     ],
     "dias": 7,
     "data_campo": "atualizado_em"
    },
    "mensagem": "A campanha {{titulo}} foi encerrada há {{dias}} dias e ainda não tem análise de resultado.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Registrar leads, oportunidades, investimento realizado e aprendizados",
      "papel": "analista_performance",
      "prazo_dias": 2
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (relatório de performance de campanha)"
   },
   {
    "id": "MKT_EVENTO_SEM_FOLLOWUP",
    "titulo": "Evento realizado sem follow-up",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "evento",
     "campo": "data_follow_up",
     "filtros": [
      {
       "campo": "estado",
       "igual": "realizado"
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "O prazo de follow-up do evento {{titulo}} venceu. Interessados esfriam rápido.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Enviar agradecimento aos presentes e repassar interessados ao Comercial",
      "papel": "eventos_parcerias",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "followup_evento"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (follow-up de eventos em até 48h)"
   },
   {
    "id": "MKT_SEM_EVENTO_ARQUITETOS",
    "titulo": "Nenhum encontro com arquitetos em 60 dias",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "evento",
     "filtros": [
      {
       "campo": "tipo_evento",
       "em": [
        "cafe_tecnico_arquitetos",
        "visita_guiada_showroom",
        "workshop_tecnico"
       ]
      },
      {
       "campo": "estado",
       "diferente": "cancelado"
      }
     ],
     "janela_dias": 60,
     "data_campo": "data_evento",
     "operador": "<",
     "valor": 1
    },
    "mensagem": "Nenhum encontro com arquitetos nos últimos 60 dias ({{total}} registrado). O canal de indicação precisa de presença constante.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Agendar café técnico ou visita guiada ao showroom com escritórios nível A",
      "papel": "eventos_parcerias",
      "prazo_dias": 7
     },
     {
      "tipo": "rascunho",
      "modelo": "convite_showroom_arquitetos"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (marketing de relacionamento com especificadores)"
   },
   {
    "id": "MKT_CASE_AUTORIZACAO_PARADA",
    "titulo": "Pedido de autorização de case parado",
    "severidade": "INFO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "case",
     "filtros": [
      {
       "campo": "estado",
       "igual": "aguardando_autorizacao"
      }
     ],
     "dias": 15,
     "data_campo": "atualizado_em"
    },
    "mensagem": "O case {{titulo}} aguarda autorização há {{dias}} dias.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Retomar o pedido de autorização com o cliente (via Pós-venda se necessário) ou descartar o case",
      "papel": "produtor_conteudo",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "pedido_autorizacao_case"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado"
   }
  ],
  "modelos": [
   {
    "id": "convite_showroom_arquitetos",
    "tipo": "email",
    "assunto": "Convite: tecnologia invisível no projeto de interiores — café no showroom VOICE",
    "corpo": "Olá,\n\nGostaríamos de receber você e sua equipe para um café técnico no showroom da VOICE. Em 60 minutos mostramos, funcionando, como iluminação, som, cortinas, climatização e rede se integram sem aparecer no projeto — e em que fase da obra cada decisão precisa ser tomada para não comprometer o acabamento.\n\nEvento: {{titulo}}\nResponsável: {{responsavel}}\n\nConfirma presença respondendo este e-mail?\n\nEquipe VOICE Ambientes Inteligentes"
   },
   {
    "id": "followup_evento",
    "tipo": "whatsapp",
    "assunto": "Agradecimento pós-evento",
    "corpo": "Olá! Obrigado por ter vindo ao {{titulo}}. Foi ótimo conversar sobre seus projetos. Se tiver alguma obra em andamento em que possamos ajudar com a infraestrutura de automação e rede, posso pedir para nosso consultor entrar em contato esta semana?"
   },
   {
    "id": "pedido_autorizacao_case",
    "tipo": "email",
    "assunto": "Podemos contar a história do seu projeto?",
    "corpo": "Olá, {{cliente_nome}},\n\nFicamos muito felizes com o resultado do seu projeto. Gostaríamos de pedir sua autorização para apresentá-lo como case da VOICE.\n\nVocê decide tudo: se aparece o seu nome ou não, quais ambientes podem ser fotografados e o que não deve aparecer (fachada, endereço, pessoas, objetos pessoais). Nada é publicado sem a sua aprovação final por escrito.\n\nSe concordar, enviamos o termo de autorização para assinatura digital.\n\nCom carinho,\n{{responsavel}}\nVOICE Ambientes Inteligentes"
   },
   {
    "id": "termo_autorizacao_imagem",
    "tipo": "documento",
    "assunto": "Termo de autorização de uso de imagem e divulgação de projeto",
    "corpo": "Cliente: {{cliente_nome}}\nProjeto: {{titulo}}\nArquiteto/escritório: {{arquiteto_parceiro}}\nEscopo autorizado: ( ) fotos ( ) vídeo ( ) nome do cliente ( ) cidade/bairro ( ) crédito ao arquiteto\nRestrições: {{restricoes}}\nCanais autorizados: site, redes sociais, apresentações comerciais, mostras.\nPrazo: indeterminado, revogável a qualquer momento mediante pedido por escrito.\nAprovação final da versão a ser publicada: obrigatória.\nData e assinatura: "
   },
   {
    "id": "brief_campanha",
    "tipo": "documento",
    "assunto": "Brief de campanha — {{titulo}}",
    "corpo": "Objetivo mensurável: {{objetivo}} — meta de leads: {{meta_leads}}\nPúblico: {{publico}}\nMensagem central (SB7 — herói, problema, guia, plano, chamada, fracasso evitado, sucesso): {{mensagem_central}}\nCanais: {{canais}}\nPeríodo: {{data_inicio}} a {{data_fim}}\nOrçamento: {{orcamento}}\nPeças necessárias:\nComo o Comercial recebe os leads:\nRiscos e cuidados de marca/autorização:\nData da análise:"
   },
   {
    "id": "repasse_lead_comercial",
    "tipo": "documento",
    "assunto": "Repasse de interessado ao Comercial",
    "corpo": "Origem: {{titulo}}\nNome e contato:\nPerfil (cliente final, arquiteto, construtora):\nO que perguntou / interesse:\nFase da obra (se souber):\nRegistrado por: {{responsavel}}\nPedido ao Comercial: responder no mesmo dia útil e devolver o resultado ao Marketing."
   }
  ],
  "documentos": [
   "BrandScript VOICE (StoryBrand SB7)",
   "Guia de marca e tom de voz",
   "Termo de autorização de uso de imagem e divulgação de projeto",
   "Banco de imagens com status de autorização",
   "Brief de campanha",
   "Checklist de evento no showroom",
   "Relatório mensal de performance"
  ],
  "relacoes": [
   {
    "setor": "vendas",
    "fluxo": "Entrega leads e interessados de campanhas e eventos; recebe retorno sobre qualidade dos leads, objeções recorrentes e projetos candidatos a case."
   },
   {
    "setor": "posvenda",
    "fluxo": "Recebe clientes promotores e autorizações de case; entrega conteúdo educativo para clientes da base."
   },
   {
    "setor": "operacoes",
    "fluxo": "Agenda sessões de fotos nas entregas e recebe informações técnicas dos projetos."
   },
   {
    "setor": "financas",
    "fluxo": "Aprova e acompanha orçamento de campanhas e eventos."
   },
   {
    "setor": "direcao",
    "fluxo": "Aprova posicionamento, orçamento trimestral e parcerias; recebe relatório de performance."
   }
  ],
  "fontes": [
   {
    "titulo": "Skill campaign-plan",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/marketing/skills/campaign-plan/SKILL.md"
   },
   {
    "titulo": "Skill brand-review",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/marketing/skills/brand-review/SKILL.md"
   },
   {
    "titulo": "Skill performance-report",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/marketing/skills/performance-report/SKILL.md"
   },
   {
    "titulo": "Skill content-strategy",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/content-strategy/SKILL.md"
   },
   {
    "titulo": "Building a StoryBrand — Donald Miller",
    "tipo": "livro",
    "ref": "https://grahammann.net/book-notes/building-a-storybrand-donald-miller"
   },
   {
    "titulo": "Jobs-to-be-Done — Clayton Christensen (Competing Against Luck)",
    "tipo": "metodo",
    "ref": "Competing Against Luck (HarperBusiness, 2016)"
   },
   {
    "titulo": "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
    "tipo": "norma",
    "ref": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
   }
  ]
 },
 {
  "id": "operacoes",
  "sigla": "COO",
  "nome": "Operações",
  "missao": "Transformar cada contrato vendido em uma entrega impecável na obra de alto padrão — no prazo, no escopo, com qualidade verificada e sem que a VOICE financie o projeto do cliente com o próprio caixa.",
  "cor": "cyan",
  "diretor": {
   "titulo": "Diretor de Operações (COO)",
   "nome": "Rogério Tavares Mendonça",
   "perfil": "Persona fictícia. Engenheiro eletricista com cerca de 18 anos em implantação de sistemas integrados (automação, redes, AV e segurança) em residências e corporativos de alto padrão, convivendo diariamente com construtoras, arquitetos e outras disciplinas de obra. Estilo calmo e metódico: planeja por fases, protege a restrição da obra e não aceita 'pronto' sem checklist assinado.",
   "especialidades": [
    "Planejamento e controle de obras de integração de sistemas por fases (infraestrutura, equipamentos, instalação, programação/comissionamento, entrega)",
    "Compras técnicas e logística de equipamentos importados e de alto valor",
    "Coordenação de equipes próprias e terceirizadas em canteiro de obra",
    "Gestão da qualidade de campo: checklists, certificação de cabeamento, punch list e aceite",
    "Interface com construtora, arquiteto e demais disciplinas (elétrica, marcenaria, gesso, ar-condicionado)"
   ],
   "metodos": [
    {
     "nome": "Guia PMBOK — domínios de desempenho (planejamento, entrega, medição, incerteza)",
     "autor": "Project Management Institute (PMI)",
     "uso": "Kickoff formal com termo de abertura, EAP por fases do projeto VOICE, linha de base de cronograma e controle de mudanças de escopo (aditivos) antes de executar."
    },
    {
     "nome": "Last Planner System (planejamento puxado e PPC)",
     "autor": "Glenn Ballard e Greg Howell (Lean Construction Institute)",
     "uso": "Planejamento semanal com a equipe de campo: só entra no plano da semana a atividade cujas restrições (tubulação liberada, parede fechada, energia no rack, equipamento em estoque) já foram removidas; mede-se o PPC (percentual de planos concluídos)."
    },
    {
     "nome": "Teoria das Restrições / Corrente Crítica",
     "autor": "Eliyahu M. Goldratt",
     "uso": "Identifica a restrição de cada obra (normalmente a liberação da construtora ou o prazo de importação) e protege o prazo com pulmão de projeto em vez de folgas escondidas em cada tarefa."
    },
    {
     "nome": "Ciclo PDCA e análise de causa raiz (5 porquês)",
     "autor": "W. Edwards Deming / Taiichi Ohno (Sistema Toyota)",
     "uso": "Toda ocorrência de retrabalho gera causa raiz e ação corretiva; as lições alimentam os padrões técnicos do CIO e os checklists de campo."
    },
    {
     "nome": "Avaliação de fornecedores por custo total (TCO) e desempenho (OTIF)",
     "autor": "Prática de gestão de suprimentos (skill vendor-review)",
     "uso": "Fornecedores e distribuidores são avaliados por custo total (frete, seguro, prazo, garantia, suporte técnico no Brasil) e por entrega no prazo e completa."
    }
   ],
   "principios": [
    "Contrato sem kickoff não entra em campo: escopo, cronograma por fases e responsáveis definidos antes da primeira visita técnica.",
    "Compra relevante de equipamentos só com a fase financeiramente coberta (Política V1 sec.10): valores recebidos devem cobrir os desembolsos da fase, incluindo custos e encargos diretos.",
    "Exposição de caixa por obra preferencialmente zero ou positiva; acima de 10% do contrato só com autorização expressa da direção (Política V1 sec.11).",
    "Não existe 'pronto' sem checklist: cabeamento certificado, rack identificado, sistemas testados e punch list zerado antes de chamar o cliente para o aceite.",
    "Obra de cliente premium é também a casa do cliente: limpeza, proteção de acabamentos e pontualidade fazem parte da qualidade.",
    "Retrabalho é custo do projeto e consome a provisão de risco de 2% (Política V1 sec.6); cada ocorrência é analisada sem caça a culpados.",
    "Exceção não vira regra: toda saída de parâmetro tem responsável, justificativa, impacto financeiro e registro (Política V1 sec.14)."
   ],
   "como_aconselha": "Direto e orientado a fatos de campo. Responde com o status da obra em verde/amarelo/vermelho, a restrição atual, o impacto em prazo e caixa e uma recomendação clara com responsável e data. Traz números (PPC, dias de atraso, valor comprometido versus recebido) antes de opiniões.",
   "perguntas_chave": [
    "Qual é a restrição que hoje impede esta obra de avançar — e quem remove?",
    "O que já recebemos deste contrato cobre os desembolsos da próxima fase?",
    "A construtora confirmou a data de liberação das áreas (tubulação, forro, marcenaria)?",
    "Algum equipamento crítico tem prazo de entrega maior que a folga do cronograma?",
    "Quantas horas de retrabalho tivemos no mês e qual a causa mais frequente?",
    "O cliente e o arquiteto receberam o status semanal da obra?",
    "O que falta para o aceite e para a passagem ao Pós-venda?"
   ],
   "limites": [
    "Não autoriza compra relevante com a fase sem cobertura financeira: exige autorização expressa da direção e registro (Política V1 sec.10 e sec.14).",
    "Não aceita exposição de caixa acima de 10% do contrato sem autorização expressa da direção (Política V1 sec.11).",
    "Não altera escopo, preço ou prazo contratual com o cliente sem aditivo aprovado pelo Comercial e pela direção.",
    "Não substitui equipamento especificado por outro não homologado pelo CIO.",
    "Não contrata terceiro novo sem documentação de segurança do trabalho (NR-10/NR-35 quando aplicável) e sem aprovação da direção."
   ]
  },
  "equipe": [
   {
    "papel": "gerente_obra",
    "nome": "Gerente de projetos de obra",
    "reporta_a": "COO",
    "responsabilidades": [
     "Conduzir o kickoff com o Comercial, o cliente e o arquiteto/construtora e emitir o termo de abertura",
     "Montar e manter o cronograma por fases e a lista de restrições de cada obra",
     "Enviar o status semanal ao cliente e ao arquiteto parceiro",
     "Controlar mudanças de escopo (aditivos) e acionar Comercial/Finanças",
     "Conduzir o aceite do cliente e a passagem formal para o Pós-venda"
    ],
    "indicadores": [
     "entregas_no_prazo",
     "tempo_kickoff",
     "ppc_semanal"
    ]
   },
   {
    "papel": "coordenador_campo",
    "nome": "Coordenador de campo",
    "reporta_a": "COO",
    "responsabilidades": [
     "Distribuir e acompanhar diariamente as equipes próprias e terceirizadas",
     "Garantir segurança do trabalho (EPI, NR-10, NR-35) e proteção dos acabamentos do cliente",
     "Aplicar os checklists de instalação e registrar evidências fotográficas",
     "Registrar ocorrências e retrabalhos no mesmo dia"
    ],
    "indicadores": [
     "ppc_semanal",
     "horas_retrabalho",
     "aprovacao_primeira_inspecao"
    ]
   },
   {
    "papel": "comprador",
    "nome": "Comprador técnico e logística",
    "reporta_a": "COO",
    "responsabilidades": [
     "Cotar com no mínimo três fornecedores quando possível e registrar o custo total (frete, seguro, prazo, garantia)",
     "Verificar com Finanças a cobertura financeira da fase antes de emitir pedido relevante",
     "Acompanhar prazos de entrega, importação e transporte até a obra ou o almoxarifado",
     "Conferir recebimento (quantidade, modelo, número de série, nota fiscal) e registrar avarias"
    ],
    "indicadores": [
     "compras_com_cobertura",
     "otif_fornecedores"
    ]
   },
   {
    "papel": "tecnico_campo",
    "nome": "Técnico instalador / líder de equipe",
    "reporta_a": "coordenador_campo",
    "responsabilidades": [
     "Executar infraestrutura, passagem e terminação de cabos, montagem de racks e instalação de equipamentos conforme projeto executivo",
     "Certificar o cabeamento e identificar pontos e patch panels conforme o padrão técnico",
     "Preencher os checklists de instalação com fotos"
    ],
    "indicadores": [
     "aprovacao_primeira_inspecao",
     "horas_retrabalho"
    ]
   },
   {
    "papel": "inspetor_qualidade",
    "nome": "Inspetor de qualidade e comissionamento",
    "reporta_a": "COO",
    "responsabilidades": [
     "Inspecionar cada fase antes de liberar a seguinte (inspeção independente de quem executou)",
     "Conduzir o comissionamento integrado (rede, Wi-Fi, AV, segurança, automação) e a punch list",
     "Preparar a documentação de entrega para o aceite e para o Pós-venda"
    ],
    "indicadores": [
     "aprovacao_primeira_inspecao",
     "aceite_sem_pendencias"
    ]
   }
  ],
  "processos": [
   {
    "id": "execucao_obra",
    "nome": "Execução da obra por fases",
    "descricao": "Do contrato recebido do Comercial até o aceite do cliente e a passagem para o Pós-venda, com portões de qualidade entre as fases.",
    "etapas": [
     {
      "id": "kickoff",
      "nome": "Kickoff e termo de abertura",
      "responsavel": "gerente_obra",
      "criterio_saida": "Contrato, escopo vendido e projeto executivo recebidos; reunião de kickoff realizada com cliente/arquiteto; cronograma por fases, responsáveis e condições de pagamento por fase registrados."
     },
     {
      "id": "infraestrutura",
      "nome": "Infraestrutura e cabeamento",
      "responsavel": "coordenador_campo",
      "criterio_saida": "Tubulação e eletrocalhas conferidas, cabos passados, terminados, identificados e certificados; checklist de cabeamento aprovado pelo inspetor."
     },
     {
      "id": "equipamentos",
      "nome": "Equipamentos (compra e recebimento)",
      "responsavel": "comprador",
      "criterio_saida": "Equipamentos da fase comprados com cobertura financeira confirmada, recebidos e conferidos (modelo, série, NF)."
     },
     {
      "id": "instalacao",
      "nome": "Instalação",
      "responsavel": "tecnico_campo",
      "criterio_saida": "Racks montados, equipamentos instalados e energizados, checklist de instalação aprovado com fotos."
     },
     {
      "id": "comissionamento",
      "nome": "Programação e comissionamento",
      "responsavel": "inspetor_qualidade",
      "criterio_saida": "Sistemas programados e testados de forma integrada; punch list interna zerada; as-built solicitado à Tecnologia."
     },
     {
      "id": "entrega",
      "nome": "Entrega técnica e aceite",
      "responsavel": "gerente_obra",
      "criterio_saida": "Demonstração ao cliente realizada, termo de aceite assinado, pendências residuais com data acordada."
     },
     {
      "id": "passagem_posvenda",
      "nome": "Passagem para o Pós-venda",
      "responsavel": "gerente_obra",
      "criterio_saida": "Dossiê de entrega (as-built, garantias, contatos, referência do cofre de credenciais) transferido ao Pós-venda e obra encerrada."
     }
    ]
   },
   {
    "id": "compras_logistica",
    "nome": "Compras e logística",
    "descricao": "Da requisição da obra à conferência do material, com verificação obrigatória de cobertura financeira antes de compra relevante (Política V1 sec.10).",
    "etapas": [
     {
      "id": "requisicao",
      "nome": "Requisição",
      "responsavel": "gerente_obra",
      "criterio_saida": "Itens, quantidades, fase e data de necessidade na obra definidos a partir do projeto executivo."
     },
     {
      "id": "cotacao",
      "nome": "Cotação e custo total",
      "responsavel": "comprador",
      "criterio_saida": "Cotações comparadas por custo total (preço, frete, seguro, prazo, garantia) e somente itens homologados."
     },
     {
      "id": "cobertura",
      "nome": "Verificação de cobertura financeira",
      "responsavel": "comprador",
      "criterio_saida": "Finanças confirma que o recebido cobre os desembolsos da fase, ou a direção autoriza exceção por escrito."
     },
     {
      "id": "pedido",
      "nome": "Pedido e acompanhamento",
      "responsavel": "comprador",
      "criterio_saida": "Pedido emitido com prazo de entrega confirmado pelo fornecedor e acompanhado até a chegada."
     },
     {
      "id": "recebimento",
      "nome": "Recebimento e conferência",
      "responsavel": "comprador",
      "criterio_saida": "Material conferido contra pedido e NF, números de série registrados, avarias reportadas."
     }
    ]
   },
   {
    "id": "qualidade_ocorrencias",
    "nome": "Qualidade, ocorrências e retrabalho",
    "descricao": "Checklists por fase, registro de ocorrências de campo e ciclo PDCA de correção e prevenção.",
    "etapas": [
     {
      "id": "registro",
      "nome": "Registro da ocorrência",
      "responsavel": "coordenador_campo",
      "criterio_saida": "Ocorrência registrada no mesmo dia com obra, categoria, gravidade e fotos."
     },
     {
      "id": "analise",
      "nome": "Análise de causa raiz",
      "responsavel": "inspetor_qualidade",
      "criterio_saida": "Causa raiz (5 porquês) e origem (equipe, terceiro, fornecedor, outra disciplina, projeto) definidas."
     },
     {
      "id": "correcao",
      "nome": "Correção",
      "responsavel": "coordenador_campo",
      "criterio_saida": "Ação corretiva executada e custo/horas de retrabalho apurados."
     },
     {
      "id": "verificacao",
      "nome": "Verificação e prevenção",
      "responsavel": "inspetor_qualidade",
      "criterio_saida": "Correção verificada; se aplicável, checklist ou padrão técnico atualizado com a lição aprendida."
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "obra",
    "nome": "Obra",
    "descricao": "Projeto contratado em execução, do kickoff à passagem para o Pós-venda.",
    "responsavel": "gerente_obra",
    "estados": [
     "kickoff",
     "infraestrutura",
     "equipamentos",
     "instalacao",
     "comissionamento",
     "aceite",
     "concluida",
     "suspensa",
     "cancelada"
    ],
    "estado_inicial": "kickoff",
    "estados_finais": [
     "concluida",
     "cancelada"
    ],
    "campos": [
     {
      "id": "cliente",
      "rotulo": "Cliente",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "contrato_ref",
      "rotulo": "Referência do contrato (Comercial)",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "endereco_obra",
      "rotulo": "Endereço da obra",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "arquiteto_parceiro",
      "rotulo": "Arquiteto / designer / construtora parceira",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "escopo_resumo",
      "rotulo": "Escopo contratado (sistemas e ambientes)",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "valor_contrato",
      "rotulo": "Valor do contrato",
      "tipo": "dinheiro",
      "obrigatorio": true
     },
     {
      "id": "valor_recebido",
      "rotulo": "Valor recebido até agora",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "faixa_exposicao",
      "rotulo": "Exposição de caixa da obra (recebido x comprometido)",
      "tipo": "opcao",
      "opcoes": [
       "Zero ou positiva",
       "Negativa até 10% do contrato",
       "Negativa acima de 10% — autorizada pela direção",
       "Negativa acima de 10% — sem autorização"
      ],
      "obrigatorio": false
     },
     {
      "id": "data_kickoff",
      "rotulo": "Data do kickoff",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "liberacao_construtora",
      "rotulo": "Próxima liberação de área pela construtora",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "data_entrega_prevista",
      "rotulo": "Entrega técnica prevista (linha de base)",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "restricao_atual",
      "rotulo": "Restrição atual da obra",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "pct_avanco",
      "rotulo": "Avanço físico (%)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "data_aceite",
      "rotulo": "Data do aceite do cliente",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "termo_aceite_assinado",
      "rotulo": "Termo de aceite assinado",
      "tipo": "sim_nao",
      "obrigatorio": false
     },
     {
      "id": "passagem_posvenda",
      "rotulo": "Dossiê entregue ao Pós-venda",
      "tipo": "sim_nao",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "compra",
    "nome": "Compra",
    "descricao": "Requisição e pedido de equipamentos, materiais ou serviços de terceiros para uma obra, com controle de cobertura financeira da fase.",
    "responsavel": "comprador",
    "estados": [
     "requisicao",
     "cotacao",
     "aguardando_cobertura",
     "aprovada",
     "pedido_emitido",
     "em_transito",
     "recebida",
     "conferida",
     "cancelada"
    ],
    "estado_inicial": "requisicao",
    "estados_finais": [
     "conferida",
     "cancelada"
    ],
    "campos": [
     {
      "id": "obra_ref",
      "rotulo": "Obra",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "fase",
      "rotulo": "Fase da obra",
      "tipo": "opcao",
      "opcoes": [
       "Infraestrutura/cabeamento",
       "Equipamentos",
       "Instalação",
       "Programação/comissionamento",
       "Entrega"
      ],
      "obrigatorio": true
     },
     {
      "id": "itens",
      "rotulo": "Itens e quantidades (somente homologados)",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "fornecedor",
      "rotulo": "Fornecedor / distribuidor",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "qtd_cotacoes",
      "rotulo": "Número de cotações",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "compra_relevante",
      "rotulo": "Compra relevante de equipamentos",
      "tipo": "sim_nao",
      "obrigatorio": true
     },
     {
      "id": "cobertura_financeira",
      "rotulo": "Cobertura financeira da fase (Política V1 sec.10)",
      "tipo": "opcao",
      "opcoes": [
       "Coberta — recebido cobre os desembolsos da fase",
       "Exceção autorizada pela direção",
       "Não coberta"
      ],
      "obrigatorio": false
     },
     {
      "id": "data_necessidade",
      "rotulo": "Data de necessidade na obra",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_prevista_entrega",
      "rotulo": "Entrega prometida pelo fornecedor",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "nota_fiscal",
      "rotulo": "Número da nota fiscal",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "conferencia_ok",
      "rotulo": "Conferência sem divergência",
      "tipo": "sim_nao",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "ocorrencia",
    "nome": "Ocorrência de obra",
    "descricao": "Problema de campo: retrabalho, avaria, material com defeito, interferência de outra disciplina, falha de programação ou reclamação do cliente/arquiteto.",
    "responsavel": "coordenador_campo",
    "estados": [
     "aberta",
     "em_analise",
     "em_correcao",
     "verificacao",
     "encerrada",
     "cancelada"
    ],
    "estado_inicial": "aberta",
    "estados_finais": [
     "encerrada",
     "cancelada"
    ],
    "campos": [
     {
      "id": "obra_ref",
      "rotulo": "Obra",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "Retrabalho de instalação",
       "Dano ou avaria em acabamento",
       "Material com defeito",
       "Interferência de outra disciplina",
       "Falha de programação",
       "Segurança do trabalho",
       "Reclamação do cliente ou arquiteto"
      ],
      "obrigatorio": true
     },
     {
      "id": "gravidade",
      "rotulo": "Gravidade",
      "tipo": "opcao",
      "opcoes": [
       "Baixa",
       "Média",
       "Alta",
       "Crítica"
      ],
      "obrigatorio": true
     },
     {
      "id": "descricao",
      "rotulo": "Descrição e evidências",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "origem",
      "rotulo": "Origem",
      "tipo": "opcao",
      "opcoes": [
       "Equipe própria",
       "Terceiro contratado",
       "Fornecedor",
       "Outra disciplina da obra",
       "Projeto executivo"
      ],
      "obrigatorio": false
     },
     {
      "id": "causa_raiz",
      "rotulo": "Causa raiz (5 porquês)",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "acao_corretiva",
      "rotulo": "Ação corretiva e preventiva",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "horas_retrabalho",
      "rotulo": "Horas de retrabalho",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "custo_retrabalho",
      "rotulo": "Custo do retrabalho",
      "tipo": "dinheiro",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "checklist",
    "nome": "Checklist de instalação e qualidade",
    "descricao": "Inspeção de uma fase da obra (portão de qualidade) com itens verificados, não conformidades e evidências.",
    "responsavel": "inspetor_qualidade",
    "estados": [
     "pendente",
     "em_execucao",
     "reprovado",
     "aprovado",
     "dispensado"
    ],
    "estado_inicial": "pendente",
    "estados_finais": [
     "aprovado",
     "dispensado"
    ],
    "campos": [
     {
      "id": "obra_ref",
      "rotulo": "Obra",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "tipo_checklist",
      "rotulo": "Tipo de checklist",
      "tipo": "opcao",
      "opcoes": [
       "Pré-infraestrutura (tubulação e eletrocalhas)",
       "Cabeamento e certificação",
       "Rack, energia e aterramento",
       "Instalação de equipamentos",
       "Programação e comissionamento",
       "Qualidade pré-entrega (punch list)",
       "Aceite do cliente"
      ],
      "obrigatorio": true
     },
     {
      "id": "tentativa",
      "rotulo": "Inspeção nº",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "itens_nao_conformes",
      "rotulo": "Itens não conformes",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "evidencias_fotos",
      "rotulo": "Evidências fotográficas anexadas",
      "tipo": "sim_nao",
      "obrigatorio": false
     },
     {
      "id": "executado_por",
      "rotulo": "Equipe que executou",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "observacoes",
      "rotulo": "Observações e pendências",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "reuniao_diaria_campo",
    "nome": "Alinhamento diário de campo (15 minutos)",
    "frequencia": "diaria",
    "responsavel": "coordenador_campo",
    "passos": [
     "Confirmar equipes, veículos e materiais de cada obra do dia",
     "Verificar restrições do dia (área liberada, energia, acesso ao condomínio)",
     "Lembrar EPI e requisitos NR-10/NR-35 das atividades do dia",
     "Registrar no VEOS ocorrências do dia anterior ainda não lançadas"
    ]
   },
   {
    "id": "planejamento_semanal",
    "nome": "Planejamento semanal puxado (Last Planner)",
    "frequencia": "semanal",
    "responsavel": "gerente_obra",
    "passos": [
     "Medir o PPC da semana anterior e registrar as causas de não cumprimento",
     "Revisar o plano de médio prazo (4 a 6 semanas) e a lista de restrições por obra",
     "Remover restrições: cobrar liberações da construtora, compras e projetos pendentes",
     "Comprometer com a equipe apenas as atividades sem restrição para a semana seguinte"
    ]
   },
   {
    "id": "revisao_compras_cobertura",
    "nome": "Revisão de compras e cobertura financeira",
    "frequencia": "semanal",
    "responsavel": "comprador",
    "passos": [
     "Listar compras relevantes previstas para os próximos 30 dias por obra e fase",
     "Conferir com Finanças o recebido de cada contrato versus os desembolsos da fase (Política V1 sec.10)",
     "Encaminhar à direção apenas as exceções, com justificativa e impacto financeiro (sec.14)",
     "Cobrar fornecedores com entregas atrasadas e reprogramar a obra se necessário"
    ]
   },
   {
    "id": "status_cliente",
    "nome": "Status semanal para cliente e arquiteto",
    "frequencia": "semanal",
    "responsavel": "gerente_obra",
    "passos": [
     "Atualizar avanço físico, fase atual e restrição de cada obra",
     "Enviar status (verde/amarelo/vermelho) ao cliente e ao arquiteto parceiro",
     "Registrar pedidos de mudança recebidos e encaminhar ao Comercial como aditivo"
    ]
   },
   {
    "id": "auditoria_qualidade",
    "nome": "Auditoria de qualidade em campo",
    "frequencia": "quinzenal",
    "responsavel": "inspetor_qualidade",
    "passos": [
     "Visitar sem aviso ao menos duas obras em andamento",
     "Verificar identificação de cabos, organização de rack, limpeza e proteção de acabamentos",
     "Registrar não conformidades como ocorrência e orientar a equipe no local"
    ]
   },
   {
    "id": "revisao_operacional_mensal",
    "nome": "Revisão operacional mensal (PDCA)",
    "frequencia": "mensal",
    "responsavel": "COO",
    "passos": [
     "Apresentar à direção os indicadores do setor e a carteira de obras",
     "Analisar ocorrências do mês por categoria e origem; escolher uma causa para eliminar",
     "Comparar o custo de retrabalho com a provisão de risco de 2% (Política V1 sec.6)",
     "Avaliar fornecedores (OTIF, avarias, suporte) e terceiros de campo",
     "Enviar lições aprendidas à Tecnologia para atualização de padrões"
    ]
   }
  ],
  "indicadores": [
   {
    "id": "entregas_no_prazo",
    "nome": "Entregas técnicas no prazo",
    "formula": "Obras com entrega técnica até a data de linha de base ÷ obras entregues no mês × 100",
    "meta": "≥ 90%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "tempo_kickoff",
    "nome": "Tempo até o kickoff",
    "formula": "Dias úteis entre o contrato assinado recebido do Comercial e a reunião de kickoff (média)",
    "meta": "≤ 5 dias úteis",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "ppc_semanal",
    "nome": "PPC — percentual de planos concluídos",
    "formula": "Atividades comprometidas e concluídas na semana ÷ atividades comprometidas × 100",
    "meta": "≥ 80%",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "compras_com_cobertura",
    "nome": "Compras relevantes com fase coberta",
    "formula": "Compras relevantes emitidas com cobertura confirmada ou exceção autorizada ÷ compras relevantes emitidas × 100",
    "meta": "100%",
    "frequencia": "mensal",
    "status": "POLITICA"
   },
   {
    "id": "exposicao_caixa_obras",
    "nome": "Obras com exposição acima de 10% sem autorização",
    "formula": "Quantidade de obras ativas com exposição negativa acima de 10% do contrato sem autorização expressa da direção",
    "meta": "0 (exposição preferencialmente zero ou positiva)",
    "frequencia": "semanal",
    "status": "POLITICA"
   },
   {
    "id": "custo_retrabalho_provisao",
    "nome": "Retrabalho frente à provisão de risco",
    "formula": "Custo de retrabalho, assistência e perdas da obra ÷ receita líquida da obra × 100",
    "meta": "≤ 2% (provisão de risco) — PROPOSTA: usa como referência a provisão de risco de 2% (Política V1 sec.6); a política não fixa meta para este custo (sec.15 prevê revisar com dados reais)",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "horas_retrabalho",
    "nome": "Horas de retrabalho",
    "formula": "Horas de retrabalho ÷ horas totais de campo × 100",
    "meta": "≤ 5%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "aprovacao_primeira_inspecao",
    "nome": "Aprovação na primeira inspeção",
    "formula": "Checklists aprovados na inspeção nº 1 ÷ checklists concluídos × 100",
    "meta": "≥ 90%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "otif_fornecedores",
    "nome": "OTIF de fornecedores",
    "formula": "Pedidos entregues no prazo prometido e completos, sem avaria ÷ pedidos recebidos × 100",
    "meta": "≥ 95%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "aceite_sem_pendencias",
    "nome": "Aceite sem pendências",
    "formula": "Termos de aceite assinados sem punch list residual ÷ aceites do mês × 100",
    "meta": "≥ 80%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   }
  ],
  "sentinelas": [
   {
    "id": "OPS_COMPRA_SEM_COBERTURA",
    "titulo": "Compra aguardando confirmação de cobertura financeira",
    "severidade": "ALTO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "compra",
     "campo": "cobertura_financeira",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "aguardando_cobertura",
        "aprovada",
        "pedido_emitido"
       ]
      }
     ]
    },
    "mensagem": "A compra {{titulo}} está sem verificação de cobertura financeira da fase. Compra relevante só com os valores recebidos cobrindo os desembolsos da fase.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Confirmar com Finanças a cobertura da fase antes do pedido",
      "papel": "comprador",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "solicitacao_cobertura"
     }
    ],
    "fonte": "Política V1 sec.10"
   },
   {
    "id": "OPS_PEDIDO_NAO_COBERTO",
    "titulo": "Pedido emitido com fase não coberta",
    "severidade": "CRITICO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "compra",
     "filtros": [
      {
       "campo": "cobertura_financeira",
       "igual": "Não coberta"
      },
      {
       "campo": "estado",
       "em": [
        "pedido_emitido",
        "em_transito",
        "recebida"
       ]
      }
     ],
     "janela_dias": 30,
     "data_campo": "atualizado_em",
     "operador": ">=",
     "valor": 1
    },
    "mensagem": "{{total}} pedido(s) emitido(s) nos últimos 30 dias com a fase sem cobertura financeira e sem autorização da direção. A VOICE não deve financiar a execução com caixa próprio.",
    "acoes": [
     {
      "tipo": "notificar",
      "para": "direcao"
     },
     {
      "tipo": "tarefa",
      "titulo": "Registrar justificativa, impacto financeiro e responsável pela exceção",
      "papel": "comprador",
      "prazo_dias": 1
     }
    ],
    "fonte": "Política V1 sec.10 e sec.14"
   },
   {
    "id": "OPS_EXPOSICAO_ACIMA_10",
    "titulo": "Obra com exposição de caixa acima de 10% sem autorização",
    "severidade": "CRITICO",
    "status": "POLITICA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "obra",
     "filtros": [
      {
       "campo": "faixa_exposicao",
       "igual": "Negativa acima de 10% — sem autorização"
      },
      {
       "campo": "estado",
       "nao_em": [
        "concluida",
        "cancelada"
       ]
      }
     ],
     "janela_dias": 60,
     "data_campo": "atualizado_em",
     "operador": ">=",
     "valor": 1
    },
    "mensagem": "{{total}} obra(s) com exposição financeira acima de 10% do contrato sem autorização expressa da direção.",
    "acoes": [
     {
      "tipo": "notificar",
      "para": "direcao"
     },
     {
      "tipo": "notificar",
      "para": "COO"
     },
     {
      "tipo": "tarefa",
      "titulo": "Suspender novas compras da obra até regularizar recebimentos ou obter autorização",
      "papel": "gerente_obra",
      "prazo_dias": 1
     }
    ],
    "fonte": "Política V1 sec.11"
   },
   {
    "id": "OPS_KICKOFF_ATRASADO",
    "titulo": "Contrato recebido sem kickoff",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "obra",
     "filtros": [
      {
       "campo": "estado",
       "igual": "kickoff"
      }
     ],
     "dias": 7,
     "data_campo": "criado_em"
    },
    "mensagem": "A obra {{titulo}} foi recebida do Comercial há {{dias}} dias e ainda não teve kickoff. O cliente premium espera ver o início organizado.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Agendar kickoff com cliente, arquiteto e Comercial",
      "papel": "gerente_obra",
      "prazo_dias": 2
     },
     {
      "tipo": "rascunho",
      "modelo": "convite_kickoff"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (PMBOK: termo de abertura antes da execução)"
   },
   {
    "id": "OPS_ENTREGA_EM_RISCO",
    "titulo": "Entrega técnica vencendo ou vencida",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "obra",
     "campo": "data_entrega_prevista",
     "filtros": [
      {
       "campo": "estado",
       "nao_em": [
        "aceite",
        "suspensa"
       ]
      }
     ],
     "antecedencia_dias": 10
    },
    "mensagem": "A entrega técnica da obra {{titulo}} está a {{dias}} dia(s) da linha de base (ou já passou) e a obra ainda não chegou ao aceite.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Reavaliar restrição e caminho crítico; propor plano de recuperação",
      "papel": "gerente_obra",
      "prazo_dias": 2
     },
     {
      "tipo": "rascunho",
      "modelo": "status_semanal_cliente"
     },
     {
      "tipo": "notificar",
      "para": "COO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Corrente Crítica: consumo do pulmão de projeto)"
   },
   {
    "id": "OPS_FORNECEDOR_ATRASADO",
    "titulo": "Entrega de fornecedor atrasada",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "compra",
     "campo": "data_prevista_entrega",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "pedido_emitido",
        "em_transito"
       ]
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "O pedido {{titulo}} passou da data de entrega prometida pelo fornecedor ({{dias}} dia(s)).",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "cobranca_fornecedor"
     },
     {
      "tipo": "tarefa",
      "titulo": "Obter nova data do fornecedor e avaliar impacto no cronograma da obra",
      "papel": "comprador",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (OTIF, skill vendor-review)"
   },
   {
    "id": "OPS_COMPRA_PRAZO_CURTO",
    "titulo": "Material sem pedido perto da data de necessidade",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "compra",
     "campo": "data_necessidade",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "requisicao",
        "cotacao",
        "aguardando_cobertura",
        "aprovada"
       ]
      }
     ],
     "antecedencia_dias": 15
    },
    "mensagem": "A compra {{titulo}} ainda não tem pedido e o material é necessário na obra em {{dias}} dia(s). Prazo de entrega pode virar a restrição da obra.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Fechar cotação e cobertura ou replanejar a atividade com a equipe",
      "papel": "comprador",
      "prazo_dias": 1
     },
     {
      "tipo": "notificar",
      "para": "gerente_obra"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Last Planner: remoção de restrições no médio prazo)"
   },
   {
    "id": "OPS_OCORRENCIA_GRAVE_PARADA",
    "titulo": "Ocorrência grave sem andamento",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "ocorrencia",
     "filtros": [
      {
       "campo": "gravidade",
       "em": [
        "Alta",
        "Crítica"
       ]
      },
      {
       "campo": "estado",
       "nao_em": [
        "encerrada",
        "cancelada"
       ]
      }
     ],
     "dias": 2
    },
    "mensagem": "A ocorrência {{titulo}} (gravidade alta/crítica) está sem atualização há {{dias}} dias.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Definir ação corretiva e comunicar o cliente se houver impacto visível",
      "papel": "coordenador_campo",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "comunicado_ocorrencia"
     },
     {
      "tipo": "notificar",
      "para": "COO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (PDCA / gestão de não conformidades)"
   },
   {
    "id": "OPS_RETRABALHO_RECORRENTE",
    "titulo": "Retrabalho recorrente no mês",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "ocorrencia",
     "filtros": [
      {
       "campo": "categoria",
       "igual": "Retrabalho de instalação"
      }
     ],
     "janela_dias": 30,
     "data_campo": "criado_em",
     "operador": ">=",
     "valor": 3
    },
    "mensagem": "{{total}} ocorrências de retrabalho de instalação nos últimos 30 dias. Retrabalho consome a provisão de risco de 2% do projeto.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Analisar causa comum (5 porquês) e atualizar checklist ou treinamento",
      "papel": "inspetor_qualidade",
      "prazo_dias": 5
     },
     {
      "tipo": "notificar",
      "para": "COO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Lean: eliminação de desperdício de retrabalho); referência Política V1 sec.6"
   },
   {
    "id": "OPS_ACEITE_PENDENTE",
    "titulo": "Obra parada aguardando aceite",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "obra",
     "filtros": [
      {
       "campo": "estado",
       "igual": "aceite"
      }
     ],
     "dias": 7
    },
    "mensagem": "A obra {{titulo}} está há {{dias}} dias aguardando aceite. Sem aceite não há parcela final (10%) nem passagem ao Pós-venda.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Agendar demonstração final e coletar o termo de aceite",
      "papel": "gerente_obra",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "termo_aceite"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (PMBOK: encerramento formal); referência Política V1 sec.10 (parcela na entrega técnica)"
   }
  ],
  "modelos": [
   {
    "id": "convite_kickoff",
    "tipo": "email",
    "assunto": "VOICE | Início do projeto {{titulo}} — reunião de kickoff",
    "corpo": "Olá, {{cliente}}.\n\nObrigado pela confiança na VOICE Ambientes Inteligentes. Para iniciarmos o projeto {{titulo}} com organização, propomos uma reunião de kickoff de 45 minutos com você e com o escritório {{arquiteto_parceiro}}.\n\nPauta:\n1. Escopo contratado e ambientes atendidos\n2. Cronograma por fases (infraestrutura, equipamentos, instalação, programação/comissionamento e entrega)\n3. Interfaces com a construtora e demais disciplinas\n4. Pontos de contato, horários de acesso à obra e regras do condomínio\n5. Marcos de pagamento vinculados às fases\n\nSeu gerente de projeto será {{responsavel}}. Sugerimos as datas abaixo — fique à vontade para indicar outra.\n\nAtenciosamente,\nVOICE Ambientes Inteligentes"
   },
   {
    "id": "status_semanal_cliente",
    "tipo": "email",
    "assunto": "VOICE | Status semanal — {{titulo}}",
    "corpo": "Olá, {{cliente}}.\n\nSegue o status do projeto {{titulo}}:\n\nSituação geral: [verde / amarelo / vermelho]\nFase atual: {{estado}}\nAvanço físico: {{pct_avanco}}%\nEntrega técnica prevista: {{data_entrega_prevista}}\n\nConcluído nesta semana:\n- ...\n\nPróxima semana:\n- ...\n\nDependências de terceiros: {{restricao_atual}}\n\nQualquer dúvida, estou à disposição.\n{{responsavel}} — VOICE Ambientes Inteligentes"
   },
   {
    "id": "solicitacao_cobertura",
    "tipo": "documento",
    "assunto": "Verificação de cobertura financeira — {{titulo}}",
    "corpo": "Solicitação de verificação de cobertura (Política V1 sec.10)\n\nObra: {{obra_ref}}\nFase: {{fase}}\nCompra: {{titulo}}\nFornecedor: {{fornecedor}}\nValor da compra: {{valor}}\nData de necessidade na obra: {{data_necessidade}}\n\nPara Finanças preencher:\n- Valor já recebido do contrato: R$ ...\n- Desembolsos da fase (equipamentos, frete, seguro, mão de obra, encargos): R$ ...\n- Resultado: [ ] Coberta  [ ] Não coberta\n\nSe não coberta, exceção somente com autorização expressa da direção, contendo: responsável pela autorização, justificativa, impacto financeiro conhecido e registro da decisão (sec.14).\n\nSolicitante: {{responsavel}}"
   },
   {
    "id": "cobranca_fornecedor",
    "tipo": "whatsapp",
    "assunto": "Cobrança de entrega",
    "corpo": "Olá! Aqui é da VOICE Ambientes Inteligentes. O pedido {{titulo}} (NF/pedido {{nota_fiscal}}) tinha entrega prometida para {{data_prevista_entrega}} e ainda não recebemos. O material é necessário na obra em {{data_necessidade}}. Pode nos confirmar hoje a nova data e o código de rastreio? Obrigado."
   },
   {
    "id": "comunicado_ocorrencia",
    "tipo": "email",
    "assunto": "VOICE | Ocorrência na obra — {{titulo}}",
    "corpo": "Olá.\n\nQueremos informar com transparência uma ocorrência na obra {{obra_ref}}:\n\nO que aconteceu: {{descricao}}\nO que já fizemos: ...\nO que faremos e quando: {{acao_corretiva}}\nImpacto no cronograma: [nenhum / X dias]\n\nA correção é de responsabilidade da VOICE e não gera custo adicional para você quando a origem for nossa. Seguimos à disposição.\n\n{{responsavel}} — VOICE Ambientes Inteligentes"
   },
   {
    "id": "termo_aceite",
    "tipo": "documento",
    "assunto": "Termo de aceite — {{titulo}}",
    "corpo": "TERMO DE ACEITE DE ENTREGA TÉCNICA\n\nCliente: {{cliente}}\nObra: {{titulo}} — {{endereco_obra}}\nContrato: {{contrato_ref}}\n\nDeclaro que os sistemas abaixo foram demonstrados e estão em funcionamento:\n[ ] Rede e Wi-Fi  [ ] Áudio e vídeo  [ ] Automação e iluminação  [ ] Segurança eletrônica  [ ] Controle de acesso  [ ] Outros: ...\n\nPendências residuais (com data acordada):\n- ...\n\nRecebi: orientações de uso, contatos de suporte e informações de garantia. As credenciais administrativas ficam sob custódia da VOICE em cofre digital e serão fornecidas conforme contrato.\n\nData: ____/____/______\nCliente: __________________   VOICE: {{responsavel}}"
   },
   {
    "id": "passagem_posvenda",
    "tipo": "documento",
    "assunto": "Passagem para o Pós-venda — {{titulo}}",
    "corpo": "DOSSIÊ DE PASSAGEM PARA O PÓS-VENDA\n\nObra: {{titulo}}\nCliente: {{cliente}}\nParceiro: {{arquiteto_parceiro}}\nData do aceite: {{data_aceite}}\n\n1. Escopo entregue: {{escopo_resumo}}\n2. As-built (link fornecido pela Tecnologia): ...\n3. Referência do item no cofre de credenciais (nunca a senha): ...\n4. Equipamentos, números de série e garantias: ...\n5. Pendências residuais e datas: ...\n6. Preferências do cliente e observações de relacionamento: ...\n7. Ocorrências relevantes durante a obra: ...\n\nEntregue por: {{responsavel}}"
   }
  ],
  "documentos": [
   "Termo de abertura da obra (kickoff) com escopo, cronograma por fases e contatos",
   "Cronograma por fases e lista de restrições (plano de médio prazo)",
   "Mapa de fornecedores homologados e comparativo de custo total",
   "Checklist de pré-infraestrutura (tubulação, eletrocalhas, caixas)",
   "Checklist de cabeamento com relatórios de certificação",
   "Checklist de rack, energia e aterramento",
   "Checklist de comissionamento integrado e punch list",
   "Termo de aceite de entrega técnica",
   "Dossiê de passagem para o Pós-venda",
   "Procedimento de segurança do trabalho em obra (NR-10, NR-35, EPI) e integração de terceiros"
  ],
  "relacoes": [
   {
    "setor": "vendas",
    "fluxo": "Recebe o contrato assinado, o escopo vendido e as condições de pagamento por fase para o kickoff; devolve pedidos de mudança do cliente para virar aditivo."
   },
   {
    "setor": "financas",
    "fluxo": "Consulta a cobertura financeira da fase antes de compras relevantes e informa exposição de caixa por obra; informa marcos concluídos para faturamento das parcelas (50/40/10)."
   },
   {
    "setor": "tecnologia",
    "fluxo": "Recebe projeto executivo, padrões técnicos e lista de produtos homologados; envia lições aprendidas e solicita o as-built e o registro de credenciais no cofre."
   },
   {
    "setor": "posvenda",
    "fluxo": "Entrega o dossiê de passagem após o aceite; recebe retorno de chamados causados por falhas de instalação."
   },
   {
    "setor": "pessoas",
    "fluxo": "Solicita capacitação técnica, integração de terceiros e comprovação de NR-10/NR-35 das equipes."
   },
   {
    "setor": "secretaria",
    "fluxo": "Recebe ordens da direção distribuídas pela Secretaria e devolve o retorno no prazo combinado."
   },
   {
    "setor": "direcao",
    "fluxo": "Reporta carteira de obras, exceções de cobertura e exposição de caixa para autorização."
   }
  ],
  "fontes": [
   {
    "titulo": "VOICE — Política de Saúde Financeira V1 (sec.6, 10, 11 e 14)",
    "tipo": "site",
    "ref": "VOICE_360/04 - PADROES/VOICE - Politica de Saude Financeira - V1.md"
   },
   {
    "titulo": "Skill vendor-review (custo total e risco de fornecedores)",
    "tipo": "skill",
    "ref": "operations/skills/vendor-review/SKILL.md"
   },
   {
    "titulo": "Skill capacity-plan (utilização de equipes e caminho crítico)",
    "tipo": "skill",
    "ref": "operations/skills/capacity-plan/SKILL.md"
   },
   {
    "titulo": "Skill status-report (status verde/amarelo/vermelho, riscos e decisões)",
    "tipo": "skill",
    "ref": "operations/skills/status-report/SKILL.md"
   },
   {
    "titulo": "Skill process-doc (RACI e procedimentos)",
    "tipo": "skill",
    "ref": "operations/skills/process-doc/SKILL.md"
   },
   {
    "titulo": "Skill process-optimization (desperdícios: espera, retrabalho, repasses)",
    "tipo": "skill",
    "ref": "operations/skills/process-optimization/SKILL.md"
   },
   {
    "titulo": "Skill risk-assessment (matriz probabilidade × impacto)",
    "tipo": "skill",
    "ref": "operations/skills/risk-assessment/SKILL.md"
   },
   {
    "titulo": "Skill inventory-planner (prazo de reposição versus cobertura)",
    "tipo": "skill",
    "ref": "small-business/skills/inventory-planner/SKILL.md"
   },
   {
    "titulo": "Guia PMBOK — 7ª edição",
    "tipo": "livro",
    "ref": "https://www.pmi.org/standards/pmbok"
   },
   {
    "titulo": "Last Planner System — Lean Construction Institute",
    "tipo": "metodo",
    "ref": "https://leanconstruction.org/lean-topics/last-planner-system/"
   },
   {
    "titulo": "Corrente Crítica — Eliyahu M. Goldratt",
    "tipo": "livro",
    "ref": "Goldratt, E. M. Critical Chain. North River Press, 1997"
   },
   {
    "titulo": "NR-10 — Segurança em instalações e serviços em eletricidade",
    "tipo": "norma",
    "ref": "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-10-nr-10"
   },
   {
    "titulo": "NR-35 — Trabalho em altura",
    "tipo": "norma",
    "ref": "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-35-nr-35"
   }
  ]
 },
 {
  "id": "tecnologia",
  "sigla": "CIO",
  "nome": "Tecnologia e Engenharia",
  "missao": "Garantir que todo sistema entregue pela VOICE siga padrões de engenharia comprovados, use somente produtos homologados, seja documentado como construído e proteja as credenciais e os dados dos clientes e da própria VOICE.",
  "cor": "blue",
  "diretor": {
   "titulo": "Diretora de Tecnologia e Engenharia (CIO)",
   "nome": "Beatriz Nogueira Sampaio",
   "perfil": "Persona fictícia. Engenheira de telecomunicações com cerca de 15 anos em projetos de infraestrutura de redes, audiovisual e segurança eletrônica para residências e escritórios de alto padrão, e experiência em gestão de serviços de TI. Estilo rigoroso e didático: tudo o que vai para a obra precisa de padrão escrito, e tudo o que foi feito na obra precisa estar documentado.",
   "especialidades": [
    "Cabeamento estruturado residencial e comercial (ABNT NBR 16264, ABNT NBR 14565, ANSI/TIA-568, ANSI/TIA-606)",
    "Redes corporativas e residenciais: VLANs, Wi-Fi de alta densidade, segmentação de IoT e acesso remoto seguro",
    "Integração de áudio e vídeo, automação, segurança eletrônica e controle de acesso",
    "Gestão de serviços de TI (ITIL 4): incidentes, mudanças e configuração",
    "Segurança da informação (ISO/IEC 27001/27002) e LGPD aplicada a sistemas e dados de clientes"
   ],
   "metodos": [
    {
     "nome": "ITIL 4 — gerenciamento de incidentes, mudanças e configuração",
     "autor": "AXELOS / PeopleCert",
     "uso": "Incidentes classificados por severidade (SEV1 a SEV4) com responsável e cadência de comunicação; mudanças em VEOS, Zoho, integrações e redes de clientes passam por avaliação de impacto e plano de reversão; as-built funciona como base de configuração de cada obra."
    },
    {
     "nome": "ISO/IEC 27001 e 27002 — controles de segurança da informação",
     "autor": "ISO/IEC",
     "uso": "Cofre de senhas com acesso por função, revisão periódica de acessos, backup com teste de restauração, gestão de fornecedores de nuvem e registro de incidentes."
    },
    {
     "nome": "Postmortem sem culpa e 5 porquês",
     "autor": "Prática de Site Reliability Engineering (Google) / Sistema Toyota",
     "uso": "Todo incidente SEV1/SEV2 e toda falha recorrente de produto geram análise de causa raiz com ações preventivas e responsáveis, sem busca de culpados."
    },
    {
     "nome": "Privacidade desde a concepção (Privacy by Design)",
     "autor": "Ann Cavoukian; incorporada à LGPD (Lei 13.709/2018, art. 46)",
     "uso": "Câmeras, controle de acesso e automação coletam dados pessoais (imagem, biometria, hábitos): coletar o mínimo, restringir acesso remoto, definir retenção e registrar quem acessa."
    },
    {
     "nome": "Engenharia por normas de cabeamento e instalações",
     "autor": "ABNT / TIA",
     "uso": "Projeto executivo e certificação seguem ABNT NBR 16264 (residencial), ABNT NBR 14565 (edifícios comerciais), ANSI/TIA-568 (desempenho), ANSI/TIA-606 (identificação) e interface elétrica conforme ABNT NBR 5410."
    }
   ],
   "principios": [
    "Credenciais nunca ficam no registro, em e-mail, WhatsApp ou planilha: ficam no cofre de senhas; no VEOS registra-se apenas a referência do item no cofre.",
    "Só vai para a obra produto homologado, com compatibilidade testada, suporte no Brasil e homologação Anatel quando for equipamento de radiofrequência.",
    "Projeto executivo revisado por um segundo engenheiro antes de liberar para a obra.",
    "Sem as-built não há entrega completa: mapa de portas, VLANs, endereçamento, versões de firmware e backup de configurações.",
    "Toda mudança tem plano de reversão escrito antes de ser executada.",
    "Rede do cliente segmentada: IoT, câmeras e convidados separados da rede principal; acesso remoto apenas por canal seguro e autorizado.",
    "Incidente com dado pessoal é tratado como prioridade máxima e avaliado para comunicação à ANPD e aos titulares."
   ],
   "como_aconselha": "Técnico, mas traduzido para a decisão de negócio. Responde com o risco (probabilidade × impacto), a norma ou padrão aplicável, a recomendação e o custo de não fazer. Quando não há dado suficiente, diz o que precisa ser testado antes de opinar.",
   "perguntas_chave": [
    "Este produto está homologado e testado com a plataforma de automação que vamos usar?",
    "O projeto executivo foi revisado por outro engenheiro antes de ir para a obra?",
    "Onde estão as credenciais desta obra — estão no cofre, com acesso restrito?",
    "Qual é o plano de reversão se esta mudança der errado?",
    "Este incidente envolve dados pessoais de clientes (imagens, biometria, acessos)?",
    "O as-built da última obra entregue já está completo e arquivado?",
    "Qual padrão técnico está desatualizado frente às lições de campo?"
   ],
   "limites": [
    "Não aprova sozinha a adoção de nova plataforma ou fabricante estratégico: exige decisão da direção com análise de custo total e risco.",
    "Não contrata sistemas ou serviços de nuvem com dados de clientes sem avaliação de segurança e contrato com cláusulas de proteção de dados aprovados pela direção.",
    "Não decide sozinha a comunicação de incidente à ANPD ou aos titulares: prepara a avaliação técnica e a direção decide, com apoio jurídico.",
    "Não acessa remotamente sistemas de cliente sem autorização registrada do cliente.",
    "Não altera escopo técnico vendido sem aditivo tratado pelo Comercial e Operações."
   ]
  },
  "equipe": [
   {
    "papel": "engenheiro_projetos",
    "nome": "Engenheiro de projetos e sistemas",
    "reporta_a": "CIO",
    "responsabilidades": [
     "Elaborar projetos executivos (cabeamento, rede, AV, segurança, controle de acesso, automação) conforme padrões técnicos",
     "Revisar por pares os projetos de outros engenheiros antes da liberação para a obra",
     "Consolidar o as-built e os relatórios de certificação ao final da obra"
    ],
    "indicadores": [
     "projetos_revisados",
     "asbuilt_no_prazo"
    ]
   },
   {
    "papel": "programador_automacao",
    "nome": "Programador de automação e AV",
    "reporta_a": "CIO",
    "responsabilidades": [
     "Programar e comissionar plataformas de automação, áudio e vídeo e iluminação",
     "Manter backup das programações e das configurações de cada obra",
     "Testar compatibilidade de produtos em bancada para homologação"
    ],
    "indicadores": [
     "asbuilt_no_prazo",
     "lead_time_homologacao"
    ]
   },
   {
    "papel": "analista_redes",
    "nome": "Analista de redes e segurança eletrônica",
    "reporta_a": "CIO",
    "responsabilidades": [
     "Projetar e configurar redes, Wi-Fi, VLANs, VPN e acesso remoto seguro",
     "Configurar CFTV, alarme e controle de acesso com mínimo de dados pessoais e retenção definida",
     "Registrar credenciais exclusivamente no cofre e documentar a referência no as-built"
    ],
    "indicadores": [
     "credenciais_em_cofre",
     "mttr_incidentes"
    ]
   },
   {
    "papel": "analista_sistemas",
    "nome": "Analista de sistemas internos",
    "reporta_a": "CIO",
    "responsabilidades": [
     "Sustentar o VEOS, os módulos Zoho (CRM, Books, Projects) e as integrações entre eles",
     "Conduzir mudanças nos sistemas internos com avaliação de impacto e plano de reversão",
     "Executar backups e testes de restauração"
    ],
    "indicadores": [
     "mudancas_sucesso",
     "disponibilidade_sistemas"
    ]
   },
   {
    "papel": "responsavel_seguranca",
    "nome": "Responsável por segurança da informação e privacidade",
    "reporta_a": "CIO",
    "responsabilidades": [
     "Administrar o cofre de senhas e a revisão periódica de acessos",
     "Coordenar a resposta a incidentes de segurança e a avaliação de comunicação à ANPD",
     "Manter o inventário de dados pessoais tratados em sistemas internos e em sistemas de clientes"
    ],
    "indicadores": [
     "incidentes_lgpd_no_prazo",
     "credenciais_em_cofre"
    ]
   }
  ],
  "processos": [
   {
    "id": "ciclo_projeto_tecnico",
    "nome": "Ciclo do projeto técnico",
    "descricao": "Do levantamento técnico ao as-built arquivado, com revisão por pares e controle de configurações.",
    "etapas": [
     {
      "id": "levantamento",
      "nome": "Levantamento técnico",
      "responsavel": "engenheiro_projetos",
      "criterio_saida": "Plantas, ambientes, pontos, requisitos do cliente e do arquiteto e infraestrutura existente registrados."
     },
     {
      "id": "projeto_executivo",
      "nome": "Projeto executivo",
      "responsavel": "engenheiro_projetos",
      "criterio_saida": "Projeto por disciplina conforme padrões vigentes, somente com produtos homologados, com lista de materiais para compras."
     },
     {
      "id": "revisao_pares",
      "nome": "Revisão por pares",
      "responsavel": "engenheiro_projetos",
      "criterio_saida": "Projeto revisado por outro engenheiro, comentários resolvidos e revisão numerada."
     },
     {
      "id": "liberado_obra",
      "nome": "Liberação para a obra",
      "responsavel": "engenheiro_projetos",
      "criterio_saida": "Projeto executivo entregue a Operações e registrado no kickoff."
     },
     {
      "id": "asbuilt",
      "nome": "As-built e configurações",
      "responsavel": "programador_automacao",
      "criterio_saida": "As-built com mapa de portas, VLANs, endereçamento, firmware, backups de programação e referência do cofre de credenciais."
     },
     {
      "id": "arquivo",
      "nome": "Arquivamento e passagem",
      "responsavel": "engenheiro_projetos",
      "criterio_saida": "Dossiê técnico arquivado e disponível para Pós-venda."
     }
    ]
   },
   {
    "id": "homologacao_produtos",
    "nome": "Homologação de produtos",
    "descricao": "Avaliação técnica e comercial de produtos antes de entrarem no catálogo técnico da VOICE.",
    "etapas": [
     {
      "id": "solicitacao",
      "nome": "Solicitação",
      "responsavel": "engenheiro_projetos",
      "criterio_saida": "Produto, fabricante, motivo e aplicação pretendida registrados."
     },
     {
      "id": "avaliacao",
      "nome": "Avaliação documental",
      "responsavel": "engenheiro_projetos",
      "criterio_saida": "Compatibilidade com plataformas, homologação Anatel quando aplicável, garantia e suporte no Brasil verificados."
     },
     {
      "id": "bancada",
      "nome": "Teste de bancada",
      "responsavel": "programador_automacao",
      "criterio_saida": "Integração testada com a plataforma de automação e a rede padrão; firmware testado registrado."
     },
     {
      "id": "piloto",
      "nome": "Piloto em obra controlada",
      "responsavel": "analista_redes",
      "criterio_saida": "Uso real sem falhas por período acordado."
     },
     {
      "id": "decisao",
      "nome": "Decisão",
      "responsavel": "engenheiro_projetos",
      "criterio_saida": "Homologado com restrições documentadas ou reprovado com motivo."
     }
    ]
   },
   {
    "id": "gestao_incidentes_mudancas",
    "nome": "Gestão de incidentes e mudanças",
    "descricao": "Resposta a incidentes técnicos e de segurança (incluindo LGPD) e controle de mudanças em sistemas internos e redes de clientes.",
    "etapas": [
     {
      "id": "registro",
      "nome": "Registro e classificação",
      "responsavel": "analista_redes",
      "criterio_saida": "Incidente registrado com origem, severidade e indicação de envolvimento de dados pessoais."
     },
     {
      "id": "contencao",
      "nome": "Contenção e comunicação",
      "responsavel": "responsavel_seguranca",
      "criterio_saida": "Impacto contido, partes afetadas informadas e, se houver dado pessoal com risco relevante, prazo de comunicação à ANPD registrado."
     },
     {
      "id": "resolucao",
      "nome": "Resolução",
      "responsavel": "analista_redes",
      "criterio_saida": "Serviço restabelecido e verificado com o usuário ou cliente."
     },
     {
      "id": "pos_incidente",
      "nome": "Pós-incidente",
      "responsavel": "responsavel_seguranca",
      "criterio_saida": "Causa raiz e ações preventivas registradas; padrão técnico ou homologação atualizados quando aplicável."
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "padrao_tecnico",
    "nome": "Padrão técnico",
    "descricao": "Regra de engenharia da VOICE por disciplina (ex.: identificação de cabos, VLANs padrão, montagem de rack, retenção de CFTV).",
    "responsavel": "engenheiro_projetos",
    "estados": [
     "rascunho",
     "revisao",
     "vigente",
     "obsoleto"
    ],
    "estado_inicial": "rascunho",
    "estados_finais": [
     "obsoleto"
    ],
    "campos": [
     {
      "id": "disciplina",
      "rotulo": "Disciplina",
      "tipo": "opcao",
      "opcoes": [
       "Cabeamento estruturado",
       "Redes e Wi-Fi",
       "Áudio e vídeo",
       "Segurança eletrônica (CFTV e alarme)",
       "Controle de acesso",
       "Automação e iluminação",
       "Interface elétrica de baixa tensão",
       "Sistemas internos VOICE"
      ],
      "obrigatorio": true
     },
     {
      "id": "norma_referencia",
      "rotulo": "Norma de referência",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "versao",
      "rotulo": "Versão",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "conteudo",
      "rotulo": "Conteúdo do padrão",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "data_revisao",
      "rotulo": "Próxima revisão",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "aprovado_por",
      "rotulo": "Aprovado por",
      "tipo": "texto",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "homologacao",
    "nome": "Homologação de produto",
    "descricao": "Avaliação de um produto ou firmware para entrar no catálogo técnico da VOICE, com matriz de compatibilidade.",
    "responsavel": "engenheiro_projetos",
    "estados": [
     "solicitada",
     "avaliacao",
     "teste_bancada",
     "piloto",
     "homologado",
     "reprovado"
    ],
    "estado_inicial": "solicitada",
    "estados_finais": [
     "homologado",
     "reprovado"
    ],
    "campos": [
     {
      "id": "fabricante",
      "rotulo": "Fabricante",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "modelo",
      "rotulo": "Modelo",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "Rede e Wi-Fi",
       "Áudio e vídeo",
       "Automação e iluminação",
       "Segurança eletrônica",
       "Controle de acesso",
       "Cabeamento e infraestrutura",
       "Energia (nobreak e proteção)"
      ],
      "obrigatorio": true
     },
     {
      "id": "firmware_testado",
      "rotulo": "Firmware testado",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "compatibilidade",
      "rotulo": "Compatibilidade (plataformas, protocolos, limitações)",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "anatel",
      "rotulo": "Homologação Anatel",
      "tipo": "opcao",
      "opcoes": [
       "Homologado Anatel",
       "Não se aplica",
       "Sem homologação — bloqueado"
      ],
      "obrigatorio": false
     },
     {
      "id": "suporte_brasil",
      "rotulo": "Garantia e suporte no Brasil",
      "tipo": "sim_nao",
      "obrigatorio": false
     },
     {
      "id": "resultado_teste",
      "rotulo": "Resultado dos testes",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "incidente",
    "nome": "Incidente técnico ou de segurança",
    "descricao": "Falha em sistema interno da VOICE, em rede ou sistema de cliente sob responsabilidade técnica, falha recorrente de produto ou incidente de segurança da informação.",
    "responsavel": "analista_redes",
    "estados": [
     "registrado",
     "contencao",
     "resolvido",
     "pos_incidente",
     "encerrado"
    ],
    "estado_inicial": "registrado",
    "estados_finais": [
     "encerrado"
    ],
    "campos": [
     {
      "id": "origem",
      "rotulo": "Origem",
      "tipo": "opcao",
      "opcoes": [
       "Sistema interno VOICE (VEOS, Zoho, integrações)",
       "Rede ou sistema de cliente",
       "Falha de produto homologado",
       "Segurança da informação",
       "Acesso indevido ou vazamento de credencial"
      ],
      "obrigatorio": true
     },
     {
      "id": "severidade",
      "rotulo": "Severidade",
      "tipo": "opcao",
      "opcoes": [
       "SEV1",
       "SEV2",
       "SEV3",
       "SEV4"
      ],
      "obrigatorio": true
     },
     {
      "id": "dados_pessoais",
      "rotulo": "Envolve dados pessoais (LGPD)",
      "tipo": "opcao",
      "opcoes": [
       "Não",
       "Em avaliação",
       "Sim — sem risco relevante",
       "Sim — risco ou dano relevante"
      ],
      "obrigatorio": true
     },
     {
      "id": "data_ciencia",
      "rotulo": "Data em que a VOICE tomou ciência",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "prazo_anpd",
      "rotulo": "Prazo de comunicação à ANPD",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "sistemas_afetados",
      "rotulo": "Sistemas e clientes afetados",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "causa_raiz",
      "rotulo": "Causa raiz",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "acoes_preventivas",
      "rotulo": "Ações preventivas",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "projeto_tecnico",
    "nome": "Projeto técnico e as-built",
    "descricao": "Dossiê técnico de uma obra: projeto executivo, revisões, as-built, backups de configuração e referência das credenciais no cofre.",
    "responsavel": "engenheiro_projetos",
    "estados": [
     "levantamento",
     "projeto_executivo",
     "revisao_pares",
     "liberado_obra",
     "asbuilt_pendente",
     "asbuilt_entregue",
     "arquivado"
    ],
    "estado_inicial": "levantamento",
    "estados_finais": [
     "arquivado"
    ],
    "campos": [
     {
      "id": "obra_ref",
      "rotulo": "Obra",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "disciplinas",
      "rotulo": "Disciplinas do projeto",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "revisao_projeto",
      "rotulo": "Revisão atual do projeto",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "revisor",
      "rotulo": "Revisor (segundo engenheiro)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "certificacao_cabeamento",
      "rotulo": "Relatórios de certificação anexados",
      "tipo": "sim_nao",
      "obrigatorio": false
     },
     {
      "id": "backup_configuracoes",
      "rotulo": "Backup de programações e configurações",
      "tipo": "sim_nao",
      "obrigatorio": false
     },
     {
      "id": "ref_cofre",
      "rotulo": "Referência do item no cofre de senhas (NUNCA a senha)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "link_asbuilt",
      "rotulo": "Link do as-built",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "data_limite_asbuilt",
      "rotulo": "Prazo do as-built",
      "tipo": "data",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "mudanca",
    "nome": "Solicitação de mudança",
    "descricao": "Mudança planejada em sistema interno (VEOS, Zoho, integrações), na rede da VOICE ou em sistema de cliente já entregue.",
    "responsavel": "analista_sistemas",
    "estados": [
     "solicitada",
     "avaliacao",
     "aprovada",
     "agendada",
     "executada",
     "revertida",
     "encerrada",
     "cancelada"
    ],
    "estado_inicial": "solicitada",
    "estados_finais": [
     "encerrada",
     "cancelada"
    ],
    "campos": [
     {
      "id": "sistema",
      "rotulo": "Sistema",
      "tipo": "opcao",
      "opcoes": [
       "VEOS",
       "Zoho CRM",
       "Zoho Books",
       "Zoho Projects",
       "Integrações entre sistemas",
       "Rede e infraestrutura da VOICE",
       "Sistema de cliente entregue"
      ],
      "obrigatorio": true
     },
     {
      "id": "tipo_mudanca",
      "rotulo": "Tipo de mudança",
      "tipo": "opcao",
      "opcoes": [
       "Padrão (pré-aprovada)",
       "Normal",
       "Emergencial"
      ],
      "obrigatorio": true
     },
     {
      "id": "impacto",
      "rotulo": "Impacto (usuários, sistemas, processos)",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "plano_reversao",
      "rotulo": "Plano de reversão",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "janela_execucao",
      "rotulo": "Janela de execução",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "autorizacao_cliente",
      "rotulo": "Autorização do cliente registrada (se sistema de cliente)",
      "tipo": "sim_nao",
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "triagem_incidentes",
    "nome": "Triagem diária de incidentes",
    "frequencia": "diaria",
    "responsavel": "analista_redes",
    "passos": [
     "Revisar incidentes abertos e confirmar severidade e responsável",
     "Verificar se algum incidente envolve dados pessoais e se o prazo de comunicação está registrado",
     "Atualizar partes afetadas conforme a cadência da severidade"
    ]
   },
   {
    "id": "comite_mudancas",
    "nome": "Comitê semanal de mudanças",
    "frequencia": "semanal",
    "responsavel": "CIO",
    "passos": [
     "Avaliar mudanças normais solicitadas: impacto, risco e plano de reversão",
     "Aprovar e agendar janelas de execução fora do horário crítico",
     "Revisar mudanças executadas na semana e as revertidas"
    ]
   },
   {
    "id": "revisao_projetos",
    "nome": "Revisão por pares de projetos executivos",
    "frequencia": "semanal",
    "responsavel": "engenheiro_projetos",
    "passos": [
     "Distribuir os projetos da semana para um revisor diferente do autor",
     "Checar aderência a padrões vigentes, produtos homologados e normas (NBR 16264, NBR 14565, TIA-568, TIA-606)",
     "Registrar comentários, resolver e numerar a revisão antes de liberar para a obra"
    ]
   },
   {
    "id": "comite_homologacao",
    "nome": "Comitê de homologação e catálogo técnico",
    "frequencia": "quinzenal",
    "responsavel": "CIO",
    "passos": [
     "Revisar homologações em andamento e resultados de bancada e piloto",
     "Decidir homologar ou reprovar e atualizar o catálogo técnico",
     "Revisar falhas recorrentes de produtos e atualizações de firmware críticas"
    ]
   },
   {
    "id": "backup_restauracao",
    "nome": "Backup e teste de restauração",
    "frequencia": "mensal",
    "responsavel": "analista_sistemas",
    "passos": [
     "Verificar execução dos backups do VEOS, das integrações e das programações de obras",
     "Restaurar ao menos um backup em ambiente de teste e registrar o resultado",
     "Abrir incidente para qualquer falha de backup"
    ]
   },
   {
    "id": "revisao_acessos",
    "nome": "Revisão de acessos e do cofre de senhas",
    "frequencia": "trimestral",
    "responsavel": "responsavel_seguranca",
    "passos": [
     "Revisar quem tem acesso a cada pasta do cofre, ao VEOS e ao Zoho; remover acessos de desligados e terceiros encerrados",
     "Conferir se todas as obras entregues têm referência de cofre no as-built",
     "Rotacionar credenciais compartilhadas e as expostas em incidentes",
     "Atualizar o inventário de dados pessoais tratados"
    ]
   },
   {
    "id": "revisao_padroes",
    "nome": "Revisão de padrões técnicos",
    "frequencia": "trimestral",
    "responsavel": "CIO",
    "passos": [
     "Revisar padrões com revisão vencida e as lições aprendidas enviadas por Operações",
     "Atualizar normas de referência e versões",
     "Comunicar mudanças de padrão às equipes de campo"
    ]
   }
  ],
  "indicadores": [
   {
    "id": "mttr_incidentes",
    "nome": "Tempo médio de restabelecimento (SEV1/SEV2)",
    "formula": "Média de horas entre registro e resolução de incidentes SEV1 e SEV2",
    "meta": "SEV1 ≤ 4 h; SEV2 ≤ 1 dia útil",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "incidentes_lgpd_no_prazo",
    "nome": "Incidentes com dado pessoal avaliados no prazo legal",
    "formula": "Incidentes com dado pessoal e risco relevante comunicados à ANPD em até 3 dias úteis da ciência ÷ incidentes desse tipo × 100",
    "meta": "100% (prazo da Resolução CD/ANPD nº 15/2024)",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "credenciais_em_cofre",
    "nome": "Obras com credenciais no cofre",
    "formula": "Obras entregues com referência de cofre registrada ÷ obras entregues × 100",
    "meta": "100%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "asbuilt_no_prazo",
    "nome": "As-built no prazo",
    "formula": "As-built entregues até 15 dias após a entrega técnica ÷ obras entregues × 100",
    "meta": "≥ 95%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "projetos_revisados",
    "nome": "Projetos revisados por pares antes da obra",
    "formula": "Projetos liberados para obra com revisor registrado ÷ projetos liberados × 100",
    "meta": "100%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "mudancas_sucesso",
    "nome": "Mudanças bem-sucedidas",
    "formula": "Mudanças executadas sem reversão nem incidente ÷ mudanças executadas × 100",
    "meta": "≥ 95%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "lead_time_homologacao",
    "nome": "Tempo de homologação",
    "formula": "Média de dias entre solicitação e decisão da homologação",
    "meta": "≤ 30 dias",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "padroes_em_dia",
    "nome": "Padrões técnicos em dia",
    "formula": "Padrões vigentes com revisão dentro da data ÷ padrões vigentes × 100",
    "meta": "≥ 90%",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "disponibilidade_sistemas",
    "nome": "Disponibilidade dos sistemas internos",
    "formula": "Horas disponíveis do VEOS e integrações em horário comercial ÷ horas totais em horário comercial × 100",
    "meta": "≥ 99,5%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   }
  ],
  "sentinelas": [
   {
    "id": "TEC_LGPD_PRAZO_ANPD",
    "titulo": "Prazo de comunicação à ANPD vencendo",
    "severidade": "CRITICO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "incidente",
     "campo": "prazo_anpd",
     "filtros": [
      {
       "campo": "dados_pessoais",
       "igual": "Sim — risco ou dano relevante"
      }
     ],
     "antecedencia_dias": 1
    },
    "mensagem": "O incidente {{titulo}} envolve dados pessoais com risco relevante e o prazo de comunicação à ANPD vence em {{dias}} dia(s) ou já venceu. Verificar com o jurídico se a VOICE se enquadra como agente de pequeno porte (prazo em dobro).",
    "acoes": [
     {
      "tipo": "notificar",
      "para": "direcao"
     },
     {
      "tipo": "rascunho",
      "modelo": "avaliacao_incidente_lgpd"
     },
     {
      "tipo": "tarefa",
      "titulo": "Concluir avaliação técnica e submeter à direção a decisão de comunicação",
      "papel": "responsavel_seguranca",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — regra de alerta baseada na Lei 13.709/2018 (LGPD) art. 48 e Resolução CD/ANPD nº 15/2024 (3 dias úteis)"
   },
   {
    "id": "TEC_LGPD_SEM_PRAZO",
    "titulo": "Incidente com dado pessoal sem prazo de comunicação registrado",
    "severidade": "CRITICO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "incidente",
     "campo": "prazo_anpd",
     "filtros": [
      {
       "campo": "dados_pessoais",
       "em": [
        "Em avaliação",
        "Sim — risco ou dano relevante"
       ]
      },
      {
       "campo": "estado",
       "diferente": "encerrado"
      }
     ]
    },
    "mensagem": "O incidente {{titulo}} envolve ou pode envolver dados pessoais e ainda não tem o prazo de comunicação à ANPD registrado (3 dias úteis a partir da ciência).",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Registrar data de ciência e prazo de comunicação à ANPD",
      "papel": "responsavel_seguranca",
      "prazo_dias": 1
     },
     {
      "tipo": "notificar",
      "para": "CIO"
     }
    ],
    "fonte": "PROPOSTA — regra de alerta baseada na Resolução CD/ANPD nº 15/2024"
   },
   {
    "id": "TEC_SEV_ALTA_PARADO",
    "titulo": "Incidente SEV1/SEV2 sem atualização",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "incidente",
     "filtros": [
      {
       "campo": "severidade",
       "em": [
        "SEV1",
        "SEV2"
       ]
      },
      {
       "campo": "estado",
       "em": [
        "registrado",
        "contencao"
       ]
      }
     ],
     "dias": 1
    },
    "mensagem": "O incidente {{titulo}} (SEV1/SEV2) está sem atualização há {{dias}} dia(s). Clientes e usuários afetados precisam de comunicação regular.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Atualizar status, próximos passos e horário da próxima atualização",
      "papel": "analista_redes",
      "prazo_dias": 0
     },
     {
      "tipo": "rascunho",
      "modelo": "status_incidente_cliente"
     },
     {
      "tipo": "notificar",
      "para": "CIO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (ITIL 4 gerenciamento de incidentes; skill incident-response)"
   },
   {
    "id": "TEC_POSTMORTEM_SEM_CAUSA",
    "titulo": "Pós-incidente sem causa raiz",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "incidente",
     "campo": "causa_raiz",
     "filtros": [
      {
       "campo": "estado",
       "igual": "pos_incidente"
      }
     ]
    },
    "mensagem": "O incidente {{titulo}} está em pós-incidente sem causa raiz registrada.",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "postmortem"
     },
     {
      "tipo": "tarefa",
      "titulo": "Conduzir postmortem sem culpa (5 porquês) com ações e responsáveis",
      "papel": "analista_redes",
      "prazo_dias": 5
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (postmortem sem culpa; skill incident-response)"
   },
   {
    "id": "TEC_MUDANCA_SEM_REVERSAO",
    "titulo": "Mudança sem plano de reversão",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "mudanca",
     "campo": "plano_reversao",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "avaliacao",
        "aprovada",
        "agendada"
       ]
      }
     ]
    },
    "mensagem": "A mudança {{titulo}} está sendo avaliada ou agendada sem plano de reversão escrito.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Escrever plano de reversão com gatilho, passos e verificação",
      "papel": "analista_sistemas",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "solicitacao_mudanca"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (ITIL 4 habilitação de mudanças; skill change-request)"
   },
   {
    "id": "TEC_ASBUILT_SEM_COFRE",
    "titulo": "As-built sem referência de cofre de credenciais",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "projeto_tecnico",
     "campo": "ref_cofre",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "asbuilt_pendente",
        "asbuilt_entregue"
       ]
      }
     ]
    },
    "mensagem": "O projeto {{titulo}} não tem a referência do cofre de credenciais. Senhas não podem ficar em registro, e-mail ou WhatsApp.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Cadastrar credenciais da obra no cofre e registrar apenas a referência",
      "papel": "analista_redes",
      "prazo_dias": 2
     },
     {
      "tipo": "notificar",
      "para": "responsavel_seguranca"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (ISO/IEC 27002 controle 5.17 — informações de autenticação)"
   },
   {
    "id": "TEC_ASBUILT_ATRASADO",
    "titulo": "As-built atrasado",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "projeto_tecnico",
     "campo": "data_limite_asbuilt",
     "filtros": [
      {
       "campo": "estado",
       "igual": "asbuilt_pendente"
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "O as-built do projeto {{titulo}} passou do prazo há {{dias}} dia(s). Sem as-built o Pós-venda atende o cliente às cegas.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Concluir as-built com mapa de portas, VLANs, firmware e backups",
      "papel": "engenheiro_projetos",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "checklist_asbuilt"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (ITIL 4 gestão de configuração; ANSI/TIA-606 documentação)"
   },
   {
    "id": "TEC_PADRAO_REVISAO_VENCIDA",
    "titulo": "Padrão técnico com revisão vencida",
    "severidade": "INFO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "padrao_tecnico",
     "campo": "data_revisao",
     "filtros": [
      {
       "campo": "estado",
       "igual": "vigente"
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "O padrão {{titulo}} está com a revisão vencida há {{dias}} dia(s).",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Revisar padrão frente a normas atuais e lições de campo",
      "papel": "engenheiro_projetos",
      "prazo_dias": 15
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (ISO 9001 controle de informação documentada)"
   },
   {
    "id": "TEC_HOMOLOGACAO_PARADA",
    "titulo": "Homologação parada",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "homologacao",
     "filtros": [
      {
       "campo": "estado",
       "nao_em": [
        "homologado",
        "reprovado"
       ]
      }
     ],
     "dias": 15
    },
    "mensagem": "A homologação {{titulo}} está sem andamento há {{dias}} dias. Produto não homologado não pode ser especificado em obra.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Retomar teste ou decidir reprovar a homologação",
      "papel": "engenheiro_projetos",
      "prazo_dias": 5
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (gestão de catálogo técnico)"
   },
   {
    "id": "TEC_FALHA_PRODUTO_RECORRENTE",
    "titulo": "Falhas recorrentes de produto homologado",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "incidente",
     "filtros": [
      {
       "campo": "origem",
       "igual": "Falha de produto homologado"
      }
     ],
     "janela_dias": 60,
     "data_campo": "criado_em",
     "operador": ">=",
     "valor": 3
    },
    "mensagem": "{{total}} incidentes por falha de produto homologado nos últimos 60 dias. Avaliar suspensão da homologação ou do firmware.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Analisar falhas por fabricante/modelo e revisar homologação",
      "papel": "engenheiro_projetos",
      "prazo_dias": 7
     },
     {
      "tipo": "notificar",
      "para": "CIO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (ITIL 4 gerenciamento de problemas)"
   }
  ],
  "modelos": [
   {
    "id": "status_incidente_cliente",
    "tipo": "email",
    "assunto": "VOICE | Atualização sobre o incidente {{titulo}}",
    "corpo": "Olá.\n\nAtualização sobre o incidente {{titulo}} ({{severidade}}):\n\nO que sabemos agora: ...\nImpacto: {{sistemas_afetados}}\nO que estamos fazendo: ...\nPróxima atualização: [horário]\n\nPor segurança, a VOICE nunca solicita senhas por e-mail ou WhatsApp.\n\n{{responsavel}} — Tecnologia e Engenharia, VOICE Ambientes Inteligentes"
   },
   {
    "id": "postmortem",
    "tipo": "documento",
    "assunto": "Postmortem — {{titulo}}",
    "corpo": "POSTMORTEM SEM CULPA\n\nIncidente: {{titulo}}\nSeveridade: {{severidade}}\nOrigem: {{origem}}\nSistemas e clientes afetados: {{sistemas_afetados}}\n\n1. Linha do tempo (detecção, contenção, resolução)\n2. Impacto (duração, usuários, clientes, dados)\n3. Causa raiz — 5 porquês\n4. O que funcionou bem\n5. O que pode melhorar\n6. Ações preventivas (ação, responsável, prazo)\n7. Padrões ou homologações a atualizar\n\nFoco em processos e sistemas, não em pessoas."
   },
   {
    "id": "avaliacao_incidente_lgpd",
    "tipo": "documento",
    "assunto": "Avaliação de incidente com dados pessoais — {{titulo}}",
    "corpo": "AVALIAÇÃO DE INCIDENTE DE SEGURANÇA COM DADOS PESSOAIS\n(para decisão da direção com apoio jurídico)\n\nIncidente: {{titulo}}\nData de ciência: {{data_ciencia}}\nPrazo de comunicação à ANPD: {{prazo_anpd}} (3 dias úteis; confirmar enquadramento como agente de pequeno porte)\n\n1. Natureza e categorias de dados afetados (ex.: imagens de CFTV, biometria, registros de acesso, contatos)\n2. Número aproximado de titulares\n3. Medidas técnicas de proteção existentes\n4. Riscos e possíveis consequências aos titulares\n5. Medidas adotadas para reverter ou mitigar\n6. Recomendação: [ ] comunicar ANPD e titulares  [ ] registrar internamente sem comunicação\n\nResponsável técnico: {{responsavel}}"
   },
   {
    "id": "solicitacao_mudanca",
    "tipo": "documento",
    "assunto": "Solicitação de mudança — {{titulo}}",
    "corpo": "SOLICITAÇÃO DE MUDANÇA\n\nSistema: {{sistema}}\nTipo: {{tipo_mudanca}}\nJanela: {{janela_execucao}}\n\nDescrição e justificativa: ...\nImpacto: {{impacto}}\nRiscos e mitigação: ...\nPlano de execução (passo, responsável, horário): ...\nPlano de reversão — gatilho, passos, verificação: {{plano_reversao}}\nComunicação (quem, quando, canal): ...\nAutorização do cliente (se sistema de cliente): {{autorizacao_cliente}}\n\nSolicitante: {{responsavel}}"
   },
   {
    "id": "relatorio_homologacao",
    "tipo": "documento",
    "assunto": "Relatório de homologação — {{fabricante}} {{modelo}}",
    "corpo": "RELATÓRIO DE HOMOLOGAÇÃO\n\nProduto: {{fabricante}} {{modelo}}\nCategoria: {{categoria}}\nFirmware testado: {{firmware_testado}}\nAnatel: {{anatel}}\nGarantia e suporte no Brasil: {{suporte_brasil}}\n\nCompatibilidade: {{compatibilidade}}\nResultados de bancada e piloto: {{resultado_teste}}\nRestrições de uso: ...\nCusto total estimado (produto, frete, suporte): ...\n\nDecisão: [ ] Homologado  [ ] Homologado com restrições  [ ] Reprovado\nResponsável: {{responsavel}}"
   },
   {
    "id": "checklist_asbuilt",
    "tipo": "documento",
    "assunto": "Checklist de as-built — {{titulo}}",
    "corpo": "CHECKLIST DE AS-BUILT\n\nObra: {{obra_ref}}\n\n[ ] Plantas atualizadas com pontos e trajetos reais\n[ ] Identificação de cabos e patch panels conforme ANSI/TIA-606\n[ ] Relatórios de certificação do cabeamento\n[ ] Diagrama de rede: VLANs, endereçamento, SSIDs, acesso remoto\n[ ] Lista de equipamentos com modelos, números de série e firmware\n[ ] Backup das programações de automação, AV e segurança\n[ ] Referência do item no cofre de senhas (nunca a senha): {{ref_cofre}}\n[ ] Retenção configurada de CFTV e registros de acesso\n\nLink: {{link_asbuilt}}\nResponsável: {{responsavel}}"
   },
   {
    "id": "entrega_asbuilt_posvenda",
    "tipo": "email",
    "assunto": "VOICE | As-built disponível — {{titulo}}",
    "corpo": "Olá, equipe de Pós-venda e Operações.\n\nO as-built da obra {{obra_ref}} está concluído: {{link_asbuilt}}\nCredenciais: disponíveis somente no cofre, item {{ref_cofre}}, com acesso por função.\nBackups de configuração: {{backup_configuracoes}}\n\nQualquer divergência encontrada em atendimento deve ser registrada para atualização do documento.\n\n{{responsavel}} — Tecnologia e Engenharia"
   }
  ],
  "documentos": [
   "Catálogo técnico de produtos homologados e matriz de compatibilidade",
   "Padrão de cabeamento estruturado e identificação (NBR 16264, NBR 14565, TIA-568, TIA-606)",
   "Padrão de rede: VLANs, segmentação de IoT, Wi-Fi e acesso remoto seguro",
   "Padrão de montagem de rack, energia e aterramento (interface com NBR 5410)",
   "Padrão de segurança eletrônica e controle de acesso com retenção e minimização de dados",
   "Modelo de projeto executivo e checklist de revisão por pares",
   "Checklist de as-built",
   "Política de cofre de senhas e revisão de acessos",
   "Plano de resposta a incidentes (incluindo LGPD e comunicação à ANPD)",
   "Registro de mudanças e plano de reversão",
   "Inventário de dados pessoais tratados em sistemas internos e de clientes"
  ],
  "relacoes": [
   {
    "setor": "operacoes",
    "fluxo": "Entrega projeto executivo, padrões técnicos e lista de homologados; recebe lições aprendidas de campo e dados para o as-built."
   },
   {
    "setor": "vendas",
    "fluxo": "Apoia a pré-venda técnica e valida a viabilidade e os produtos da proposta antes do fechamento."
   },
   {
    "setor": "posvenda",
    "fluxo": "Entrega as-built e referência de cofre; recebe falhas recorrentes de produtos e incidentes de clientes."
   },
   {
    "setor": "financas",
    "fluxo": "Sustenta as integrações Zoho Books/VEOS e informa custos de licenças e homologações."
   },
   {
    "setor": "pessoas",
    "fluxo": "Define trilhas de capacitação técnica e solicita concessão/remoção de acessos em admissões e desligamentos."
   },
   {
    "setor": "direcao",
    "fluxo": "Submete decisões de plataforma, contratos de nuvem e comunicação de incidentes de dados pessoais."
   },
   {
    "setor": "secretaria",
    "fluxo": "Recebe ordens da direção distribuídas pela Secretaria e devolve o retorno no prazo."
   }
  ],
  "fontes": [
   {
    "titulo": "Skill incident-response (severidades, comunicação e postmortem)",
    "tipo": "skill",
    "ref": "engineering/skills/incident-response/SKILL.md"
   },
   {
    "titulo": "Skill documentation (runbooks, documentação de arquitetura)",
    "tipo": "skill",
    "ref": "engineering/skills/documentation/SKILL.md"
   },
   {
    "titulo": "Skill deploy-checklist (verificação e gatilhos de reversão)",
    "tipo": "skill",
    "ref": "engineering/skills/deploy-checklist/SKILL.md"
   },
   {
    "titulo": "Skill tech-debt (priorização por impacto, risco e esforço)",
    "tipo": "skill",
    "ref": "engineering/skills/tech-debt/SKILL.md"
   },
   {
    "titulo": "Skill change-request (análise de impacto e plano de reversão)",
    "tipo": "skill",
    "ref": "operations/skills/change-request/SKILL.md"
   },
   {
    "titulo": "Skill runbook (procedimentos operacionais)",
    "tipo": "skill",
    "ref": "operations/skills/runbook/SKILL.md"
   },
   {
    "titulo": "Skill compliance-tracking (ISO 27001, inventário de controles e evidências)",
    "tipo": "skill",
    "ref": "operations/skills/compliance-tracking/SKILL.md"
   },
   {
    "titulo": "Skill compliance-check (privacidade e bases legais)",
    "tipo": "skill",
    "ref": "legal/skills/compliance-check/SKILL.md"
   },
   {
    "titulo": "ABNT NBR 16264 — Cabeamento estruturado residencial",
    "tipo": "norma",
    "ref": "https://www.normas.com.br/visualizar/abnt-nbr-nm/33990/abnt-nbr16264-cabeamento-estruturado-residencial"
   },
   {
    "titulo": "ABNT NBR 14565 — Cabeamento estruturado para edifícios comerciais",
    "tipo": "norma",
    "ref": "ABNT NBR 14565"
   },
   {
    "titulo": "ABNT NBR 5410 — Instalações elétricas de baixa tensão",
    "tipo": "norma",
    "ref": "ABNT NBR 5410"
   },
   {
    "titulo": "ANSI/TIA-568 e ANSI/TIA-606 — desempenho e identificação de cabeamento",
    "tipo": "norma",
    "ref": "https://tiaonline.org"
   },
   {
    "titulo": "ITIL 4 — práticas de gerenciamento de serviços",
    "tipo": "metodo",
    "ref": "https://www.axelos.com/certifications/itil-service-management"
   },
   {
    "titulo": "ISO/IEC 27001 e 27002 — segurança da informação",
    "tipo": "norma",
    "ref": "https://www.iso.org/standard/27001"
   },
   {
    "titulo": "Lei 13.709/2018 — LGPD",
    "tipo": "norma",
    "ref": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
   },
   {
    "titulo": "Resolução CD/ANPD nº 15/2024 — Regulamento de comunicação de incidente de segurança",
    "tipo": "norma",
    "ref": "https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis"
   }
  ]
 },
 {
  "id": "posvenda",
  "sigla": "CXO",
  "nome": "Pós-venda e Experiência do Cliente",
  "missao": "Garantir que cada casa e cada empresa atendida pela VOICE funcione sem esforço depois da entrega: suporte rápido, manutenção preventiva, garantia cumprida e clientes tão satisfeitos que indicam e voltam a comprar.",
  "cor": "green",
  "diretor": {
   "titulo": "Diretora de Experiência do Cliente (CXO)",
   "nome": "Juliana Castro Lacerda",
   "perfil": "Persona fictícia criada para o VEOS — não representa pessoa real. Construiu carreira em atendimento de alto padrão (hotelaria de luxo e serviços técnicos residenciais), onde aprendeu que o cliente premium lembra mais de como o problema foi resolvido do que do problema. Estilo acolhedor com o cliente e exigente com prazos e causa raiz.",
   "especialidades": [
    "Suporte técnico residencial e corporativo para automação, redes, áudio e vídeo e segurança",
    "Gestão de SLA, triagem por prioridade e escalonamento",
    "Contratos de suporte e manutenção preventiva recorrentes",
    "NPS com ciclo fechado e programas de indicação"
   ],
   "metodos": [
    {
     "nome": "Net Promoter System (NPS com ciclo fechado)",
     "autor": "Fred Reichheld / Bain & Company",
     "uso": "Pesquisa após a entrega, após chamados e anual. Ciclo interno: retorno pessoal a todo detrator em até 48 horas e reconhecimento da equipe. Ciclo externo: causas recorrentes viram mudança de processo, equipamento padrão ou treinamento, levadas à direção."
    },
    {
     "nome": "Customer Success (gestão proativa da base)",
     "autor": "Lincoln Murphy e Nick Mehta (Customer Success, 2016)",
     "uso": "A VOICE não espera o chamado: visita de acompanhamento em 30 e 90 dias após a entrega, preventivas programadas e revisão anual do sistema com recomendações de atualização."
    },
    {
     "nome": "Triagem por prioridade P1–P4 com SLA",
     "autor": "Prática consolidada de service desk (ITIL e suporte técnico)",
     "uso": "P1: casa sem rede, sem acesso ou segurança inoperante; P2: sistema principal degradado; P3: falha pontual com contorno; P4: dúvida, ajuste de cena ou melhoria."
    },
    {
     "nome": "Análise de causa raiz (5 Porquês)",
     "autor": "Taiichi Ohno / Sistema Toyota de Produção",
     "uso": "Todo chamado fechado tem causa registrada; chamados reincidentes geram análise e ação com Operações."
    }
   ],
   "principios": [
    "Cliente de alto padrão não deve precisar pedir duas vezes.",
    "Resolver remotamente quando possível; ir até o cliente quando necessário, sem hesitar.",
    "Todo detrator recebe ligação pessoal, nunca só uma mensagem automática.",
    "Garantia cumprida com elegância é marketing: a próxima venda nasce do suporte.",
    "Indicação e oportunidade de ampliação percebidas no atendimento vão para o Comercial no mesmo dia.",
    "Custo de garantia e assistência é acompanhado contra a provisão de 2% da Política V1 sec.6."
   ],
   "como_aconselha": "Começa pelo cliente afetado e pelo prazo, depois pela causa. Responde com o plano de contenção, o responsável e quando o cliente terá notícia. Separa claramente o que é Política oficial do que é proposta.",
   "perguntas_chave": [
    "Há algum cliente com P1 aberto agora? Quem está com ele e quando é a próxima atualização?",
    "Quais detratores ainda não receberam retorno pessoal?",
    "Quais garantias e contratos vencem nos próximos 60 dias e já oferecemos continuidade?",
    "Quais causas se repetem nos chamados e o que Operações vai mudar?",
    "Quantas indicações e oportunidades de ampliação repassamos ao Comercial neste mês?"
   ],
   "limites": [
    "Não concede atendimento gratuito fora da garantia ou do contrato acima do valor combinado com a direção; cortesias são registradas.",
    "Não altera preço ou escopo de contrato de suporte sem a direção e Finanças.",
    "Não publica nem autoriza uso de imagem do cliente — encaminha a autorização ao Marketing.",
    "Não promete troca de equipamento fora da garantia do fabricante sem aprovação da direção."
   ]
  },
  "equipe": [
   {
    "papel": "atendimento_cx",
    "nome": "Atendimento e triagem (N1)",
    "reporta_a": "CXO",
    "responsabilidades": [
     "Receber chamados por WhatsApp, telefone, e-mail e aplicativo e registrar no VEOS.",
     "Classificar prioridade P1–P4, cobertura (garantia, contrato, avulso) e definir prazos de resposta e solução.",
     "Resolver remotamente dúvidas e ajustes simples (cenas, aplicativo, reinício de equipamentos).",
     "Manter o cliente informado até o fechamento."
    ],
    "indicadores": [
     "tempo_primeira_resposta",
     "resolucao_remota",
     "cumprimento_sla"
    ]
   },
   {
    "papel": "tecnico_campo",
    "nome": "Técnico de campo (N2)",
    "reporta_a": "CXO",
    "responsabilidades": [
     "Atender chamados que exigem visita e executar preventivas.",
     "Registrar causa raiz, solução e peças utilizadas.",
     "Enviar relatório de visita e identificar oportunidades de melhoria no sistema do cliente."
    ],
    "indicadores": [
     "preventivas_no_prazo",
     "chamados_reincidentes"
    ]
   },
   {
    "papel": "gestor_contratos",
    "nome": "Gestor de contratos de suporte",
    "reporta_a": "CXO",
    "responsabilidades": [
     "Criar o registro de garantia de cada projeto entregue e oferecer contrato de suporte antes do fim da garantia.",
     "Conduzir renovações e reajustes com Finanças.",
     "Planejar o calendário anual de preventivas por contrato."
    ],
    "indicadores": [
     "taxa_renovacao",
     "receita_recorrente"
    ]
   },
   {
    "papel": "coord_cx",
    "nome": "Coordenador(a) de experiência do cliente",
    "reporta_a": "CXO",
    "responsabilidades": [
     "Enviar pesquisas de satisfação e fechar o ciclo com cada detrator.",
     "Conduzir o huddle semanal e a análise mensal de causas recorrentes.",
     "Repassar indicações e oportunidades de ampliação ao Comercial e promotores ao Marketing."
    ],
    "indicadores": [
     "nps",
     "indicacoes_repassadas",
     "custo_garantia"
    ]
   }
  ],
  "processos": [
   {
    "id": "atendimento_chamado",
    "nome": "Atendimento de chamado",
    "descricao": "Do contato do cliente à confirmação de que o problema foi resolvido, com prioridade, SLA e causa raiz.",
    "etapas": [
     {
      "id": "abertura",
      "nome": "Abertura",
      "responsavel": "atendimento_cx",
      "criterio_saida": "Chamado registrado com cliente, sistema afetado, descrição nas palavras do cliente e canal."
     },
     {
      "id": "triagem",
      "nome": "Triagem",
      "responsavel": "atendimento_cx",
      "criterio_saida": "Prioridade P1–P4, cobertura (garantia, contrato, avulso ou cortesia) e prazos de resposta e solução definidos; primeira resposta enviada."
     },
     {
      "id": "diagnostico_remoto",
      "nome": "Diagnóstico remoto",
      "responsavel": "atendimento_cx",
      "criterio_saida": "Resolvido remotamente ou decidido que precisa de visita, com visita agendada."
     },
     {
      "id": "visita",
      "nome": "Atendimento em campo",
      "responsavel": "tecnico_campo",
      "criterio_saida": "Problema resolvido ou contido; causa raiz e solução registradas; peças/orçamento informados se fora de cobertura."
     },
     {
      "id": "confirmacao",
      "nome": "Confirmação e fechamento",
      "responsavel": "atendimento_cx",
      "criterio_saida": "Cliente confirma que está funcionando; chamado fechado; pesquisa pós-chamado enviada."
     }
    ]
   },
   {
    "id": "garantia_contratos",
    "nome": "Garantia, contratos de suporte e preventivas",
    "descricao": "Todo projeto entregue entra em garantia registrada; antes do fim da garantia, oferta de contrato de suporte com preventivas programadas e renovação.",
    "etapas": [
     {
      "id": "registro_garantia",
      "nome": "Registro da garantia",
      "responsavel": "gestor_contratos",
      "criterio_saida": "Contrato modalidade garantia_entrega criado com data de início (entrega técnica), data de fim e sistemas cobertos."
     },
     {
      "id": "acompanhamento",
      "nome": "Acompanhamento pós-entrega",
      "responsavel": "tecnico_campo",
      "criterio_saida": "Visitas de acompanhamento de 30 e 90 dias realizadas com relatório."
     },
     {
      "id": "oferta_contrato",
      "nome": "Oferta de contrato de suporte",
      "responsavel": "gestor_contratos",
      "criterio_saida": "Proposta de contrato enviada pelo menos 60 dias antes do fim da garantia."
     },
     {
      "id": "preventivas",
      "nome": "Execução de preventivas",
      "responsavel": "tecnico_campo",
      "criterio_saida": "Preventivas do contrato realizadas no mês previsto com checklist e relatório."
     },
     {
      "id": "renovacao",
      "nome": "Renovação",
      "responsavel": "gestor_contratos",
      "criterio_saida": "Contrato renovado, alterado ou encerrado com motivo, 30 dias antes do vencimento."
     }
    ]
   },
   {
    "id": "ciclo_satisfacao",
    "nome": "Satisfação, ciclo fechado e indicações",
    "descricao": "NPS em momentos definidos, retorno pessoal, melhoria de processo e devolução de indicações e oportunidades ao Comercial.",
    "etapas": [
     {
      "id": "envio",
      "nome": "Envio da pesquisa",
      "responsavel": "coord_cx",
      "criterio_saida": "Pesquisa enviada 30 dias após a entrega, após chamados fechados e anualmente a toda a base."
     },
     {
      "id": "retorno",
      "nome": "Retorno ao cliente (ciclo interno)",
      "responsavel": "coord_cx",
      "criterio_saida": "Detrator contatado pessoalmente em até 48 horas; neutro em até 7 dias; promotor agradecido e convidado a indicar."
     },
     {
      "id": "melhoria",
      "nome": "Melhoria estrutural (ciclo externo)",
      "responsavel": "CXO",
      "criterio_saida": "Causas recorrentes levadas à direção e a Operações com ação e responsável."
     },
     {
      "id": "repasse",
      "nome": "Repasse de indicação e ampliação",
      "responsavel": "coord_cx",
      "criterio_saida": "Indicação ou oportunidade de ampliação registrada e repassada ao Comercial no mesmo dia; promotor com autorização de case repassado ao Marketing."
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "chamado",
    "nome": "Chamado de suporte",
    "descricao": "Solicitação de suporte, falha ou ajuste em sistema instalado pela VOICE.",
    "responsavel": "atendimento_cx",
    "estados": [
     "aberto",
     "triagem",
     "em_atendimento",
     "aguardando_cliente",
     "aguardando_peca",
     "visita_agendada",
     "resolvido",
     "fechado",
     "cancelado"
    ],
    "estado_inicial": "aberto",
    "estados_finais": [
     "fechado",
     "cancelado"
    ],
    "campos": [
     {
      "id": "cliente_nome",
      "rotulo": "Cliente",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "telefone",
      "rotulo": "Telefone / WhatsApp",
      "tipo": "telefone",
      "obrigatorio": true
     },
     {
      "id": "sistema",
      "rotulo": "Sistema afetado",
      "tipo": "opcao",
      "opcoes": [
       "rede_wifi",
       "automacao_iluminacao",
       "audio_video",
       "cftv_seguranca",
       "controle_acesso",
       "climatizacao_integracao",
       "cortinas_persianas",
       "aplicativo_controle",
       "outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "prioridade",
      "rotulo": "Prioridade",
      "tipo": "opcao",
      "opcoes": [
       "P1_critico",
       "P2_alto",
       "P3_medio",
       "P4_baixo"
      ],
      "obrigatorio": true
     },
     {
      "id": "descricao",
      "rotulo": "Descrição (palavras do cliente)",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "canal_abertura",
      "rotulo": "Canal de abertura",
      "tipo": "opcao",
      "opcoes": [
       "whatsapp",
       "telefone",
       "email",
       "aplicativo",
       "visita",
       "monitoramento_remoto"
      ],
      "obrigatorio": true
     },
     {
      "id": "cobertura",
      "rotulo": "Cobertura",
      "tipo": "opcao",
      "opcoes": [
       "garantia_instalacao",
       "garantia_fabricante",
       "contrato_suporte",
       "avulso_faturavel",
       "cortesia"
      ],
      "obrigatorio": true
     },
     {
      "id": "data_limite_resposta",
      "rotulo": "Prazo de primeira resposta",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_limite_solucao",
      "rotulo": "Prazo de solução",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_primeira_resposta",
      "rotulo": "Data da primeira resposta",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "causa_raiz",
      "rotulo": "Causa raiz",
      "tipo": "opcao",
      "opcoes": [
       "defeito_equipamento",
       "configuracao_programacao",
       "infraestrutura_rede",
       "provedor_internet",
       "energia_eletrica",
       "uso_do_cliente",
       "intervencao_terceiros",
       "falha_instalacao",
       "atualizacao_fabricante"
      ],
      "obrigatorio": false
     },
     {
      "id": "solucao",
      "rotulo": "Solução aplicada",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "reincidente",
      "rotulo": "Reincidente (mesmo problema em 90 dias)",
      "tipo": "opcao",
      "opcoes": [
       "nao",
       "sim"
      ],
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "contrato_suporte",
    "nome": "Garantia / contrato de suporte",
    "descricao": "Cobertura pós-entrega de um cliente: período de garantia da instalação ou contrato de suporte recorrente com preventivas e SLA.",
    "responsavel": "gestor_contratos",
    "estados": [
     "proposta",
     "ativo",
     "em_renovacao",
     "encerrado",
     "cancelado"
    ],
    "estado_inicial": "proposta",
    "estados_finais": [
     "encerrado",
     "cancelado"
    ],
    "campos": [
     {
      "id": "cliente_nome",
      "rotulo": "Cliente",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "projeto_ref",
      "rotulo": "Projeto de origem",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "modalidade",
      "rotulo": "Modalidade",
      "tipo": "opcao",
      "opcoes": [
       "garantia_entrega",
       "suporte_essencial",
       "suporte_premium",
       "suporte_corporativo"
      ],
      "obrigatorio": true
     },
     {
      "id": "sistemas_cobertos",
      "rotulo": "Sistemas cobertos",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "data_inicio",
      "rotulo": "Início",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_fim",
      "rotulo": "Fim / vencimento",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "valor_mensal",
      "rotulo": "Valor mensal",
      "tipo": "dinheiro",
      "obrigatorio": false
     },
     {
      "id": "preventivas_ano",
      "rotulo": "Preventivas por ano",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "sla_resposta_horas",
      "rotulo": "SLA de resposta P1 (horas)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "data_oferta_continuidade",
      "rotulo": "Data da oferta de continuidade/renovação",
      "tipo": "data",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "visita_manutencao",
    "nome": "Visita de manutenção",
    "descricao": "Visita técnica pós-venda: preventiva de contrato, acompanhamento pós-entrega, corretiva ou treinamento do cliente.",
    "responsavel": "tecnico_campo",
    "estados": [
     "planejada",
     "agendada",
     "realizada",
     "relatorio_enviado",
     "cancelada"
    ],
    "estado_inicial": "planejada",
    "estados_finais": [
     "relatorio_enviado",
     "cancelada"
    ],
    "campos": [
     {
      "id": "cliente_nome",
      "rotulo": "Cliente",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "contrato_ref",
      "rotulo": "Contrato / garantia",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "tipo_visita",
      "rotulo": "Tipo de visita",
      "tipo": "opcao",
      "opcoes": [
       "preventiva",
       "acompanhamento_30_dias",
       "acompanhamento_90_dias",
       "corretiva",
       "treinamento_cliente",
       "revisao_anual"
      ],
      "obrigatorio": true
     },
     {
      "id": "data_prevista",
      "rotulo": "Data prevista",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_realizada",
      "rotulo": "Data realizada",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "checklist",
      "rotulo": "Checklist executado",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "pendencias",
      "rotulo": "Pendências encontradas",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "oportunidade_identificada",
      "rotulo": "Oportunidade identificada",
      "tipo": "opcao",
      "opcoes": [
       "nenhuma",
       "atualizacao_equipamento",
       "expansao_ambientes",
       "novo_sistema",
       "contrato_suporte"
      ],
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "pesquisa_satisfacao",
    "nome": "Pesquisa de satisfação (NPS)",
    "descricao": "Resposta de NPS de um cliente em um momento definido, com retorno, ação e eventual indicação ou oportunidade.",
    "responsavel": "coord_cx",
    "estados": [
     "enviada",
     "respondida",
     "retorno_feito",
     "encerrada"
    ],
    "estado_inicial": "enviada",
    "estados_finais": [
     "encerrada"
    ],
    "campos": [
     {
      "id": "cliente_nome",
      "rotulo": "Cliente",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "momento",
      "rotulo": "Momento",
      "tipo": "opcao",
      "opcoes": [
       "pos_entrega_30_dias",
       "pos_chamado",
       "relacional_anual"
      ],
      "obrigatorio": true
     },
     {
      "id": "nota_nps",
      "rotulo": "Nota (0 a 10)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "classificacao",
      "rotulo": "Classificação",
      "tipo": "opcao",
      "opcoes": [
       "promotor",
       "neutro",
       "detrator"
      ],
      "obrigatorio": false
     },
     {
      "id": "comentario",
      "rotulo": "Comentário do cliente",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "data_resposta",
      "rotulo": "Data da resposta",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "data_retorno_cliente",
      "rotulo": "Data do retorno pessoal ao cliente",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "acao_interna",
      "rotulo": "Ação interna (ciclo externo)",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "indicacao_ou_ampliacao",
      "rotulo": "Indicação ou ampliação",
      "tipo": "opcao",
      "opcoes": [
       "nenhuma",
       "indicacao",
       "ampliacao",
       "ambas"
      ],
      "obrigatorio": false
     },
     {
      "id": "data_repasse_comercial",
      "rotulo": "Data do repasse ao Comercial",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "autoriza_case",
      "rotulo": "Aceita ser case?",
      "tipo": "opcao",
      "opcoes": [
       "nao_perguntado",
       "sim",
       "nao"
      ],
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "triagem_diaria",
    "nome": "Triagem diária de chamados",
    "frequencia": "diaria",
    "responsavel": "atendimento_cx",
    "passos": [
     "Revisar chamados abertos por prioridade, começando pelos P1 e P2.",
     "Conferir prazos de resposta e solução que vencem hoje.",
     "Atualizar clientes aguardando retorno.",
     "Confirmar a agenda de visitas do dia com os técnicos."
    ]
   },
   {
    "id": "huddle_semanal",
    "nome": "Huddle semanal de experiência (ciclo interno)",
    "frequencia": "semanal",
    "responsavel": "coord_cx",
    "passos": [
     "Ler em voz alta 3 comentários de clientes da semana (1 promotor, 1 neutro, 1 detrator).",
     "Conferir retorno de todos os detratores.",
     "Reconhecer atendimentos elogiados.",
     "Registrar o que a equipe muda por conta própria e o que precisa subir à direção."
    ]
   },
   {
    "id": "agenda_preventivas",
    "nome": "Agenda de preventivas e acompanhamentos",
    "frequencia": "mensal",
    "responsavel": "gestor_contratos",
    "passos": [
     "Gerar as visitas preventivas do mês a partir dos contratos ativos.",
     "Gerar visitas de 30 e 90 dias dos projetos entregues recentemente.",
     "Agendar com os clientes respeitando a rotina da casa.",
     "Conferir garantias e contratos que vencem nos próximos 60 dias."
    ]
   },
   {
    "id": "analise_causa_raiz",
    "nome": "Análise mensal de causas (ciclo externo)",
    "frequencia": "mensal",
    "responsavel": "CXO",
    "passos": [
     "Agrupar chamados fechados por sistema e causa raiz.",
     "Aplicar 5 Porquês nos 3 problemas mais frequentes e nos reincidentes.",
     "Definir ação com Operações (padrão de instalação, equipamento, programação, treinamento do cliente).",
     "Comparar custo de garantia e assistência com a provisão de 2% da receita líquida dos projetos (Política V1 sec.6)."
    ]
   },
   {
    "id": "repasse_comercial",
    "nome": "Repasse de oportunidades ao Comercial",
    "frequencia": "semanal",
    "responsavel": "coord_cx",
    "passos": [
     "Listar indicações e oportunidades de ampliação vindas de pesquisas e visitas.",
     "Confirmar que cada uma foi registrada como lead no Comercial.",
     "Enviar promotores que aceitam ser case ao Marketing."
    ]
   },
   {
    "id": "revisao_contratos",
    "nome": "Revisão trimestral da carteira de contratos",
    "frequencia": "trimestral",
    "responsavel": "gestor_contratos",
    "passos": [
     "Revisar receita recorrente, renovações e cancelamentos com motivo.",
     "Verificar se o volume de chamados de cada contrato é compatível com o preço.",
     "Propor à direção e a Finanças ajustes de modalidade e reajuste."
    ]
   }
  ],
  "indicadores": [
   {
    "id": "nps",
    "nome": "NPS",
    "formula": "% promotores (9–10) − % detratores (0–6) nas respostas do período",
    "meta": "≥ 70",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "tempo_primeira_resposta",
    "nome": "Tempo de primeira resposta P1",
    "formula": "Mediana do tempo entre abertura e primeira resposta dos chamados P1",
    "meta": "≤ 1 hora",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "cumprimento_sla",
    "nome": "Cumprimento de SLA de solução",
    "formula": "Chamados fechados dentro do prazo de solução ÷ chamados fechados × 100",
    "meta": "≥ 90%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "resolucao_remota",
    "nome": "Resolução remota",
    "formula": "Chamados fechados sem visita ÷ chamados fechados × 100",
    "meta": "≥ 50%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "chamados_reincidentes",
    "nome": "Chamados reincidentes",
    "formula": "Chamados marcados como reincidentes ÷ chamados fechados × 100",
    "meta": "≤ 10%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "preventivas_no_prazo",
    "nome": "Preventivas no prazo",
    "formula": "Preventivas realizadas até a data prevista ÷ preventivas previstas × 100",
    "meta": "≥ 95%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "taxa_renovacao",
    "nome": "Renovação e conversão de garantia em contrato",
    "formula": "Contratos renovados ou garantias convertidas em contrato ÷ vencimentos do período × 100",
    "meta": "≥ 60%",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "receita_recorrente",
    "nome": "Receita recorrente de suporte",
    "formula": "Soma do valor mensal dos contratos de suporte ativos",
    "meta": "Crescimento trimestral; valor-alvo a definir pela direção",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "indicacoes_repassadas",
    "nome": "Indicações e ampliações repassadas ao Comercial",
    "formula": "Pesquisas e visitas com indicação ou ampliação repassadas no período",
    "meta": "≥ 4 por mês",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "custo_garantia",
    "nome": "Custo de garantia e assistência x provisão",
    "formula": "Custo real de garantia, assistência e retrabalho dos projetos ÷ receita líquida dos mesmos projetos × 100",
    "meta": "Dentro da provisão de 2% da receita líquida do projeto — PROPOSTA: usa como referência a provisão de risco de 2% (Política V1 sec.6); a política não fixa meta para este custo (sec.15 prevê revisar com dados reais)",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   }
  ],
  "sentinelas": [
   {
    "id": "CX_P1_SEM_RESPOSTA",
    "titulo": "Chamado P1 com prazo de resposta vencido",
    "severidade": "CRITICO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "chamado",
     "campo": "data_limite_resposta",
     "filtros": [
      {
       "campo": "prioridade",
       "igual": "P1_critico"
      },
      {
       "campo": "estado",
       "em": [
        "aberto",
        "triagem"
       ]
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "Chamado crítico {{titulo}} sem primeira resposta no prazo. Cliente possivelmente sem rede, acesso ou segurança.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Ligar para o cliente agora, conter o problema e agendar visita se necessário",
      "papel": "atendimento_cx",
      "prazo_dias": 0
     },
     {
      "tipo": "rascunho",
      "modelo": "resposta_abertura_chamado"
     },
     {
      "tipo": "notificar",
      "para": "CXO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (triagem P1–P4 com SLA de 1 hora para P1)"
   },
   {
    "id": "CX_CHAMADO_SLA_VENCIDO",
    "titulo": "Chamado com prazo de solução vencido",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "chamado",
     "campo": "data_limite_solucao",
     "filtros": [
      {
       "campo": "estado",
       "nao_em": [
        "resolvido"
       ]
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "O chamado {{titulo}} passou do prazo de solução. Escalonar e informar o cliente com nova previsão.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Escalonar para técnico de campo e dar nova previsão ao cliente",
      "papel": "tecnico_campo",
      "prazo_dias": 1
     },
     {
      "tipo": "notificar",
      "para": "coord_cx"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (escalonamento por violação de SLA)"
   },
   {
    "id": "CX_CHAMADO_PARADO",
    "titulo": "Chamado parado sem atualização",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "chamado",
     "filtros": [
      {
       "campo": "estado",
       "nao_em": [
        "fechado",
        "cancelado"
       ]
      }
     ],
     "dias": 3,
     "data_campo": "atualizado_em"
    },
    "mensagem": "O chamado {{titulo}} está sem atualização há {{dias}} dias. Cliente de alto padrão não deve precisar perguntar pelo andamento.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Atualizar o cliente sobre o andamento e registrar o próximo passo",
      "papel": "atendimento_cx",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (atualização proativa de chamados)"
   },
   {
    "id": "CX_CHAMADO_SEM_CAUSA",
    "titulo": "Chamado fechado sem causa raiz",
    "severidade": "INFO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "chamado",
     "campo": "causa_raiz",
     "filtros": [
      {
       "campo": "estado",
       "igual": "fechado"
      }
     ]
    },
    "mensagem": "O chamado {{titulo}} foi fechado sem causa raiz. Sem causa, o ciclo externo de melhoria fica cego.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Registrar a causa raiz do chamado",
      "papel": "tecnico_campo",
      "prazo_dias": 2
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (5 Porquês / Net Promoter System, ciclo externo)"
   },
   {
    "id": "CX_DETRATOR_SEM_RETORNO",
    "titulo": "Detrator sem retorno pessoal",
    "severidade": "CRITICO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "pesquisa_satisfacao",
     "campo": "data_retorno_cliente",
     "filtros": [
      {
       "campo": "classificacao",
       "igual": "detrator"
      }
     ]
    },
    "mensagem": "O cliente da pesquisa {{titulo}} deu nota de detrator e ainda não recebeu retorno pessoal. Prazo proposto: 48 horas.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Ligar pessoalmente para o cliente, ouvir, pedir desculpas e combinar plano de ação",
      "papel": "coord_cx",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "roteiro_retorno_detrator"
     },
     {
      "tipo": "notificar",
      "para": "CXO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Net Promoter System, ciclo interno)"
   },
   {
    "id": "CX_DETRATORES_RECORRENTES",
    "titulo": "Vários detratores no mês",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "pesquisa_satisfacao",
     "filtros": [
      {
       "campo": "classificacao",
       "igual": "detrator"
      }
     ],
     "janela_dias": 30,
     "data_campo": "data_resposta",
     "operador": ">=",
     "valor": 2
    },
    "mensagem": "{{total}} detratores nos últimos 30 dias. Levar causas à direção (ciclo externo).",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Preparar análise das causas dos detratores do mês para a direção",
      "papel": "coord_cx",
      "prazo_dias": 5
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Net Promoter System, ciclo externo)"
   },
   {
    "id": "CX_INDICACAO_NAO_REPASSADA",
    "titulo": "Indicação ou ampliação não repassada ao Comercial",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "pesquisa_satisfacao",
     "campo": "data_repasse_comercial",
     "filtros": [
      {
       "campo": "indicacao_ou_ampliacao",
       "em": [
        "indicacao",
        "ampliacao",
        "ambas"
       ]
      }
     ]
    },
    "mensagem": "A pesquisa {{titulo}} gerou indicação ou oportunidade de ampliação que ainda não foi repassada ao Comercial.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Registrar a indicação/ampliação como lead no Comercial e anotar a data do repasse",
      "papel": "coord_cx",
      "prazo_dias": 1
     },
     {
      "tipo": "rascunho",
      "modelo": "repasse_oportunidade_comercial"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Customer Success: expansão e indicação)"
   },
   {
    "id": "CX_GARANTIA_TERMINANDO",
    "titulo": "Garantia termina em até 60 dias",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "contrato_suporte",
     "campo": "data_fim",
     "filtros": [
      {
       "campo": "modalidade",
       "igual": "garantia_entrega"
      },
      {
       "campo": "estado",
       "igual": "ativo"
      }
     ],
     "antecedencia_dias": 60
    },
    "mensagem": "A garantia {{titulo}} termina em breve. Oferecer contrato de suporte antes do vencimento.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Enviar proposta de contrato de suporte e registrar a data da oferta",
      "papel": "gestor_contratos",
      "prazo_dias": 5
     },
     {
      "tipo": "rascunho",
      "modelo": "oferta_contrato_fim_garantia"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Customer Success: renovação proativa)"
   },
   {
    "id": "CX_CONTRATO_VENCENDO",
    "titulo": "Contrato de suporte vence em até 45 dias",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "contrato_suporte",
     "campo": "data_fim",
     "filtros": [
      {
       "campo": "modalidade",
       "diferente": "garantia_entrega"
      },
      {
       "campo": "estado",
       "em": [
        "ativo",
        "em_renovacao"
       ]
      }
     ],
     "antecedencia_dias": 45
    },
    "mensagem": "O contrato {{titulo}} vence em até 45 dias. Conduzir a renovação com Finanças.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Preparar renovação com histórico de chamados e preventivas do período",
      "papel": "gestor_contratos",
      "prazo_dias": 5
     },
     {
      "tipo": "rascunho",
      "modelo": "renovacao_contrato"
     },
     {
      "tipo": "notificar",
      "para": "CXO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (radar de renovações)"
   },
   {
    "id": "CX_PREVENTIVA_ATRASADA",
    "titulo": "Visita de manutenção atrasada",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "visita_manutencao",
     "campo": "data_prevista",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "planejada",
        "agendada"
       ]
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "A visita {{titulo}} passou da data prevista sem ser realizada.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Reagendar a visita com o cliente e justificar o atraso",
      "papel": "tecnico_campo",
      "prazo_dias": 2
     },
     {
      "tipo": "notificar",
      "para": "gestor_contratos"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (manutenção preventiva contratada)"
   }
  ],
  "modelos": [
   {
    "id": "resposta_abertura_chamado",
    "tipo": "whatsapp",
    "assunto": "Confirmação de abertura de chamado",
    "corpo": "Olá, {{cliente_nome}}! Aqui é {{responsavel}}, do suporte VOICE. Recebemos seu chamado sobre {{titulo}} e já estamos cuidando disso. Próxima atualização até {{data_limite_resposta}}. Se for urgente, pode me ligar diretamente."
   },
   {
    "id": "roteiro_retorno_detrator",
    "tipo": "roteiro",
    "assunto": "Roteiro de ligação para detrator",
    "corpo": "1. Agradecer a sinceridade da avaliação.\n2. Pedir que conte o que aconteceu, sem interromper. Anotar nas palavras do cliente.\n3. Reconhecer o impacto na rotina da casa ou da empresa e pedir desculpas pelo que foi nossa responsabilidade.\n4. Propor ação concreta com data e responsável (visita, ajuste, treinamento).\n5. Combinar o próximo contato para confirmar que ficou resolvido.\n6. Registrar data do retorno e ação interna na pesquisa {{titulo}}."
   },
   {
    "id": "pesquisa_nps_pos_entrega",
    "tipo": "whatsapp",
    "assunto": "Pesquisa de satisfação 30 dias após a entrega",
    "corpo": "Olá, {{cliente_nome}}! Já faz um mês que entregamos seu projeto. Em uma escala de 0 a 10, quanto você recomendaria a VOICE a um amigo ou ao seu arquiteto? E o que podemos melhorar? Sua resposta vai direto para a nossa diretora de experiência."
   },
   {
    "id": "oferta_contrato_fim_garantia",
    "tipo": "email",
    "assunto": "Seu sistema VOICE continua protegido depois da garantia",
    "corpo": "Olá, {{cliente_nome}},\n\nA garantia da instalação do seu projeto termina em {{data_fim}}. Para que tudo continue funcionando como no primeiro dia, oferecemos o contrato de suporte VOICE com visitas preventivas programadas, atendimento prioritário e acompanhamento das atualizações dos fabricantes.\n\nPosso apresentar as modalidades em uma conversa de 15 minutos?\n\n{{responsavel}}\nVOICE Ambientes Inteligentes"
   },
   {
    "id": "renovacao_contrato",
    "tipo": "email",
    "assunto": "Renovação do seu contrato de suporte VOICE",
    "corpo": "Olá, {{cliente_nome}},\n\nSeu contrato de suporte vence em {{data_fim}}. Preparamos um resumo do período: chamados atendidos, preventivas realizadas e recomendações para o próximo ano.\n\nPodemos agendar a renovação e conversar sobre ajustes na cobertura?\n\n{{responsavel}}\nVOICE Ambientes Inteligentes"
   },
   {
    "id": "relatorio_visita",
    "tipo": "documento",
    "assunto": "Relatório de visita — {{titulo}}",
    "corpo": "Cliente: {{cliente_nome}}\nTipo de visita: {{tipo_visita}}\nData: {{data_realizada}}\nChecklist executado: {{checklist}}\nPendências encontradas: {{pendencias}}\nRecomendações: \nOportunidade identificada: {{oportunidade_identificada}}\nTécnico: {{responsavel}}"
   },
   {
    "id": "repasse_oportunidade_comercial",
    "tipo": "documento",
    "assunto": "Repasse ao Comercial — {{titulo}}",
    "corpo": "Cliente: {{cliente_nome}}\nTipo: {{indicacao_ou_ampliacao}}\nContexto (comentário do cliente / visita): {{comentario}}\nNota NPS: {{nota_nps}}\nContato indicado (se houver):\nRegistrado por: {{responsavel}}\nPedido ao Comercial: contato em até 1 dia útil e retorno ao Pós-venda sobre o resultado."
   }
  ],
  "documentos": [
   "Tabela de prioridades P1–P4 e prazos de resposta e solução",
   "Termo de garantia da instalação VOICE",
   "Modelos de contrato de suporte (essencial, premium, corporativo)",
   "Checklist de manutenção preventiva por sistema",
   "Relatório de visita técnica",
   "Roteiro de retorno ao detrator"
  ],
  "relacoes": [
   {
    "setor": "vendas",
    "fluxo": "Devolve indicações e oportunidades de ampliação/upsell; recebe o que foi vendido e prometido a cada cliente."
   },
   {
    "setor": "operacoes",
    "fluxo": "Recebe o projeto na entrega técnica (as built, senhas, documentação) e devolve causas recorrentes para melhoria de instalação."
   },
   {
    "setor": "marketing",
    "fluxo": "Entrega promotores que aceitam ser case e comentários de clientes; recebe conteúdo educativo para a base."
   },
   {
    "setor": "financas",
    "fluxo": "Envia contratos de suporte para faturamento recorrente e custo de garantia para comparação com a provisão de 2% (Política V1 sec.6)."
   },
   {
    "setor": "direcao",
    "fluxo": "Reporta NPS, detratores, renovações e causas estruturais (ciclo externo)."
   }
  ],
  "fontes": [
   {
    "titulo": "Política de Saúde Financeira da VOICE — V1 (sec.5 e sec.6: provisão de garantia e assistência)",
    "tipo": "norma",
    "ref": "04 - PADROES/VOICE - Politica de Saude Financeira - V1.md"
   },
   {
    "titulo": "Skill ticket-triage (P1–P4 e SLA)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/customer-support/skills/ticket-triage/SKILL.md"
   },
   {
    "titulo": "Skill customer-escalation",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/customer-support/skills/customer-escalation/SKILL.md"
   },
   {
    "titulo": "Skill customer-health",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/sales/skills/customer-health/SKILL.md"
   },
   {
    "titulo": "Skill renewal-radar",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/sales/skills/renewal-radar/SKILL.md"
   },
   {
    "titulo": "Skill review-reputation",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/review-reputation/SKILL.md"
   },
   {
    "titulo": "Net Promoter System — ciclo interno (Bain & Company)",
    "tipo": "metodo",
    "ref": "https://www.netpromotersystem.com/about/net-promoter-system-framework/inner-loop/"
   },
   {
    "titulo": "Net Promoter System — ciclo externo (Bain & Company)",
    "tipo": "metodo",
    "ref": "https://www.netpromotersystem.com/about/net-promoter-system-framework/outer-loop/"
   },
   {
    "titulo": "Customer Success — Nick Mehta, Dan Steinman e Lincoln Murphy",
    "tipo": "livro",
    "ref": "Customer Success (Wiley, 2016)"
   }
  ]
 },
 {
  "id": "pessoas",
  "sigla": "CHRO",
  "nome": "Administrativo e Pessoas",
  "missao": "Ter na VOICE pessoas certas, certificadas e seguras em cada obra: integração bem feita, capacitação técnica nas marcas que integramos, NR-10 e NR-35 sempre em dia, conversas de desenvolvimento frequentes e documentos administrativos e societários vigentes, com dados pessoais protegidos.",
  "cor": "violet",
  "diretor": {
   "titulo": "Diretora Administrativa e de Pessoas (CHRO)",
   "nome": "Mariana Figueiredo Lins",
   "perfil": "Persona fictícia. Gestora de pessoas com experiência em empresas de serviços técnicos de campo, onde segurança do trabalho e certificação de fabricante definem quem pode ir para a obra. Estilo próximo e franco: elogia em público, corrige em particular e não deixa prazo legal para a última hora.",
   "especialidades": [
    "Integração (onboarding) de técnicos e instaladores com plano de 30/60/90 dias",
    "Trilhas de certificação de fabricantes de automação, redes, áudio e vídeo e segurança eletrônica",
    "Controle de NR-10, NR-35 e aptidão ocupacional para equipes de campo",
    "Conversas individuais (1:1) e avaliação de desempenho",
    "Gestão de documentos administrativos, societários e de prestadores, com LGPD"
   ],
   "metodos": [
    {
     "nome": "Radical Candor (Franqueza Radical)",
     "autor": "Kim Scott",
     "uso": "Feedback que combina cuidado pessoal e desafio direto: elogio específico sobre a obra entregue, correção objetiva e rápida sobre acabamento, organização de rack ou documentação de programação."
    },
    {
     "nome": "Reunião individual (1:1)",
     "autor": "Andy Grove (High Output Management)",
     "uso": "Conversa quinzenal de 30 minutos, pauta do colaborador: obstáculos nas obras, aprendizado técnico, carga de trabalho e carreira."
    },
    {
     "nome": "Plano de integração 30/60/90 dias",
     "autor": "Prática de gestão de pessoas (onboarding estruturado)",
     "uso": "Pré-início com documentos, EPI e acessos; primeira semana com padrões técnicos e acompanhamento de um técnico experiente em obra; metas de 30, 60 e 90 dias por função."
    },
    {
     "nome": "Gestão de segurança do trabalho por norma regulamentadora",
     "autor": "Ministério do Trabalho e Emprego (NR-10 e NR-35)",
     "uso": "Mapa de quem trabalha com eletricidade e em altura (forros, fachadas, postes de CFTV, telhados), com treinamento, reciclagem bienal, aptidão no ASO e autorização formal; validação sempre com técnico de segurança."
    },
    {
     "nome": "Privacidade por padrão e minimização de dados",
     "autor": "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
     "uso": "O VEOS guarda só o necessário para a gestão; documentos pessoais, dados de saúde e dados bancários ficam no repositório restrito do Departamento Pessoal, e aqui aparecem apenas referências."
    }
   ],
   "principios": [
    "Ninguém sobe em escada, andaime ou telhado, nem mexe em quadro elétrico, sem treinamento válido e aptidão registrada.",
    "Certificação de fabricante é ativo da empresa: acompanhar validade como se fosse estoque.",
    "Feedback cedo e específico vale mais que avaliação tardia.",
    "Dado pessoal só entra no sistema se for necessário, e com acesso restrito.",
    "Regra trabalhista, previdenciária ou fiscal não se presume: valida-se com contador e advogado."
   ],
   "como_aconselha": "Fala de forma acolhedora e objetiva. Começa pelo risco para a pessoa e para a obra, diz o que a norma ou a prática recomenda e deixa claro quando algo é PROPOSTA que precisa de validação do contador, do advogado ou do técnico de segurança. Sempre termina com responsável e prazo.",
   "perguntas_chave": [
    "Quem da equipe escalada para as obras desta semana está com NR-10, NR-35 e ASO válidos?",
    "Temos pelo menos dois técnicos certificados em cada marca principal que integramos, para não depender de uma só pessoa?",
    "Os novos colaboradores concluíram a integração e sabem os padrões técnicos da VOICE?",
    "As conversas 1:1 estão acontecendo, ou só conversamos quando há problema?",
    "Algum contrato com prestador, certidão ou documento societário vence nos próximos 30 dias?",
    "Quem tem acesso aos dados pessoais da equipe, e precisa mesmo ter?"
   ],
   "limites": [
    "Não define vínculo de trabalho, enquadramento de prestador, verbas ou obrigações fiscais: valida com contador e advogado.",
    "Não libera trabalho em altura ou com eletricidade sem parecer do técnico de segurança.",
    "Não contrata, desliga nem altera remuneração sem aprovação da direção.",
    "Não compartilha dados pessoais de colaboradores fora do necessário à finalidade."
   ]
  },
  "equipe": [
   {
    "papel": "analista_adm",
    "nome": "Analista administrativo e de departamento pessoal",
    "reporta_a": "CHRO",
    "responsabilidades": [
     "Cadastrar colaboradores e prestadores com o mínimo de dados necessários",
     "Conduzir a documentação de admissão e de contratação de prestadores com o contador",
     "Controlar férias, ausências e envio mensal das variáveis ao contador",
     "Manter documentos administrativos e societários vigentes e arquivados"
    ],
    "indicadores": [
     "documentos_vigentes",
     "absenteismo",
     "turnover"
    ]
   },
   {
    "papel": "coordenador_capacitacao",
    "nome": "Coordenador de capacitação e certificações",
    "reporta_a": "CHRO",
    "responsabilidades": [
     "Manter a matriz de certificações por função e por marca integrada",
     "Planejar treinamentos de fabricantes, internos e normativos",
     "Arquivar certificados e controlar validades",
     "Conduzir a trilha de integração técnica dos novos colaboradores"
    ],
    "indicadores": [
     "certificacoes_fabricante",
     "horas_treinamento",
     "integracao_no_prazo"
    ]
   },
   {
    "papel": "tecnico_seguranca",
    "nome": "Técnico de segurança do trabalho (próprio ou terceirizado)",
    "reporta_a": "CHRO",
    "responsabilidades": [
     "Definir quais funções exigem NR-10 e NR-35 e validar os treinamentos",
     "Acompanhar aptidão ocupacional (ASO) de quem trabalha em altura e com eletricidade",
     "Orientar EPI, análise de risco e permissão de trabalho em obras",
     "Checar semanalmente a aptidão da equipe escalada para as obras"
    ],
    "indicadores": [
     "conformidade_nr"
    ]
   },
   {
    "papel": "lider_equipe",
    "nome": "Líder de equipe técnica",
    "reporta_a": "CHRO",
    "responsabilidades": [
     "Fazer 1:1 quinzenal com cada liderado",
     "Dar feedback específico após cada entrega de obra",
     "Acompanhar o plano 30/60/90 dos novos técnicos",
     "Informar ausências e necessidades de cobertura na agenda de obras"
    ],
    "indicadores": [
     "cadencia_1a1",
     "integracao_no_prazo"
    ]
   },
   {
    "papel": "encarregado_dados",
    "nome": "Encarregado de dados pessoais (LGPD)",
    "reporta_a": "CHRO",
    "responsabilidades": [
     "Definir quem acessa dados pessoais de colaboradores e prestadores",
     "Classificar o nível de acesso dos documentos administrativos",
     "Responder a pedidos de titulares e registrar incidentes com dados pessoais"
    ],
    "indicadores": [
     "documentos_vigentes"
    ]
   }
  ],
  "processos": [
   {
    "id": "integracao",
    "nome": "Integração de colaboradores e prestadores",
    "descricao": "Da pré-admissão à efetivação, com trilha técnica específica para funções de campo.",
    "etapas": [
     {
      "id": "pre_inicio",
      "nome": "Pré-início",
      "responsavel": "analista_adm",
      "criterio_saida": "Documentação conferida com o contador, contrato assinado, EPI e uniforme separados, acessos criados"
     },
     {
      "id": "primeira_semana",
      "nome": "Primeira semana",
      "responsavel": "lider_equipe",
      "criterio_saida": "Apresentação da VOICE e dos padrões técnicos, padrinho definido, acompanhamento de obra com técnico experiente"
     },
     {
      "id": "seguranca",
      "nome": "Aptidão de segurança",
      "responsavel": "tecnico_seguranca",
      "criterio_saida": "Para funções de campo: ASO com aptidão exigida, NR-10 e/ou NR-35 válidos e autorização formal registrados"
     },
     {
      "id": "plano_30_60_90",
      "nome": "Plano 30/60/90",
      "responsavel": "lider_equipe",
      "criterio_saida": "Metas de 30, 60 e 90 dias registradas e revisadas em 1:1"
     },
     {
      "id": "efetivacao",
      "nome": "Efetivação",
      "responsavel": "analista_adm",
      "criterio_saida": "Avaliação de 90 dias concluída e colaborador marcado como ativo"
     }
    ]
   },
   {
    "id": "capacitacao_seguranca",
    "nome": "Capacitação técnica e segurança",
    "descricao": "Ciclo de certificações de fabricantes e de treinamentos normativos, com controle de validade e reciclagem.",
    "etapas": [
     {
      "id": "necessidade",
      "nome": "Levantar a necessidade",
      "responsavel": "coordenador_capacitacao",
      "criterio_saida": "Treinamento registrado para o colaborador a partir da matriz por função e marca"
     },
     {
      "id": "agendamento",
      "nome": "Agendar",
      "responsavel": "coordenador_capacitacao",
      "criterio_saida": "Data, carga horária e custo definidos, sem conflito com a agenda de obras"
     },
     {
      "id": "realizacao",
      "nome": "Realizar e comprovar",
      "responsavel": "coordenador_capacitacao",
      "criterio_saida": "Certificado arquivado e validade registrada"
     },
     {
      "id": "reciclagem",
      "nome": "Reciclar",
      "responsavel": "tecnico_seguranca",
      "criterio_saida": "Reciclagem feita antes do vencimento, ou antecipada quando houver mudança de procedimento, afastamento longo ou evento que a justifique"
     }
    ]
   },
   {
    "id": "desempenho",
    "nome": "Acompanhamento de desempenho",
    "descricao": "1:1 quinzenal, feedback após cada obra e revisão trimestral de desenvolvimento.",
    "etapas": [
     {
      "id": "um_a_um",
      "nome": "1:1 quinzenal",
      "responsavel": "lider_equipe",
      "criterio_saida": "Conversa realizada e próxima data registrada"
     },
     {
      "id": "feedback_obra",
      "nome": "Feedback de obra",
      "responsavel": "lider_equipe",
      "criterio_saida": "Feedback específico registrado após a entrega técnica"
     },
     {
      "id": "revisao_trimestral",
      "nome": "Revisão trimestral",
      "responsavel": "lider_equipe",
      "criterio_saida": "Autoavaliação, avaliação do líder e plano de desenvolvimento com próximas certificações"
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "colaborador",
    "nome": "Colaborador / prestador",
    "descricao": "Pessoa que trabalha para a VOICE, com ou sem vínculo empregatício. Guarda só o necessário à gestão; documentos pessoais, dados de saúde e bancários ficam no repositório restrito do DP (LGPD). O enquadramento do vínculo é validado com contador e advogado.",
    "responsavel": "analista_adm",
    "estados": [
     "pre_admissao",
     "integracao",
     "ativo",
     "afastado",
     "desligado"
    ],
    "estado_inicial": "pre_admissao",
    "estados_finais": [
     "desligado"
    ],
    "campos": [
     {
      "id": "vinculo",
      "rotulo": "Vínculo (validar com contador/advogado)",
      "tipo": "opcao",
      "opcoes": [
       "CLT",
       "Sócio",
       "Estagiário",
       "Prestador PJ",
       "Autônomo",
       "Outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "funcao",
      "rotulo": "Função",
      "tipo": "opcao",
      "opcoes": [
       "Instalador de infraestrutura",
       "Técnico de automação e programação",
       "Técnico de redes e TI",
       "Técnico de áudio e vídeo",
       "Técnico de segurança eletrônica e controle de acesso",
       "Projetista / engenharia",
       "Consultor comercial",
       "Administrativo e financeiro",
       "Coordenação e gestão",
       "Outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "data_inicio",
      "rotulo": "Data de início",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "gestor",
      "rotulo": "Líder imediato",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "email",
      "rotulo": "E-mail corporativo",
      "tipo": "email",
      "obrigatorio": false
     },
     {
      "id": "telefone",
      "rotulo": "Telefone corporativo",
      "tipo": "telefone",
      "obrigatorio": false
     },
     {
      "id": "trabalho_altura",
      "rotulo": "Trabalha em altura (acima de 2 m)?",
      "tipo": "sim_nao",
      "obrigatorio": true
     },
     {
      "id": "trabalho_eletrico",
      "rotulo": "Trabalha com instalações elétricas?",
      "tipo": "sim_nao",
      "obrigatorio": true
     },
     {
      "id": "aso_validade",
      "rotulo": "Validade do ASO (sem dados de saúde)",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "proxima_1a1",
      "rotulo": "Próxima 1:1",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "contrato_fim",
      "rotulo": "Fim do contrato (prestadores)",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "dossie_ref",
      "rotulo": "Pasta restrita do DP (referência)",
      "tipo": "texto",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "treinamento",
    "nome": "Treinamento / certificação",
    "descricao": "Treinamento normativo, certificação de fabricante ou capacitação interna de um colaborador, com certificado e validade. Fica 'válido' até ser substituído pela reciclagem, para que o vencimento seja vigiado.",
    "responsavel": "coordenador_capacitacao",
    "estados": [
     "necessario",
     "agendado",
     "valido",
     "reciclagem_pendente",
     "substituido",
     "cancelado"
    ],
    "estado_inicial": "necessario",
    "estados_finais": [
     "substituido",
     "cancelado"
    ],
    "campos": [
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "NR-10 básico",
       "NR-10 reciclagem",
       "NR-35 inicial",
       "NR-35 reciclagem",
       "Certificação de fabricante",
       "Integração e padrões técnicos VOICE",
       "Primeiros socorros",
       "LGPD e segurança da informação",
       "Outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "colaborador_ref",
      "rotulo": "Colaborador",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "fabricante",
      "rotulo": "Fabricante / entidade (ex.: marca de automação, rede ou áudio e vídeo integrada)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "carga_horaria",
      "rotulo": "Carga horária (h)",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "data_realizacao",
      "rotulo": "Data de realização",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "validade",
      "rotulo": "Validade",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "certificado_ref",
      "rotulo": "Certificado arquivado (link ou caminho)",
      "tipo": "texto",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "ausencia",
    "nome": "Férias e ausências",
    "descricao": "Férias, folgas, licenças, afastamentos e faltas, com cobertura definida na agenda de obras. Atestados: registrar só o período; nenhum diagnóstico ou CID no VEOS (LGPD).",
    "responsavel": "analista_adm",
    "estados": [
     "solicitada",
     "aprovada",
     "em_curso",
     "concluida",
     "recusada",
     "cancelada"
    ],
    "estado_inicial": "solicitada",
    "estados_finais": [
     "concluida",
     "recusada",
     "cancelada"
    ],
    "campos": [
     {
      "id": "tipo_ausencia",
      "rotulo": "Tipo",
      "tipo": "opcao",
      "opcoes": [
       "Férias",
       "Folga / compensação",
       "Atestado médico",
       "Licença",
       "Falta",
       "Treinamento externo",
       "Outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "colaborador_ref",
      "rotulo": "Colaborador",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "data_inicio",
      "rotulo": "Início",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "data_fim",
      "rotulo": "Fim",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "dias",
      "rotulo": "Dias",
      "tipo": "numero",
      "obrigatorio": false
     },
     {
      "id": "cobertura",
      "rotulo": "Cobertura (quem assume obras, plantão ou atendimentos)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "aprovado_por",
      "rotulo": "Aprovado por",
      "tipo": "texto",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "documento_adm",
    "nome": "Documento administrativo ou societário",
    "descricao": "Contrato social e alterações, procurações, certidões, alvarás, seguros, contratos com prestadores e políticas internas, com validade e nível de acesso.",
    "responsavel": "analista_adm",
    "estados": [
     "vigente",
     "em_renovacao",
     "substituido",
     "arquivado"
    ],
    "estado_inicial": "vigente",
    "estados_finais": [
     "substituido",
     "arquivado"
    ],
    "campos": [
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "Contrato social e alterações",
       "Procuração",
       "Certidão negativa",
       "Alvará, licença ou registro profissional",
       "Contrato com prestador de serviço",
       "Seguro (responsabilidade civil, equipamentos, vida)",
       "Política interna",
       "Outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "orgao_contraparte",
      "rotulo": "Órgão emissor ou contraparte",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "validade",
      "rotulo": "Validade",
      "tipo": "data",
      "obrigatorio": false
     },
     {
      "id": "arquivo_ref",
      "rotulo": "Arquivo (link ou caminho)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "acesso",
      "rotulo": "Nível de acesso",
      "tipo": "opcao",
      "opcoes": [
       "Interno geral",
       "Restrito à direção",
       "Restrito ao DP (contém dados pessoais)"
      ],
      "obrigatorio": false
     },
     {
      "id": "observacoes",
      "rotulo": "Observações",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "aptidao_obras_semana",
    "nome": "Checagem de aptidão da equipe escalada",
    "frequencia": "semanal",
    "responsavel": "tecnico_seguranca",
    "passos": [
     "Receber de Operações a escala de obras da semana",
     "Conferir, para cada técnico escalado em altura ou com eletricidade, NR-35/NR-10, ASO e autorização válidos",
     "Bloquear e comunicar substituição quando houver pendência",
     "Registrar a checagem"
    ]
   },
   {
    "id": "integracao_semanal",
    "nome": "Acompanhamento das integrações",
    "frequencia": "semanal",
    "responsavel": "coordenador_capacitacao",
    "passos": [
     "Listar colaboradores em pré-admissão e integração",
     "Checar etapas do checklist de integração",
     "Confirmar metas de 30/60/90 com o líder",
     "Escalar à CHRO integrações paradas"
    ]
   },
   {
    "id": "um_a_um",
    "nome": "Ciclo de 1:1",
    "frequencia": "quinzenal",
    "responsavel": "lider_equipe",
    "passos": [
     "Conduzir 30 minutos com pauta do colaborador",
     "Falar de obstáculos, aprendizado técnico, carga de trabalho e carreira",
     "Dar ao menos um feedback específico (elogio ou correção) no estilo Radical Candor",
     "Registrar próximos passos e a data da próxima 1:1"
    ]
   },
   {
    "id": "vencimentos_mensal",
    "nome": "Revisão mensal de vencimentos",
    "frequencia": "mensal",
    "responsavel": "analista_adm",
    "passos": [
     "Listar certificações, NR, ASO, contratos de prestadores e documentos que vencem em 60 dias",
     "Agendar reciclagens e renovações",
     "Atualizar certidões negativas usadas em cadastros de construtoras e condomínios",
     "Reportar à CHRO o que não tiver data garantida"
    ]
   },
   {
    "id": "variaveis_contador",
    "nome": "Envio mensal de informações ao contador",
    "frequencia": "mensal",
    "responsavel": "analista_adm",
    "passos": [
     "Consolidar férias, ausências, admissões e desligamentos do mês",
     "Conferir contratos e notas de prestadores do mês com o Financeiro",
     "Enviar ao contador pelo canal combinado, sem expor dados pessoais em canais abertos",
     "Registrar dúvidas trabalhistas ou fiscais para validação do contador ou advogado"
    ]
   },
   {
    "id": "revisao_trimestral",
    "nome": "Revisão trimestral de desenvolvimento e férias",
    "frequencia": "trimestral",
    "responsavel": "CHRO",
    "passos": [
     "Revisar desempenho com cada líder (autoavaliação e avaliação do líder)",
     "Atualizar a matriz de certificações por marca e evitar dependência de uma só pessoa",
     "Planejar férias do trimestre seguinte fora dos picos de entrega de obra",
     "Revisar acessos a dados pessoais com o encarregado de dados"
    ]
   }
  ],
  "indicadores": [
   {
    "id": "conformidade_nr",
    "nome": "Conformidade NR-10 / NR-35 da equipe de campo",
    "formula": "Colaboradores que trabalham em altura ou com eletricidade com treinamento, reciclagem e ASO válidos / total desses colaboradores × 100",
    "meta": "100% (exigência normativa; validar com técnico de segurança)",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "certificacoes_fabricante",
    "nome": "Cobertura de certificações por marca integrada",
    "formula": "Marcas principais com ao menos 2 técnicos certificados válidos / total de marcas principais × 100",
    "meta": "100% das marcas principais com 2 ou mais certificados",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "horas_treinamento",
    "nome": "Horas de treinamento por colaborador",
    "formula": "Soma da carga horária de treinamentos concluídos nos últimos 12 meses / colaboradores ativos",
    "meta": "≥ 40 h/ano para funções técnicas",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "integracao_no_prazo",
    "nome": "Integrações concluídas no prazo",
    "formula": "Integrações concluídas em até 30 dias do início / integrações iniciadas × 100",
    "meta": "≥ 90%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "cadencia_1a1",
    "nome": "Cadência de 1:1",
    "formula": "1:1 realizadas até a data prevista / 1:1 previstas × 100",
    "meta": "≥ 90%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "absenteismo",
    "nome": "Absenteísmo não planejado",
    "formula": "Dias de falta e atestado / dias úteis previstos da equipe × 100",
    "meta": "≤ 3%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "turnover",
    "nome": "Rotatividade em 12 meses",
    "formula": "Desligamentos nos últimos 12 meses / média de colaboradores ativos × 100",
    "meta": "≤ 15% ao ano",
    "frequencia": "trimestral",
    "status": "PROPOSTA"
   },
   {
    "id": "documentos_vigentes",
    "nome": "Documentos administrativos vigentes",
    "formula": "Documentos com validade futura ou em renovação antes do vencimento / documentos controlados × 100",
    "meta": "100%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   }
  ],
  "sentinelas": [
   {
    "id": "PES_CERTIFICACAO_VENCENDO",
    "titulo": "Treinamento ou certificação vencendo",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "treinamento",
     "campo": "validade",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "valido",
        "reciclagem_pendente"
       ]
      }
     ],
     "antecedencia_dias": 60
    },
    "mensagem": "O treinamento '{{titulo}}' vence em até 60 dias (ou já venceu). Agendar reciclagem antes que o técnico fique impedido de ir à obra.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Agendar reciclagem ou renovação da certificação",
      "papel": "coordenador_capacitacao",
      "prazo_dias": 7
     },
     {
      "tipo": "rascunho",
      "modelo": "aviso_reciclagem"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (NR-10 e NR-35 com reciclagem bienal; antecedência de 60 dias a calibrar)"
   },
   {
    "id": "PES_NR_PENDENTE",
    "titulo": "Treinamento NR necessário e não agendado",
    "severidade": "CRITICO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "treinamento",
     "filtros": [
      {
       "campo": "estado",
       "igual": "necessario"
      },
      {
       "campo": "categoria",
       "em": [
        "NR-10 básico",
        "NR-10 reciclagem",
        "NR-35 inicial",
        "NR-35 reciclagem"
       ]
      }
     ],
     "dias": 5,
     "data_campo": "atualizado_em"
    },
    "mensagem": "O treinamento normativo '{{titulo}}' está marcado como necessário há {{dias}} dias sem agendamento. O colaborador não deve executar a atividade até regularizar.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Agendar o treinamento NR e comunicar restrição de atividade a Operações",
      "papel": "tecnico_seguranca",
      "prazo_dias": 2
     },
     {
      "tipo": "notificar",
      "para": "CHRO"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (NR-10 e NR-35 do MTE; validar com técnico de segurança)"
   },
   {
    "id": "PES_TREINAMENTO_SEM_CERTIFICADO",
    "titulo": "Treinamento válido sem certificado arquivado",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "treinamento",
     "campo": "certificado_ref",
     "filtros": [
      {
       "campo": "estado",
       "igual": "valido"
      }
     ]
    },
    "mensagem": "O treinamento '{{titulo}}' está como válido, mas sem certificado arquivado. Sem comprovante, não há como demonstrar a capacitação em fiscalização ou para a construtora.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Arquivar o certificado e registrar a validade",
      "papel": "coordenador_capacitacao",
      "prazo_dias": 3
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (evidência de treinamento em compliance)"
   },
   {
    "id": "PES_ASO_VENCENDO",
    "titulo": "ASO vencendo para equipe de campo",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "colaborador",
     "campo": "aso_validade",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "integracao",
        "ativo"
       ]
      }
     ],
     "antecedencia_dias": 30
    },
    "mensagem": "O ASO de '{{titulo}}' vence em até 30 dias (ou já venceu).",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Agendar exame periódico com a clínica de saúde ocupacional",
      "papel": "analista_adm",
      "prazo_dias": 5
     },
     {
      "tipo": "notificar",
      "para": "tecnico_seguranca"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (PCMSO/ASO; periodicidade definida pelo médico do trabalho)"
   },
   {
    "id": "PES_INTEGRACAO_PARADA",
    "titulo": "Integração parada",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "colaborador",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "pre_admissao",
        "integracao"
       ]
      }
     ],
     "dias": 7,
     "data_campo": "atualizado_em"
    },
    "mensagem": "A integração de '{{titulo}}' não avança há {{dias}} dias.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Revisar checklist de integração com o líder",
      "papel": "coordenador_capacitacao",
      "prazo_dias": 2
     },
     {
      "tipo": "rascunho",
      "modelo": "checklist_integracao"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (onboarding 30/60/90)"
   },
   {
    "id": "PES_1A1_ATRASADA",
    "titulo": "1:1 atrasada",
    "severidade": "INFO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "colaborador",
     "campo": "proxima_1a1",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "integracao",
        "ativo"
       ]
      }
     ],
     "antecedencia_dias": 0
    },
    "mensagem": "A 1:1 com '{{titulo}}' passou da data prevista.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Realizar a 1:1 e registrar a próxima data",
      "papel": "lider_equipe",
      "prazo_dias": 3
     },
     {
      "tipo": "rascunho",
      "modelo": "roteiro_1a1"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (Andy Grove, High Output Management; Kim Scott, Radical Candor)"
   },
   {
    "id": "PES_AUSENCIA_SEM_APROVACAO",
    "titulo": "Ausência próxima sem aprovação",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "ausencia",
     "campo": "data_inicio",
     "filtros": [
      {
       "campo": "estado",
       "igual": "solicitada"
      }
     ],
     "antecedencia_dias": 7
    },
    "mensagem": "A ausência '{{titulo}}' começa em até 7 dias e ainda não foi aprovada.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Aprovar ou recusar a ausência com o líder e checar a agenda de obras",
      "papel": "analista_adm",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (antecedência de 7 dias a calibrar; prazos legais de férias a validar com o contador)"
   },
   {
    "id": "PES_AUSENCIA_SEM_COBERTURA",
    "titulo": "Ausência aprovada sem cobertura",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "ausencia",
     "campo": "cobertura",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "aprovada",
        "em_curso"
       ]
      }
     ]
    },
    "mensagem": "A ausência '{{titulo}}' foi aprovada sem definição de quem cobre as obras e atendimentos.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Definir cobertura com Operações e registrar",
      "papel": "lider_equipe",
      "prazo_dias": 2
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (planejamento de capacidade)"
   },
   {
    "id": "PES_DOCUMENTO_VENCENDO",
    "titulo": "Documento administrativo ou societário vencendo",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "documento_adm",
     "campo": "validade",
     "filtros": [
      {
       "campo": "estado",
       "igual": "vigente"
      }
     ],
     "antecedencia_dias": 30
    },
    "mensagem": "O documento '{{titulo}}' vence em até 30 dias (ou já venceu). Certidões e seguros vencidos podem travar cadastros em construtoras e condomínios.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Iniciar renovação e marcar como em renovação",
      "papel": "analista_adm",
      "prazo_dias": 5
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (controle de vencimentos em compliance)"
   },
   {
    "id": "PES_CONTRATO_PRESTADOR_VENCENDO",
    "titulo": "Contrato de prestador vencendo",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "colaborador",
     "campo": "contrato_fim",
     "filtros": [
      {
       "campo": "vinculo",
       "em": [
        "Prestador PJ",
        "Autônomo"
       ]
      },
      {
       "campo": "estado",
       "em": [
        "integracao",
        "ativo"
       ]
      }
     ],
     "antecedencia_dias": 30
    },
    "mensagem": "O contrato do prestador '{{titulo}}' termina em até 30 dias (ou já terminou).",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Decidir renovação ou encerramento com a direção e revisar o contrato com o advogado",
      "papel": "analista_adm",
      "prazo_dias": 7
     },
     {
      "tipo": "rascunho",
      "modelo": "checklist_prestador"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (gestão de contratos com prestadores; validar com advogado)"
   }
  ],
  "modelos": [
   {
    "id": "boas_vindas",
    "tipo": "email",
    "assunto": "Bem-vindo(a) à VOICE Ambientes Inteligentes",
    "corpo": "Olá, {{titulo}}!\n\nÉ uma alegria ter você na VOICE. No seu primeiro dia vamos apresentar a empresa, nossos padrões técnicos e a forma como cuidamos de clientes e arquitetos parceiros.\n\nTraga os documentos solicitados pelo DP. Uniforme e EPI estarão separados para você. Seu líder e seu padrinho vão acompanhar sua primeira semana, inclusive em obra.\n\nQualquer dúvida, fale comigo.\n{{responsavel}}"
   },
   {
    "id": "checklist_integracao",
    "tipo": "documento",
    "assunto": "Checklist de integração — {{titulo}}",
    "corpo": "INTEGRAÇÃO — {{titulo}}\n\nPRÉ-INÍCIO\n[ ] Documentação conferida com o contador\n[ ] Contrato assinado (vínculo validado)\n[ ] E-mail, sistemas e grupos de trabalho criados\n[ ] Uniforme, EPI e ferramentas separados\n[ ] Padrinho definido\n\nPRIMEIRA SEMANA\n[ ] Apresentação da VOICE, clientes e parceiros\n[ ] Padrões técnicos: infraestrutura, rack, identificação de cabos, documentação de programação\n[ ] Postura em obra de alto padrão: discrição, limpeza e proteção do ambiente\n[ ] Acompanhamento de obra com técnico experiente\n[ ] LGPD: cuidado com dados, senhas e imagens de clientes\n\nSEGURANÇA (funções de campo)\n[ ] ASO com aptidão exigida\n[ ] NR-10 e/ou NR-35 válidos\n[ ] Autorização formal registrada\n\nMETAS 30/60/90 DIAS\n30: ______  60: ______  90: ______\n\nResponsável: {{responsavel}}"
   },
   {
    "id": "roteiro_1a1",
    "tipo": "roteiro",
    "assunto": "Roteiro de 1:1",
    "corpo": "1:1 com {{titulo}} (30 min, pauta do colaborador)\n\n1. Como você está? O que mais tomou sua energia nestas duas semanas?\n2. Alguma obra ou cliente travando seu trabalho? O que eu posso destravar?\n3. O que você aprendeu de novo (marca, protocolo, integração)?\n4. Feedback: um ponto forte específico e um ponto a ajustar, com exemplo concreto.\n5. Próxima certificação ou desafio que você quer assumir.\n6. Combinados e data da próxima 1:1.\n\nLíder: {{responsavel}}"
   },
   {
    "id": "aviso_reciclagem",
    "tipo": "whatsapp",
    "assunto": "Reciclagem de treinamento",
    "corpo": "Olá! Seu treinamento '{{titulo}}' está perto de vencer. Vamos agendar a reciclagem para você continuar liberado para as obras. Me passe duas datas possíveis nesta semana, que eu alinho com a agenda de Operações. Obrigado! — {{responsavel}}"
   },
   {
    "id": "checklist_prestador",
    "tipo": "documento",
    "assunto": "Checklist de renovação de prestador — {{titulo}}",
    "corpo": "PRESTADOR — {{titulo}}\n\n[ ] Avaliação de qualidade das obras realizadas (com Operações)\n[ ] Escopo, valores e forma de medição revisados\n[ ] Treinamentos NR-10/NR-35 e seguro do prestador válidos\n[ ] Cláusulas de confidencialidade e de proteção de dados de clientes (LGPD)\n[ ] Documentos fiscais e cadastrais do prestador em dia (validar com o contador)\n[ ] Revisão contratual pelo advogado\n[ ] Decisão da direção: renovar ou encerrar\n\nResponsável: {{responsavel}}"
   },
   {
    "id": "envio_contador",
    "tipo": "email",
    "assunto": "VOICE — informações de pessoal da competência",
    "corpo": "Olá,\n\nSeguem, pelo canal seguro combinado, as informações de pessoal do mês: admissões, desligamentos, férias, ausências e contratos de prestadores.\n\nTemos também dúvidas para sua validação antes de qualquer providência:\n- ______\n\nObrigado,\n{{responsavel}}\nAdministrativo e Pessoas — VOICE Ambientes Inteligentes"
   }
  ],
  "documentos": [
   "Checklist de integração por função (campo e escritório)",
   "Matriz de certificações por função e por marca integrada",
   "Controle de NR-10, NR-35, ASO e autorizações da equipe de campo",
   "Roteiro de 1:1 e modelo de revisão trimestral",
   "Calendário de férias e ausências com cobertura",
   "Pasta de documentos societários, certidões, alvarás e seguros",
   "Modelo de contrato com prestador (revisado por advogado)",
   "Registro de acessos a dados pessoais (LGPD)"
  ],
  "relacoes": [
   {
    "setor": "direcao",
    "fluxo": "Entrega indicadores de pessoas e riscos de pessoas-chave; recebe metas de capacitação e decisões de contratação, desligamento e remuneração."
   },
   {
    "setor": "operacoes",
    "fluxo": "Recebe a escala de obras para checar aptidão NR e cobertura de ausências; devolve restrições e técnicos liberados."
   },
   {
    "setor": "financas",
    "fluxo": "Envia variáveis de folha, contratos e notas de prestadores e custos de treinamento; recebe programação de pagamentos."
   },
   {
    "setor": "tecnologia",
    "fluxo": "Recebe padrões técnicos para a integração e define junto as trilhas de certificação por marca."
   },
   {
    "setor": "posvenda",
    "fluxo": "Recebe necessidades de capacitação vindas de retornos técnicos e garantias."
   },
   {
    "setor": "secretaria",
    "fluxo": "Apoia arquivo de documentos, correspondência de órgãos e agenda de treinamentos e exames."
   }
  ],
  "fontes": [
   {
    "titulo": "Skill onboarding (pré-início, primeira semana, metas 30/60/90)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/human-resources/skills/onboarding/SKILL.md"
   },
   {
    "titulo": "Skill performance-review (autoavaliação, avaliação do líder, calibração)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/human-resources/skills/performance-review/SKILL.md"
   },
   {
    "titulo": "Skill people-report (rotatividade, tempo de casa, engajamento)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/human-resources/skills/people-report/SKILL.md"
   },
   {
    "titulo": "Skill org-planning (estrutura e pontos únicos de falha)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/human-resources/skills/org-planning/SKILL.md"
   },
   {
    "titulo": "Skill compliance-tracking (inventário de controles, evidências e calendário)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/operations/skills/compliance-tracking/SKILL.md"
   },
   {
    "titulo": "Skill vendor-check (situação de contratos com fornecedores e prestadores)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/legal/skills/vendor-check/SKILL.md"
   },
   {
    "titulo": "Skill payroll-prep (preparação de informações de folha)",
    "tipo": "skill",
    "ref": "knowledge-work-plugins/small-business/skills/payroll-prep/SKILL.md"
   },
   {
    "titulo": "NR-35 — Trabalho em Altura (texto oficial)",
    "tipo": "norma",
    "ref": "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-35.pdf"
   },
   {
    "titulo": "NR-10 — Segurança em Instalações e Serviços em Eletricidade",
    "tipo": "norma",
    "ref": "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes"
   },
   {
    "titulo": "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
    "tipo": "norma",
    "ref": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
   },
   {
    "titulo": "Radical Candor — Kim Scott",
    "tipo": "livro",
    "ref": "Scott, K. Radical Candor. St. Martin's Press, 2017"
   },
   {
    "titulo": "High Output Management — Andy Grove",
    "tipo": "livro",
    "ref": "Grove, A. High Output Management. Random House, 1983"
   }
  ]
 },
 {
  "id": "secretaria",
  "sigla": "SEC",
  "nome": "Secretaria Executiva",
  "missao": "Fazer as decisões da direção chegarem ao setor certo, com prazo e dono, e voltarem com resposta — mantendo agenda, reuniões e documentos da VOICE organizados para uma empresa que atende clientes e parceiros de alto padrão.",
  "cor": "violet",
  "diretor": {
   "titulo": "Secretária Executiva da Direção (SEC)",
   "nome": "Luciana Ferraz Assunção",
   "perfil": "Persona fictícia. Secretária executiva com formação em Secretariado Executivo e cerca de 14 anos assessorando diretorias de empresas de serviços de alto padrão, habituada a agendas com clientes exigentes, arquitetos e construtoras. Estilo discreto, organizado e firme na cobrança: nada combinado fica sem dono, prazo e registro.",
   "especialidades": [
    "Captura, esclarecimento e distribuição de demandas da direção (GTD)",
    "Gestão de agenda da direção e de compromissos com clientes, arquitetos e fornecedores",
    "Preparação e condução administrativa de reuniões: pauta, ata e encaminhamentos",
    "Controle de pendências e cobrança de retorno dos setores",
    "Gestão documental: classificação, arquivo, validade e confidencialidade (incluindo dados pessoais)"
   ],
   "metodos": [
    {
     "nome": "Getting Things Done (GTD) — capturar, esclarecer, organizar, refletir, engajar",
     "autor": "David Allen",
     "uso": "Toda ordem da direção (reunião, WhatsApp, e-mail, conversa) entra numa caixa única, é esclarecida em resultado esperado e próxima ação, recebe setor e prazo e é revisada na revisão semanal."
    },
    {
     "nome": "Reuniões eficazes: tipos de reunião e pauta com objetivo",
     "autor": "Patrick Lencioni (Death by Meeting) e práticas de gestão de reuniões",
     "uso": "Separa a reunião tática semanal da direção das reuniões estratégicas; pauta com objetivo e tempo por item enviada 24 horas antes; ata com decisões e encaminhamentos em até 24 horas."
    },
    {
     "nome": "5W2H para encaminhamentos",
     "autor": "Ferramenta da gestão da qualidade (difundida no Brasil pela escola de qualidade japonesa)",
     "uso": "Todo encaminhamento de ata e toda ordem registram o quê, por quê, quem, quando, onde, como e quanto — no mínimo quem, o quê e quando."
    },
    {
     "nome": "Matriz de Eisenhower (urgente × importante)",
     "autor": "Popularizada por Stephen R. Covey (Os 7 hábitos das pessoas altamente eficazes)",
     "uso": "Classifica as ordens para proteger a agenda da direção: o importante é agendado, o urgente não importante é delegado."
    },
    {
     "nome": "Gestão documental e tabela de temporalidade",
     "autor": "Arquivologia (CONARQ) e LGPD (Lei 13.709/2018)",
     "uso": "Documentos classificados por categoria, confidencialidade e prazo de guarda; documentos com dados pessoais com acesso restrito e descarte seguro."
    }
   ],
   "principios": [
    "Nada fica só na memória ou no WhatsApp: toda ordem vira registro com setor, resultado esperado e prazo.",
    "Toda ordem tem um único dono no setor de destino e confirmação de recebimento.",
    "Reunião sem pauta com objetivo não é convocada; reunião sem ata e encaminhamentos não terminou.",
    "Cobrança é respeitosa, previsível e registrada — e começa antes do vencimento.",
    "A agenda da direção protege tempo para o importante: clientes, parceiros e decisões.",
    "Discrição absoluta: informações de clientes, sócios e colaboradores só circulam para quem precisa.",
    "Senhas e credenciais nunca são enviadas ou arquivadas pela Secretaria; ficam no cofre sob gestão da Tecnologia."
   ],
   "como_aconselha": "Objetiva e cordial. Responde com a lista do que está pendente, com quem e até quando, destacando o que venceu e o que depende de decisão da direção. Propõe a próxima ação concreta e o texto pronto da mensagem.",
   "perguntas_chave": [
    "Qual é o resultado esperado desta ordem e até quando?",
    "Qual setor é o dono — e quem, dentro dele, confirmou o recebimento?",
    "Esta reunião precisa acontecer? Qual decisão ela deve produzir?",
    "Quais encaminhamentos da última reunião de direção ainda não foram cumpridos?",
    "Há compromissos com clientes ou arquitetos nas próximas 48 horas que ainda não foram confirmados?",
    "O que a direção precisa decidir esta semana para destravar os setores?"
   ],
   "limites": [
    "Não decide em nome da direção: distribui, acompanha e cobra; decisões ficam com a direção ou o diretor do setor.",
    "Não altera prazo de ordem da direção sem autorização de quem emitiu a ordem.",
    "Não assume compromisso com cliente, parceiro ou fornecedor em nome de outro setor.",
    "Não arquiva nem transmite senhas ou credenciais.",
    "Não descarta documento sem respeitar a temporalidade e sem autorização da direção quando for contrato, societário ou documento com dados pessoais."
   ]
  },
  "equipe": [
   {
    "papel": "assistente_direcao",
    "nome": "Assistente executiva da direção",
    "reporta_a": "SEC",
    "responsabilidades": [
     "Gerir a agenda da direção e confirmar compromissos com clientes, arquitetos e fornecedores",
     "Convocar reuniões com pauta, preparar materiais e secretariar a reunião",
     "Redigir e enviar atas com decisões e encaminhamentos"
    ],
    "indicadores": [
     "atas_24h",
     "pauta_antecedencia",
     "compromissos_confirmados"
    ]
   },
   {
    "papel": "controlador_pendencias",
    "nome": "Controlador de ordens e pendências",
    "reporta_a": "SEC",
    "responsabilidades": [
     "Registrar e esclarecer as ordens da direção e distribuí-las aos setores",
     "Garantir confirmação de recebimento e acompanhar prazos",
     "Cobrar retornos antes e depois do vencimento e consolidar o resumo semanal para a direção"
    ],
    "indicadores": [
     "ordens_no_prazo",
     "tempo_distribuicao",
     "encaminhamentos_cumpridos",
     "pendencias_vencidas"
    ]
   },
   {
    "papel": "gestor_documental",
    "nome": "Responsável pelo arquivo e gestão documental",
    "reporta_a": "SEC",
    "responsabilidades": [
     "Receber, classificar e arquivar contratos, atas, termos de aceite e correspondências oficiais",
     "Controlar validade, confidencialidade e temporalidade dos documentos",
     "Atender pedidos de localização de documentos pelos setores"
    ],
    "indicadores": [
     "documentos_classificados"
    ]
   },
   {
    "papel": "recepcao",
    "nome": "Recepção e atendimento",
    "reporta_a": "SEC",
    "responsabilidades": [
     "Receber clientes, arquitetos e fornecedores no escritório ou showroom com padrão de atendimento premium",
     "Registrar ligações e recados como ordem ou pendência para o setor correto",
     "Apoiar a logística de reuniões presenciais (sala, demonstração, café)"
    ],
    "indicadores": [
     "compromissos_confirmados"
    ]
   }
  ],
  "processos": [
   {
    "id": "fluxo_ordens",
    "nome": "Fluxo de ordens da direção",
    "descricao": "Da captura da ordem da direção ao retorno do setor e ao encerramento, com dono, prazo e cobrança.",
    "etapas": [
     {
      "id": "captura",
      "nome": "Captura",
      "responsavel": "controlador_pendencias",
      "criterio_saida": "Ordem registrada no VEOS no mesmo dia, com origem (reunião, WhatsApp, e-mail, conversa)."
     },
     {
      "id": "esclarecimento",
      "nome": "Esclarecimento",
      "responsavel": "controlador_pendencias",
      "criterio_saida": "Resultado esperado, prioridade e prazo definidos; dúvidas confirmadas com quem emitiu a ordem."
     },
     {
      "id": "distribuicao",
      "nome": "Distribuição",
      "responsavel": "controlador_pendencias",
      "criterio_saida": "Ordem enviada ao setor de destino e recebimento confirmado pelo responsável."
     },
     {
      "id": "acompanhamento",
      "nome": "Acompanhamento e cobrança",
      "responsavel": "controlador_pendencias",
      "criterio_saida": "Status atualizado; lembrete enviado antes do prazo; cobrança registrada após o prazo."
     },
     {
      "id": "retorno",
      "nome": "Retorno à direção",
      "responsavel": "controlador_pendencias",
      "criterio_saida": "Resposta do setor registrada e apresentada à direção; ordem encerrada ou reaberta com novo prazo autorizado."
     }
    ]
   },
   {
    "id": "ciclo_reuniao",
    "nome": "Ciclo da reunião",
    "descricao": "Convocação com pauta, condução, ata e verificação dos encaminhamentos.",
    "etapas": [
     {
      "id": "convocacao",
      "nome": "Convocação e pauta",
      "responsavel": "assistente_direcao",
      "criterio_saida": "Objetivo, participantes, pauta com tempo por item e materiais enviados com 24 horas de antecedência."
     },
     {
      "id": "conducao",
      "nome": "Condução e registro",
      "responsavel": "assistente_direcao",
      "criterio_saida": "Decisões e encaminhamentos anotados no formato quem, o quê e quando."
     },
     {
      "id": "ata",
      "nome": "Ata",
      "responsavel": "assistente_direcao",
      "criterio_saida": "Ata enviada em até 24 horas e encaminhamentos lançados como pendências."
     },
     {
      "id": "verificacao",
      "nome": "Verificação dos encaminhamentos",
      "responsavel": "controlador_pendencias",
      "criterio_saida": "Encaminhamentos revisados na abertura da reunião seguinte."
     }
    ]
   },
   {
    "id": "gestao_documental",
    "nome": "Gestão documental",
    "descricao": "Recebimento, classificação, arquivo, controle de validade e descarte seguro de documentos da empresa.",
    "etapas": [
     {
      "id": "recebimento",
      "nome": "Recebimento",
      "responsavel": "gestor_documental",
      "criterio_saida": "Documento registrado com origem e setor."
     },
     {
      "id": "classificacao",
      "nome": "Classificação",
      "responsavel": "gestor_documental",
      "criterio_saida": "Categoria, confidencialidade e validade/temporalidade definidas."
     },
     {
      "id": "arquivo",
      "nome": "Arquivo",
      "responsavel": "gestor_documental",
      "criterio_saida": "Documento arquivado com localização registrada e acesso restrito quando necessário."
     },
     {
      "id": "descarte",
      "nome": "Descarte",
      "responsavel": "gestor_documental",
      "criterio_saida": "Descarte seguro ao fim da temporalidade, com autorização quando exigida e registro."
     }
    ]
   }
  ],
  "registros": [
   {
    "tipo": "ordem",
    "nome": "Ordem da direção",
    "descricao": "Demanda emitida pela direção para um setor, com resultado esperado, prazo e retorno.",
    "responsavel": "controlador_pendencias",
    "estados": [
     "recebida",
     "esclarecimento",
     "distribuida",
     "em_execucao",
     "aguardando_retorno",
     "concluida",
     "cancelada"
    ],
    "estado_inicial": "recebida",
    "estados_finais": [
     "concluida",
     "cancelada"
    ],
    "campos": [
     {
      "id": "origem",
      "rotulo": "Origem",
      "tipo": "opcao",
      "opcoes": [
       "Reunião de direção",
       "WhatsApp da direção",
       "E-mail",
       "Conversa presencial ou ligação"
      ],
      "obrigatorio": true
     },
     {
      "id": "setor_destino",
      "rotulo": "Setor de destino",
      "tipo": "opcao",
      "opcoes": [
       "Direção",
       "Finanças",
       "Comercial",
       "Marketing",
       "Operações",
       "Tecnologia e Engenharia",
       "Pós-venda",
       "Pessoas",
       "Secretaria Executiva"
      ],
      "obrigatorio": true
     },
     {
      "id": "descricao",
      "rotulo": "Descrição da ordem",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "resultado_esperado",
      "rotulo": "Resultado esperado (como saber que está pronto)",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "prioridade",
      "rotulo": "Prioridade (Eisenhower)",
      "tipo": "opcao",
      "opcoes": [
       "Urgente e importante",
       "Importante — agendar",
       "Urgente — delegar",
       "Rotina"
      ],
      "obrigatorio": false
     },
     {
      "id": "dono_setor",
      "rotulo": "Responsável no setor de destino",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "retorno_setor",
      "rotulo": "Retorno do setor",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "qtd_cobrancas",
      "rotulo": "Cobranças realizadas",
      "tipo": "numero",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "reuniao",
    "nome": "Reunião",
    "descricao": "Reunião da direção, de setor, com cliente ou com parceiro, com pauta, ata, decisões e encaminhamentos.",
    "responsavel": "assistente_direcao",
    "estados": [
     "convocada",
     "pauta_enviada",
     "realizada",
     "ata_enviada",
     "encerrada",
     "cancelada"
    ],
    "estado_inicial": "convocada",
    "estados_finais": [
     "encerrada",
     "cancelada"
    ],
    "campos": [
     {
      "id": "tipo_reuniao",
      "rotulo": "Tipo de reunião",
      "tipo": "opcao",
      "opcoes": [
       "Direção — tática semanal",
       "Direção — estratégica mensal",
       "Reunião de setor",
       "Reunião com cliente",
       "Reunião com arquiteto, designer ou construtora",
       "Comitê (mudanças ou homologação)",
       "Extraordinária"
      ],
      "obrigatorio": true
     },
     {
      "id": "data_reuniao",
      "rotulo": "Data da reunião",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "objetivo",
      "rotulo": "Objetivo (decisão ou resultado esperado)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "participantes",
      "rotulo": "Participantes",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "pauta",
      "rotulo": "Pauta com tempo por item",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "ata",
      "rotulo": "Ata",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "decisoes",
      "rotulo": "Decisões tomadas",
      "tipo": "texto_longo",
      "obrigatorio": false
     },
     {
      "id": "qtd_encaminhamentos",
      "rotulo": "Número de encaminhamentos",
      "tipo": "numero",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "pendencia",
    "nome": "Pendência / encaminhamento",
    "descricao": "Encaminhamento de reunião ou item a cobrar de um setor, cliente, parceiro ou fornecedor (quem, o quê, quando).",
    "responsavel": "controlador_pendencias",
    "estados": [
     "aberta",
     "em_andamento",
     "aguardando_terceiro",
     "resolvida",
     "cancelada"
    ],
    "estado_inicial": "aberta",
    "estados_finais": [
     "resolvida",
     "cancelada"
    ],
    "campos": [
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "Follow-up",
       "Cobrança",
       "Contrato",
       "Agendamento",
       "Documentos",
       "Outros"
      ],
      "obrigatorio": false
     },
     {
      "id": "origem_ref",
      "rotulo": "Origem (reunião ou ordem)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "setor",
      "rotulo": "Setor responsável",
      "tipo": "opcao",
      "opcoes": [
       "Direção",
       "Finanças",
       "Comercial",
       "Marketing",
       "Operações",
       "Tecnologia e Engenharia",
       "Pós-venda",
       "Pessoas",
       "Secretaria Executiva",
       "Externo (cliente, parceiro ou fornecedor)"
      ],
      "obrigatorio": true
     },
     {
      "id": "quem",
      "rotulo": "Quem",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "o_que",
      "rotulo": "O quê",
      "tipo": "texto_longo",
      "obrigatorio": true
     },
     {
      "id": "como",
      "rotulo": "Como / observações",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "qtd_cobrancas",
      "rotulo": "Cobranças realizadas",
      "tipo": "numero",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "compromisso",
    "nome": "Compromisso de agenda",
    "descricao": "Compromisso da direção: visita a obra, reunião com cliente, arquiteto ou fornecedor, demonstração em showroom ou evento.",
    "responsavel": "assistente_direcao",
    "estados": [
     "agendado",
     "confirmado",
     "remarcado",
     "realizado",
     "cancelado"
    ],
    "estado_inicial": "agendado",
    "estados_finais": [
     "realizado",
     "cancelado"
    ],
    "campos": [
     {
      "id": "data_compromisso",
      "rotulo": "Data",
      "tipo": "data",
      "obrigatorio": true
     },
     {
      "id": "horario",
      "rotulo": "Horário",
      "tipo": "texto",
      "obrigatorio": true
     },
     {
      "id": "tipo_compromisso",
      "rotulo": "Tipo",
      "tipo": "opcao",
      "opcoes": [
       "Visita a obra",
       "Reunião com cliente",
       "Reunião com arquiteto ou designer",
       "Reunião com construtora",
       "Demonstração em showroom",
       "Fornecedor ou fabricante",
       "Interno",
       "Evento ou relacionamento"
      ],
      "obrigatorio": true
     },
     {
      "id": "local",
      "rotulo": "Local ou link",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "participantes",
      "rotulo": "Participantes",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "contato_confirmacao",
      "rotulo": "Telefone para confirmação",
      "tipo": "telefone",
      "obrigatorio": false
     },
     {
      "id": "preparacao",
      "rotulo": "Preparação necessária (briefing, materiais)",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "arquivo",
    "nome": "Documento arquivado",
    "descricao": "Documento oficial sob guarda da Secretaria: contratos, aditivos, termos de aceite, atas, societário, correspondências.",
    "responsavel": "gestor_documental",
    "estados": [
     "recebido",
     "classificado",
     "arquivado",
     "descartado"
    ],
    "estado_inicial": "recebido",
    "estados_finais": [
     "descartado"
    ],
    "campos": [
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "Contrato de cliente",
       "Aditivo ou termo de aceite",
       "Ata de reunião",
       "Societário ou procuração",
       "Contrato de fornecedor ou parceiro",
       "Correspondência oficial",
       "Certidão ou licença"
      ],
      "obrigatorio": true
     },
     {
      "id": "setor_origem",
      "rotulo": "Setor de origem",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "confidencialidade",
      "rotulo": "Confidencialidade",
      "tipo": "opcao",
      "opcoes": [
       "Interno",
       "Restrito à direção",
       "Contém dados pessoais (LGPD)"
      ],
      "obrigatorio": true
     },
     {
      "id": "local_arquivo",
      "rotulo": "Localização (pasta digital ou física)",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "data_validade",
      "rotulo": "Validade ou fim da temporalidade",
      "tipo": "data",
      "obrigatorio": false
     }
    ]
   },
   {
    "tipo": "contato",
    "nome": "Contato",
    "descricao": "Agenda de contatos da VOICE: clientes, arquitetos e parceiros, fornecedores e equipe. Base para WhatsApp e e-mail.",
    "responsavel": "assistente_direcao",
    "estados": [
     "ativo",
     "inativo"
    ],
    "estado_inicial": "ativo",
    "estados_finais": [
     "inativo"
    ],
    "campos": [
     {
      "id": "telefone",
      "rotulo": "Telefone / WhatsApp",
      "tipo": "telefone",
      "obrigatorio": true
     },
     {
      "id": "email",
      "rotulo": "E-mail",
      "tipo": "email",
      "obrigatorio": false
     },
     {
      "id": "empresa",
      "rotulo": "Empresa / escritório",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "cargo",
      "rotulo": "Cargo",
      "tipo": "texto",
      "obrigatorio": false
     },
     {
      "id": "categoria",
      "rotulo": "Categoria",
      "tipo": "opcao",
      "opcoes": [
       "Cliente",
       "Parceiro (arquiteto, designer, construtora)",
       "Fornecedor",
       "Equipe",
       "Outro"
      ],
      "obrigatorio": true
     },
     {
      "id": "observacoes",
      "rotulo": "Observações",
      "tipo": "texto_longo",
      "obrigatorio": false
     }
    ]
   }
  ],
  "rotinas": [
   {
    "id": "processar_entrada",
    "nome": "Processar a caixa de entrada da direção (GTD)",
    "frequencia": "diaria",
    "responsavel": "controlador_pendencias",
    "passos": [
     "Coletar ordens de WhatsApp, e-mail, recados e anotações de reuniões numa caixa única",
     "Esclarecer cada item: é acionável? qual o resultado esperado e a próxima ação?",
     "Registrar como ordem, pendência ou compromisso e distribuir ao setor com prazo",
     "Zerar a caixa de entrada até o fim do dia"
    ]
   },
   {
    "id": "briefing_agenda",
    "nome": "Briefing da agenda do dia e do seguinte",
    "frequencia": "diaria",
    "responsavel": "assistente_direcao",
    "passos": [
     "Revisar compromissos de hoje e de amanhã e confirmar os não confirmados",
     "Preparar briefing curto de cada reunião externa (cliente, arquiteto, obra)",
     "Sinalizar conflitos de agenda e deslocamentos entre obras"
    ]
   },
   {
    "id": "revisao_semanal",
    "nome": "Revisão semanal (GTD) e resumo para a direção",
    "frequencia": "semanal",
    "responsavel": "SEC",
    "passos": [
     "Revisar todas as ordens e pendências abertas por setor",
     "Listar vencidas, a vencer em 7 dias e as que dependem de decisão da direção",
     "Enviar o resumo semanal à direção antes da reunião tática"
    ]
   },
   {
    "id": "preparar_reuniao_direcao",
    "nome": "Preparar a reunião tática semanal da direção",
    "frequencia": "semanal",
    "responsavel": "assistente_direcao",
    "passos": [
     "Coletar itens de pauta dos diretores até 48 horas antes",
     "Montar pauta com objetivo e tempo por item, começando pelos encaminhamentos pendentes",
     "Enviar pauta e materiais com 24 horas de antecedência"
    ]
   },
   {
    "id": "cobranca_retornos",
    "nome": "Rodada de cobrança de retornos",
    "frequencia": "semanal",
    "responsavel": "controlador_pendencias",
    "passos": [
     "Enviar lembrete das ordens que vencem nos próximos 3 dias",
     "Cobrar ordens e pendências vencidas e registrar a cobrança",
     "Escalar à direção o que venceu após duas cobranças sem resposta"
    ]
   },
   {
    "id": "revisao_arquivo",
    "nome": "Revisão do arquivo e da temporalidade",
    "frequencia": "mensal",
    "responsavel": "gestor_documental",
    "passos": [
     "Classificar documentos recebidos e ainda sem localização",
     "Verificar documentos com validade vencendo nos próximos 30 dias (certidões, licenças, contratos)",
     "Conferir acesso restrito a documentos com dados pessoais e propor descartes à direção"
    ]
   }
  ],
  "indicadores": [
   {
    "id": "ordens_no_prazo",
    "nome": "Ordens concluídas no prazo",
    "formula": "Ordens concluídas até o prazo ÷ ordens concluídas no período × 100",
    "meta": "≥ 90%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "tempo_distribuicao",
    "nome": "Tempo de distribuição",
    "formula": "Média de horas úteis entre o registro da ordem e a confirmação de recebimento pelo setor",
    "meta": "≤ 4 horas úteis",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "atas_24h",
    "nome": "Atas enviadas em 24 horas",
    "formula": "Reuniões com ata enviada até 24 h após a realização ÷ reuniões realizadas × 100",
    "meta": "≥ 95%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "pauta_antecedencia",
    "nome": "Pautas enviadas com antecedência",
    "formula": "Reuniões com pauta enviada 24 h antes ÷ reuniões realizadas × 100",
    "meta": "≥ 90%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "encaminhamentos_cumpridos",
    "nome": "Encaminhamentos cumpridos no prazo",
    "formula": "Pendências resolvidas até o prazo ÷ pendências com prazo no período × 100",
    "meta": "≥ 85%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "pendencias_vencidas",
    "nome": "Pendências e ordens vencidas em aberto",
    "formula": "Quantidade de ordens e pendências abertas com prazo vencido no dia da revisão semanal",
    "meta": "≤ 5",
    "frequencia": "semanal",
    "status": "PROPOSTA"
   },
   {
    "id": "compromissos_confirmados",
    "nome": "Compromissos externos confirmados na véspera",
    "formula": "Compromissos externos confirmados até 24 h antes ÷ compromissos externos × 100",
    "meta": "100%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   },
   {
    "id": "documentos_classificados",
    "nome": "Documentos classificados em 2 dias úteis",
    "formula": "Documentos classificados até 2 dias úteis após o recebimento ÷ documentos recebidos × 100",
    "meta": "100%",
    "frequencia": "mensal",
    "status": "PROPOSTA"
   }
  ],
  "sentinelas": [
   {
    "id": "SEC_ORDEM_VENCENDO",
    "titulo": "Ordem da direção vencendo ou vencida",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "ordem",
     "campo": "prazo",
     "filtros": [],
     "antecedencia_dias": 1
    },
    "mensagem": "A ordem {{titulo}} vence em {{dias}} dia(s) ou já venceu e ainda não foi concluída.",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "cobranca_retorno"
     },
     {
      "tipo": "tarefa",
      "titulo": "Cobrar o setor e registrar a nova previsão",
      "papel": "controlador_pendencias",
      "prazo_dias": 0
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (GTD: revisão e acompanhamento de itens delegados)"
   },
   {
    "id": "SEC_ORDEM_SEM_PRAZO",
    "titulo": "Ordem distribuída sem prazo",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "ordem",
     "campo": "prazo",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "distribuida",
        "em_execucao",
        "aguardando_retorno"
       ]
      }
     ]
    },
    "mensagem": "A ordem {{titulo}} foi distribuída sem prazo. Ordem sem prazo não pode ser cobrada.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Confirmar o prazo com a direção e registrar",
      "papel": "controlador_pendencias",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (5W2H: quem, o quê, quando)"
   },
   {
    "id": "SEC_ORDEM_SEM_RESULTADO",
    "titulo": "Ordem sem resultado esperado definido",
    "severidade": "INFO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "ordem",
     "campo": "resultado_esperado",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "esclarecimento",
        "distribuida"
       ]
      }
     ]
    },
    "mensagem": "A ordem {{titulo}} não tem o resultado esperado descrito. Sem isso, o setor não sabe quando está pronta.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Esclarecer com a direção o resultado esperado",
      "papel": "controlador_pendencias",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (GTD: esclarecer o resultado desejado e a próxima ação)"
   },
   {
    "id": "SEC_ORDEM_SEM_CONFIRMACAO",
    "titulo": "Ordem distribuída sem confirmação do setor",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "ordem",
     "filtros": [
      {
       "campo": "estado",
       "igual": "distribuida"
      }
     ],
     "dias": 1
    },
    "mensagem": "A ordem {{titulo}} foi distribuída há {{dias}} dia(s) e o setor ainda não confirmou o recebimento.",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "distribuicao_ordem"
     },
     {
      "tipo": "tarefa",
      "titulo": "Obter confirmação de recebimento e dono no setor",
      "papel": "controlador_pendencias",
      "prazo_dias": 0
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (gestão de delegação com confirmação)"
   },
   {
    "id": "SEC_RETORNO_PARADO",
    "titulo": "Retorno do setor parado",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "ordem",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "em_execucao",
        "aguardando_retorno"
       ]
      }
     ],
     "dias": 5
    },
    "mensagem": "A ordem {{titulo}} está sem atualização há {{dias}} dias.",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "cobranca_retorno"
     },
     {
      "tipo": "notificar",
      "para": "SEC"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (GTD: lista 'aguardando' revisada semanalmente)"
   },
   {
    "id": "SEC_REUNIAO_SEM_PAUTA",
    "titulo": "Reunião próxima sem pauta enviada",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "reuniao",
     "campo": "data_reuniao",
     "filtros": [
      {
       "campo": "estado",
       "igual": "convocada"
      }
     ],
     "antecedencia_dias": 1
    },
    "mensagem": "A reunião {{titulo}} acontece em {{dias}} dia(s) e a pauta ainda não foi enviada.",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "convocacao_reuniao"
     },
     {
      "tipo": "tarefa",
      "titulo": "Fechar pauta com objetivo e enviar aos participantes",
      "papel": "assistente_direcao",
      "prazo_dias": 0
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (reuniões eficazes: pauta com objetivo enviada com antecedência)"
   },
   {
    "id": "SEC_ATA_PENDENTE",
    "titulo": "Reunião realizada sem ata",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "parado",
     "registro": "reuniao",
     "filtros": [
      {
       "campo": "estado",
       "igual": "realizada"
      }
     ],
     "dias": 1
    },
    "mensagem": "A reunião {{titulo}} foi realizada há {{dias}} dia(s) e a ata com encaminhamentos ainda não foi enviada.",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "ata_reuniao"
     },
     {
      "tipo": "tarefa",
      "titulo": "Enviar ata e lançar encaminhamentos como pendências",
      "papel": "assistente_direcao",
      "prazo_dias": 0
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (reuniões eficazes: ata em até 24 horas)"
   },
   {
    "id": "SEC_PENDENCIA_VENCIDA",
    "titulo": "Encaminhamento vencido",
    "severidade": "ALTO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "pendencia",
     "campo": "prazo",
     "filtros": [],
     "antecedencia_dias": 0
    },
    "mensagem": "O encaminhamento {{titulo}} venceu há {{dias}} dia(s).",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "cobranca_retorno"
     },
     {
      "tipo": "tarefa",
      "titulo": "Cobrar o responsável e levar à próxima reunião se não houver resposta",
      "papel": "controlador_pendencias",
      "prazo_dias": 1
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (5W2H e verificação de encaminhamentos)"
   },
   {
    "id": "SEC_COMPROMISSO_NAO_CONFIRMADO",
    "titulo": "Compromisso de amanhã sem confirmação",
    "severidade": "MEDIO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "vencido",
     "registro": "compromisso",
     "campo": "data_compromisso",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "agendado",
        "remarcado"
       ]
      }
     ],
     "antecedencia_dias": 1
    },
    "mensagem": "O compromisso {{titulo}} é em {{dias}} dia(s) e ainda não foi confirmado. Cliente e arquiteto de alto padrão esperam confirmação prévia.",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "confirmacao_compromisso"
     },
     {
      "tipo": "tarefa",
      "titulo": "Confirmar compromisso e enviar briefing à direção",
      "papel": "assistente_direcao",
      "prazo_dias": 0
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (gestão de agenda executiva)"
   },
   {
    "id": "SEC_ACUMULO_PENDENCIAS",
    "titulo": "Acúmulo de pendências abertas",
    "severidade": "INFO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "contagem",
     "registro": "pendencia",
     "filtros": [
      {
       "campo": "estado",
       "em": [
        "aberta",
        "em_andamento",
        "aguardando_terceiro"
       ]
      }
     ],
     "janela_dias": 90,
     "data_campo": "criado_em",
     "operador": ">",
     "valor": 30
    },
    "mensagem": "Há {{total}} pendências abertas criadas nos últimos 90 dias. Levar à reunião de direção para repriorizar ou cancelar.",
    "acoes": [
     {
      "tipo": "rascunho",
      "modelo": "resumo_semanal_direcao"
     },
     {
      "tipo": "notificar",
      "para": "direcao"
     }
    ],
    "fonte": "PROPOSTA — padrão de mercado (GTD: revisão semanal e limpeza de listas)"
   },
   {
    "id": "SEC_CLIENTE_SEM_EMAIL",
    "titulo": "Cliente sem e-mail no cadastro",
    "severidade": "INFO",
    "status": "PROPOSTA",
    "gatilho": {
     "tipo": "faltando",
     "registro": "contato",
     "campo": "email",
     "filtros": [
      {
       "campo": "categoria",
       "igual": "Cliente"
      }
     ]
    },
    "mensagem": "O contato '{{titulo}}' é cliente e está sem e-mail. Propostas, contratos e notas fiscais dependem dele.",
    "acoes": [
     {
      "tipo": "tarefa",
      "titulo": "Pedir o e-mail de '{{titulo}}'",
      "papel": "assistente_direcao",
      "prazo_dias": 3
     }
    ],
    "fonte": "PROPOSTA — campos do painel legado VOICE Gerenciamento de Frentes, adequados ao VEOS"
   }
  ],
  "modelos": [
   {
    "id": "distribuicao_ordem",
    "tipo": "whatsapp",
    "assunto": "Nova ordem da direção",
    "corpo": "Olá! Aqui é da Secretaria Executiva da VOICE. A direção encaminhou para o setor {{setor_destino}}:\n\n*{{titulo}}*\n{{descricao}}\n\nResultado esperado: {{resultado_esperado}}\nPrazo: {{prazo}}\n\nPode confirmar o recebimento e quem será o responsável? Obrigada!"
   },
   {
    "id": "cobranca_retorno",
    "tipo": "whatsapp",
    "assunto": "Cobrança de retorno",
    "corpo": "Olá! Retomando o item *{{titulo}}*, com prazo em {{prazo}}. A direção vai revisar este ponto na próxima reunião. Pode me passar o status atual e a previsão de conclusão? Se houver algum impedimento, me diga para eu levar à direção. Obrigada!"
   },
   {
    "id": "convocacao_reuniao",
    "tipo": "email",
    "assunto": "Convocação: {{titulo}} — {{data_reuniao}}",
    "corpo": "Olá a todos.\n\nConvocamos a reunião {{titulo}}.\n\nData: {{data_reuniao}}\nObjetivo: {{objetivo}}\nParticipantes: {{participantes}}\n\nPauta:\n{{pauta}}\n\nPor favor, leiam os materiais anexos antes da reunião e tragam os encaminhamentos da reunião anterior atualizados.\n\nSecretaria Executiva — VOICE Ambientes Inteligentes"
   },
   {
    "id": "ata_reuniao",
    "tipo": "documento",
    "assunto": "Ata — {{titulo}} ({{data_reuniao}})",
    "corpo": "ATA DE REUNIÃO\n\nReunião: {{titulo}}\nData: {{data_reuniao}}\nParticipantes: {{participantes}}\nObjetivo: {{objetivo}}\n\n1. Encaminhamentos da reunião anterior (status)\n2. Assuntos tratados\n3. Decisões: {{decisoes}}\n4. Encaminhamentos\n| Quem | O quê | Até quando |\n|---|---|---|\n|  |  |  |\n\nPróxima reunião: ...\nRedigida por: {{responsavel}}"
   },
   {
    "id": "confirmacao_compromisso",
    "tipo": "whatsapp",
    "assunto": "Confirmação de compromisso",
    "corpo": "Olá! Aqui é da VOICE Ambientes Inteligentes. Gostaríamos de confirmar nosso compromisso *{{titulo}}* em {{data_compromisso}}, às {{horario}}, em {{local}}. Está mantido? Se precisar ajustar, sugerimos outros horários. Obrigada!"
   },
   {
    "id": "resumo_semanal_direcao",
    "tipo": "documento",
    "assunto": "Resumo semanal da Secretaria para a direção",
    "corpo": "RESUMO SEMANAL — SECRETARIA EXECUTIVA\n\n1. Ordens vencidas (setor, dono, dias de atraso, cobranças)\n2. Ordens que vencem nos próximos 7 dias\n3. Itens que dependem de decisão da direção\n4. Encaminhamentos da última reunião: cumpridos × pendentes\n5. Agenda da semana: compromissos com clientes, arquitetos e obras\n6. Documentos com validade vencendo em 30 dias\n\nA única coisa mais importante da semana: ...\n\n{{responsavel}}"
   }
  ],
  "documentos": [
   "Registro único de ordens da direção (com setor, dono, prazo e retorno)",
   "Modelo de pauta com objetivo e tempo por item",
   "Modelo de ata com decisões e encaminhamentos (quem, o quê, quando)",
   "Calendário anual de reuniões de direção e comitês",
   "Plano de classificação e tabela de temporalidade de documentos",
   "Procedimento de confidencialidade e tratamento de documentos com dados pessoais",
   "Padrão de atendimento a clientes e parceiros na recepção e no showroom"
  ],
  "relacoes": [
   {
    "setor": "direcao",
    "fluxo": "Recebe ordens e decisões; devolve o resumo semanal, a agenda organizada e os itens que exigem decisão."
   },
   {
    "setor": "operacoes",
    "fluxo": "Distribui ordens e cobra retornos; agenda visitas da direção às obras; arquiva termos de aceite."
   },
   {
    "setor": "tecnologia",
    "fluxo": "Distribui ordens e cobra retornos; solicita acessos e suporte aos sistemas; convoca comitês de mudanças e homologação."
   },
   {
    "setor": "vendas",
    "fluxo": "Agenda reuniões da direção com clientes e arquitetos; arquiva contratos assinados."
   },
   {
    "setor": "financas",
    "fluxo": "Encaminha documentos financeiros recebidos e cobra retornos de ordens financeiras."
   },
   {
    "setor": "pessoas",
    "fluxo": "Organiza reuniões e arquiva documentos societários e atas que envolvam pessoas, com acesso restrito."
   },
   {
    "setor": "posvenda",
    "fluxo": "Encaminha contatos de clientes recebidos pela recepção e agenda visitas de relacionamento."
   }
  ],
  "fontes": [
   {
    "titulo": "Skill task-management (listas ativas, aguardando, concluídas; extração de compromissos de reuniões)",
    "tipo": "skill",
    "ref": "productivity/skills/task-management/SKILL.md"
   },
   {
    "titulo": "Skill meeting-briefing (preparação de reuniões e acompanhamento de ações)",
    "tipo": "skill",
    "ref": "legal/skills/meeting-briefing/SKILL.md"
   },
   {
    "titulo": "Skill monday-brief (resumo semanal em uma página e 'a única coisa')",
    "tipo": "skill",
    "ref": "small-business/skills/monday-brief/SKILL.md"
   },
   {
    "titulo": "Skill status-report (decisões necessárias com contexto e recomendação)",
    "tipo": "skill",
    "ref": "operations/skills/status-report/SKILL.md"
   },
   {
    "titulo": "Skill process-doc (RACI e responsabilidades)",
    "tipo": "skill",
    "ref": "operations/skills/process-doc/SKILL.md"
   },
   {
    "titulo": "Getting Things Done — David Allen",
    "tipo": "livro",
    "ref": "Allen, D. A arte de fazer acontecer (Getting Things Done). 2001; ed. revisada 2015"
   },
   {
    "titulo": "Death by Meeting — Patrick Lencioni",
    "tipo": "livro",
    "ref": "Lencioni, P. Death by Meeting. Jossey-Bass, 2004"
   },
   {
    "titulo": "Os 7 hábitos das pessoas altamente eficazes — Stephen R. Covey (matriz urgente × importante)",
    "tipo": "livro",
    "ref": "Covey, S. R. The 7 Habits of Highly Effective People. 1989"
   },
   {
    "titulo": "5W2H — ferramenta de plano de ação da gestão da qualidade",
    "tipo": "metodo",
    "ref": "5W2H"
   },
   {
    "titulo": "CONARQ — gestão de documentos e temporalidade",
    "tipo": "site",
    "ref": "https://www.gov.br/conarq"
   },
   {
    "titulo": "Lei 13.709/2018 — LGPD",
    "tipo": "norma",
    "ref": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
   }
  ]
 }
];
