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
- Função `api` (login + cadastro em `membros`): `/me`, `/setores`, `/orcamentos` (GET e POST). POST grava orçamento + avisos + evento numa transação, idempotente. **E2E online: 15/15** (`tests/online/e2e_api.mjs`).
- Login: Supabase Auth por link mágico; cadastro público **desligado**; membro real: Fernando (direção). Usuário TESTE automatizado (papel vendas) só para testes.
- Portal online (`apps/web` → `dist/` via `scripts/build-web.mjs`): login, visão geral, avisos do CFO, histórico. Testado servido localmente contra o Supabase real, com a mesma CSP da Netlify (desktop e celular, 0 erros JS).
- **Portal publicado: https://veos-voice.netlify.app** (Netlify, deploy automático a cada push em `main`). Testado no endereço público com o usuário TESTE: login, 7 setores, aviso do CFO gravado, histórico, celular sem rolagem lateral. A Netlify injeta o script `/.netlify/scripts/hud`, cujo código embutido é bloqueado pela nossa CSP (esperado; não é do VEOS).
- **Login real verificado (30/09):** Fernando entrou pelo link mágico no endereço público e abriu o histórico.

## Setor Financeiro online (30/09)
- Regras de caixa em TypeScript (`_shared/regras/caixa.ts`): posição/exposição e gatilho >10% (V1.1), cobertura por fase (V1 sec.10), cenário de compra proposta. **Paridade com Python: 500 + 300 casos**; cenários à mão (fronteira exata de 10%).
- Banco: projetos, fases, recebimentos efetivos, compromissos (RLS; fase do mesmo projeto por FK; pago ≤ valor; lançamentos append-only; registro idempotente).
- API `/projetos` (direção e finanças): cada lançamento devolve a reavaliação e os avisos do CFO. **E2E online 12/12.**
- Tela **Projetos e caixa**: lista com exposição e situação; detalhe com indicadores, avisos, cobertura por fase, lançamentos e simulação de compra. Testada no navegador (lançamento pelo formulário muda os avisos na hora).
- Manter ativo: função `saude` + GitHub Actions diário (`manter-supabase-ativo`, ativo).
- Ainda não: correção/estorno de lançamentos; importação de dados reais; demais setores.

## Setores vivos (30/09)
- **9 setores completos** em `setores/*.json` (esquema: `docs/SETORES_ESQUEMA.md`): diretor-persona com métodos reais, equipe (40 papéis), processos, 36 tipos de registro, 55 rotinas, 82 indicadores, **87 sentinelas**, 57 modelos. Fontes: skills `anthropics/knowledge-work-plugins` (Apache 2.0) + métodos consagrados pesquisados.
- Itens marcados "Política oficial" auditados contra a Política V1/V1.1; 2 corrigidos para Proposta (retrabalho e garantia ≤ 2%). Demais metas são **Proposta** até aprovação.
- Motor de sentinelas (`_shared/setores/motor.ts`) + validação de registros pelo catálogo + varredura que cria/reativa/resolve alertas e gera tarefas e rascunhos. Roda a cada gravação e diariamente (função `saude`).
- Portal: menu Comando (Órbita, Radar, IA, Conselho) · Setores (9) · Ferramentas do CFO; página de setor com 8 abas. Testado no navegador (desktop e celular).
- Testes: 23 locais; online 9 (setores) + 15 (api) + 12 (financeiro).
- Ainda não: envio automático de e-mail/WhatsApp (só rascunho + abrir no app, decisão de segurança); cálculo automático dos valores dos indicadores; histórico visível por registro na tela.

## Ferramentas do CFO e Zoho (30/09)
- **Negociação ao Vivo** e **Calculadora de Preços** (`apps/web/js/domain/precificacao.js`): Política V1 (MC com provisão 2%, faixas 35/30/25, alçada sec.9, ticket como meta) + Simples Nacional (LC 123, RBT12, Fator R). Testes: `tests/web/precificacao.test.mjs` (aceite 20.000 − 10% → 18.000; comissão 10% → 1.800; paridade com `cfo.ts`).
- **Zoho somente leitura**: segredos `ZOHO_CLIENT_ID/SECRET` no Supabase; OAuth pela função pública `zoho` (`/zoho/retorno`, state de uso único, servidores Zoho em lista fechada); refresh token na tabela `integracoes` (RLS sem policies). Rotas `api/zoho/*`: status, conectar/desconectar (direção), rbt12, orçamentos (+ itens com preço de compra), etapas do CRM. Tela **Integrações** e importação de orçamento na Negociação.
- **Salvar como proposta** (Negociação → registro `proposta` do Comercial): faixa de margem, faixa de desconto e aprovação preenchidas pelo cálculo; as regras COM_MARGEM_EXIGE_DIRECAO, COM_EXCECAO_SEM_JUSTIFICATIVA e COM_DESCONTO_SEM_APROVACAO reagem sozinhas.
- Catálogos: **Frente de trabalho** (Direção, 3 regras), **Contato** e categoria de pendência (Secretaria), 7 modelos de WhatsApp do painel legado (Comercial e Finanças). Totais: 38 tipos de registro, 91 regras, 64 modelos.
- Falta: a direção clicar em **Conectar Zoho** (login no Zoho); depois validar RBT12 e orçamentos reais.

## Aba Zoho: espelho completo (30/09)
- Tabelas `zoho_registros` (registro inteiro em jsonb, todos os campos), `zoho_sync` (estado por módulo) e `zoho_sync_log` (trilha). Função `zoho-sync` chamada a cada 2 min por pg_cron + pg_net (rodada máx. 100 s, Books ≤ 80 chamadas/min, CRM só o que mudou via If-Modified-Since, Projects de hora em hora).
- Módulos: Books (14: contatos, itens, orçamentos, pedidos, faturas, pagamentos, notas de crédito, compras, contas a pagar, pagamentos a fornecedores, despesas, bancos, plano de contas, impostos), CRM (18 módulos), Projects (projetos, tarefas, issues).
- Menu **Zoho** (Books, CRM, Projects): lista com busca e paginação; ficha mostra todos os campos (listas como tabelas, objetos em blocos).
- Escopos ampliados (leitura de todos os módulos): exige **reconectar** o Zoho uma vez (Integrações).
- Próximo: edição nos dois sentidos, estoque próprio, pedido → estoque → parcelas → faturamento (NF manual registrada).

## Edição nos dois sentidos, estoque e fluxo vivo (30/09)
- **Escrita no Zoho** (`_shared/zoho_escrita.ts`): Books (contatos, itens, orçamentos com itens), CRM (qualquer módulo, campos editáveis lidos dos metadados do Zoho), Projects (tarefas). Confere conflito (alterado no Zoho depois de aberto → 409), grava, relê e atualiza o espelho; trilha `zoho_escritas` append-only. Exige reconectar (escopos CREATE/UPDATE, sem DELETE).
- **Estoque próprio** (`estoque_movimentos` append-only, visão `estoque_saldos`): entrada, ajuste (com motivo), reserva/liberação/saída pelos pedidos, custo médio. Entrada completa sozinha as reservas pendentes.
- **Fluxo vivo** (`pedidos`, `pedido_itens`, `parcelas`, `notas_fiscais`, `pedidos_historico`): pedido criado do orçamento aceito no Zoho; parcelas devem somar o total; confirmar reserva estoque; entregar baixa estoque (recusa sem saldo); NF manual registrada (NF-e/NFS-e, não passa do total); última parcela recebida conclui. Funções plpgsql atômicas. Teste: `tests/banco/fluxo_vivo.sql` (17/17, transação desfeita).
- **Vigia do fluxo** (`_shared/fluxo_vigia.ts`, alertas FLX_*): estoque insuficiente, parcela vencida/vencendo (rascunho de WhatsApp), entregue sem NF, pedido parado, orçamento aceito sem pedido. A varredura dos setores ignora FLX_*.
- Menu **Operação**: Pedidos, Estoque, Recebimentos e faturamento (previsão por mês).
- **Projects arquivados**: lista pela API clássica a cada hora; tarefas 1x/dia com cursor.

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
