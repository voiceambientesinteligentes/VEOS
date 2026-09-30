# Estado atual — 30/09/2026

**Resumo:** o vigia (avisos do CFO sobre orçamentos) **está online** no Supabase e o banco tem a base inicial; o portal ainda roda só no PC. O portal local funciona com dados TESTE. O vigia (sistema vivo)
existe como protótipo para orçamentos. O pipeline V2 do cérebro segue bloqueado na
classificação do item 30. **Não está 100%.**

## Funciona (com evidência)

| Item | Evidência | Limite |
|---|---|---|
| Portal VEOS local (salas CEO/CFO/COO/CIO/CMO/CSO + Secretaria) | `apps/portal`: **155 testes Python + 20 JS aprovados** em 30/09 ~10:30, executados nesta sessão | mocks e dados sintéticos; sem Zoho real |
| Vigia `orcamento.salvo` | `test_vigia.py` (10) + rota `POST /api/vigia/orcamento` (`test_http_cfo.py`); aba **Sala CFO → Avisos (vigia)** conferida no Edge headless (desktop 1366px e celular 390px, 0 erros JS, sem rolagem lateral) | só TESTE; nada gravado |
| Controles CFO (ticket, desconto/alçada, fases, reserva, 15 indicadores) | `cfo_controls.py`, `cfo_indicadores.py` + testes | metodologias não definidas pela política ficam como RASCUNHO NÃO OFICIAL |
| Busca/hook do VOICE_360 no Claude Code | hook `UserPromptSubmit` injeta memórias com autoridade/hash | roda no PC (PowerShell); não é online |
| PreWriter 1.5: build e 34 testes de replay | `VOICE360-V2/scratch/prewriter-blockers-20260930/run-20260930-091224/stage-replay-tests.json` (passed 34, failed 0, skipped 0) | não é Writer de produção |

## Bloqueado

| Item | Situação verificada | Destrava com |
|---|---|---|
| 15 cenários PreWriter | `blocker-tests.json`: `BLOCKED_NO_GENUINE_CONSENSUS`; `genuine-preflight15.json`: `BLOCKED` | resolver o item 30 |
| Item 30 (classificação) | agregado `UNRESOLVED_TYPE`; 30/31 itens unânimes; item 30 = REFERENCIA/REFERENCIA/PADRAO | análise da fonte + decisão explícita e rastreável (etapa E) |
| Writer de produção | nunca executado nesta sequência | item 30 + requisitos W1–W10 (`VOICE360-V2-PLANNING/08-V2-PIPELINE-SPEC.md` §10.1) |
| Remover `.obsidian` da raiz | cópia arquivada e verificada (6 arquivos, hashes idênticos); a remoção da original foi **bloqueada pelo ambiente de permissões** | Fernando apagar a pasta ou aprovar a remoção |

## Online (Supabase, projeto `veos`, plano Free, us-east-1)
- Função `vigia`: `https://vkrwxvnfstvriibjwuvw.supabase.co/functions/v1/vigia` (POST, exige chave). **425/425 casos iguais ao Python** chamando a função publicada (mediana 117 ms, p95 174 ms); sem chave → 401.
- Banco: migração `20260930120000_base_setores_vigia` aplicada. Tabelas setores, diretores, orcamentos, avisos, eventos; 7 setores + 7 diretores; **RLS ativo em todas**, a chave pública não lê (listas vazias) nem grava (401); `db lint` sem erros.
- Ainda não: o vigia online não grava orçamentos/avisos no banco; sem login de usuários; portal não publicado.

## GitHub
- `origin` = https://github.com/voiceambientesinteligentes/VEOS (branch `main`), **público** por decisão do Fernando. Push verificado: commit remoto = local.

## Não implantado
- Nenhum servidor MCP próprio, nenhum domínio configurado.
- Nenhuma IA no servidor (sem orçamento de API definido).
- Nenhum dado real (Zoho declarado não confiável pelo dono).
- Setores Pós-venda e Administrativo/Pessoas não têm perfil no portal.

## Não executado nesta sessão
- Verificação visual no navegador (`verify_browser.mjs`), probes reais do Zoho e conversa real
  com Claude Code no portal (itens B6, C7 e D4 de `apps/portal/CRITERIOS-CONCLUSAO.md`).
- Nenhuma bateria do pipeline V2 foi reexecutada: não houve alteração que justificasse.
