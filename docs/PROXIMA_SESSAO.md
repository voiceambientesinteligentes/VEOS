# Próxima sessão — ponto de partida (atualizado em 07/10/2026)

## Prompt para colar no início da próxima conversa

```
Você é o Claude Code no projeto VEOS da VOICE Ambientes Inteligentes (Fernando, fundador).
Atue como especialista sênior em engenharia de software, produto e UX.

1. Leia, nesta ordem: C:\Users\voice\VOICE_360\CLAUDE.md, VEOS/docs/PROXIMA_SESSAO.md,
   VEOS/docs/ESTADO_ATUAL.md, VEOS/docs/DECISOES.md e VEOS/docs/CONTINUIDADE.md.
2. Antes de propor ou executar algo relevante, consulte a Biblioteca do VEOS
   (bib_consultar / POST /api/biblioteca/consultar): decisões vigentes, políticas,
   aprendizados validados e propostas pendentes. Precedente orienta, não autoriza.
3. Confira comigo as decisões pendentes listadas em PROXIMA_SESSAO.md (seção
   "Decisões que dependem do Fernando") antes de mexer nesses assuntos.
4. Siga o backlog em ordem de prioridade (P0 → P1 → P2), um bloco por vez:
   implementar, testar (testes automatizados + banco em transação desfeita + tela
   simulada), publicar, registrar na Biblioteca e atualizar ESTADO_ATUAL.
5. Nunca deduza regime tributário, alçada, meta ou política: pergunte ou marque como
   proposta/hipótese. Não declare "100%" sem teste verificado.
```

## Onde está tudo
- Site: https://voiceambientesinteligentes.github.io/VEOS/ (GitHub Pages, publica a cada push em `main`). A Netlify ficou congelada (créditos esgotados).
- Servidor: Supabase `veos` (ref vkrwxvnfstvriibjwuvw), funções `api`, `saude`, `zoho`, `zoho-sync`, `vigia`; pg_cron chama `zoho-sync` a cada 2 min.
- Repositório público: voiceambientesinteligentes/VEOS. Conteúdo real (Biblioteca, Zoho, pedidos) fica só no banco.

## O que já funciona (resumo)
Setores vivos (9) e Radar · Negociação e Calculadora · Zoho espelho + edição · Pedidos → estoque → parcelas → NF → recebimento · Biblioteca e governança · Contrato e termo de aceite em PDF · **P0** (validação guiada, saúde do sistema, usuários e MFA, exportação, backup criptografado, CI) · **P1** (painel executivo, compras e contas a pagar, previsão de caixa, caixa do pedido V1.1, obra no pedido, margem realizada, proposta em PDF, caixa de saída, resumo do dia, avisos) · **P2** (MCP do VEOS, independência do Zoho, busca Ctrl+K, PWA, registro LGPD).

## Mais motores de IA gratuitos (07/10)
Situação dos segredos no Supabase: GEMINI_API_KEY (ok), MISTRAL_API_KEY (ok desde 07/10: plano gratuito sem cartão, modelos Ministral 14B e 8B; testado com pergunta do tamanho do CFO e ferramentas), GROQ_API_KEY + GROQ_MODELOS (ok, mas o gratuito aguenta só perguntas curtas: ~8 mil tokens por minuto; análise de orçamento passa disso e o motor pula para o próximo), OPENROUTER_MODELOS (pronto; falta OPENROUTER_API_KEY).
1. **Mistral (ligada)**: o plano gratuito ("Uso da API incluso", até US$ 10/mês, sem cartão) só libera os modelos Ministral (`ministral-14b-2512`: 30 chamadas/min); Medium/Small respondem "limite 0" e Large responde "tier not allowed" — pedem plano pago (não ativar sem decisão). **Falta o Fernando**: admin.mistral.ai → Privacidade → desligar "Permita o uso de suas chamadas à API para treinar os modelos" (com a aba visível; o Claude no Chrome não consegue porque a página só monta o interruptor com a aba na frente). Não ligar "modelos Labs" (usa os dados para treino sempre).
2. **OpenRouter**: https://openrouter.ai/keys → Create Key → cadastrar `OPENROUTER_API_KEY` nos segredos (os modelos já estão em OPENROUTER_MODELOS: Nemotron Ultra, Nemotron Super e Gemma 4 31B, gratuitos com ferramentas). Limite: ~50 chamadas/dia sem créditos.
3. Ordem: `IA_ORDEM` (padrão gemini,mistral,openrouter,groq,nvidia,openai).

## Para ligar o que foi feito em 05/10 (ações do Fernando)
1. ~~Chave do Gemini~~ **Feito em 06/10** (a chave apareceu numa imagem da conversa: trocar por uma nova é recomendável). Decidir formalmente BIB-0091 e BIB-0092. Se a cota gratuita não bastar no dia a dia: nível pago do Gemini (GEMINI_PAGO=sim) ou OpenAI — decisão de custo (BIB-0044). Instruções originais: aistudio.google.com → "Get API key" → copiar. No Supabase: Project Settings → Edge Functions → Secrets → `GEMINI_API_KEY` = a chave. Depois: `node scripts/online.mjs tests/online/e2e_ia.mjs` (ciclo completo com IA). Decidir BIB-0091 (Gemini gratuito, dados usados pelo Google) e BIB-0092 (OpenAI paga × teto zero).
2. **Caixa real**: Ferramentas do CFO → Caixa e extrato → cadastrar as contas da empresa → importar o OFX de cada uma (internet banking → exportar extrato → OFX/Money). Classificar os lançamentos (marcar "lembrar").
3. **Contas fixas**: Contas fixas e dívidas → "Trazer do Formulário do CFO" → conferir valores e dias de vencimento.
4. **Contador**: alíquotas reais (2026 e 2027). Até lá vale a ADOTADA (BIB-0094).
5. **Pedidos daqui para frente** (BIB-0095): cada orçamento aceito a partir de 06/10 vira pedido com parcelas; preencher o favorecido da RT no pedido.
6. ~~P-9~~ decidido (BIB-0096).

## Decisões que dependem do Fernando (registradas na Biblioteca)
Já decididas em 01/10: IA no servidor = teto zero (BIB-0044); Fernando exerce a CEO (BIB-0045); repositório continua público.
1. **Revisar as propostas em consulta** (Biblioteca → Revisões), cada uma com a recomendação do Claude registrada como opinião: BIB-0037 papel do fundador (aprovar); BIB-0038 base da faixa do Simples (aprovar com ajuste: usar o faturado; validar com o contador); BIB-0039 ticket mínimo R$ 15 mil (não aprovar como bloqueio: contraria BIB-0022); BIB-0040 anexo do Simples (contador); BIB-0042 siglas (manter); BIB-0046 MFA da direção (aprovar após cadastrar o próprio MFA); BIB-0051 retenção de dados (LGPD, jurídico); BIB-0052 termo de uso interno (jurídico).
2. Lacunas de alçada: assuntos reservados ao fundador; precedência entre autoridades; quem altera políticas; compras/fornecedores; preços de tabela; contratações; comunicação externa (envio automático); quem valida ticket < R$ 100 mil; desconto ≤ 2% com MC 30–32%.
3. Textos jurídicos: cláusulas do contrato e texto do termo de aceite (o VEOS só monta os dados).
4. ~~Segredos do GitHub~~ **Feito em 01/10**: `SUPABASE_SERVICE_ROLE_KEY` e `BACKUP_SENHA` criados; backup manual e testes online no CI executados com sucesso.
5. **Dados reais nos registros dos setores** (hoje só TESTE): liberar quando quiser usar os catálogos dos setores (chamados, contratos de suporte, obras...) com dados reais.
6. NF integrada (custo do emissor) e domínio próprio (comprar/apontar o domínio).

## Primeiros passos com login real (sugestão)
1. Minha conta: cadastrar o app autenticador (MFA) e ligar os avisos do navegador.
2. Sistema → Validação guiada: percorrer os 17 passos e registrar.
3. Biblioteca → Revisões: decidir as propostas acima.
4. Sistema → Usuários: dar acesso à equipe (cada pessoa entra pelo link do e-mail).
5. (Opcional) Minha conta → Acesso do Claude Code: `node scripts/mcp/veos-mcp.mjs --configurar <código>` e o Claude Code passa a ler o VEOS pelo MCP `veos`.

## Para o FINAL do projeto (decidir junto com o Fernando, só quando ele pedir)
- **Mesclar o catálogo do VEOS com os itens do Zoho** — plano completo na Biblioteca **BIB-0077**: revisar duplicados e itens "Conferir", definir preços de venda, enviar/aposentar itens no Zoho, ligar estoque/compras/pedidos ao catálogo do VEOS, importar os demais itens do Zoho e desligar o módulo de itens.

## Motor de IA dos diretores (05/10) — substitui a seção abaixo quando houver chave
- Pergunta no site → motor no servidor (Gemini → OpenAI → fila do Claude Code) com 21 ferramentas do VEOS; sem chave, segue a fila do Claude Code (abaixo).
- Variáveis (segredos do Supabase): `GEMINI_API_KEY`, opcional `GEMINI_MODELOS` (padrão gemini-3.8-flash, 3.5-flash, 3.5-flash-lite, 2.5-flash), `GEMINI_PAGO=sim` se for o nível pago; `OPENAI_API_KEY`, `OPENAI_MODELOS`; `IA_ORDEM` (padrão gemini,openai).
- Políticas no banco: `node scripts/online.mjs scripts/carregar-politicas.mjs` sempre que a Política V1/V1.1 mudar.

## IA dos diretores pela assinatura (01/10, noite)
- Claude Pro/Max e ChatGPT Plus NÃO incluem API (a API é paga à parte). Caminho sem custo implantado: **Perguntar aos diretores** (site) → fila no banco → o Claude Code (plano Max) lê pelo MCP (`veos_perguntas_pendentes`, `veos_manual_diretor`), responde e grava (`veos_responder_pergunta`). Resposta sempre rotulada "IA · opinião, não decisão".
- Para usar: Minha conta → Acesso do Claude Code (uma vez) e, no VS Code, pedir "responda as perguntas pendentes dos diretores".
- Respostas instantâneas no site exigem API paga (decisão de custo: hoje teto zero, BIB-0044).

## Manuais dos diretores (01/10, noite)
- 9 manuais de atuação de nível sênior (`setores/manuais/*.json`, pesquisa com fontes: competências, frameworks, 13 procedimentos por diretor com perguntas/passos/entrega/critérios/quando escalar, indicadores com fórmula, rotinas, armadilhas, aplicação na VOICE, cursos/certificações de referência, bibliografia). Validados pelo gerador de catálogo; carregados sob demanda.
- Onde aparecem: aba **Manual** em cada setor (com "O que você precisa?"), Conselho, tela **IA VEOS** (mostra o procedimento do diretor para o pedido falado/digitado, sem IA paga) e MCP `veos_manual_diretor` para o Claude Code.
- Melhorar depois: procedimentos que faltam (ex.: diagnóstico de Wi-Fi lento no CIO; planejamento de obra nova no COO; funil comercial no CSO).

## Catálogo de produtos (01/10, noite)
- Catálogo próprio no VEOS (Operação → Catálogo de produtos): 139 produtos importados do inventário AliExpress (`scripts/importar_aliexpress.py`, idempotente, preserva decisões manuais), 157 variantes, ficha técnica, 380 compras de origem, fotos no Storage privado. 5 compras pessoais excluídas (histórico preservado); 3 talvez pessoais em "Conferir" (PRD-0005, PRD-0101, PRD-0119).
- Preço de compra = último preço pago (sem frete/impostos); preço de venda = lacuna. Simulador pelo markup do Sebrae (BIB-0074); alçada de preço proposta (BIB-0075).

## Próximo grande bloco (pedido do Fernando em 05/10)
Financeiro completo → **alinhar com o comercial**: orçamento criado e salvo no VEOS (com o canal RT ou RT + comissão; RT/comissão como contas a pagar já feito em 06/10), régua de cobrança (PL-050, proposta), receitas recorrentes de contratos de suporte.

## Backlog sugerido (próximos blocos técnicos)
1. **Catálogo de itens próprio** (maior dependência do Zoho: base de estoque, compras e pedidos) — ver Sistema → Independência do Zoho.
2. **Clientes e fornecedores próprios**, unificando Books e CRM.
3. **Orçamento criado e salvo no VEOS** (a Negociação já calcula) → proposta PDF direto do VEOS.
4. **Funil comercial próprio** (leads e negócios) e agenda de atividades.
5. **Saldo bancário/conciliação** (a previsão de caixa não tem saldo inicial) — via extrato OFX/CSV importado, grátis.
6. **Aviso com a aba fechada** (Web Push com VAPID; gratuito, exige chave nos segredos).
7. Domínio próprio: quando houver o domínio — `CNAME` em `apps/web`, DNS (CNAME para voiceambientesinteligentes.github.io), incluir a origem em `supabase/functions/api/index.ts` (ORIGENS) e na lista de redirecionamento do Auth do Supabase.

## Limites do ambiente (para não perder tempo)
- O classificador bloqueia criar sessão de login de teste e matar processos em massa: teste telas com página local + dados simulados (`dist/_teste/`, servidor `node scripts/serve-web.mjs`, Edge headless na porta 9230) e regras no banco com `tests/banco/*.sql` (transação desfeita).
- No PowerShell do Fernando use `npx.cmd`. Supabase CLI: `npx -y supabase@2.118.0 ...` (já logada).
- Comandos com aspas complexas no terminal: escreva um script em arquivo (scratchpad) e execute.
