# Consolidação CFO no VOICE_360 — RASCUNHO REVISÁVEL

**Estado: RASCUNHO.** Nada aqui foi promovido ao VOICE_360. Nenhuma nota canônica foi criada,
alterada ou reclassificada e o Writer canônico não foi executado. A mesma estrutura é exibida
no portal em **Contexto VOICE_360** (fonte única: `veosportal/voice360.py`, constante
`CONSOLIDACAO`).

## Fontes de regra (somente leitura, lista fixa)

| Fonte | Caminho no cofre | Uso |
|---|---|---|
| Política V1 (ativa) | `04 - PADROES/VOICE - Politica de Saude Financeira - V1.md` | §2 ticket, §3 faixas, §4 fórmula, §6 provisão, §7 fixos, §8 exceções, §9 desconto, §10 recebimento, §12 reserva, §13 indicadores, §14 governança |
| Clarificação V1.1 (ativa) | `04 - PADROES/VOICE - Politica de Saude Financeira - V1.1 - Clarificacao de posicao e exposicao de caixa.md` | posição, exposição, Valor do Contrato, falha fechada, gatilho > 10 %, pro forma |

O portal confere SHA-256 e `status` do frontmatter; a V1 é comparada com o hash registrado na
V1.1 (`4888E7BA…9D68`). Memórias derivadas (V2 draft/unverified) não são usadas.

## Funções implementadas

| Função | Implementação | Fontes | Estado |
|---|---|---|---|
| Margem de contribuição e faixas | `engine/cfo.py`, `cfo_controls.margem` | V1 §3, §4, §6, §7 | Implementado — dados sintéticos |
| Posição e exposição corrente/pro forma | `engine/cfo.py`, `cfo_controls.exposicao` | V1.1 §4–10 | Implementado — dados sintéticos |
| Ticket desejado | `cfo_controls.avaliar_ticket` | V1 §2 | Implementado — simulação |
| Desconto e alçada | `cfo_controls.simular_desconto` | V1 §3, §8, §9 | Implementado — lacuna 30–31,99 % não resolvida pela fonte |
| Cobertura por fase | `cfo_controls.avaliar_fases` | V1 §10 | Implementado — simulação |
| Reserva de caixa | `cfo_controls.avaliar_reserva` | V1 §12 | Parcial — janela/método em rascunho não oficial |
| Indicadores §13 e briefing | `cfo_indicadores` | V1 §13; estrutura do skill business-pulse | Implementado — dados sintéticos |
| Registro de decisões | `ledger.DecisionLedger` | V1 §14; padrão de `tools/decisoes_v2.py` | Implementado — local, autoria declarada |

## Dependências (externas ao código)

| Dependência | Responsável | Estado |
|---|---|---|
| Base financeira real validada para substituir a base TESTE | usuário | Pendente |
| Decisão sobre metodologias em rascunho (reserva, inadimplência, PMR, atribuição de período, denominador de desconto) | direção | Pendente |
| Alçada para desconto ≤ 2 % com MC entre 30 % e 31,99 % | política (revisão) | Não definida pela fonte |
| Autorização OAuth dos demais apps Zoho via MCP oficial | administrador Zoho | Pendente |
| Promoção canônica no VOICE_360 (Writer) | decisão separada | Não autorizada |
| Aprovação autenticada da direção | identidade | Não iniciada |

## Revisão sugerida

1. Conferir se cada convenção marcada no portal deve virar regra, ser alterada ou descartada.
2. Decidir a alçada da lacuna do desconto.
3. Só depois de base real validada e decisões registradas, avaliar promoção canônica —
   como decisão separada, fora deste portal.
