# Estado atual — 11/11/2026 (as seções do topo são as mais recentes)

## 11/11/2026 (tarde) — Gmail CONECTADO (ponte v2)
- Projeto "Ponte VEOS" (código v2 gerado em Integrações) criado no Apps Script de voiceambientesinteligentes@gmail.com, implantado como App da Web (executar como: eu; acesso: qualquer pessoa), permissões de Gmail, Agenda e "enviar como você" autorizadas pelo Claude no Chrome do Fernando (a pedido dele), URL colado e conectado: teste da ponte ok. Com os dois ligados o envio padrão é a Brevo (seletor em Integrações); resposta a conversa do Gmail sai pelo Gmail; o vigia das respostas passa a rodar a cada 10 min.
- **Ainda não testado:** envio real de um e-mail de negócio (prospecção) pelos dois caminhos, resposta real chegando e virando tarefa, agenda.

## 11/11/2026 (tarde) — Brevo CONECTADA de verdade
- Conta grátis da Brevo criada para voiceambientesinteligentes@gmail.com (o Fernando entrou com o Google no Chrome dele e confirmou o celular; o Claude preencheu perfil, endereço da empresa — do Zoho —, plano GRÁTIS e gerou a chave "VEOS" com acesso restrito: e-mails transacionais, conta (leitura e gravação), webhooks e organização (leitura); sem vencimento fixo). Conectada em Integrações: plano grátis, 300 envios, remetente confirmado, **avisos ligados**; teste enviado para o próprio Gmail.
- Corrigido no caminho: conta sem nenhum webhook responde "Webhook record does not exist" (agora vira lista vazia e o webhook é criado); "null" escrito na tela de Integrações (Brevo e Gmail); manutenção semanal da chave (`manterChaveViva` na varredura da `saude`: a Brevo desativa chave sem uso por 90 dias).
- Achado: a VOICE tem domínio próprio, voiceambientesinteligentes.com (e-mail no Google Workspace, contato@; DNS no Google Domains/Squarespace; sem DMARC). O Fernando escolheu usar o Gmail na Brevo por enquanto.

## 11/11/2026 — Brevo e Gmail: o e-mail confirmado sai pela Brevo (ou pelo Gmail), com avisos de entregue/aberto/voltou/spam
- **Pedido do Fernando:** "vamos usar brevo, acesse, crie uma conta e configure, e também o gmail; faça tudo". Decisão em DECISOES (11/11). **Conta não criada pelo Claude:** a Brevo exige o login do Google do Fernando (ou confirmação no e-mail dele) e às vezes SMS; sem navegador com a conta dele não há como, e senha não deve passar pelo Claude. Ficou tudo pronto no VEOS para ele colar a chave (pendência **CIO-17**); o Gmail segue na **CIO-15**.
- **Envio** (`api/notificacoes.ts` + `_shared/envio_email.ts` + `_shared/brevo.ts`): por onde sai = `escolherViaEmail` (`domain/brevo.js`): pedido (`via`), resposta a conversa do Gmail → Gmail, padrão de Integrações (`POST /email/padrao`), senão **Brevo**, senão Gmail. Brevo: `POST /v3/smtp/email` com texto + HTML simples (`htmlDoEmail`), `replyTo` = Gmail da VOICE, etiquetas `veos`, `veos-<id>`, tipo e `X-Mailin-custom: veos:<id>`. Limites: Brevo 280/dia, Gmail 80/dia, prospecção 30/dia somando. Erros da Brevo em português (`explicarErroBrevo`: bloqueio de IP, chave, conta em validação, cota, remetente).
- **Conectar** (`api/acoes.ts`, só direção): `POST /email/brevo/conectar {chave}` lê a conta (`GET /account`), escolhe o remetente ativo (ou cria com o e-mail da conta → código de 6 dígitos), liga o webhook transacional (cria/atualiza, 11 eventos) e guarda tudo cifrado; `/email/brevo/codigo`, `/email/brevo/testar {enviar}` (teste para o próprio e-mail), `/email/brevo/desconectar` (apaga o webhook). `GET /email/situacao` agora traz `envio` (via/nome/pelo/conta), `brevo`, `padrao` e contagens por caminho.
- **Avisos** (função nova `brevo`, `--no-verify-jwt`, `.../functions/v1/brevo/<segredo>`; `_shared/brevo_eventos.ts`): cada aviso entra em `email_eventos` (chave SHA-256, sem repetir) e carimba a mensagem (entregue, aberto ×N, clique ×N, voltou, spam, último evento). Voltou/bloqueado/spam/descadastro → lista de bloqueio + rascunhos descartados; spam/descadastro cancelam a cadência; tarefas `email:voltou`, `email:spam`, `email:saida` (avisos no chat).
- **Gmail:** ponte **v2** (`domain/ponte_google.js`): `respostas` aceita `busca` (remetente/domínio depois do envio, `buscaDeResposta`) e devolve `chave`; o vigia (`_shared/email_vigia.ts`) confere e-mails do Gmail e da Brevo (até 3 dias a cada 20 min; depois a cada 3 h) e grava a conversa da resposta.
- **Telas:** Integrações com "Envio de e-mails — Brevo" (passo a passo, links da Brevo, chave, código do remetente, Atualizar, Mandar um teste para mim, Desconectar, escolha do padrão quando os dois estão ligados) acima do Gmail; Caixa de saída com "Enviar pela Brevo"/"Enviar pelo Gmail" (+ o outro caminho) e selos Entregue/Aberto/Clicou/Voltou/Spam; chat e IA VEOS falam "pela Brevo"/"pelo Gmail". MCP `veos_enviar_email` aceita `via` opcional.
- **Banco:** `20261111120000_brevo.sql` (via 'brevo', colunas de avisos, `email_eventos`, índice do id do envio, limpeza de 180 dias). Aplicada. Funções publicadas: brevo, api, saude, mcp, ia-fila.
- **Testado (11/11):** carga dos módulos novos do servidor (Bun) e sintaxe das telas; código da ponte v2 compila; função `brevo` no ar (recusa segredo errado com 401, GET 405). Teste novo `tests/web/brevo.test.mjs` escrito (roda no CI).
- **NÃO testado:** nada com uma conta Brevo real (não existe ainda): envio, webhook de verdade (formato do aviso conferido só pela documentação), código do remetente, bloqueio de IP; ponte v2 no Google; telas novas no navegador; bateria completa (só quando o Fernando pedir).
- **Limites:** sem domínio próprio o remetente aparece como `…@brevosend.com` (nome VOICE; resposta volta ao Gmail) — para prospecção 1:1 o Gmail tende a entregar melhor; abertura é aproximada (Apple/Gmail abrem por proxy); a Brevo não recebe respostas (só o Gmail).

## 10/11/2026 (noite) — IA que executa em todos os setores (achar, cadastrar, preparar e ENVIAR e-mail)
- **Pedido do Fernando:** "usar o programa para gerenciar a empresa e fazer o que eu pedir em todos os setores; ex.: via MCP ou IA do programa achar um arquiteto, pegar o e-mail, gerar um e-mail e enviar". Decisão registrada em DECISOES (envio com confirmação explícita).
- **Modo execução da IA** (`_shared/ia/motor.ts` + `_shared/ia/acoes_ia.ts`): pedido com verbo de ação ("ache", "cadastre", "mande", "agende", "abra um chamado"... — `pedidoDeAcao` em `domain/comandos.js`) faz o diretor do setor EXECUTAR com as ferramentas do MCP, pelas mesmas rotas da API e com as permissões de quem pediu. Por setor: 11 a 20 ferramentas (registros de qualquer setor, tarefas, pesquisa na web, contatos de empresas, e-mail, clientes, orçamento em rascunho, conta a pagar, fornecedores, contratos, caixa do Gmail, agenda). Pergunta continua no modo opinião (agora com leitura da web, registros, caixa e agenda). Nunca envia: prepara; se o modelo não executar nada, refaz uma vez; se falhar depois de agir, responde com o resumo do que fez (não repete ações). Ids longos saem do texto.
- **Roteamento** (`domain/comandos.js`): 9 diretores (entraram CXO, CHRO e SEC); empate vai ao setor mais específico ("abra um chamado para o cliente" = CXO); `confirmacaoDeEnvio` ("confirmo", "sim, pode mandar"; "ok" sozinho não envia).
- **Pesquisa e contatos** (`_shared/web.ts`, regras puras em `domain/web_contatos.js`): Tavily/Brave/Serper (se houver chave, cifrada em Integrações) → **Parallel** (grátis, sem chave) → DuckDuckGo (reserva; bloqueia servidor). Leitura de página com endereço público apenas (rede interna, IPv6 direto, porta e usuário/senha recusados; redirecionamentos conferidos), máx. 1,5 MB; se o site bloquear, lê pela Parallel. `encontrar_contatos`: pesquisa → um site por domínio → página inicial/contato → e-mail do domínio primeiro, telefone BR válido, WhatsApp, redes (só link); marca quem já está no VEOS e quem está bloqueado. Instagram/LinkedIn/Facebook/Google não são lidos. Cache 24 h; limites por hora (pesquisa 60, página 150, contatos 20).
- **E-mail** (`api/notificacoes.ts`): preparar = rascunho com destino pelo cliente/registro (a IA não vê o e-mail do cliente), {{primeiro_nome}}/{{empresa}}, Markdown limpo, assinatura de quem pediu, recusa "em anexo" (ainda não anexa). Prospecção com `alvo`: cadastra o escritório como **parceiro prospectado** (cadência de follow-up começa) e o e-mail personalizado substitui o modelo do 1º toque. Mesmo destinatário no mesmo pedido = atualiza o rascunho. **Enviar** (`POST /mensagens/:id/enviar`): só e-mail, destinatário válido e fora do bloqueio, 80/dia (prospecção 30), 1 apresentação por endereço em 30 dias, linha de "sair", reserva contra clique duplo; robôs só simulam. Rascunhos de robôs não aparecem mais para a direção.
- **Gmail da VOICE** (`domain/ponte_google.js`, `_shared/google.ts`, Integrações): ponte no Google Apps Script (grátis): enviar/responder na conversa, buscar caixa, ler conversa, respostas, agenda e evento. Segredo e endereço cifrados (`integracoes_segredos`, AES-GCM com `VEOS_CIFRA`). **Vigia das respostas** (`_shared/email_vigia.ts`, na varredura de 10 min): resposta vira tarefa "Responder …" (Hoje, Radar e chat); "SAIR"/"não tenho interesse" bloqueia o contato e cancela a cadência.
- **Telas:** chat/IA VEOS com cartões dos e-mails preparados (Enviar, Ver texto, Descartar, Enviar todos, "confirmo" por voz); IA VEOS com "O que posso pedir" (rotinas dos 9 setores, `domain/capacidades.js`); Caixa de saída com "Enviar pelo Gmail", quem respondeu e o trecho; Integrações com "E-mail e agenda — Gmail da VOICE" (passo a passo, código da ponte, testar, desconectar) e "Pesquisa na web" (chaves opcionais).
- **MCP** (`domain/mcp.js`, remoto e local): +16 ferramentas (tipos_de_registro, registros, criar/atualizar_registro, concluir_tarefa, pesquisar_web, ler_pagina, encontrar_contatos, preparar_email, **enviar_email com confirmado=true**, caixa_de_saida, emails_recebidos, ler_conversa_email, agenda, criar_evento). Corrigido no MCP remoto: rotas com filtros (`?busca=`) chegavam erradas ao roteador.
- **Banco:** migration `20261110120000_ia_executa.sql` (integracoes_segredos, colunas de envio/resposta em mensagens_saida, mensagem_criar novo, mensagem_registrar_envio, pesquisa_cache, acoes_registro, limpeza diária). Segredo `VEOS_CIFRA` criado.
- **Testado (10/11):** servidor real `tests/online/e2e_ia_executa.mjs` **18/18** (pesquisa pela Parallel a partir do servidor, 3 escritórios com e-mail, leitura de site, endereço interno recusado, rascunho + parceiro, sem duplicar, filtro de registros, envio simulado, 2ª apresentação recusada, bloqueio, Gmail desligado); **uso real da IA** `tests/online/uso_ia_executa.mjs` 2/2 (Gemini e Mistral; ~29 s; 2 escritórios em Balneário Camboriú e 2 em Itajaí; e-mails 1:1 preparados; nada enviado). Carga de todos os módulos do servidor (Bun) e conferência de imports dos 137 módulos do site.
- **NÃO testado:** envio real pelo Gmail (depende do Fernando conectar a ponte), vigia das respostas com e-mail real, agenda, telas novas no navegador (cartões, Integrações, Caixa de saída), bateria completa (`npm test`, telas, banco) — escrita/atualizada, não rodada (pedido do Fernando: só quando ele pedir).
- **Limites:** modelo gratuito às vezes repete ferramentas ou mostra ids (tratado no servidor); a Parallel gratuita não publica limites; Gmail gratuito ~100 destinatários/dia; não anexa arquivos ainda; convite de agenda com convidados só pelo MCP (com confirmação) — no chat, a IA cria o compromisso sem convidados.

## 10/11/2026 (noite) — IA dos diretores: levantamento prévio e conferência ativa
- **Levantamento prévio** (`levantamentoPrevio` em `_shared/ia/texto.ts`, usado em `motor.ts`): pelo assunto da pergunta (caixa, fluxo, fechamento, indicadores, pedidos/recebíveis, funil/leads, metas, orçamentos/margem, vendas/faturamento, clientes) o servidor roda até 3 ferramentas de dados ANTES do modelo e injeta o resultado no pedido ("DADOS DO VEOS JÁ LEVANTADOS"). O modelo gratuito pequeno deixa de "esquecer" de consultar e responde mais rápido (≈11 s, antes ≈19 s). Só roda ferramentas que o setor/papel pode usar; falha ou erro de permissão é ignorado.
- **Conferência ativa**: se a resposta traz 2 ou mais valores/percentuais sem origem, o motor refaz UMA vez mandando corrigir (LACUNA no lugar de inventar) e fica com a melhor das duas.
- Testes: `tests/ia/texto.test.ts` (+1), `tests/online/e2e_ia_dados.mjs` (pergunta real de dados; fora do CI por gastar cota): caixa (CFO) e funil (CSO) respondidos com dados reais, LACUNAs honestas e fontes. Limites que seguem: modelo gratuito (Ministral) ainda pode errar interpretação; Gemini estourou tempo 2x em 24/10 (Mistral responde); mais qualidade só com modelo pago (decisão do Fernando).

## 10/11/2026 — MCP remoto definitivo (ChatGPT e Claude como o dono)
- **O que é:** função `mcp` (`supabase/functions/mcp`, `--no-verify-jwt`), URL `.../functions/v1/mcp/<segredo>`. Link secreto (só o hash fica em `mcp_links`), com escopo **consulta** (só leitura) ou **completo** (leitura + cadastros/rascunhos), validade 7/30/90 dias, revogável, limite de 120 chamadas/min, e **toda chamada registrada** em `mcp_chamadas` (inclusive as recusadas). Age como o dono que o criou: usa o mesmo roteador da API (`api/roteador.ts`) com o membro dele; se o dono sair da direção ou for desativado, o link para junto. Não passa por MFA (limite assumido: o link vale como senha).
- **Ferramentas:** as 24 do MCP local + `veos_ler` (leitura livre de qualquer tela de dados: cfo, caixa, comercial, plano, fluxo, biblioteca, produtos, projetos, diretores, zoho, setor/<id>, radar, painel, saúde, mensagens; recusa conta, usuários, entrevista e o próprio MCP). Definições compartilhadas em `apps/web/js/domain/mcp.js` (o MCP local do Claude Code usa o mesmo módulo). Nunca paga, envia, aceita orçamento, gera pedido nem mexe em política/meta/alçada/imposto.
- **Tela:** Integrações → "MCP do VEOS — ChatGPT e Claude como o dono" (criar com escopo/nome/validade, passo a passo ChatGPT e Claude, comando inicial, lista com revogar, últimas chamadas). API: `GET/POST /mcp-remoto`, `/mcp-remoto/link`, `/mcp-remoto/revogar` (só direção).
- **Link do Fernando** criado em 10/11 (completo, 90 dias, rótulo "ChatGPT e Claude do Fernando"): o segredo foi entregue só na conversa, nunca gravado em arquivo. Para trocar: revogar em Integrações e criar outro.
- Testes: domínio `tests/web/mcp.test.mjs` (3), telas `integracoes.html` 4/4, online `e2e_mcp_remoto.mjs` 22/22 (entra no CI), `e2e_mcp` 11/11. **Não testado:** conexão real no ChatGPT/Claude.
- Mais forte no futuro (opcional): OAuth do Supabase para entrar com login+MFA em vez de link secreto.

## 09/11/2026 (tarde) — indicadores sem LACUNA estrutural, entrevista testada, limpeza do pg_cron
- Pós-venda e Marketing: os indicadores que eram LACUNA por falta de campo agora têm o campo e o cálculo (SLA de solução, tempo de 1ª resposta em horas, resolução remota, custo de garantia, renovação, receita influenciada, escritórios engajados). Os registros antigos não têm os campos novos, então cada indicador só mostra valor depois que a equipe preencher; sem dado segue LACUNA com o motivo. Limite: custo de garantia em % da receita do projeto segue LACUNA (chamado ainda não aponta o projeto); escritórios engajados soma por evento/campanha (não deduplica o mesmo escritório). Testes: domínio (indicadores_setor 6), telas setor_indicadores 8/8.
- Entrevista guiada: MCP testado no servidor de ponta a ponta (online 14/14). NÃO testado: conexão real no ChatGPT.
- Corrigido: `/sistema/saude` com 502 (histórico do pg_cron sem limpeza, 74 MB) e MCP que cortava JSON no meio.
- Verificado em 09/11: `npm test` (155 Python, 20 JS, domínio), online api/financeiro/setores/sistema/mcp/ia/caixa/fornecedores/agenda/contratos/push/entrevista, telas.

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
## Sistema olha para si mesmo + fornecedores próprios (05/11)
- **Varredura agendada de verdade**: a função `saude` (regras vivas de todos os setores, fluxo, caixa, cadências) só rodava 1x por dia pelo GitHub e ao abrir o Radar, ao contrário do que a documentação dizia. Migration `20261105100000_varredura_agendada.sql`: pg_cron chama `saude` a cada 10 min (a própria função limita a 1 varredura / 10 min). Conferido: o job rodou às 17:20 UTC.
- **Vigia de saúde do VEOS** (`_shared/saude_regras.ts` puro + `saude_vigia.ts`, alertas `SAUDE_*` para o CIO, tarefa do dia, resolvem sozinhos): IA falhando em ≥50% das tentativas nas últimas 24 h (com provedores), pergunta aos diretores parada >30 min, sincronização do Zoho com erro ou sem rodar há >1 h. Testes: `tests/ia/saude.test.ts` (3). Hoje: 0 alertas (nada errado no momento).
- **P0 feitos**: lista de produtos sem a busca de 10 mil vínculos (502 do Calendário do Instagram) e IA que refaz a resposta quando a pergunta é de dados e nenhuma ferramenta foi chamada (ver CONTINUIDADE 05/11).
- **Fornecedores próprios** (`#/fornecedores`, Operação → Fornecedores, "+ Novo"): tabela `fornecedores` (FOR-00001; robôs FOR-T), histórico imutável, `fornecedor_salvar`; nome, CNPJ/CPF com dígito verificador, categoria, contato, prazos de pagamento e entrega, condição. Ficha com compras e contas a pagar do fornecedor. **Compra e Conta a pagar** escolhem o fornecedor da lista (próprios + nomes do Zoho; vendor do Zoho é importado na hora, uma vez só) e gravam `fornecedor_id`. Domínio `domain/fornecedores.js`; API `/fluxo/fornecedores`.
- Testes: domínio 168 + Python 155 + JS 20; telas `fornecedores.html` 8/8; banco `tests/banco/fornecedores.sql` 13/13; online `e2e_fornecedores.mjs` 10/10 (entra no CI; limpa o CNPJ e o vendor do robô no fim); site publicado `navegador.mjs` 78/78.
- **Agenda por pessoa** (P1-6): a direcao define o **cargo** de cada pessoa em Ajustes → Usuários ("Cargo na Estrutura"; coluna `membros.cargo`, formato `cargo` do setor da pessoa ou `setor:cargo`). A varredura (a cada 10 min) e o ato de definir o cargo geram as tarefas do dia: **diárias** (seg–sex), **semanais** (1x/semana, prazo sexta) e **mensais** (1x/mês, prazo no último dia), com `origem=agenda` e `responsavel` = a pessoa; atividade do periodo vencida e nao feita e encerrada. Cargo vago nao gera tarefa (nada de fila para ninguem). Na pagina Hoje a "Minha agenda" vem primeiro. Domínio `domain/agenda.js`, `_shared/agenda_vigia.ts`, migration `20261105120000_agenda_por_pessoa.sql`. As atividades continuam PROPOSTA ate a estrutura ser aprovada. Testes: domínio (5), telas 192/192, banco `agenda.sql` 7/7, online `e2e_agenda.mjs` 7/7 (no CI).
- **Histórico do CRM do Zoho → funil** (P1-7): o CRM antigo tem 28 leads e 14 negócios (mais contas, contatos e atividades), todos já espelhados em Ajustes → Zoho CRM. Na ficha de cada lead e negócio há **"Levar ao funil do VEOS"**: abre o formulário do Comercial já preenchido só com o que o Zoho tem (nome, telefone, e-mail, origem mapeada, valor, etapa, data) e com o **id e a origem originais escritos no texto do registro**; o que o Zoho não tem (tipo de imóvel, fase da obra) fica em branco para a pessoa preencher. Não foi importado em lote de propósito: negócios antigos ganhos disparariam alertas de "passagem pendente" e leads antigos "sem resposta". Avisa se aquele id já foi levado. Domínio `domain/crm_import.js`; testes: domínio (4), telas `zoho_crm.html` 4/4.
- **Contratos de suporte / receita recorrente** (P1-13; Financeiro → Contratos de suporte, `#/contratos`): tabela `contratos_suporte` (SUP-00001; robôs SUP-T), `contrato_cobrancas` (uma por mês, única por contrato+mês), histórico imutável. O banco gera as cobranças dos contratos ativos **do mês atual até 6 meses à frente** (nunca meses passados; respeita o fim; diariamente 06:20 e ao salvar), reajuste atualiza as abertas, **suspender cancela** as futuras e **reativar reabre**, encerrar cancela e trava. **Marcar recebida** (data não futura, uma vez só). As cobranças abertas entram na **previsão de caixa de 13 semanas como entradas previstas** (`caixa_dados.ts`; contratos de robôs só aparecem para robôs). Tela: receita mensal recorrente (MRR), por ano, atrasadas, próximo recebimento. **Não feito** (LACUNA): casar a cobrança com o crédito do extrato bancário na conciliação (hoje se marca recebida à mão) e indicadores de churn. Testes: domínio (3), telas `contratos.html` 8/8, banco `contratos_suporte.sql` 14/14, online `e2e_contratos.mjs` 12/12 (no CI).
- **Indicadores calculados sozinhos** (P1-12): no Painel de cada setor, a tabela de Indicadores ganhou **"Valor atual"** com o valor calculado dos registros do setor (últimos 90 dias) e a fonte, ou **LACUNA com o motivo** (nunca zero inventado). Marketing: leads gerados, oportunidades, conversão, custo por lead, comparecimento em eventos, cases publicados, publicações por semana. Pós-venda: NPS (com aviso de amostra pequena), chamados reincidentes, indicações repassadas, preventivas no prazo, **receita recorrente** (vem dos contratos de suporte). LACUNA declarada (falta campo/registro): receita influenciada, arquitetos engajados, SLA de solução, tempo de 1ª resposta (só há data, sem hora), resolução remota, renovação, custo de garantia — a pessoa vê o que precisa passar a registrar. Domínio `domain/indicadores_setor.js`; testes: domínio (4), telas `setor_indicadores.html` 6/6; bateria 210/210. As metas seguem PROPOSTA.
- **Histórico visível por registro e manuais** (P2-17): ao abrir um registro do setor aparece **Histórico do registro** (quem, quando, estado de→para, campos tocados; GET /registros/:id/historico, só registros que a pessoa pode ver). Manuais ganharam 3 procedimentos: funil do dia (CSO), abertura de obra nova no VEOS (COO) e Wi-Fi lento/cai (CIO) — scripts/manuais/acrescentar-procedimentos.mjs. Testes: domínio (2), telas setor_indicadores.html#historico.
- Vínculos de produto (P2-14): a tela de revisão já existe (Catálogo → Revisar duplicados, confirmar/descartar com preferência); o que falta é a decisão humana dos 37 vínculos, não código.
- **MCP ampliado** (P1-10): 24 ferramentas (eram 17). Novas, todas pela API com as permissões da pessoa: `veos_clientes`, `veos_criar_cliente`, `veos_criar_orcamento_rascunho` (só rascunho), `veos_criar_conta_a_pagar` (só lança; financeiro/direção), `veos_fornecedores`, `veos_criar_fornecedor`, `veos_criar_contrato_suporte`. Nenhuma paga, envia, aceita orçamento, gera pedido ou decide (teste automático garante). "Pedido em rascunho" não foi criado: pedido só nasce de orçamento aceito (ação humana). Testes: `tests/scripts/mcp.test.mjs` (4) e online `e2e_mcp.mjs` 11/11 (cria cliente e rascunho como robô, vendas não lança conta a pagar, validação vale). **Falta (Fernando):** gerar o código em Minha conta → Acesso do Claude Code e configurar o MCP nesta máquina.
- **Aviso com o navegador fechado / Web Push** (P1-9): Ajustes → Minha conta → "Ligar avisos no navegador" agora também **inscreve o aparelho** (service worker `sw.js` mostra o aviso e abre a tela certa ao tocar). Chaves VAPID geradas e gravadas nos segredos do Supabase (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` = o endereço do site, sem e-mail). A cada varredura (10 min) o servidor envia **alertas ALTO/CRÍTICO novos** (marca `alertas.push_enviado_em`; os que já existiam não disparam) a quem acessa o setor; no máximo 3 por pessoa por rodada (acima disso, um resumo); robôs de teste nunca recebem nem disparam; aparelho que o navegador diz que não existe mais (404/410) é removido. Envio feito **sem biblioteca** (`_shared/webpush.ts`: VAPID ES256 + aes128gcm, RFC 8291) porque o pacote `web-push` não mandou o cabeçalho de autorização no servidor. Botão "Enviar aviso de teste" na Minha conta. **Testado:** criptografia decifrada por um receptor independente e assinatura VAPID conferida (`tests/ia/webpush.test.ts`, 3); online `e2e_push.mjs` 7/7 (o serviço de push do Google aceitou a assinatura e respondeu que um aparelho de mentira não existe). **NÃO testado:** a chegada num navegador real com o VEOS fechado — o Fernando precisa ligar os avisos no celular/computador e usar "Enviar aviso de teste". iPhone só funciona com o VEOS instalado na tela inicial.
- Decisão P0-4: `e2e_operacao` e `uso_orcamento` (criam pedido e cancelam) ficam **manuais**, fora do CI; o resto entra no CI.

## IA VEOS ligada aos diretores + chat flutuante (04/11, noite)
- Problema: a IA VEOS só abria telas e dizia "a inteligência artificial ainda não está integrada" (texto antigo de `domain/comandos.js`), embora o motor dos diretores esteja ligado desde outubro.
- **Assistente único** (`ui/assistente.js`) usado pelo **chat flutuante** (botão dourado no canto de todas as telas, menos na IA VEOS; selo com avisos não lidos; tela cheia, voz liga/desliga; no celular ocupa a tela) e pela **tela IA VEOS**: pedido de tela abre a tela; o resto vai ao diretor certo (`interpretar` → CFO/CSO/CMO/COO/CIO/CEO) pelo motor de IA, numa conversa por diretor (mesmo `conversa_id`: ele lembra o que já foi dito); "analisando…" até a resposta; alertas ALTO/CRÍTICO novos do Radar entram como aviso. Histórico e preferências ficam no aparelho (localStorage).
- **Tela IA VEOS** redesenhada no estilo de app de conversa com IA (coluna central, saudação, caixa arredondada com microfone e enviar, sugestões, avisos, respostas em texto corrido; orbe da onda reage à voz). Na página Hoje aparece embutida.
- **Voz**: estilo assistente formal ("Jarvis"): escolhe a voz masculina pt-BR mais natural do navegador (ex.: Antonio Natural no Edge), mais grave; fala só o resumo da resposta; a pessoa pode trocar a voz. A voz do filme é do ator e não é copiada.
- O componente React/shadcn enviado (expandable-chat) foi feito em JavaScript puro com a mesma estrutura: o VEOS não usa React/Tailwind/TypeScript (site estático sem build, CSP só do próprio site).
- Testes: telas `ia.html` (pergunta, tela, aviso) e bateria 184/184; `tests/online/uso_ia.mjs` 6/6 com a IA real (pergunta na IA VEOS → resposta do diretor; mesma conversa no chat flutuante; "abrir os orçamentos" abre a tela).

## Perguntar aos diretores virou conversa (04/11, noite)
- Pedido do Fernando: resposta em formato de conversa e poder continuar na mesma conversa. **Chat** (`ui/views/diretores.js`): conversas à esquerda (diretor, prévia, "aguardando"), conversa à direita com balões (você × diretor), "analisando…" com atualização sozinha, falha com "Tentar de novo"/"Cancelar", sugestões rápidas ("Use os dados do VEOS e refaça", "Detalhe o primeiro passo"…), caixa de digitar embaixo (Enter envia). Nova conversa escolhendo o diretor; a IA VEOS abre a conversa já com a pergunta. No celular: lista → conversa com "‹".
- **Continuação**: coluna `conversa_id` (migration `20261104140000_conversas_diretores.sql`); `POST /diretores/perguntas {conversa_id, pergunta}` (mesmo diretor, só quem abriu ou a direção, bloqueia se a anterior está pendente). O motor (`_shared/ia/motor.ts`) lê as últimas 6 trocas respondidas antes de responder. Domínio `domain/conversa.js` (agrupar, formatar títulos/listas/aviso).
- **Honestidade das respostas**: a conferência automática agora aponta também **percentuais** sem origem (exceto faixas da Política e RT 10%); se o diretor responder sem consultar nenhum dado do VEOS e citar números, a resposta ganha aviso no topo. Motivo: a resposta do Fernando de 04/11 ("como captar novos clientes") trazia "FATOS DO FUNIL" com percentuais inventados sem usar ferramenta.
- Perguntas dos robôs de teste não aparecem para quem usa de verdade. Teste real: pergunta → 4 ferramentas consultadas; continuação "detalhe o primeiro passo disso" respondida no contexto. Limite: o modelo gratuito (Ministral) ainda se contradiz e cita coisas que não existem (ex.: "lista-alvo de 50 escritórios").
- Testes: `tests/web/conversa.test.mjs` (2), `tests/ia/texto.test.ts` (percentuais), telas `diretores.html` 6/6, bateria 180/180, online e2e_ia 4/4 e e2e_sistema 56/56.

## Novo design: menu por áreas, Hoje e celular (04/11, noite)
- Ajuste pedido pelo Fernando: **Órbita e IA VEOS na página inicial** (Hoje: abaixo dos afazeres, lado a lado no computador; no celular só as siglas na Órbita) **e como áreas próprias no menu** (Hoje · Órbita · IA VEOS · Vender · …, 9 áreas). Setores fora do Comercial abrem na área Órbita. Textos da IA atualizados: os diretores já respondem pela IA do servidor (Perguntar aos diretores).
- Pedido do Fernando: "design prático, intuitivo, fácil de ler; não preciso ver um milhão de coisas". Mesmas telas e funções; só a moldura e a aparência mudaram (padrão de Pipedrive/HubSpot/Linear).
- **Menu lateral com 7 áreas** (Hoje · Vender · Operação · Financeiro · Empresa · Biblioteca · Ajustes) e **abas da área no topo**, só da área atual; mapa único em `apps/web/js/data/navegacao.js` (perfil por tela; alimenta também a busca Ctrl+K: todas as telas, atalhos "Novo" e os 9 setores). Ícones SVG em `ui/icones.js`.
- **"+ Novo"** (contato, orçamento, cliente, compra, pergunta ao diretor). **Página inicial `#/hoje`** (`ui/views/hoje.js`): saudação, atalhos, "Para fazer hoje" (alertas graves + tarefas vencidas/de hoje, com "Feito" na linha) e "Agora na VOICE". Rota desconhecida cai em Hoje (Órbita segue em Empresa → Setores).
- **Celular**: barra inferior Hoje · Vender · + Novo · Operação · Menu. **Começar a operar** compacto (progresso, próximo passo, grupos que abrem/fecham). Aviso "Carregando…" em toda tela lenta (>300 ms); sem contorno azul do foco no conteúdo.
- Visual em `apps/web/css/tema.css` (sem @layer, carregado por último). Testes: `tests/web/navegacao.test.mjs` (5), telas `hoje.html` 4/4, bateria 176/176; fotos de revisão com `tests/online/fotos.mjs`.

## Valores estimados do CFO, modelo de negócio e captação (04/11, fim do dia)
- **Formulário do CFO**: os 10 campos vazios que afetam preço/condição ganharam média de mercado marcada `_estimados` (nova versão de compras, vendas e tempos; autor "Claude (estimativa do VEOS)", membro inativo; `scripts/estimativas-cfo.mjs`). Tela mostra "ESTIMADO" no campo + quadro no topo; ajustar ou marcar "Confirmo" tira a marca. Domínio `completarComEstimativas`, `valoresEstimados`, `estimadosQueFicam` (`formulario_cfo.js`). Nada informado pelo fundador foi trocado.
- **Avisos**: vigia do caixa cria `CAIXA_CFO_VALORES_ESTIMADOS` e `CAIXA_CFO_PRODUTIVIDADE_ALTA` (produtividade 100% → hora R$ 35; com 70% ≈ R$ 50) com tarefa do dia para o CFO: aparecem no Radar e no resumo do dia e resolvem sozinhos.
- **Modelo de negócio** (`apps/web/js/domain/empresa.js`, `MODELO_NEGOCIO`): cliente principal = arquiteto/designer (declaração do Fernando em 04/11), no prompt de todos os diretores (`_shared/ia/texto.ts`) e nas instruções do MCP (`scripts/mcp/ferramentas.mjs`); Começar a operar põe a prospecção de escritórios primeiro; Contato rápido abre em "Indicação de arquiteto". Registrar como decisão: CEO-09.
- **Captação automatizada**: não há robô de curtir/seguir (viola as regras do Instagram). Próximos: dados abertos do CNPJ por CNAE (CSO-17, aguardando o OK do Fernando por causa da BIB-0107) e publicação pela API oficial da Meta (CMO-10).

## Operação comercial do zero: do contato ao pedido (04/11, noite)
- Pedido do Fernando: "partir do zero (só produtos e orçamentos antigos) e deixar tudo pronto para operar: criar cliente, gerar orçamento, todos os aspectos".
- **Menu Vender** (direção, finanças, vendas, marketing, pós-venda): Contato rápido · Clientes · Orçamentos · Novo orçamento · Prospecção · Calendário do Instagram. **Comando → Começar a operar** (`#/operar`): etapas com situação real e o botão da ferramenta.
- **Clientes** (`#/clientes`, `#/clientes/:id`): tabela própria `clientes` (CLI-00001), PF/PJ, CPF/CNPJ com dígito verificador, contato, obra, imóvel, fase, origem, parceiro, aceite LGPD; ficha com orçamentos, pedidos, oportunidades (campo novo `cliente_ref` no lead/oportunidade) e histórico. Domínio `apps/web/js/domain/clientes.js`.
- **Orçamentos** (`#/orcamentos`, `/novo`, `/:id`): montador do zero com ambientes, catálogo com foto e **preço sugerido pela Política V1 (MC 35% com custo real de importação)** quando não há preço de tabela, mão de obra (5 serviços-padrão; preço da hora pela Política quando há custo-hora; estimativa pelos tempos-padrão), desconto, canal (comissão/RT), condição sugerida, validade, prazo; **margem e alçada ao vivo pelo mesmo motor da Negociação**. Ciclo: rascunho → enviado → aceito (**gera o pedido**: `POST /fluxo/pedidos {orcamento_veos_id}`) / recusado (motivo) / expirado; nova versão a partir de rascunho/enviado/expirado. Domínio `apps/web/js/domain/orcamento.js`. Proposta em PDF usa o cliente do VEOS (contato, obra, validade, prazo, condição) e marca enviado.
- **Retomar do Zoho**: orçamentos antigos não fechados (121 em 04/11) viram cliente + orçamento novo com itens ligados ao catálogo (vínculos confirmados/a revisar) e preço recalculado; o antigo aparece na linha.
- **Captação**: Contato rápido (lead em 30 s → cadência "lead novo" → botão "virar cliente e orçar"); Prospecção (7 públicos, buscas públicas Google Maps/Instagram/LinkedIn/CASACOR, mensagem 1:1 personalizada com opção de sair, alvo vira parceiro "prospectado" com cadência); Calendário do Instagram (20 pautas em 6 pilares, legenda + roteiro + hashtags, produtos reais; cada post vira "conteúdo" no Marketing; rotina do Instagram como PROPOSTA). Domínios `conteudo.js` e `prospeccao.js`. Nada é publicado/enviado sozinho; sem automação de seguir/curtir.
- **Estrutura**: cada atividade de cargo mostra "→ ferramenta" (mapa por palavras-chave em `estrutura.js`, `ferramentaDaAtividade`).
- **Começar do zero**: dados dos robôs de teste (`@veos-teste.invalid`) não aparecem para usuários reais (registros, Radar, tarefas, alertas, clientes, orçamentos, pedidos — `_shared/teste.ts`, `usuarios_teste()`); **numeração real recomeça do 1** (CLI/ORV/PED/COM) e teste usa série T (`CLI-T00001`), regra: e-mail `.invalid` ou usuário inexistente (migration `20261104130000_numeracao_real.sql`).
- Banco: migrations `20261104120000_operacao_comercial.sql` (clientes, histórico, `cliente_salvar`, ciclo `orcamento_veos_situacao`, colunas novas do orçamento) e `20261104130000_numeracao_real.sql`, aplicadas. Funções `api`, `saude`, `ia-fila` publicadas.
- Testes: `tests/web/operacao.test.mjs` (11), telas `operacao.html` (24/24) e bateria completa 172/172, banco `tests/banco/operacao_comercial.sql` 18/18 (+ compras 16, fluxo 17, pedido_rt 9, margem 5, caixa 25, orçamentos 10 com as migrations), **online `tests/online/e2e_operacao.mjs` 21/21** (robô: lead → parceiro → conteúdo → cliente → orçamento com produto → enviado → v2 → aceito → pedido → retomada do Zoho; pedido TESTE cancelado no fim). O e2e cria pedido real (cancelado): fora do `test:online` do CI de propósito. **Site publicado**: `navegador.mjs` 72/72 telas (novas incluídas, computador e celular; fotos do catálogo 8/8) e `tests/online/uso_orcamento.mjs` 8/8 (robô cadastra cliente pela tela, monta orçamento com produto + serviço, MC 41,1% verde, salva, PDF sem custo/margem, marca enviado, gera o pedido; pedido TESTE cancelado). Playwright não fica instalado: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --no-package-lock playwright` antes (usa o Edge).
- Falta (Fernando): primeiro uso real (CSO-15), retomar os antigos vivos (CSO-16), preço de tabela/custo da hora (CFO-16/17), rotina do Instagram (CMO-09), Começar a operar (CEO-08).

## Estrutura da empresa: organograma e atividades de cada cargo (04/11) — PROPOSTA
- Pedido do Fernando: estruturar a empresa (ex.: diretor comercial → gerente → vendedor) e o que cada cargo faz, em todos os diretores.
- **Hierarquia** em `setores/*.json`: o CEO no topo, os 8 diretores respondem a ele, e os cargos respondem ao diretor ou a um gerente/coordenador do setor (ex.: CSO → Gerente comercial → Vendedor, SDR, Orçamentista, Assistente; COO → Gerente de obras → Coordenador de campo → Técnicos). 41 cargos (1 novo: `gerente_comercial`); ids antigos mantidos (registros e regras dependem deles).
- **Cada cargo** tem nível (gestão/assessoria/execução), missão, agenda diária/semanal/mensal, entregas, o que decide sozinho, o que leva ao chefe, fase (essencial agora × quando crescer) e quem acumula enquanto o cargo não tem pessoa. Os diretores também ganharam agenda. Tudo `status: PROPOSTA`.
- Conteúdo em `scripts/estrutura/dados.mjs` (fonte única), aplicado por `scripts/estrutura/aplicar.mjs`; validação no motor (`validarEstrutura`: chefe existente, sem ciclo, nível/fase, cobertura, agenda).
- **Telas**: nova `#/estrutura` (Comando → Estrutura da empresa: organograma, uma aba por diretor, "Quem acumula") e aba **Equipe** de cada setor com organograma clicável + cartões. Domínio `apps/web/js/domain/estrutura.js`.
- Testes: `tests/web/estrutura.test.mjs` (6), `tests/setores/motor.test.ts` (validador da estrutura), telas `estrutura.html` (8/8) e `setor_equipe.html` (6/6). Aba Pendências: um tópico "Estrutura do setor" por diretor (CFO-15, CSO-13, CMO-07, COO-09, CIO-14, CXO-07, CHRO-07, SEC-06, CEO-07), dono Fernando: aprovar.

## CSO-04: orçamento próprio criado e salvo no VEOS (03/11)
- **Tabela própria** (`comercial_orcamentos`/`comercial_orcamento_itens`, migration `20261103120000_comercial_orcamentos.sql`): nasce em "rascunho", numeração `ORV-00001`; salvar de novo sobre o mesmo orçamento (`substitui`) grava uma **nova versão da mesma série** e marca a anterior "substituída" — só a vigente conta. Histórico append-only (`comercial_orcamentos_historico`). Função `orcamento_veos_criar` idempotente por chave, RLS sem policy (só a Edge Function grava).
- **Negociação ao Vivo** (`#/negociacao`): novo botão "Salvar orçamento no VEOS" (ao lado de "Salvar como proposta" e "Fechar negociação"), com os mesmos itens já usados para fechar o pedido; salvar de novo mostra "Salvar nova versão do orçamento" e versiona. `apps/web/js/domain/precificacao.js` → `paraOrcamentoVeos`.
- **Proposta em PDF sem o Zoho** (`#/propostas/orcamento/:id`): `telaProposta` (`apps/web/js/ui/views/proposta.js`) passou a aceitar tanto o id numérico do Zoho quanto o uuid do orçamento próprio, reaproveitando `agruparItens`/a mesma renderização; tipo de cada item (produto/serviço) já é conhecido por item no orçamento próprio, não precisa adivinhar como no Zoho. `apps/web/js/domain/proposta.js` → `linhasDoOrcamentoVeos`, `totaisDoOrcamentoVeos`.
- API: `GET/POST /comercial/orcamentos`, `GET /comercial/orcamentos/:id` (`supabase/functions/api/comercial.ts`).
- Testes: domínio (`tests/web/precificacao.test.mjs`, `tests/web/proposta.test.mjs`) e telas (134/134, incluindo `tests/telas/negociacao.js` com o botão novo e `tests/telas/proposta_orcamento.html/js`) passando nesta máquina (03–04/11). Migration aplicada no projeto online (`npx supabase db push`) e `tests/banco/comercial_orcamentos.sql` rodado contra o banco real: **10/10 cenários OK**. **Falta só**: usar uma vez de ponta a ponta com login real (criar um orçamento TESTE na Negociação e abrir o PDF).

## Setor comercial, orçamento e segurança do site (07/10 a 24/10)
- **Proposta em PDF** (`#/propostas/<id>`): formato padrão igual ao Zoho Books (Nº, item e descrição, quantidade com unidade, valor unitário, desconto quando houver, total); o "global" (sem preço por item, totais de mão de obra e materiais) virou opção.
- **Cadastro pendente** (Catálogo → Cadastro pendente, `#/produtos/pendentes`): produto que entra em orçamento sem cadastro no catálogo do VEOS vira pendência (linha digitada sem item no Zoho ou item do Zoho sem produto do VEOS), contando desde 06/10/2026; cadastrar (PRD-xxxx sem custo/preço), ligar a produto existente ou dispensar com motivo; alerta FLX_CADASTRO_PENDENTE para Operações. Itens antigos ficam para a mesclagem do fim (BIB-0077).
- **Setor comercial** (`#/comercial`, item "Setor comercial" no menu): abas Visão (base real do Zoho), Implantação (29 itens com evidência e histórico; decisões só a direção marca), Canais (14 canais com dono, oferta, medição, o que a IA faz, ferramenta gratuita e cuidado legal), Follow-up, Metas e donos, Base de clientes (segmento automático, código do cliente) e Plano e roteiros.
- **Cadências de follow-up** (lead novo, proposta enviada, parceiro em prospecção, reativação, pós-venda): cada toque vira tarefa e rascunho na Caixa de saída; envio sempre humano; só registros de pessoas reais desde 07/10; contato bloqueado não recebe rascunho; mudou de etapa, toques pendentes cancelados. Motor: `_shared/comercial_vigia.ts` (ao salvar o registro, na varredura do Radar e na função saude).
- **CSO e CMO com ferramentas de dados**: base_comercial, funil_comercial, canais_e_cadencias, implantacao_comercial, metas_comerciais e funil_reverso (clientes só pelo código). Teste real em 24/10: o CSO respondeu pela Mistral em 10 s com ticket real e atividade semanal calculada pelo VEOS.
- **Motores**: Mistral primeiro desde 24/10 (5 de 5 respostas; Gemini 3.8 gratuito respondeu 2 de 23), BIB-0110.
- **Base real (Zoho, 24/10)**: 173 orçamentos, 71 clientes, 52 ganhos, 38 perdidos, 83 sem decisão; ainda nenhum lead real no CRM do VEOS.
- **Incidente (BIB-0104)**: o site público expunha uma chave da API da Anthropic, a senha da área "Equipe Interna" e dados internos. Removidos do código (repositório privado do site), mas a Netlify não republicou: em 24/10 o site no ar ainda mostra a chave. Falta o Fernando revogar a chave, trocar a senha e republicar.
- Biblioteca: BIB-0101 a BIB-0110 (pesquisas, base real, incidente, propostas RT × CAU, donos das metas, regras de prospecção, ideia do site, CRM em produção, ordem dos motores).
- Testes: regras 132, portal 155 + 20, telas 130 + pendências, banco cadastro_pendente 12/12 e comercial 9/9, motor das cadências 4.

## Aba provisória "Pendências do projeto" (24/10)
- Primeiro item do menu Comando (`#/pendencias`, só direção): visão geral com linha de fluxo (CFO → CSO → CMO → COO → CIO → CXO → CHRO → SEC → CEO), uma aba por diretor e "Quem precisa agir" (Fernando, contador, jurídico, Claude). Cada tópico traz estado, quem faz, quando, o que fazer em ordem e o critério de pronto, com a fonte.
- Só pendência do projeto (construir/validar o VEOS), nunca rotina da empresa. Dados em `apps/web/js/data/pendencias_projeto.js` (atualizar o estado do tópico e publicar). **Remover a aba quando o projeto fechar** (CEO-06).

**Resumo:** o VEOS está online (GitHub Pages + Supabase) com setores vivos, Zoho espelhado e editável, fluxo de pedidos, Biblioteca, e — desde 05/10 — **motor de raciocínio dos diretores** (Gemini/OpenAI no servidor, com ferramentas do VEOS) e o **financeiro completo pelo caixa real** (extrato, conciliação, recorrentes, 13 semanas, DRE, indicadores e vigia). Falta o uso real: a chave do Gemini, o extrato das contas e as alíquotas do contador. **Não está 100%** (ver PLANO_EXECUCAO, etapa do financeiro).

## Vários motores de IA e "cobrado × o que deveria" (07/10)
- Pedido do Fernando: instalar um OpenDots para complementar o Gemini. Avaliação (BIB-0097): OpenDots não é um modelo de IA, é um espaço de agentes que precisa de modelo e servidor sempre ligado — não resolve a cota do Gemini e duplicaria o VEOS.
- O motor do VEOS agora aceita qualquer provedor compatível com a API da OpenAI: Gemini → Mistral → OpenRouter → Groq → NVIDIA → OpenAI → fila do Claude Code. Cada um entra com a chave nos segredos (MISTRAL_API_KEY, OPENROUTER_API_KEY + OPENROUTER_MODELOS, GROQ_API_KEY, NVIDIA_API_KEY + NVIDIA_MODELOS, OPENAI_API_KEY). A tela de perguntas mostra quais estão ligados e o que falta.
- Diagnóstico dos orçamentos: cada cartão tem **Cobrado × o que deveria, item a item** (preço pela Política, meta 35% e mínimo 30%, total corrigido), botão para perguntar ao CFO sobre o orçamento, seletor com todos os orçamentos e link da Base de preços para o cartão (`#/cfo/diagnostico?orc=EST-...`). O CFO usa a mesma conta (`domain/correcao_orcamento.js`).
- Testes: domínio 119, ia 18, telas do Diagnóstico e de perguntas, online IA 4.
- Motores ligados no servidor: Gemini → Mistral (Ministral 14B/8B; treino desligado) → OpenRouter (só modelos `:free`; conta sem créditos, pago responde 402) → Groq (só perguntas curtas) → fila do Claude Code. Regra do Fernando: tudo 100% gratuito e sem cartão; modelo local só em último caso.
- Provedor instável não segura mais a pergunta (40 s em falhas ou 3 falhas → próximo). Teste online: Gemini travou e a Mistral respondeu em 7–12 s. OpenRouter: erro do provedor de origem que vem com HTTP 200 passa a ser tratado como sobrecarga. Testes ia 23.

## Motor ligado e respostas do fundador aplicadas (06/10)
- **Motor de IA ligado** (chave gratuita do Gemini nos segredos). Testado com a pergunta real do 969: o CFO identifica que não existe, analisa o EST-000966 como hipótese, aponta os erros, recalcula pela Política e lê as horas corretamente (com produtividade realista). Nível gratuito: sobrecarga (503) e cota diária (429) frequentes → o motor troca de modelo levando os dados já levantados e a função ia-fila tenta de novo a cada 5 min (até 5 vezes); sem sucesso, a pergunta fica para o Claude Code.
- A nova tentativa automática respondeu uma pergunta do Fernando de 03/10 que estava esquecida na fila.
- **Alíquotas adotadas** (BIB-0094): Simples calculado pelo VEOS, rotulado ADOTADA nas telas e no CFO.
- **Início do controle em 06/10/2026** (BIB-0095): o vigia de orçamento aceito sem pedido só olha a partir daí; **Base de preços** no Diagnóstico e ferramenta qualidade_dos_orcamentos analisam todos os orçamentos (rascunhos, enviados e aceitos; versões contam uma vez).
- **RT 10% / comissão 5% na assinatura** (BIB-0096): campos no pedido (padrão do Formulário), quadro RT e comissão na tela do pedido, contas a pagar automáticas quando a entrada é recebida (assinatura, a cada parcela ou no fim), sinal sugerido cobre material + RT/comissão (texto ao cliente sem custos internos). Banco pedido_rt.sql 9/9.
- Formulário do CFO: novas versões de Impostos (adota a simulação) e Vendas (canais Com RT (padrão) e Com RT + comissão/indicação; quando pagar).
- Testes: domínio 117; banco caixa 25, RT 9, motor 12, formulário 6, fluxo 17, compras 16, obra 11, margem 5, avisos 8, painel 8; online api 15, financeiro 12, sistema 56, caixa 10, IA 4 (com chave real).

## Motor de raciocínio dos diretores (05/10)
Pedido do Fernando: colocar motores de raciocínio (ChatGPT e Gemini) nos diretores.
- `_shared/ia/`: provedores (Gemini `generateContent` com functionDeclarations; OpenAI Chat Completions com tools), troca de modelo por cota/sobrecarga e de provedor por chave inválida; sem provedor ou com falha, a pergunta volta para a fila do Claude Code com o motivo.
- 21 ferramentas (o modelo não calcula): manual e procedimento, precedentes (consulta registrada), registro da Biblioteca, texto integral da Política V1/V1.1 (`documentos_canonicos`, só no banco), Plano da VOICE; CFO: parâmetros, busca/análise/correção de orçamento, preço e margem pela Política, diagnóstico, previsão de caixa, painel, custo real do produto, pedidos e recebíveis, caixa e contas, fluxo de 13 semanas, fechamento do mês, indicadores.
- As ferramentas usam os **mesmos módulos de cálculo das telas** (o gerador copia `apps/web/js/domain` e os manuais para `_shared`; `--verificar` garante que estão em dia).
- Pergunta enviada → análise em segundo plano; trilha append-only `ia_execucoes`; reserva única por pergunta; conferência automática dos valores em reais; Markdown limpo; clientes só pelo código (minimização).
- Situação: **sem chave configurada** (nada a pagar). Gemini gratuito: o Google pode usar o conteúdo para melhorar os produtos dele (aviso na tela). OpenAI exige API paga (BIB-0092). Propostas BIB-0091 e BIB-0092.
- Testes: `tests/ia` (provedores 7, textos 5, coerência 3), banco `ia_motor.sql` 12/12, tela `diretores`, online `e2e_ia` (com chave: ciclo completo; no CI só a situação dos motores).

## Financeiro completo pelo caixa real (05/10)
- **Caixa e extrato** (`#/cfo/caixa`): contas da empresa, extrato OFX/CSV lido no navegador (codificação, colunas, "SALDO DO DIA", lançamentos iguais no mesmo dia), sem duplicar ao reimportar; saldo pela âncora (saldo do OFX ou informado); classificação pelo **plano de contas gerencial sugerido** (proposta PL-049, editável) com regras aprendidas; conciliação com parcela (recebe), conta a pagar (paga) e transferência; sugestões únicas em um clique.
- **Contas fixas e dívidas** (`#/cfo/recorrentes`): recorrentes geram contas a pagar ~100 dias à frente (pg_cron diário); "Trazer do Formulário do CFO".
- **Fluxo de 13 semanas** (`#/cfo/fluxo`), **Fechamento do mês** (`#/cfo/fechamento`, DRE pelo caixa) e **Indicadores da Política** (`#/cfo/indicadores`, sec.13 + reserva sec.12).
- **Vigia do caixa** (CAIXA_*): caixa negativo em 4 semanas, abaixo da reserva, extrato desatualizado, sem categoria, nenhuma conta (ativo hoje: CAIXA_SEM_CONTAS).
- Domínio: `extrato.js`, `caixa13.js`, `dre.js`, `indicadores.js`. API `/caixa` + `_shared/caixa_dados.ts` (compartilhado com o motor).
- Testes: banco `caixa_real.sql` 25/25; domínio extrato 8 + caixa 7; telas `caixa` 12/12; online `e2e_caixa` 9/9; regressão online api 15, financeiro 12, sistema 56, setores 9.
- Dados reais: 0 contas bancárias, 0 pedidos, 0 contas a pagar (o fluxo está pronto, falta o uso).

## Painel do dono, plano comercial, canais de venda e condição automática (02/10, madrugada)
Pedido do Fernando, a partir das respostas dele: explicar e simular o ponto de equilíbrio, criar o plano de captação de clientes, tratar o showroom, canais de venda selecionáveis, unir orçamentos, valor fechado, dólar do AliExpress, e uma interface fácil com painéis e perguntas aos diretores.

**Painel do dono** (`#/painel-dono`, direção e financeiro):
- ponto de equilíbrio financeiro com o passo a passo (saídas do mês ÷ margem por real vendido, por canal);
- vendido no mês contra a meta;
- simulação de duas obras-modelo, com itens de referência dos orçamentos, preço da Política e horas pela composição;
- metas aprovadas ou propostas;
- gráficos de contatos (CRM) e orçamentos por mês;
- resumo do Plano e checklist "o que falta", com link para a seção do formulário;
- botões para perguntar ao CFO, CSO, CMO e COO.

**Plano comercial** (`#/comercial`): funil "da meta à semana" com taxas editáveis, canais, roteiros de abordagem, calculadora de showroom (próprio e parceiro) e agenda de eventos.

**Domínio:**
- `domain/equilibrio.js`: saídas, margem por real, ponto de equilíbrio, mix praticado, itens de referência, simulação de obra, funil, showroom e checklist;
- `domain/condicao.js`: condição de pagamento sugerida (sinal que cobre o material, etapas, validade e dólar de referência, sem cláusula cambial).

**Formulário v3:**
- produtividade calculada pelo "dia de obra" (jornada, deslocamento, preparação, espera, retrabalho);
- canais de venda (com RT/indicação, direto, turn key);
- valor fechado nos tempos;
- folga do dólar do AliExpress;
- seção 10 com as metas aprovadas pelo fundador (migração `20261002140000`).

**Negociação ao Vivo:**
- soma vários orçamentos (projeto pedido em partes);
- o canal de venda lança comissão e RT;
- botão "Condição sugerida pelo CFO".

**Proposta:**
- formato global por grupos (CDC art. 40) ou detalhado;
- condição e validade sugeridas;
- dólar PTAX de referência.

**Preço dos produtos:**
- seletor de canal;
- custo atualizado pela variação da PTAX desde a data da compra, todo dia (`GET /cfo/cambio?desde=`).

**API:** `GET /cfo/painel` devolve só contagens do CRM por mês, sem dados pessoais.

**Plano da VOICE:** 10 itens revisados (com histórico) e 16 novos (comercial, financeiro e decisões). As respostas do CFO, do CSO com o CMO e do COO estão em "Perguntar aos diretores". Números da empresa só no banco.

**Biblioteca:**
- BIB-0088: gestão financeira, CDC e câmbio;
- BIB-0089: geração de contatos e showroom;
- BIB-0090: proposta dos canais e da condição automática.

**Testes:**
- domínio e regras: 83 (incluindo `tests/web/equilibrio.test.mjs`);
- telas: 102/102, com os novos `painel_dono`, `comercial` e `negociacao`;
- online: e2e_sistema 56/56.

**Atenção para o fim do projeto:** no plano gratuito do GitHub, o GitHub Pages só publica a partir de repositório público. Deixar o repositório privado exige GitHub Pro (pago) ou outra hospedagem. É decisão do fundador (PL "Repositório privado × site no ar").

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

**Achados:** os números da empresa (horas, margem, ponto de equilíbrio, funil) ficam só no banco: resposta do CFO em "Perguntar aos diretores", Plano da VOICE e BIB-0086/0087. Nunca no repositório público.

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

