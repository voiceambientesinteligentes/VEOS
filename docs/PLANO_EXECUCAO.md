# Plano de execução

Base: Plano Mestre V1 (30/09/2026), P01–P15. Status: NÃO INICIADA · EM EXECUÇÃO · BLOQUEADA ·
EM VALIDAÇÃO · CONCLUÍDA. Sem percentual global.

| Etapa | Entrega verificável | Depende de | Status |
|---|---|---|---|
| P01 Arquitetura e decisões | `docs/` deste repositório | — | CONCLUÍDA (30/09) |
| P01b Workspace e saída do Obsidian | workspace + backup verificado + `.obsidian` arquivada | Obsidian fechado | EM EXECUÇÃO |
| P02 Núcleo local (item 30, 15 cenários, W1–W10) | item 30 com decisão rastreável; 15 cenários executados | análise + decisão do Fernando | BLOQUEADA |
| P03 Versionar código | `git clone` do repositório privado roda os testes | repositório privado | EM EXECUÇÃO (Git local pronto) |
| P03b **Vigia (sistema vivo)** | eventos → avisos por diretor, com fonte; tela no portal | regras aprovadas por setor | EM EXECUÇÃO (orçamento pronto em TESTE) |
| P04 Esquema e setores | esquema de cadastros compartilhados + visões por setor + exemplos TESTE | P01 | NÃO INICIADA |
| P05 Viabilidade online | MCP autenticado lê 1 documento TESTE dentro da franquia; CPU medida | P03, decisão P-1 | NÃO INICIADA |
| P06 Núcleo na nuvem | regras e vigia rodando no servidor com os mesmos testes | P05 | NÃO INICIADA |
| P07 Cópia de teste online | contagem e hashes online = originais | P06 | NÃO INICIADA |
| P08 MCP de consulta | CFO/CMO trazem fontes corretas; acesso indevido negado | P07 | NÃO INICIADA |
| P09 Ordens e escrita | repetir a chamada não duplica; aprovação com identidade | P08 | NÃO INICIADA |
| P10 Piloto CFO | relatório TESTE rastreável | P09 | NÃO INICIADA |
| P11 Piloto CMO | campanha revisável sem vazar custos | P09 | NÃO INICIADA |
| P12 Portal online | portal no subdomínio, desktop e celular | P06 | NÃO INICIADA |
| P13 Backup e restauração | restauração demonstrada | P07 | NÃO INICIADA |
| P14 Homologação | ordem via MCP com o PC desligado | P08–P13 | NÃO INICIADA |
| P15 Setores e dados reais | setor com dados reais validados | P14 | NÃO INICIADA |

## Definição de "pronto" da primeira meta (MVP online)
1. Portal VEOS no subdomínio da VOICE, com login restrito.
2. Vigia avisa sobre orçamento TESTE que não fecha, com regra e fonte.
3. CFO e CMO respondem via MCP com fonte, versão e lacunas (dados TESTE).
4. Tudo acima funcionando com o PC da VOICE desligado.

## Etapa: Biblioteca e governança (01/10/2026)
| Item | Situação |
|---|---|
| Registros tipados, estados, versões, vigência | Implementado e testado (banco 20/20) |
| Autoridade, confirmação explícita, trava contra alteração silenciosa | Implementado e testado |
| Divergência fundamentada / hipótese a validar | Implementado e testado |
| Pareceres (informado/consultado/aprovador), sem resposta ≠ aprovação, encaminhamento CEO/fundador | Implementado e testado; respostas dependem de membros humanos nos setores |
| Consulta a precedentes integrada (Negociação: proposta e pedido) | Implementado; validado em banco e tela simulada |
| Menu Biblioteca (7 áreas, filtros, ficha, ações) | Implementado; validado em tela simulada |
| Recomendações por IA dos líderes / 3 lentes automáticas | Dependente de integração (IA) |
| Assuntos reservados, CEO humana, precedência, alçadas faltantes | Pendente de decisão do fundador |

## Etapa: Financeiro completo e CFO apto (05/10/2026)
Critério de "pronto" do financeiro: cada linha com entrega verificável. **Não está 100%** enquanto houver linha dependente do Fernando.

| Item | Entrega verificável | Situação |
|---|---|---|
| Motor de raciocínio do CFO | pergunta no site respondida pela IA com ferramentas do VEOS, trilha em `ia_execucoes`, fontes e conferência de valores | Implementado e testado (unitário 12, banco 12/12, tela, online sem chave); **resposta real depende da chave do Gemini (Fernando)** |
| Precificação pela Política | análise e correção de orçamento, preço por faixa, custo real com dólar do dia | Implementado e testado (ferramentas contra o banco real reproduzem o cálculo manual do EST-000966) |
| Caixa real (extrato) | importar OFX/CSV sem duplicar, saldo por âncora, classificar com regras, conciliar com parcela/conta/transferência | Implementado e testado (banco 25/25, leitor 8, tela 12/12, online 9/9); **depende de o Fernando cadastrar as contas e importar o extrato** |
| Contas fixas, dívidas e retirada | recorrentes viram contas a pagar automáticas; importação do Formulário do CFO | Implementado e testado (banco); **conferir valores e vencimentos reais (Fernando)** |
| Fluxo de 13 semanas e reserva | projeção semanal com imposto estimado, atrasos, necessidade de caixa 30/60/90, reserva 3× fixos | Implementado e testado (domínio 7, tela, ferramenta) |
| Fechamento do mês (DRE) | DRE pelo caixa com MC e margem operacional, pendências e conferência com o saldo | Implementado e testado; **completo só com extrato classificado** |
| Indicadores da Política (sec.13) | 15 indicadores com fórmula, meta da Política e LACUNA | Implementado e testado; vários em LACUNA até haver extrato e pedidos |
| Vigia do caixa | alertas CAIXA_* automáticos no Radar de Finanças | Implementado e testado contra o banco real (CAIXA_SEM_CONTAS ativo) |
| Impostos reais | alíquotas do contador (2026 e 2027) no Formulário | **Depende do contador** (hoje SIMULAÇÃO rotulada) |
| RT/comissão a pagar | contas a pagar automáticas de RT e comissão por pedido | **Depende de decisão (P-9)**; fase de alinhamento com o comercial |
| Pedidos reais | orçamentos aceitos viram pedidos com parcelas (contas a receber) | Fluxo pronto; **0 pedidos reais**: uso pelo Fernando/equipe |
