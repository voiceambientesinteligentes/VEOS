# Critérios de conclusão — CFO e integrações Zoho (28/09/2026)

**Resposta direta:** o CFO **não** está 100% concluído e as plataformas Zoho **não** estão
100% integradas. O que dependia só de código e dos dados/permissões atuais foi implementado;
o restante depende de ações externas listadas abaixo.

Legenda de status:
- **IMPLEMENTADO** — código presente e coberto por teste nomeado (dados sintéticos TESTE).
- **PARCIAL** — implementado com convenção/rascunho não oficial ou escopo reduzido declarado.
- **PENDENTE EXTERNO** — depende de dado, decisão, conta ou permissão fora do código.
- **NÃO EXECUTADO** — verificação que só o usuário pode rodar neste PC.

> Os testes novos foram escritos nesta entrega **mas não executados por quem os escreveu**
> (sem shell nesta sessão). Até o usuário rodar os comandos abaixo, “coberto por teste”
> significa “teste existe”, não “teste passou”.

## A. Camada de controles CFO (Decimal)

| # | Critério | Status | Evidência |
|---|---|---|---|
| A1 | Ticket R$ 100.000 desejado, sem bloqueio; exceção justificada não reduz margem | IMPLEMENTADO | `TicketTests` |
| A2 | Desconto recalcula RL/MC e provisão 2% uma vez; imposto pós-desconto explícito | IMPLEMENTADO | `DescontoTests.test_recalculates_rl_mc_and_provision_once` |
| A3 | Alçadas: ≤2% com MC≥32 autonomia; >2–5 direção; MC<30 direção; >5 excepcional; MC<25 extraordinária; limites exatos 2,00/5,00/32/30/25 | IMPLEMENTADO | `DescontoTests` (fronteiras) |
| A4 | MC 30–31,99% com desconto ≤2% = NÃO RESOLVIDO | IMPLEMENTADO | `test_mc_30_to_31_99_with_small_discount_is_unresolved` |
| A5 | Denominador do desconto = bruto, rotulado CONVENÇÃO DE SIMULAÇÃO | PARCIAL (convenção, não regra) | `convencoes` no resultado |
| A6 | Cobertura por fase com recebimento efetivo alocado; sem reutilização; a receber não conta; atual × proposta sem aprovar compra; 50/40/10 editável | IMPLEMENTADO | `FasesTests` |
| A7 | Reserva: meses completos, livre × restrito, meta 3 meses, histórico ausente = desconhecido | IMPLEMENTADO | `ReservaTests` |
| A8 | Janela/método da reserva configuráveis como RASCUNHO NÃO OFICIAL | PARCIAL (aguarda decisão) | `test_window_and_method_are_configurable` |
| A9 | 15 indicadores com valor/metodologia/data/fonte/status/origem | IMPLEMENTADO | `test_fifteen_indicators_with_full_metadata`, `test_values_september` |
| A10 | `null` para denominador zero ou dado ausente | IMPLEMENTADO | `test_zero_denominators_become_null`, `test_missing_partner_and_fixed_cost_are_gaps` |
| A11 | Comparação atual × anterior (Δ R$, variação/\|anterior\|, p.p.); sem baseline = indisponível | IMPLEMENTADO | `test_period_comparison`, `test_without_baseline_comparison_is_unavailable` |
| A12 | Contrato ≠ receita ≠ faturamento ≠ caixa; nada é DRE contábil | IMPLEMENTADO (rótulos) | metodologias em `cfo_indicadores.METODOLOGIA` |
| A13 | Fixture nova somente TESTE; fixture antiga inalterada | IMPLEMENTADO | `engine/fixtures/cfo-controles-TESTE.json`; `cfo-demo.json` não editado |
| A14 | Motor original preservado | IMPLEMENTADO | `engine/cfo.py` não editado; `BridgeTests` existentes |

## B. Portal CFO

| # | Critério | Status | Evidência |
|---|---|---|---|
| B1 | Formulários reais de desconto, ticket, fase e reserva | IMPLEMENTADO | aba Controles (`cfo_controls.js`); rotas em `test_http_cfo.py` |
| B2 | Briefing no topo com prioridade calculada, evidência e lacunas | IMPLEMENTADO | `BriefingTests`; aba Briefing |
| B3 | Badge TESTE único por tela; metodologia recolhida | IMPLEMENTADO | `method()` em `dom.js` |
| B4 | Tokens/componentes/abas existentes reaproveitados; HTML/CSS/JS em camadas | IMPLEMENTADO | `components.css`/`views.css` (camadas novas só com tokens) |
| B5 | Menu Integrações Zoho com progresso por contagens, sem percentual global | IMPLEMENTADO | `integrations.js`; `test_catalog_complete_and_nothing_hardcoded`; JS `integrationProgress` |
| B6 | Verificação visual no navegador | NÃO EXECUTADO | rodar `verify_browser.mjs` e revisar as abas novas |

## C. Integrações Zoho

| # | Critério | Status | Evidência |
|---|---|---|---|
| C1 | Registro dos 59 serviços do catálogo + 2 upcoming; catálogo ≠ contratado/conectado | IMPLEMENTADO | `test_catalog_complete_and_nothing_hardcoded` |
| C2 | Estados separados (oferta/conta/servidor/leitura/dados/ação), nada fixo no código | IMPLEMENTADO | idem |
| C3 | Healthcheck real `claude mcp list`, sem shell, timeout, job assíncrono, JSON sanitizado | IMPLEMENTADO | `test_health_runs_mcp_list_without_shell_and_sanitizes`, `test_health_job_is_async_and_recorded` |
| C4 | Probes read-only com whitelist exata, `--setting-sources ""`, dontAsk, hooks desativados, negação de escrita | IMPLEMENTADO | `test_probe_command_is_exact_whitelist` |
| C5 | Validação de `tool_use` + `tool_result` reais; narrativa não conta; falha = erro | IMPLEMENTADO | `test_probe_rejects_narrative_and_incomplete_streams` |
| C6 | Somente metadados sanitizados persistidos | IMPLEMENTADO | `test_probe_success_keeps_only_metadata` |
| C7 | Execução real do healthcheck e dos 3 probes neste PC | NÃO EXECUTADO | abrir **Integrações Zoho** e usar os botões; resultado fica registrado com horário |
| C8 | Autorização/OAuth dos demais apps (inclui Mail via MCP custom) | PENDENTE EXTERNO | administrador Zoho + guia MCP oficial |
| C9 | Contratação real de cada app | PENDENTE EXTERNO | não verificável pelo catálogo |
| C10 | Dados Zoho confiáveis para indicador | PENDENTE EXTERNO | usuário declarou os dados atuais incorretos |

## D. Chat, Secretaria e reunião com contexto CFO

| # | Critério | Status | Evidência |
|---|---|---|---|
| D1 | Contexto calculado TESTE + regras + integrações injetado pela aplicação; provedor sem tools | IMPLEMENTADO | `ContextTests`; `test_command_has_no_tools_and_denies_mcp` (existente) |
| D2 | Só CFO recebe; demais salas/históricos inalterados | IMPLEMENTADO | `test_injected_in_cfo_chat_only`, `test_meeting_gives_context_only_to_cfo_turn` |
| D3 | COMMON_RULES: acesso conectado ≠ registros validados; nunca Zoho em indicador | IMPLEMENTADO | `test_common_rules_separate_access_from_validated_records` |
| D4 | Resposta real do Claude Code com contexto | NÃO EXECUTADO | `python verify_live_integration.py` ou conversa na sala CFO |

## E. Decisões locais

| # | Critério | Status | Evidência |
|---|---|---|---|
| E1 | Append-only, cadeia SHA-256, transação SQL, snapshot com hash | IMPLEMENTADO | `LedgerTests` |
| E2 | Proposto / registrado pelo usuário / rejeitado, motivo, autor, dependências; sem autoaprovação | IMPLEMENTADO | `test_requires_explicit_confirmation_and_valid_fields`, `test_resolution_rules_no_double_resolution` |
| E3 | Identidade forte da direção | PENDENTE EXTERNO | aplicação local no PC; autoria é declarada |

## F. VOICE_360

| # | Critério | Status | Evidência |
|---|---|---|---|
| F1 | Lista fixa de políticas oficiais com hash/status; fallback NÃO CANÔNICO | IMPLEMENTADO | `Voice360Tests` |
| F2 | Documento de consolidação revisável no portal | IMPLEMENTADO | tela Contexto VOICE_360; `CONSOLIDACAO-VOICE360-RASCUNHO.md` |
| F3 | Promoção canônica | PENDENTE EXTERNO (não autorizada) | decisão separada; Writer não executado |

## G. Testes

| # | Critério | Status |
|---|---|---|
| G1 | 65 Python + 12 JS existentes preservados (nenhum removido/alterado) | IMPLEMENTADO — confirmar executando |
| G2 | Suítes novas (limites, alocação duplicada, ausências, probes, esquema, health, contexto, ledger, HTTP) | IMPLEMENTADO — **NÃO EXECUTADO** |

Comandos:

```
cd scratch\VEOS-LOCAL\portal
python -m unittest discover -s tests -v
node --test tests/js/domain.test.mjs tests/js/controls.test.mjs
```

## Verificação executada em 30/09/2026

Em 30/09/2026 às 09:02:31 -03, as duas suítes documentadas acima foram executadas neste PC: **144 testes Python aprovados** e **20 testes JavaScript aprovados**, ambos com saída 0. Evidências: `verification/codex-20260930-090226/result.json`, `python-tests.txt` e `js-tests.txt`.

Essa execução substitui a pendência de execução das suítes G1/G2 indicada no texto histórico acima. Os testes usam mocks e dados sintéticos; não comprovam autenticação, leitura real do Zoho, confiabilidade dos dados financeiros, aprovação humana ou conclusão do Writer. A revisão visual B6 e as verificações reais C7/D4 não foram realizadas nesta execução. O projeto não foi declarado 100% concluído.
