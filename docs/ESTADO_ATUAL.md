# Estado atual — 02/10/2026

**Resumo:** o VEOS está online (site no GitHub Pages + Supabase) com setores vivos, Zoho espelhado e editável, fluxo de pedidos, Biblioteca, e — desde 01/10 — validação guiada, saúde do sistema, gestão de usuários com MFA, exportação, backup semanal criptografado e testes no CI. Falta o uso real guiado pelo Fernando e os segredos do GitHub para backup e testes online no CI. O pipeline V2 do cérebro segue bloqueado no item 30. **Não está 100%.**

## Plano da VOICE, tempos de serviço e formulário v2 (02/10, noite)
Pedido do Fernando: completar o formulário com subdivisões, pesquisar os tempos de serviço que faltavam, analisar os 4 últimos orçamentos e montar o plano no VEOS (metas, faturamento, captação, gestão financeira).

**Formulário do CFO v2** (9 seções):
- novas seções "4. Tempos de serviço" (dispositivo, atividade, tecnologia, unidade e tempo em minutos ou horas) e "5. Você, Fernando" (retirada, pró-labore, papel);
- subdivisões em grupos;
- números com texto são aceitos ("3600 MêS" vira 3600, com aviso de "lido como");
- a lista antiga de tempos e a retirada são convertidas na tela, sem gravar;
- 18 sugestões de tempos vindas da pesquisa.

**Tempos e composição** (`domain/tempos.js`): calcula as horas de um orçamento a partir dos equipamentos e dos tempos-padrão. Converte "18 MINUTOS" e "16 HORAS".

**Análise detalhada de orçamento** (`domain/analise_orcamento.js`), visível em Diagnóstico → Últimos orçamentos:
- produto contra o preço mínimo da Política, já com imposto, comissão e indicação;
- horas cobradas contra horas calculadas, com testes, entrega e produtividade;
- pontos de atenção.

**Câmbio:** PTAX do Banco Central em `GET /cfo/cambio` (API Olinda). A tela de preços usa o dólar do dia mais a folga cambial.

**Conflito "preço já inclui imposto":** quando o pedido real mostra +20%, vale o pedido e a tela avisa.

**Plano da VOICE** (`#/plano`):
- tabelas `plano_itens` e `plano_historico` (append-only), função `plano_mudar` com as transições de estado;
- só a direção aprova, cancela, cria ou edita; o setor do item marca andamento ou feito e faz anotações;
- 34 itens propostos pelos diretores, gravados no banco com dados reais (fora do repositório).

**Estoque estratégico** (`#/cfo/estoque`): curva de itens dos projetos orçados (versões contam uma vez), lote sugerido e momento do dólar. A compra só é liberada pelo gatilho do CFO: reserva de 3 meses e nenhuma dívida em atraso.

**Achados:**
- **Mão de obra:** as horas cobradas batem com o cálculo (83 contra 84 h no Studio We.Arch, com 65% de produtividade).
- **Produto:** a 2× o custo, com 15% de comissão mais indicação, fica em 29% de margem.
- **Ponto de equilíbrio:** cerca de R$ 105 mil/mês.
- **Funil:** 54 projetos orçados em 12 meses, somando R$ 1,44 mi.

**Biblioteca:**
- BIB-0084: tempos (SINAPI e IPVM);
- BIB-0085: mercado, finanças e câmbio;
- BIB-0086: aprendizado;
- BIB-0087: proposta do plano.

**Testes:**
- telas novas (plano, estoque estratégico e telas do CFO);
- banco: `tests/banco/plano.sql` 11/11 e `formulario_cfo.sql` 6/6;
- online: e2e_sistema 53/53;
- domínio: 74 testes.

## Precificação e diagnóstico do CFO (02/10)
Pedido do Fernando: preço correto dos produtos pelas skills do CFO, informações para o preço da mão de obra, análise dos pedidos/orçamentos e formulário para o que falta.
- **Formulário do CFO** (`#/cfo/formulario`, direção e financeiro): 7 seções (impostos e contador, compras e importação, equipe e mão de obra, custos fixos, vendas e recebimento, dívidas, o que aconteceu nos pedidos). Cada gravação é uma nova versão (`formulario_respostas`, append-only; vigente = última por seção).
- **Preço dos produtos e da hora** (`#/cfo/precos`): preço mínimo pela Política V1, com P = C / [(1 − t)(1 − 2% − alvo) − v] nas metas de 35, 30 e 25%. O custo no Brasil vem do preço pago × fator de importação, nesta ordem: valor informado, último pedido do produto após 12/05/2026, regra do Remessa Conforme com câmbio, mediana de 1,205 até R$ 280 (acima disso, lacuna). Há também o cenário hipotético "compra no CNPJ" (fator 1,928). A tela mostra o custo e o preço da hora (metodologia Sebrae), o preço por serviço (tempo-padrão) e o faturamento mínimo do mês (fixos + pró-labore + parcelas). Sem alíquota informada pelo contador, o imposto é uma SIMULAÇÃO rotulada: Simples Anexo I para produto e III para serviço, pelo RBT12 do Zoho. 2027 fica como lacuna.
- **Diagnóstico dos orçamentos** (`#/cfo/diagnostico`): sinais por orçamento aceito do Zoho:
  - desconto fora da alçada;
  - mão de obra tirada no desconto;
  - item abaixo do custo ou a preço zero;
  - item sem custo;
  - valor global;
  - sem imposto;
  - sem condição de pagamento;
  - indicador no campo vendedor;
  - MC estimada abaixo de 30% ou 25%.
- Evidência do fator de importação, medida nos pedidos de um item só: **1,446 antes de 12/05/2026** (II 20% + ICMS 17%) e **1,205 depois** (II 0%, regra que só vale para pessoa física). Isso indica compras no CPF e revenda pelo CNPJ, o que é risco fiscal a levar ao contador.
- Testes:
  - domínio: 8 testes, incluindo a paridade com a Calculadora;
  - telas: 92/92;
  - banco: `tests/banco/formulario_cfo.sql`, 6/6;
  - online: e2e_sistema 47/47.
- Os dados reais da análise ficam só no banco (respostas do CFO e Biblioteca); nada vai para o repositório.

## P1 e P2 (01/10, noite)
**Implementado e testado** (banco em transação desfeita, telas simuladas a 1366 e 390 px, online contra o Supabase real, navegador no site publicado)
- **Painel executivo** (Visão geral, direção e finanças): vendas aceitas por mês (orçamentos aceitos no Books), faturado (NF registradas; o Books não tem faturas → lacuna explícita), caixa previsto × recebido, pedidos com **margem bruta orçada** (não é a MC oficial), funil do CRM (negócios sem valor no Zoho → aviso), orçamentos por situação, alertas por setor. Gráficos com paleta validada para o fundo escuro. Banco 8/8.
- **Compras e contas a pagar**: faltas de estoque → compra registrada (o VEOS não envia ao fornecedor) → recebimento (entrada no estoque pelo custo da compra e reserva automática dos pedidos) → parcelas viram contas a pagar; contas avulsas; **previsão de caixa entradas − saídas**; **caixa do pedido pela Política V1.1** (mesma `exposicao()` com paridade testada); alertas de conta vencida, compra atrasada e exposição > 10%. Banco 16/16.
- **Obra no pedido**: projeto do Zoho Projects como checklist, horas da equipe (custo para a margem), aceite e garantia (prazo informado, nunca presumido), termo de aceite em PDF (texto colado do jurídico), alertas de aceite pendente (7 dias) e garantia terminando (60 dias) — prazos = propostas do catálogo. Banco 11/11.
- **Margem realizada**: compras recebidas + estoque pelo custo médio + despesas + horas × orçado; lacunas explícitas; ao concluir o pedido vira **aprendizado (hipótese)** na Biblioteca. Banco 5/5.
- **Proposta comercial em PDF** com a identidade da VOICE a partir do orçamento do Zoho (seções, descrições, termos e notas da própria VOICE), sem custo/margem; envio por rascunho de e-mail/WhatsApp.
- **Notificações**: caixa de saída (de alertas, propostas ou à mão; uma pessoa envia e marca, fica registrado), resumo do dia por setor no Radar, aviso no navegador (aba aberta) para alertas altos/críticos. Banco 8/8.
- **MCP do VEOS** (`scripts/mcp/veos-mcp.mjs`, `.mcp.json`): 14 ferramentas para o Claude Code com a sessão do próprio usuário (separada da do navegador), pelas mesmas regras; cria só ideia/proposta/tarefa/rascunho. Acesso criado em Minha conta. Online 6/6 (protocolo real).
- **Independência do Zoho** (Sistema): mapa por módulo — uso real, cobertura do VEOS e o que falta — e roteiro de desligamento.
- **UX**: busca global (Ctrl+K ou /), PWA instalável (manifesto, ícones, service worker só com arquivos do site), selo "Somente dados TESTE" substituído.
- **LGPD**: registro permanente de acesso a dados pessoais (fichas de clientes/contatos do Zoho, pedidos, exportações) e tela para a direção.
- Totais em 01/10: bancos 106/106 cenários; telas simuladas 70/70; online api 15, financeiro 12, setores 9, sistema 33, mcp 6; navegador no site publicado 42/42 telas (computador e celular), PWA e busca conferidos.

**Depende de decisão ou de terceiros (não implementado de propósito)**
- IA dos diretores (P2.12): teto zero decidido (BIB-0044).
- NF integrada (P2.15): custo do serviço emissor — decisão do fundador.
- Domínio próprio (P2.16): precisa do domínio e do acesso ao DNS (passos em PROXIMA_SESSAO).
- Retenção de dados e termo de uso (LGPD): propostas BIB-0051 e BIB-0052 (jurídico).
- Registros dos setores com dados reais: hoje só TESTE (decisão "dados reais numa fase própria").

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
