# Próxima sessão — ponto de partida (atualizado em 01/10/2026, fim da tarde)

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
Setores vivos (9) e Radar · Negociação ao Vivo e Calculadora · Zoho espelho completo + edição nos dois sentidos · Pedidos → estoque → parcelas → NF manual → recebimento, com vigia FLX_* · Biblioteca e governança (BIB_*) · Contrato em PDF e anexos · **P0 (01/10):** validação guiada, saúde do sistema com vigia SIS_*, usuários e acessos com MFA, exportação CSV, backup semanal criptografado, CI com testes locais, telas simuladas e navegador no site publicado.

## Decisões que dependem do Fernando (registradas na Biblioteca)
Já decididas em 01/10: IA no servidor = teto zero (BIB-0044); Fernando exerce a CEO (BIB-0045); repositório continua público.
1. **Revisar as propostas em consulta** (Biblioteca → Revisões), cada uma com a recomendação do Claude registrada como opinião: BIB-0037 papel do fundador (recomenda aprovar); BIB-0038 base da faixa do Simples (aprovar com ajuste: usar o faturado; validar com o contador); BIB-0039 ticket mínimo R$ 15 mil (não aprovar como bloqueio: contraria BIB-0022); BIB-0040 anexo do Simples (depende do contador); BIB-0042 siglas (manter); **BIB-0046 exigir MFA da direção** (aprovar depois de cadastrar o próprio MFA).
2. Lacunas de alçada: assuntos reservados ao fundador; precedência entre autoridades; quem altera políticas; compras/fornecedores; preços de tabela; contratações; comunicação externa; quem valida ticket < R$ 100 mil; desconto ≤ 2% com MC 30–32%.
3. Cláusulas do contrato aprovadas pelo jurídico (o VEOS não inventa texto jurídico).
4. **Segredos do GitHub** (Settings → Secrets and variables → Actions): `SUPABASE_SERVICE_ROLE_KEY` e `BACKUP_SENHA`. Liberam o backup semanal e os testes online no CI.

## Backlog sugerido (visão de engenharia, produto e UX)

### P0 — fechar a base com segurança
Implementado e testado em 01/10 (ver ESTADO_ATUAL). Falta só o que depende do Fernando:
1. **Validação real guiada**: executar Sistema → Validação guiada logado e registrar (falhas viram incidentes).
2. **E2E no CI**: cadastrar o segredo `SUPABASE_SERVICE_ROLE_KEY`; conferir a primeira execução do job `online`.
3. **Usuários e acessos**: cadastrar o próprio MFA (Minha conta) e decidir BIB-0046; dar acesso às pessoas da equipe.
4. **Backup**: cadastrar `BACKUP_SENHA` e rodar `backup-semanal` manualmente uma vez (Actions → Run workflow); testar a abertura do arquivo.
5. **Saúde do sistema**: acompanhar os alertas SIS_* no Radar (setor Tecnologia).

### P1 — completar o fluxo da empresa (próximo bloco técnico)
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
