# Decisões

Formato: data · decisão · quem · origem. Propostas ficam separadas até o Fernando confirmar.

## Confirmadas (pelo Fernando)

| Data | Decisão | Origem |
|---|---|---|
| 30/09/2026 | Desenvolvimento centralizado no VS Code + Claude Code. | prompt de transição |
| 30/09/2026 | Obsidian dispensado: deixa de ser dependência. Notas, anexos e histórico são preservados integralmente. A configuração `.obsidian` será arquivada **fora da estrutura ativa** após backup verificado. (Substitui a instrução anterior de mantê-la no lugar.) | mensagem de 30/09 |
| 30/09/2026 | VEOS será usado online no site da VOICE, com domínio conectado na etapa final. | mensagem de 30/09 |
| 30/09/2026 | Hierarquia: VEOS contém o VOICE_360; o VOICE_360 contém os diretores (CMO, CFO…), cada um com personalidade a ser criada. | mensagem de 30/09 |
| 30/09/2026 | "Sistema vivo": ordens/registros que contrariam regra geram aviso automático do diretor responsável (ex.: orçamento com margem que não fecha). | mensagem de 30/09 |
| 30/09/2026 | Repositório GitHub `VEOS` fica **privado** até o final; público só no fim. | mensagem de 30/09 |
| 30/09/2026 | Infraestrutura começa em planos gratuitos; nada pago sem decisão. | Plano Mestre §1 |
| 30/09/2026 | Dados de exemplo sempre marcados TESTE; dados reais numa fase própria. | Plano Mestre §1 |

## Propostas (aguardando confirmação)

| # | Proposta | Recomendação |
|---|---|---|
| P-1 | Hospedagem: Cloudflare (Workers + D1 + R2) × Vercel | **Cloudflare**. Vercel Hobby proíbe uso comercial; Vercel Pro é pago. |
| P-2 | Endereço: subdomínio `veos.<domínio da VOICE>`; o site atual continua na Netlify | subdomínio |
| P-3 | Orçamento mensal para IA no servidor (respostas na voz dos diretores com o PC desligado) | definir um teto; o vigia funciona sem IA |
| P-4 | Item 30: REFERENCIA ou PADRAO | análise da fonte em andamento (etapa E) |
| P-5 | Siglas existentes: CSO = Vendas/Comercial, CIO = Tecnologia e dados. Manter ou renomear? | manter até decisão |
| P-6 | Perfis novos: Pós-venda e Administrativo/Pessoas | criar quando houver regras do setor |

## Registro técnico (decidido pelo Claude, reversível)

| Data | Decisão | Motivo |
|---|---|---|
| 30/09/2026 | O repositório Git é `VOICE_360/VEOS/`, só com código e docs. O acervo e as evidências ficam fora do Git. | o acervo tem políticas, evidências com hash e dados que não devem ir ao GitHub |
| 30/09/2026 | Portal **copiado** (não movido) de `VOICE360-V2/scratch/VEOS-LOCAL/portal` para `VEOS/apps/portal`. A origem continua intacta como histórico. | preservar evidências e caminhos; a cópia foi validada com os mesmos testes |
| 30/09/2026 | Vigia implementado como módulo novo que reutiliza `cfo_controls` sem alterá-lo. | não duplicar regras já testadas |
