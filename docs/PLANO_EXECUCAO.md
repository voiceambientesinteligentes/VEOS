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
