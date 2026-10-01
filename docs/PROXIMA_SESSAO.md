# Próxima sessão — ponto de partida (atualizado em 01/10/2026)

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
Setores vivos (9) e Radar · Negociação ao Vivo (regime pela data: Simples até 31/12/2026 com faixa pelos orçamentos aceitos/faturados; depois alíquotas da tela validada) · Calculadora · Zoho espelho completo + edição nos dois sentidos · Pedidos → estoque → parcelas → NF manual → recebimento, com vigia FLX_* · Biblioteca e governança do fundador (BIB_*) · Contrato do pedido em PDF (imprimir) e anexos PDF privados.

## Decisões que dependem do Fernando (registradas na Biblioteca)
1. Aprovar/ajustar as 6 propostas: papel do fundador; base da faixa do Simples; ticket mínimo R$ 15.000; anexo do Simples para serviços (contador); orçamento de IA (P-3); siglas (P-5).
2. Lacunas de alçada: assuntos reservados ao fundador; quem exerce a CEO; precedência entre autoridades; quem altera políticas; compras/fornecedores; preços de tabela; contratações; comunicação externa; quem valida ticket < R$ 100 mil; desconto ≤ 2% com MC 30–32%.
3. Cláusulas do contrato aprovadas pelo jurídico (o VEOS não inventa texto jurídico).
4. Repositório público × privado (GitHub Pages grátis exige repositório público).

## Backlog sugerido (visão de engenharia, produto e UX)

### P0 — fechar a base com segurança
1. **Validação real guiada**: roteiro de teste com o Fernando logado (Zoho editar, pedido completo, Biblioteca, contrato, anexo). Registrar resultado e erros na Biblioteca.
2. **E2E automatizado no CI**: GitHub Actions com usuário TESTE (segredos do repositório), Playwright headless contra o site e a API; o ambiente local bloqueia criar sessão de teste, então o CI é o caminho.
3. **Usuários e acessos pela tela**: convidar membros, papel por setor, desativar; MFA obrigatório para direção; quem exerce a CEO.
4. **Backup e exportação**: dump semanal do banco (Action com segredo, arquivo criptografado) + exportar CSV/Excel de pedidos, parcelas, estoque e Biblioteca.
5. **Saúde do sistema na tela**: última sincronização do Zoho, erros, varreduras, uso dos limites gratuitos (banco 500 MB, chamadas Zoho), com alerta quando falhar.

### P1 — completar o fluxo da empresa
6. **Painel executivo real** (Visão geral): faturamento, margem orçada × realizada, caixa previsto × realizado, funil do CRM, alertas por setor.
7. **Compras e contas a pagar**: pedido de compra a partir da falta de estoque; recebimento de mercadoria → entrada de estoque; contas a pagar na previsão de caixa (entradas − saídas); exposição de caixa V1.1 calculada pelos pedidos (unificar com "Projetos e caixa").
8. **Obra e pós-venda**: tarefas do Zoho Projects ligadas ao pedido (checklist de obra); horas lançadas; termo de aceite; garantia e chamados; contratos de manutenção recorrente.
9. **Margem realizada**: ao concluir o pedido, comparar custo real (compras + horas) com o orçado e gerar aprendizado na Biblioteca.
10. **Proposta comercial em PDF com a identidade da VOICE** (substitui o PDF do Zoho) e envio por rascunho + botão.
11. **Notificações**: caixa de saída de mensagens com aprovação humana (e-mail/WhatsApp), resumo diário por setor, aviso no navegador.

### P2 — inteligência e independência do Zoho
12. **IA dos diretores** (após P-3): respostas e pareceres sugeridos, sempre rotulados como IA, citando registros da Biblioteca e dados; voz na aba IA VEOS; processo das 3 lentes com fontes reais.
13. **MCP do VEOS** para o Claude Code consultar e operar com as mesmas regras e permissões.
14. **Desligamento do Zoho por módulo**: catálogo de itens, clientes, orçamentos e CRM próprios; checklist de migração; leitura final e arquivamento.
15. **Emissão de NF integrada** (depende de serviço e custo: decisão do fundador).
16. **Domínio próprio** (ex.: veos.voiceambientesinteligentes.com) no GitHub Pages.
17. **UX**: busca global (Ctrl+K), PWA instalável no celular, estados vazios com orientação, atalhos, acessibilidade, modo de impressão nas telas principais.
18. **LGPD**: política de retenção dos dados de clientes do espelho, registro de acesso a dados pessoais, termo de uso interno.

## Limites do ambiente (para não perder tempo)
- O classificador bloqueia criar sessão de login de teste e matar processos em massa: teste telas com página local + dados simulados (`dist/_teste/`, servidor `node scripts/serve-web.mjs`, Edge headless na porta 9230) e regras no banco com `tests/banco/*.sql` (transação desfeita).
- No PowerShell do Fernando use `npx.cmd`. Supabase CLI: `npx -y supabase@2.118.0 ...` (já logada).
- Comandos com aspas complexas no terminal: escreva um script em arquivo (scratchpad) e execute.
