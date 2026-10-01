# Estado atual — 01/10/2026

**Resumo:** o VEOS está online (site no GitHub Pages + Supabase) com setores vivos, Zoho espelhado e editável, fluxo de pedidos, Biblioteca, e — desde 01/10 — validação guiada, saúde do sistema, gestão de usuários com MFA, exportação, backup semanal criptografado e testes no CI. Falta o uso real guiado pelo Fernando e os segredos do GitHub para backup e testes online no CI. O pipeline V2 do cérebro segue bloqueado no item 30. **Não está 100%.**

## P0 — base com segurança (01/10, tarde)
**Implementado e testado** (testes automatizados + banco em transação desfeita + telas simuladas + online contra o Supabase real e o site publicado)
- **Validação guiada** (Sistema → Validação guiada): roteiro de 17 passos com login real; cada falha vira incidente na Biblioteca e a rodada vira referência. Telas 4/4.
- **Saúde do sistema** (Sistema → Saúde): banco e arquivos × limites do plano Free (500 MB / 1 GB), sincronização do Zoho por módulo (chamadas e erros em 24 h), agendamentos pg_cron, chamadas HTTP do agendador, varreduras, usuários. Vigia **SIS_*** roda no banco a cada 10 min (`veos-saude-sistema`, sem HTTP) e cria/resolve alertas no setor Tecnologia. Banco `tests/banco/sistema.sql` 8/8. Estado real em 01/10: 28 MB, 0 alertas.
- **Usuários e acessos** (Sistema → Usuários, direção): dar acesso (cria o login sem senha e **sem enviar e-mail**; a pessoa entra pelo link), papel por setor (9), desativar com motivo (também bloqueia o login), reativar, histórico append-only; **MFA TOTP gratuito** (Minha conta: QR code + código; no login, código pedido quando a direção exige). Regras no banco (`membro_gerir`): só direção gere, ninguém se desativa, nunca fica sem direção ativa, MFA só exigível de quem já cadastrou. Banco `tests/banco/membros.sql` 13/13; telas 14/14.
- **Exportar dados** (Sistema → Exportar, direção): CSV para Excel (`;`, vírgula decimal, BOM, proteção contra fórmula) de pedidos, itens, parcelas, NF, estoque, movimentos e Biblioteca.
- **Backup semanal** (`.github/workflows/backup-semanal.yml`): todas as tabelas + anexos + logins, gzip + AES-256-GCM (senha no segredo `BACKUP_SENHA`), artefato por 90 dias; tokens do Zoho ficam fora. Abrir: `scripts/restaurar-backup.mjs`. Ida e volta conferida localmente (37 tabelas, 0,5 MB); senha errada recusada.
- **CI** (`.github/workflows/testes.yml`): a cada push, `npm test` + 26 telas simuladas (Chrome); depois de cada publicação e diariamente, testes online da API e **navegador Playwright no site publicado** (30/30 telas, computador e celular 390 px).
- Testes online: `node scripts/online.mjs tests/online/<arquivo>.mjs` (chaves pela CLI, sem imprimir) ou `npm run test:online`. Resultados 01/10: api 15, financeiro 12, setores 9, sistema 15, navegador 30/30.
- Telas simuladas: `npm run test:telas` (fontes em `tests/telas/`, com moldura de celular a 390 px reais — o Edge headless não abre janela menor que ~490 px; os testes "de celular" anteriores rodavam a 492 px).

**Dependente do Fernando**
- Cadastrar no GitHub (Settings → Secrets and variables → Actions) os segredos `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API) e `BACKUP_SENHA` (senha forte criada e guardada por ele). Sem eles, o backup semanal falha com aviso e os testes online do CI não rodam.
- Executar a validação guiada com login real e cadastrar o próprio MFA; decidir a proposta BIB-0046 (exigir MFA da direção).

**Não validado com uso real**: convite de pessoa real, MFA com app real, CSV aberto no Excel, backup com anexos (bucket vazio em 01/10).

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
- Portal publicado hoje no **GitHub Pages** (https://voiceambientesinteligentes.github.io/VEOS/); a Netlify (https://veos-voice.netlify.app) ficou congelada. Testado no endereço público com o usuário TESTE: login, 7 setores, aviso do CFO gravado, histórico, celular sem rolagem lateral. A Netlify injeta o script `/.netlify/scripts/hud`, cujo código embutido é bloqueado pela nossa CSP (esperado; não é do VEOS).
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

## Biblioteca e governança (01/10)
**Implementado e testado**
- Banco (`20261001100000_biblioteca.sql`): registros tipados (preferência, ideia, proposta, decisão, política, exceção, erro/incidente, aprendizado, referência) com estados por tipo; versões (`serie`/`versao`, `substitui`/`substituido_por`); data de registro ≠ data de vigência; fontes com natureza (fato verificado, opinião da fonte, inferência, hipótese) e "acessada"; vínculos entre registros e com objetos do VEOS; pareceres (informado/consultado/aprovador, prazo, quem conclui); encaminhamento à CEO/fundador; trilha append-only; consultas a precedentes registradas.
- Regras no banco, iguais para todos (inclusive o fundador): decisão/política/exceção só com autoridade + confirmação explícita + justificativa; trava contra alteração silenciosa de registro fechado (revisão = nova versão); rejeição exige motivo preservado; divergência exige problema/argumento/aplicação/benefícios/riscos/alternativa e vira proposta ligada (sem evidência acessada = HIPÓTESE A VALIDAR); só membros do setor respondem parecer; consultado não aprova; prazo vencido = "sem resposta" (nunca aprovação); aprendizado só validado com verificação; incidente só verificado com evidência; registros restritos invisíveis até na busca.
- Teste de aceite: `tests/banco/biblioteca.sql` — 20/20 (os 16 cenários pedidos), transação desfeita. Rodar: `npx supabase db query --linked -f tests/banco/biblioteca.sql`.
- Carga real (só no banco, fora do Git): fundador; 17 alçadas (7 com fonte na Política V1/V1.1 e 10 LACUNAS); 2 políticas e 15 decisões confirmadas; hospedagem v1 → v2 (Netlify → GitHub Pages) com incidente ligado; 4 incidentes; 2 aprendizados em verificação; 2 referências; 6 propostas pendentes do fundador.
- Menu **Biblioteca**: Governança, Decisões e precedentes, Erros e aprendizados, Pesquisas e referências, Políticas vigentes, Revisões em andamento, Consultar precedentes. Filtros por assunto, setor, tipo, situação, responsável e período. Ficha com versões, fontes, relações, pareceres e histórico; ações de divergir, pedir parecer, encaminhar, aprovar/rejeitar, revisar, revogar, mudar situação e adicionar fonte. Telas conferidas com dados simulados (desktop e celular).
- Radar: pedido de parecer vira tarefa do setor; vigia `BIB_*` alerta parecer sem resposta e conflito encaminhado (rodando na função saude).
- Negociação ao Vivo consulta precedentes antes de salvar a proposta ou fechar o pedido; a consulta fica registrada com a referência (proposta:/pedido:) e os códigos aplicáveis vão no resumo do pedido.

**Implementado, ainda não validado com uso real**
- Fluxo completo pela tela com login (criar, divergir, pedir/responder parecer, revisar) — testado no banco e em tela simulada, não com sessão real.

**Dependente de integração**
- Líderes com IA: pareceres e recomendações dos diretores dependem de atuação humana. A busca de precedentes é por regras (texto, escopo, validade, versão), não raciocínio de IA. Processo das 3 lentes: registro manual (referências + divergência), sem pesquisa automática.
- Hoje só existe um usuário humano (direção): pareceres de outros setores ficam pendentes até haver membros nesses setores.

**Pendente de decisão de negócio** (estão em Biblioteca → Revisões/Governança)
- Assuntos reservados ao fundador; quem exerce a CEO; regra de precedência entre autoridades/escopos; quem altera políticas; alçadas de compras, preços de tabela, contratações, comunicação externa, orçamento de IA; validação de ticket abaixo de R$ 100 mil; desconto até 2% com MC 30–32%.
- Propostas: papel do fundador; base da faixa do Simples; ticket mínimo R$ 15.000; anexo do Simples para serviços; P-3; P-5.

## PDF (01/10)
- Contrato gerado do pedido (`#/pedidos/<id>/contrato`): dados do pedido, cliente (Zoho), itens, parcelas, prazo e cláusulas coladas pelo usuário; imprimir/salvar em PDF. Testado em tela simulada e impresso em PDF (Edge headless).
- Anexos PDF no pedido: bucket privado `anexos` (até 16 MB, só PDF), envio e abertura por URL assinada (5 min). **Implementado, não validado com login real.**

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
