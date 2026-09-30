# Reaproveitamento de skills oficiais

Fonte: clone local `scratch/references/knowledge-work-plugins` (Anthropic), commit
`da38ec1ee89d41e5380e652a97382695003396e7` (`refs/remotes/origin/main`, conferido em
`.git/packed-refs` em 28/09/2026).

As skills foram **lidas e aplicadas como referência de método**. Nada foi copiado para este
portal, nenhum plugin foi instalado (local ou global) e nenhum conector citado pelas skills
foi consultado: o usuário restringiu a registros reais e só o Zoho interessa — e o Zoho está
declarado incorreto, então também não alimenta indicador.

| Skill (arquivo lido) | O que foi reaproveitado | Onde está no portal | O que NÃO foi reaproveitado |
|---|---|---|---|
| `small-business/skills/business-pulse/SKILL.md` | Briefing de uma página; **#1 prioridade** única, específica, com números e próximo passo; TL;DR de 3 linhas “números primeiro”; todo número com delta vs período anterior ou “sem baseline”; riscos nomeando registro + valor + próximo passo; status geral = pior seção; fontes indisponíveis em apêndice discreto | `veosportal/cfo_indicadores.py` (`montar_briefing`), aba **Briefing** (`web/js/ui/views/cfo_briefing.js`) | Coleta paralela de conectores (QuickBooks, Stripe, HubSpot, Gmail…), pedir números ao dono, exportar/publicar, agendamento |
| `business-pulse/reference/output_template.md` | Ordem Status → TL;DR → seções → #1 Priority → Apêndice (janela, fontes usadas/indisponíveis, limiares); setas ▲ ▼ ▬ com ▬ para variação < 1% | idem; `domain/controls.js` (`arrow`, `comparisonLabel`) | Emojis e seções de pipeline/calendário/e-mail (sem fonte válida) |
| `business-pulse/reference/data_sources.md` | Regra de degradar com elegância: fonte ausente vira “n/d” e vai ao apêndice, nunca bloqueia; nota de que o Books não tem DRE (faturado ≠ resultado) | apêndice do briefing; indicador “Faturamento” rotulado como grandeza distinta | Mapeamento de ferramentas dos conectores |
| `business-pulse/reference/thresholds.md` | Limiares explícitos e rotulados; os que não vêm da política ficam marcados como não oficiais | `apendice.limiares` com origem POLITICA / CONVENÇÃO / RASCUNHO | Limiares SMB genéricos (runway 6 meses etc.): substituídos pelos da Política V1/V1.1 |
| `small-business/shared/artifact-style.md` | Padrões de componente: *status pill* retangular em caixa alta (→ `.stamp`), *stat tile* número + linha de contexto (→ `.stat`), tabela com números tabulares à direita, painéis “ledger-card”, apêndice discreto, tokens em vez de hex | `web/css/components.css` (camada nova) + `dom.js` (`stamp`, `stat`, `method`) | Paleta teal/stone e fontes Google (CSP local e identidade obsidiana/dourado/ciano preservadas) |
| `small-business/shared/absent-is-not-zero.md` | Ausente/denominador zero → `null` + lacuna explícita; histórico ausente → “desconhecido”; “sem parceiro” ≠ parceiro não informado | `cfo_controls.py`, `cfo_indicadores.py`, testes `test_zero_denominators_become_null`, `test_missing_partner_and_fixed_cost_are_gaps`, `test_absent_history_is_unknown_not_zero` | — |
| `design/skills/design-system/SKILL.md` | Tokens → componentes com variantes/estados → padrões (formulários, navegação por sidebar/abas, exibição de dados, feedback); consistência antes de criatividade; documentar estados | Tokens existentes reutilizados; novos componentes só com tokens; abas com `role=tablist` e setas; estados `tone-ok/warn/risk/neutral/live` | Auditoria com pontuação e integração Figma |
| `finance/skills/financial-statements/SKILL.md` | Comparação período a período: variação R$ = atual − anterior; variação % = (atual − anterior) / \|anterior\| × 100; margens comparadas em pontos (p.p.); rótulo “gerencial, não GAAP/DRE” | `comparar()` em `cfo_indicadores.py`; aba **Indicadores** | Demonstrações GAAP, materialidade, decomposição de variância |

## Limites

- Reaproveitar a estrutura **não** torna os números reais: toda a camada usa a base
  `engine/fixtures/cfo-controles-TESTE.json`.
- As skills não definem regra financeira da VOICE. Regras vêm apenas da Política V1 e da
  Clarificação V1.1 ativas; o que elas não definem aparece como CONVENÇÃO DE SIMULAÇÃO ou
  RASCUNHO NÃO OFICIAL.
- O clone de skills não é publicado (ver `.gitignore` e `MANIFEST.md`).
