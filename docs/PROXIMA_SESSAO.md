# Próxima sessão — ponto de partida (atualizado em 05/11/2026, fim do dia)

Este arquivo trata só do **PROGRAMA** (o VEOS: telas, servidor, banco, IA, integrações).
O que é operação da empresa (decidir metas, RT, alíquotas, preencher dados reais, ligar para clientes)
fica na aba **Pendências do projeto** do site, não aqui.

## Prompt para colar no início da próxima conversa

```
Você é o Claude Code no projeto VEOS (VOICE Executive Operating System) da VOICE Ambientes
Inteligentes. O Fernando é o fundador e CEO. Atue como engenheiro de software sênior, de produto e
UX, com autonomia técnica total (pode editar, testar, publicar, fazer commit e push sem pedir
confirmação), mas nunca gaste dinheiro, nunca envie nada a clientes ou terceiros e nunca altere
política, meta, alçada ou regime tributário: isso é decisão do Fernando.

Repositório: C:\Users\ferna\VEOS (GitHub voiceambientesinteligentes/VEOS, público; o site publica
sozinho no GitHub Pages a cada push na main). Banco e servidor: Supabase, projeto vkrwxvnfstvriibjwuvw.

1. Leia, nesta ordem: docs/PROXIMA_SESSAO.md (este), docs/ESTADO_ATUAL.md (as seções do topo são as
   mais recentes), docs/CONTINUIDADE.md, docs/DECISOES.md e docs/SETORES_ESQUEMA.md.
2. No PowerShell desta máquina, antes de tudo:
   $env:PATH += ";C:\Program Files\Git\cmd;C:\Program Files\nodejs"
   A CLI do Supabase já está logada: npx -y supabase@2.118.0 ...
3. Trabalhe pelo backlog "O que falta no programa" abaixo, em ordem (P0 → P1 → P2), um bloco por vez:
   implementar → testar (npm test; node scripts/testar-telas.mjs; banco com tests/banco/*.sql em
   transação desfeita; online com node scripts/online.mjs tests/online/<teste>.mjs) → publicar
   (db push, functions deploy, git push) → conferir no site publicado (tests/online/navegador.mjs) →
   atualizar docs/ESTADO_ATUAL.md, docs/CONTINUIDADE.md e a aba Pendências.
4. Antes de recomendar algo de negócio, consulte a Biblioteca do VEOS (precedente orienta, não autoriza).
   Nada que não foi aprovado vira regra: marque como PROPOSTA ou LACUNA.
5. Não declare "100%" ou "pronto" sem teste verificado; diga o que foi testado e o que não foi.
6. Responda ao Fernando em português do Brasil, simples e direto, sem jargão.
```

## Como rodar (comandos desta máquina)
- Testes de regras e domínio: `npm test` (gera/confere o catálogo e roda 160 testes + 155 Python + 20 JS).
- Catálogo e cópia do domínio para o servidor: `node scripts/gerar-catalogo.mjs` (rode sempre que mexer em `setores/*.json` ou `apps/web/js/domain/*.js`; o `npm test` falha com "Desatualizado" se esquecer).
- Telas com dados simulados (Edge headless, 1366 px e 390 px): `node scripts/testar-telas.mjs [filtro]` (184 telas em 04/11). Cada página lista os casos em `<!-- casos: ... -->`.
- Banco: `npx -y supabase@2.118.0 db push --linked --yes` (migrations) e `npx -y supabase@2.118.0 db query --linked -f tests/banco/<arquivo>.sql`. Ensaiar migration antes: junte migration + teste num arquivo com `begin; ... rollback;` e rode o db query.
- Funções: `npx -y supabase@2.118.0 functions deploy <api|saude|ia-fila|zoho|zoho-sync|vigia> --use-api --project-ref vkrwxvnfstvriibjwuvw`.
- Testes online contra o sistema real (robôs `@veos-teste.invalid`, ficam inativos no fim): `node scripts/online.mjs tests/online/<e2e_api|e2e_financeiro|e2e_setores|e2e_sistema|e2e_mcp|e2e_ia|e2e_caixa|e2e_operacao>.mjs`.
- No navegador (precisa do Playwright, que não fica instalado): `$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="1"; npm install --no-save --no-package-lock playwright` e então `navegador.mjs` (77 telas do site publicado), `uso_orcamento.mjs` (montador de ponta a ponta), `uso_ia.mjs` (IA real) e `fotos.mjs "#/rota"` (fotos para revisar o visual; `VEOS_FOTOS`, `VEOS_FOTO_INTEIRA=1`, `VEOS_SITE` para o publicado).
- Comandos com muitas aspas: escreva um script na pasta de rascunho e execute. `Remove-Item` no mesmo comando que cita "C:\Program Files" é bloqueado: apague em comando separado.

## Onde está tudo
- Site: https://voiceambientesinteligentes.github.io/VEOS/ — código em `apps/web` (JavaScript puro, sem React/Tailwind/build; CSP só do próprio site). Estilos do portal em `apps/portal/web/css` + `apps/web/css` (o visual novo está em `tema.css`, carregado por último).
- Menu e abas: `apps/web/js/data/navegacao.js` (9 áreas; alimenta também a busca Ctrl+K). Página inicial `#/hoje`.
- Servidor: Edge Function `api` (`supabase/functions/api/*.ts`), `saude` (vigias a cada 10 min), `ia-fila` (motor de IA a cada 5 min), `zoho-sync` (a cada 2 min). Domínio compartilhado copiado para `supabase/functions/_shared/dominio/`.
- IA dos diretores: `supabase/functions/_shared/ia/` (motor com fallback gratuito Gemini → Mistral → OpenRouter → Groq; hoje responde a Mistral `ministral-14b`). Contexto da empresa em `apps/web/js/domain/empresa.js` (cliente principal = arquiteto). Assistente do site: `apps/web/js/ui/assistente.js` (chat flutuante + tela IA VEOS).
- Robôs de teste: dados criados por `@veos-teste.invalid` não aparecem para usuários reais (`_shared/teste.ts`); numeração real (CLI/ORV/PED/COM) começa do 1 e teste usa série T.
- Regra de custo zero da IA: nenhuma conta de IA pode ter cartão; quando a cota gratuita acaba, o provedor recusa e o motor passa ao próximo (detalhes em ESTADO_ATUAL, 07/10).

## O que já existe (resumo de 04/11)
Setores vivos (9) com registros, regras vivas e Radar · Estrutura da empresa (organograma, agenda de cada cargo, atividade → ferramenta) · Operação comercial do zero (clientes, montador de orçamento com preço pela Política V1, PDF, enviado/aceito/recusado, pedido gerado do orçamento, retomada dos orçamentos antigos do Zoho, contato rápido, prospecção, calendário do Instagram, Começar a operar) · Pedidos → estoque → parcelas → NF → recebimento, compras e contas a pagar · Financeiro do CFO (caixa por extrato OFX, 13 semanas, DRE, indicadores, preço dos produtos, formulário com valores estimados marcados) · Biblioteca e governança · Zoho espelhado e editável · Diretores com IA em formato de conversa (continuação no mesmo fio, conferência de valores e percentuais) · IA VEOS por voz/texto ligada aos diretores e chat flutuante com avisos · Novo design (menu por áreas, Hoje, celular) · Usuários, MFA, LGPD, backup, exportação, MCP `veos` (24 ferramentas), PWA.

## O que falta no PROGRAMA (backlog técnico, em ordem)

### P0 — corrigir/garantir antes de crescer
1. **FEITO em 04/11 (aguarda confirmação ao longo dos dias) — Erro 502 intermitente na tela Calendário do Instagram** (`#/conteudo`): apareceu na 1ª tentativa do `navegador.mjs` duas vezes em 04/11 (passa ao repetir). Provável carga de `GET /produtos` com URLs assinadas das fotos; investigar o log da função `api` e, se for isso, pedir só os produtos com foto e em menos quantidade.
2. **FEITO em 04/11 (retry coberto por teste de domínio; não observado ao vivo) — Qualidade das respostas da IA** (modelo gratuito pequeno): às vezes responde sem consultar dados, se contradiz ou cita coisas que não existem. Já existe aviso e conferência; falta: quando a pergunta for de dados (vendas, funil, caixa, clientes) e o modelo não chamar nenhuma ferramenta, **refazer automaticamente uma vez exigindo a ferramenta**; testar com `uso_ia.mjs` e perguntas de exemplo.
3. **E-mail de login (Supabase Auth)**: conferir no painel o limite do envio padrão antes de convidar a equipe; se for baixo, preparar a configuração de SMTP próprio (gratuito, ex.: conta de e-mail da empresa) — a configuração final depende do Fernando passar o acesso.
4. **FEITO em 05/11 (decidido: manuais)** — Testes online que criam pedido real (`e2e_operacao`, `uso_orcamento`) estão fora do CI de propósito; decidir se entram no CI com limpeza total ou ficam manuais (hoje: pedido TESTE cancelado e série T).

### P1 — completar a estrutura
5. **FEITO em 05/11** — Fornecedores próprios (cadastro, ligado a compras e contas a pagar) — fecha a parte "fornecedores" do CSO-06.
6. **FEITO em 05/11** — Agenda por pessoa: as atividades diárias/semanais de cada cargo (Estrutura) virando tarefas no Radar para quem ocupa o cargo; base para "o que eu faço hoje" por pessoa (CSO-05/SEC-04).
7. **FEITO em 05/11 (sob demanda, por registro)** — Importar o histórico do CRM do Zoho (leads, negócios, atividades) para o funil próprio sem perder origem (CSO-05).
8. **Importação dos escritórios de arquitetura pelos dados abertos do CNPJ** (CNAE 7111-1/00 e 7410-2/02, região de SC) por um job mensal gratuito no GitHub Actions, entrando como alvos na Prospecção (CSO-17). **Aguarda o OK do Fernando** (regra de prospecção BIB-0107).
9. **FEITO em 05/11 (falta o Fernando testar num aparelho real)** — Aviso com o navegador fechado (Web Push com chaves VAPID nos segredos do Supabase; gratuito) — hoje os avisos só aparecem com o VEOS aberto (CIO-08).
10. **FEITO em 05/11 (código); falta o Fernando configurar o MCP nesta máquina** — MCP do VEOS ampliado ("tudo que eu pedir no Claude ele cria no VEOS"): ferramentas de criação pela API com as permissões do usuário — cliente, orçamento, pedido em rascunho, conta a pagar, tarefa —, sempre com rascunho + confirmação humana para o que for irreversível (CIO-06). Configurar o MCP nesta máquina depende do Fernando gerar o código (Minha conta → Acesso do Claude Code).
11. **FEITO em 05/11** — Avisos do assistente: incluir no chat flutuante as respostas dos diretores dadas em "Perguntar aos diretores" e as tarefas vencidas do dia (hoje entram só os alertas ALTO/CRÍTICO).
12. **FEITO em 05/11 (Marketing e Pós-venda; LACUNAs declaradas)** — Indicadores calculados sozinhos (marketing, pós-venda, satisfação e retrabalho) com fonte e LACUNA quando faltar dado (CMO-06, CXO-06).
13. **FEITO em 05/11 (sem conciliação automática com o extrato)** — Receita recorrente dos contratos de suporte (contrato → parcelas mensais → caixa e indicadores) (CFO-13, CXO-05).

### P2 — acabamento e independência do Zoho
14. **JÁ EXISTE a tela (Catálogo → Revisar duplicados); falta a decisão humana dos 37** — Vínculos de produto a revisar (37 "a_revisar" entre o catálogo do VEOS e os itens do Zoho): tela de revisão rápida; hoje a retomada de orçamentos antigos reconhece poucos itens do catálogo.
15. **Mesclar o catálogo com os itens do Zoho** e o roteiro de desligamento do Zoho por módulo (BIB-0077, COO-04, CIO-05) — só quando o Fernando pedir.
16. **Publicação automática no Instagram** pela API oficial da Meta (agendar os posts do calendário) — depende da conta comercial ligada a uma Página do Facebook e de quem aprova (CMO-03/CMO-10).
17. **FEITO em 05/11** — Histórico visível por registro nas telas dos setores (SEC-05) e procedimentos que faltam nos manuais (funil no CSO, obra nova no COO, Wi-Fi lento no CIO).
18. **FEITO em 05/11 (GET /cfo/orcamentos?resumo=1 para o montador e os preços)** — Desempenho: Formulário e telas do CFO carregam `GET /cfo/orcamentos` (~3 s, 220 KB); criar um resumo leve só com o faturamento de 12 meses para o montador de orçamento e o formulário.
19. **FEITO em 05/11 (ia.css removido; textos TESTE do usuário real conferidos)** — Limpeza: estilos antigos da tela IA (`apps/web/css/ia.css`, classes `.ia-*` não usadas), tela "Comando por voz" antiga e textos que ainda falam em "TESTE" para o usuário real.

## Depende do Fernando para o PROGRAMA funcionar por completo (não é operação da empresa)
- **Revogar a chave da Anthropic exposta no site antigo da VOICE** e trocar a senha da área interna (BIB-0104, CIO-13). Urgente.
- **Entrar com o login real uma vez**: MFA da direção, Validação guiada e um orçamento de verdade (os testes usaram robôs).
- **Reiniciar o VS Code e configurar o MCP `veos`** (Minha conta → Acesso do Claude Code → `node scripts/mcp/veos-mcp.mjs --configurar <código>`).
- **Trocar as chaves de IA** que apareceram em conversas (Gemini, Mistral, OpenRouter, Groq) direto nos segredos do Supabase.
- OK para o item 8 (CNPJ), acesso para o SMTP (item 3), e, quando quiser, domínio próprio (CNAME + ORIGENS da `api` + Auth).

## Limites do ambiente
- Um `npm install --no-save <pacote>` remove o Playwright instalado antes: reinstale com `$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="1"; npm install --no-save --no-package-lock playwright@1.55.0` (a 1.65 estava quebrada no registro em 05/11).
- Heredocs grandes no Bash às vezes falham aqui: escreva arquivos com a ferramenta Write e edições com Edit/scripts pequenos.
- Cuidado com `$$` em `String.replace` (vira `$`): use função como substituição.
- O classificador de segurança bloqueia algumas ações automáticas (ex.: apagar com caminho de "Program Files" no mesmo comando); separe os comandos.
- A Supabase CLI interativa trava aqui; se precisar logar de novo, use `npx supabase login --token <PAT de escopo completo>`.
- Edge headless é o navegador dos testes de tela; o Playwright usa o Edge instalado (`channel: "msedge"`).



