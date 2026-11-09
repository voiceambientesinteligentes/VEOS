# Continuidade

Atualize este arquivo ao fim de cada sessão: última ação, resultado e próximo passo.

## 09/11/2026 (tarde) — pendências do programa fechadas
- Fernando pediu "tudo que não depende de mim, 100%" (isto vale como pedido de testar o acumulado).
- **Indicadores**: novos campos nos catálogos (chamado: horas até a 1ª resposta, data resolvida, remoto/com visita, custo do atendimento; contrato de suporte: resultado da oferta de continuidade; evento/campanha: escritórios presentes/alcançados; lead e oportunidade: campanha de origem). Agora calculados: SLA de solução, tempo de 1ª resposta, resolução remota, custo de garantia (valor; o % sobre a receita do projeto segue LACUNA por falta do vínculo chamado→projeto), taxa de renovação, receita influenciada (oportunidades ganhas com origem de Marketing) e escritórios engajados (soma por evento/campanha). Sem dado continua LACUNA. Os registros antigos não têm os campos: os indicadores só ficam preenchidos conforme a equipe passa a registrar.
- **Bugs achados nos testes e corrigidos**: (1) `/sistema/saude` dava 502: o histórico do pg_cron nunca era limpo (44 mil linhas, 74 MB); migration `20261109100000_limpeza_cron.sql` apaga o que passa de 3 dias e agenda limpeza diária; (2) MCP cortava respostas grandes no meio do JSON; agora corta as maiores listas e avisa em `truncado`.
- **Entrevista guiada**: servidor testado de ponta a ponta (`tests/online/e2e_entrevista.mjs`, 14 verificações, entra no CI; usa link de teste próprio e apaga o que grava). Falta só conectar no ChatGPT de verdade.
- Cache do site subido para `veos-v2` (dourado novo). Pendências do site: chaves marcadas como feitas.
- As 2 falhas do CI eram o `e2e_sistema` (502 por lentidão do pg_cron) e, depois, o MCP; ambos corrigidos.

## 09/11/2026 — Fim de sessão (estado e pendências)
- Dourado ficou vivo (quase neon): `--gold #f2c53d`, `--gold-2 #ffd85e` em `g4.css` (substitui o `#d1bea4` citado abaixo). Publicado; se o navegador mostrar o tom antigo: Ctrl+F5/janela anônima; se persistir, subir a versão do cache em `apps/web/sw.js` (`veos-v1`).
- Regra do Fernando: **não rodar testes ao editar**; só quando ele pedir, cobrindo tudo acumulado. NÃO testado ainda: piscar da Órbita, entrevista ponta a ponta no ChatGPT (conector com "Sem autenticação"), visual G4 no menu/painel, todas as telas.
- Falha no GitHub Actions "testes" do commit 644c682 (16:56 de 06/11) e a do 58e7b88 (online, "API (usuarios TESTE)") não investigadas; verificar quando ele pedir "testa".

## 06/11/2026 — Visual no padrão do G4 OS (só aparência)
- Pedido do Fernando: replicar o design do aplicativo G4 OS (instalado no computador dele) mantendo o fundo preto do VEOS. Valores lidos das variáveis de tema do app instalado (somente leitura, nada copiado além de números/nomes de fontes).
- `apps/web/css/g4.css` (carregado depois do `tema.css`): fontes **Manrope** (texto), **Geist** (títulos) e **Geist Mono** (números/código), hospedadas em `apps/web/fonts/` (licença OFL; a CSP só aceita fontes do próprio site); texto `#e8e6e4`, linhas a 10%, destaque `#d1bea4` no lugar do dourado, estados do G4, cantos 8/12/16 px, corpo 14,4 px (o G4 usa 13,5; mantido maior pela leitura), menu lateral plano, painel principal solto com cantos de 12 px, cartões planos com linha fina.
- Para voltar ao visual anterior: tirar a linha `css/g4.css` do `index.html`.
- NÃO TESTADO: só uma captura da tela Hoje (conteúdo) em 1366 px e 390 px com dados simulados; o menu lateral, o painel principal solto e as demais telas não foram vistos; rodada completa de telas não executada (pedido do Fernando: só testar quando ele pedir). A Órbita e o logotipo continuam com o dourado antigo (cores fixas no desenho).
## 06/11/2026 — Entrevista guiada da empresa (link do MCP para o ChatGPT)
- **O que é:** o Fernando cria um link em Integrações → "Entrevista guiada da empresa", cola no ChatGPT (conector MCP, sem autenticação), cola o comando de início e responde. O chat faz uma pergunta por vez (roteiro de ~70 perguntas em 15 seções: empresa, clientes, metas, impostos, compras, equipe, custos, preço/comissões, comercial, marketing, obras, pós-venda, pessoas, ferramentas, decisões), grava cada resposta (confirmado / estimado / não sei) e no fim gera o arquivo `.md`. O mesmo arquivo (.md e .json) baixa em Integrações; o Fernando envia ao Claude Code, que preenche o VEOS (tudo como PROPOSTA/ESTIMADO até aprovação na tela; "não sei" = LACUNA).
- **Onde está:** função `entrevista` (MCP remoto, `--no-verify-jwt`, URL `.../functions/v1/entrevista/<segredo>`), rotas `/api/entrevista` (só direção), migration `20261106100000_entrevista.sql` (links por hash, 21 dias, revogável; respostas; arquivos), roteiro em `apps/web/js/domain/entrevista.js`, painel em `integracoes.js`.
- **Segurança:** o link só lê perguntas e grava respostas da entrevista (nenhum outro dado do VEOS); servidor recusa respostas com cara de senha/chave/cartão; limite de 90 chamadas/min por link.
- **NÃO TESTADO** (o Fernando pediu para só testar quando ele pedir): nada além de sintaxe dos arquivos web, migration aplicada, funções publicadas e a resposta 401 para link inválido. Falta: criar o link na tela, conectar de verdade no ChatGPT (depende do plano permitir conector próprio), rodar a entrevista ponta a ponta. Teste escrito e não executado: `tests/web/entrevista.test.mjs`.
- **Limite conhecido:** só há uma entrevista (as respostas se acumulam); não há botão de recomeçar do zero.
## 05/11/2026 (fim do dia) — backlog do programa executado

**Resumo**: P0 (502, IA refaz resposta de dados, CI decidido), P1-5 a 13 (fornecedores, agenda por pessoa, histórico do CRM por registro, Web Push, MCP ampliado, avisos do assistente, indicadores, contratos de suporte), P2-14/17/18/19. Ficaram: P0-3 (SMTP: precisa do Fernando), P1-8 (CNPJ: aguarda OK dele), P2-15 (desligar o Zoho: só quando pedir), P2-16 (Instagram/Meta: precisa de conta). Testes: 192 de domínio + 155 Python + 20 JS, telas 212/212, banco (fornecedores 13, agenda 7, contratos 14), online (fornecedores 10, agenda 7, contratos 12, push 7, mcp 11), site publicado conferido. **Não verificado**: chegada do aviso num navegador real; uso real (login do Fernando) de tudo isto.

## 05/11/2026 — sistema vivo, fornecedores

**Feito**
- Descoberto e corrigido: a varredura das regras vivas não rodava a cada 10 min (só 1x/dia). Agora pg_cron. Novo vigia de saúde do próprio VEOS (IA, perguntas paradas, Zoho) com alertas para o CIO.
- Fornecedores próprios completos (P1-5), ligados a compras e contas a pagar. Detalhe e testes em ESTADO_ATUAL (05/11).
- P0-4 decidido: testes que criam pedido ficam manuais.
- Agenda por pessoa (P1-6): cargo por pessoa em Usuarios; tarefas diarias/semanais/mensais do cargo no Hoje. Para ligar: Fernando define o cargo de cada pessoa (so entao gera tarefa).

**Próximo passo**
- Histórico do CRM do Zoho (P1-7): botão "Levar ao funil do VEOS" em cada lead/negócio do Zoho CRM. Fernando decide quais valem a pena levar.
- Contratos de suporte (P1-13) com cobranças mensais na previsão de caixa; Fernando cadastra os contratos reais (valor, dia, início).
- MCP ampliado (24 ferramentas), Web Push (VAPID nos segredos), indicadores de Marketing/Pós-venda, histórico por registro. Fernando: ligar os avisos no aparelho e tocar em "Enviar aviso de teste"; configurar o MCP.
- Próximo: P1-8 (aguarda OK), P2-15/16 (só quando o Fernando pedir/depender de conta Meta) de PROXIMA_SESSAO. Fernando: P0-3 (SMTP), revogar chave exposta, login real, MCP.

## 04/11/2026 (sessão seguinte) — P0 itens 1 e 2

**Feito**
- P0-1 (502 no Calendário do Instagram): a lista `GET /produtos` buscava até 10 mil vínculos a revisar a cada chamada; agora busca só os dos produtos da página (`produtos.ts`). Função `api` publicada. Site publicado `navegador.mjs` 77/77 na 1ª tentativa; como o erro era intermitente, só se confirma com o uso dos próximos dias.
- P0-2 (IA sem consultar dados): se a pergunta é de dados (`perguntaDeDados`) e o modelo não chamou nenhuma ferramenta, o motor refaz UMA vez exigindo a consulta (só se houver tempo; senão mantém a primeira resposta com o aviso). Funções `api` e `ia-fila` publicadas. Testes: domínio 161, Python 155, JS 20, `uso_ia.mjs` 6/6. Não observei o retry disparar ao vivo.

**Próximo passo**
- P0-3 (limite do e-mail de login, precisa do Fernando), P0-4 (decidir se os testes que criam pedido entram no CI), depois P1 (fornecedores próprios).
## 04/11/2026 (fim do dia) — encerramento da sessão

**Feito nesta sessão (em ordem)**
- Operação comercial do zero (clientes, montador de orçamento, ciclo até o pedido, retomada do Zoho, captação), numeração real do 1 e robôs fora da visão real.
- Formulário do CFO: 10 valores estimados marcados + avisos no Radar; arquiteto como cliente principal no contexto dos diretores e do MCP.
- Auditoria do que funciona (8 testes online, 133 verificações) e do que falta.
- Novo design: 9 áreas no menu com abas, página Hoje (com Órbita e IA), "+ Novo", barra no celular.
- Perguntar aos diretores em formato de conversa, com continuação; conferência de percentuais e aviso de resposta sem dados.
- IA VEOS ligada aos diretores + chat flutuante com avisos + voz masculina natural (estilo assistente).
- Verificado no fim: domínio 160 + Python 155 + JS 20; telas 184/184; site publicado 77/77; uso real da IA 6/6 e do montador 8/8.

**Próximo passo**
- Seguir `docs/PROXIMA_SESSAO.md` → "O que falta no PROGRAMA" (P0 primeiro: erro 502 intermitente no `#/conteudo` e refazer resposta da IA quando ela não consultar dados).
- Fernando (programa): revogar a chave exposta no site antigo, entrar com login real, configurar o MCP, trocar as chaves de IA.

## 04/11/2026 (noite) — operação comercial do zero

**Feito**
- Pedido do Fernando: "começar do zero e deixar tudo pronto para operar (cliente, orçamento, todos os aspectos)". Clientes próprios, montador de orçamento do zero (catálogo + mão de obra + margem/alçada ao vivo), ciclo enviado/aceito/recusado com o pedido gerado do orçamento, retomada dos orçamentos antigos do Zoho, Contato rápido, Prospecção, Calendário do Instagram, Começar a operar e o link atividade → ferramenta na Estrutura. Robôs de teste fora da visão real; numeração real recomeça do 1. Ver ESTADO_ATUAL (04/11, noite).
- Verificado: domínio 152 + Python 155 + JS 20; telas 172/172; banco 18/18 (e os testes de compras, fluxo, RT, margem, caixa e orçamentos com as migrations); API real `e2e_operacao` 21/21.

**Próximo passo**
- Fernando: CEO-08 (Começar a operar), CSO-15 (primeiro cliente e orçamento com login real), CSO-16 (retomar antigos vivos), CFO-16/17 (preço de tabela e custo da hora), CMO-09 (rotina do Instagram).
- Claude: fornecedores próprios e importação do histórico do CRM (CSO-05/06); agenda por pessoa; ligar os vínculos de produto a revisar (37) para a retomada do Zoho achar mais itens no catálogo.

## 04/11/2026 (tarde) — permissões liberadas + estrutura da empresa

**Feito**
- Claude Code nesta máquina com permissões liberadas (`bypassPermissions` em `~/.claude/settings.json`); memórias da sessão anterior copiadas para a pasta do projeto. Reiniciar o VS Code para o `git` e o MCP `veos` entrarem no PATH.
- Estrutura da empresa (pedido do Fernando): hierarquia e agenda de todos os cargos dos 9 diretores, tela `#/estrutura` e aba Equipe com organograma. Ver ESTADO_ATUAL (04/11). Testes: 141 domínio + 155 Python + 20 JS; telas novas 14/14.

**Próximo passo**
- Fernando: revisar e aprovar a estrutura de cada diretor (tópicos "Estrutura do setor" na aba Pendências) e escolher a ordem das primeiras contratações (aba "Quem acumula").
- Claude: depois da aprovação, registrar na Biblioteca e trocar `PROPOSTA` por aprovado; ligar as atividades diárias à agenda própria (CSO-05/SEC-04) para virarem tarefas no Radar.

## 03/11/2026 — troca de computador + CSO-04 (orçamento próprio no VEOS)

**Feito**
- Troca de máquina: GitHub CLI, Git e Node.js instalados e autenticados (conta `voiceambientesinteligentes`); repositório clonado em `C:\Users\ferna\VEOS` (antes `C:\Users\voice\VOICE_360\VEOS`). Autonomia técnica total (decisão de 30/09 em DECISOES.md) reafirmada pelo Fernando.
- Implementado o item **CSO-04** do fluxo de pendências (`#/pendencias`): orçamento próprio do VEOS, versionado (série/versão), com botão "Salvar orçamento no VEOS" na Negociação ao Vivo e Proposta em PDF direto dele (`#/propostas/orcamento/:id`), sem depender do Zoho. Ver detalhe técnico em `docs/ESTADO_ATUAL.md` (seção 03/11).
- Testes escritos (domínio, banco em transação, tela), seguindo exatamente os padrões já usados no projeto (ex.: `pedido_criar`, `comercial_implantacao_marcar`).

**Feito (continuação)**
- `npm test` (134 domínio + 155 Python + 20 JS) e `npm run test:telas` (134/134) rodando verde nesta máquina.
- Supabase CLI autenticada por token de acesso pessoal (o Fernando gerou em supabase.com/dashboard/account/tokens; o login interativo por navegador trava neste terminal não interativo — registrar como limitação do ambiente, igual ao `npx.cmd` de 06/10). Projeto `veos` vinculado; migration `20261103120000_comercial_orcamentos.sql` aplicada (`supabase db push`); `tests/banco/comercial_orcamentos.sql` rodado contra o banco real: **10/10 cenários OK**.
- Achado durante os testes: o texto mais longo do tópico CSO-04 em `pendencias_projeto.js` (auto-aberto na Visão geral por ser `quando:agora` + `dono:Claude`) causava rolagem lateral em 390px — token técnico comprido sem espaço para quebrar. Corrigido deixando o texto mais curto e em prosa (sem nomes de tabela/rota embutidos).

**Não executado nesta sessão**
- Uso de ponta a ponta com login real (criar um orçamento TESTE na Negociação ao Vivo, abrir o PDF pela proposta). Só então marcar CSO-04 como "feito" em `pendencias_projeto.js`.

## 04/11/2026 — CI quebrado, reversão do tema claro e fim da sessão

**Feito**
- CI: `online` job do workflow `testes` estava falhando desde a migração do runner `ubuntu-latest` para Ubuntu 26.04 (19/10) — o Playwright 1.55 não instala o Chromium nela. Fixado em `ubuntu-24.04`. Confirmado rodando o workflow manualmente (job `online` passou da etapa "Instalar navegador").
- Achado ao conferir isso: o teste de navegador no site publicado agora falha em `catalogo: 0/8 fotos carregadas` — parece não relacionado (fotos de produto não carregando do Storage), **não investigado, fora do escopo de hoje**.
- **Revertido o redesenho visual de 02/11** (commits `0aa235a` e `628f26f`, feitos na sessão anterior, no outro computador): tinham trocado o tema do site inteiro de escuro para claro e a tela de entrada padrão de Órbita para Visão geral — isso contraria a decisão de 30/09 ("layout e base do VEOS ficam como estão, sem troca de tema") e deixou a Órbita (desenhada para fundo escuro) destoando. Revertido para o tema escuro original; Visão geral continua existindo e acessível pelo menu, só deixou de ser a tela de entrada. O conserto de selos longos quebrando linha no celular (parte daqueles commits) foi mantido, pois já vivia em `components.css`, independente do tema. 134/134 telas e 134/134 testes de domínio continuam passando. Registrado em DECISOES.md.

**Não executado nesta sessão**
- O item "0/8 fotos do catálogo" no teste de navegador (achado, não investigado).
- Uso de ponta a ponta do CSO-04 com login real (ver sessão de 03/11 acima).

**Próximo passo**
- Conferir visualmente no navegador (voiceambientesinteligentes.github.io/VEOS/) se a Órbita voltou a ficar como o Fernando lembra, depois que o GitHub Pages republicar.
- Investigar o "0/8 fotos do catálogo" se for relevante.
- Fazer o uso de ponta a ponta do CSO-04 (orçamento próprio) e marcar como "feito" em `pendencias_projeto.js`.

## 30/09/2026 — sessão de transição (Claude Code, VS Code)

**Feito**
- Inspeção da raiz `C:\Users\voice\VOICE_360`: sem Git na raiz, sem CLAUDE.md prévio, Obsidian
  aberto, `.obsidian` sem plugins da comunidade, hook de busca do VOICE_360 ativo e independente
  do Obsidian.
- Backup completo com manifesto SHA-256 em
  `C:\Users\voice\VOICE_360_BACKUPS\transicao-vscode-20260930-100353` (resultado em
  `resultado.json`).
- Criado `VEOS/` (repositório Git local, branch `main`): portal copiado e validado
  (144 Python + 20 JS aprovados na cópia), vigia `orcamento.salvo` + 10 testes aprovados, docs.
- Criados `CLAUDE.md` e `VOICE_ECOSYSTEM.code-workspace` na raiz.
- Evidências do PreWriter e do item 30 conferidas em disco (sem reexecução).

**Feito (continuação, ~10:30)**
- `.obsidian` copiada para `VOICE_360_BACKUPS\obsidian-config-arquivada-20260930` (6 arquivos,
  hashes idênticos). A original continua na raiz porque a remoção foi bloqueada pelo ambiente.
- Vigia no portal: rota `POST /api/vigia/orcamento` + aba "Avisos (vigia)" na sala CFO,
  conferida no navegador (desktop e celular). 155 Python + 20 JS aprovados.
- Autonomia técnica total registrada em DECISOES.md e CLAUDE.md.
- GitHub conectado: `origin/main` em https://github.com/voiceambientesinteligentes/VEOS (push verificado).

**Feito (Supabase, ~11:00)**
- Login da CLI feito pelo Fernando (`npx.cmd`, porque o PowerShell bloqueia `npx.ps1`).
- Vigia portado para TypeScript (`supabase/functions/_shared/regras`), paridade 425/425 local e **online**.
- Migração inicial aplicada com RLS; projeto ligado (`supabase link`).

**Feito (online, ~11:40)**
- Auth: cadastro público desligado (atenção: `auth.email.enable_signup=false` desliga o LOGIN por e-mail; o bloqueio de cadastro é `[auth] enable_signup=false`).
- Função `api` + migração `membros`/`registrar_orcamento`; E2E 15/15; Fernando cadastrado (direção).
- Portal online em `apps/web`, build `node scripts/build-web.mjs`, teste local `node scripts/serve-web.mjs` (porta 8878).

**Feito (Financeiro, ~13:00)**
- Keep-alive do Supabase (função `saude` + Actions diário).
- Setor Financeiro online: regras de caixa com paridade, banco, API e tela Projetos e caixa.
- Testes: `npm test` (regras + portal) e, online, `tests/online/e2e_api.mjs` (15) e `tests/online/e2e_financeiro.mjs` (12), com as chaves obtidas pela CLI.

**Feito (setores vivos, ~16:10)**
- 9 catálogos pesquisados (3 pesquisas paralelas), validados e auditados; motor, banco, API, Radar, Conselho, páginas de setor.
- Aprovações pendentes para o Fernando: metas marcadas como Proposta em cada setor (aba Indicadores e Regras vivas).

**Aguardando o Fernando**
0. Site no ar e login real do Fernando verificado. Próximas etapas: personalidade dos diretores, mais regras do vigia, MCP, keep-alive do Supabase. Decisões pendentes: P-3 (orçamento de IA) e P-5 (siglas).
1. Apagar a pasta `VOICE_360\.obsidian` (cópia já arquivada) ou aprovar a remoção.
2. (Recomendado) Tornar o repositório privado.
3. Decisões P-1 (hospedagem), P-3 (orçamento de IA) e P-5 (siglas) em [DECISOES.md](DECISOES.md).

**Próximo passo técnico (independente das pendências)**
- Etapa E: ler a fonte integral, o candidato e os três motivos do item 30 e preparar uma análise
  com as duas leituras lado a lado.
- Vigia: próximos eventos (exposição de caixa V1.1, cobertura de fase V1 sec.10).
- P04: esboço do esquema de cadastros compartilhados e setores.

## 01/10/2026 — Biblioteca e governança do fundador
- Etapa pedida: governança transversal + perfil do fundador (não redefinir os outros líderes ainda).
- Antes de qualquer recomendação/ação relevante: `POST /api/biblioteca/consultar` (ou `bib_consultar` no banco). Precedente orienta, não autoriza; substituído/expirado/fora do escopo não vale; exceção não vira regra; sem precedente: informar.
- Toda mudança em decisão/política vigente: `bib_revisar` (nova versão). Divergência: `bib_divergir`. Nada de UPDATE direto (a trava recusa).
- Conteúdo real da Biblioteca fica só no banco (repositório é público).
- Próximo: o fundador aprova/ajusta as propostas pendentes e preenche as lacunas; depois, perfis individuais dos demais líderes sobre esta base.

## 01/10/2026 (tarde) — P0 completo no código
- Decisões do Fernando registradas: IA teto zero (BIB-0044), CEO = fundador (BIB-0045), repositório público. Propostas BIB-0037/38/39/40/42 em consulta com recomendação do Claude; BIB-0046 (MFA da direção) criada.
- Entregas (commits 4d5df53, 53f1ecc, 9f22fa5, 2537d79, 77cf13f, 3e038a9): validação guiada, saúde do sistema + vigia SIS_* no banco, usuários e acessos + MFA, exportação CSV, backup semanal criptografado, CI (local + online + navegador). Registro: BIB-0047; aprendizados validados BIB-0048 (largura mínima do Edge headless) e BIB-0049 (append nativo escreve "null").
- Corrigido: `apps/portal/.gitignore` ignorava `web/js/data/` (o clone limpo falhava no CI).
- Próximo: Fernando cadastra os segredos do GitHub, executa a validação guiada e revisa as propostas; técnico: P1.6 Painel executivo real.

## 01/10/2026 (noite) — P1 e P2
- P1: painel executivo (fea98cf), compras e contas a pagar (fa8fffb), obra no pedido (ac34276), margem realizada (ad732b8), proposta em PDF (ba17dd4), notificações (8d2ac04). Registro BIB-0050.
- P2: MCP do VEOS (07b2fd3), independência do Zoho (44f02de), busca Ctrl+K e PWA (925822f), LGPD (0303411). Propostas LGPD BIB-0051/0052.
- Não implementados de propósito: IA (teto zero), NF integrada (custo), domínio (precisa do domínio), dados reais nos registros dos setores (decisão).
- Verificação: bancos 106/106; telas 70/70; online 15+12+9+33+6; navegador no site publicado 42/42 (inclui PWA e Ctrl+K); CI verde.
- Próximo: Fernando executa a validação guiada, decide as propostas e cadastra os segredos; técnico: catálogo de itens próprio.

## 01/10/2026 (noite) — catálogo de produtos
- Importado o inventário AliExpress do fundador para o catálogo próprio (commits 0e11b9e, 8826b8d e seguintes). Registros: BIB-0074 (Sebrae), BIB-0075 (alçada de preço, proposta), BIB-0076 (importação), BIB-0077 (mesclagem Zoho × VEOS, para o fim do projeto).
- Fundador: excluir compras pessoais (feito: 5; 3 em dúvida) e deixar a mesclagem com o Zoho para o final, decidindo juntos.
- Testes online agora usam usuários TESTE separados no GitHub Actions (antes colidiam com a execução local).

## 01/10/2026 (noite) — manuais dos diretores
- Fundador: não decidir nada da empresa agora; terminar o programa e tornar cada diretor especialista sênior. Feito: 9 pesquisas em paralelo (fontes abertas; benchmarks só com fonte), manuais integrados ao portal, IA VEOS e MCP.
- Achado legal relevante: reserva técnica a arquitetos é vedada (Lei 12.378/2010, art. 18, VI; CAU) — BIB-0078.

