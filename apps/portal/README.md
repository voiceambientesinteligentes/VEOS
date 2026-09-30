# VEOS Portal

Portal local da VOICE com salas executivas (CEO, CFO, COO, CIO, CMO, CSO),
Secretaria, sala de reunião mediada, **sala CFO com briefing, controles, indicadores e
decisões sobre dados sintéticos TESTE**, painel de **Integrações Zoho** com estados
verificáveis e **Contexto VOICE_360** (políticas oficiais por hash).

As conversas são respondidas pelo **Claude Code instalado neste computador**,
exibido na interface como **“Claude Code • perfil consultivo”**. Os perfis são
instruções de papel: **não são executivos autônomos**, não executam ações, não
aprovam nada e não acessam Zoho, arquivos ou sistemas.

> **O CFO não está 100% concluído** e o Zoho não está 100% integrado. Ver
> [`CRITERIOS-CONCLUSAO.md`](CRITERIOS-CONCLUSAO.md) — checklist item a item com status
> objetivo e pendências externas.

## Abrir

Dê dois cliques em `ABRIR-PORTAL.cmd`. Ele roda `python run.py`, que sobe o
servidor em `http://127.0.0.1:8877/` e abre o navegador. Feche a janela do
console (ou Ctrl+C) para encerrar.

Requisitos: Python 3.10+ (somente biblioteca padrão). Para as conversas e as
verificações de integração, o Claude Code autenticado com a sua assinatura
(`%USERPROFILE%\.local\bin\claude.exe` ou `VEOS_CLAUDE_BIN`). Sem o Claude Code, o portal
abre normalmente, o estado mostra “Claude Code não encontrado”, **nenhuma resposta é gerada**
e as verificações de integração terminam como **erro** (nunca como zero).

## Arquitetura

```
portal/
├─ ABRIR-PORTAL.cmd, run.py        inicialização
├─ veosportal/                     backend (Python stdlib)
│  ├─ config.py                    endereço fixo 127.0.0.1:8877, limites, caminhos
│  ├─ http_app.py                  rotas JSON, lista fixa de estáticos, Host/Origin/CSRF, CSP
│  ├─ store.py                     SQLite em runtime/ (mensagens, jobs, reuniões, rascunhos,
│  │                               verificações de integração, decisões append-only)
│  ├─ provider.py                  Claude Code -p, sem ferramentas, stdin, timeout
│  ├─ rooms.py                     perfis consultivos, regras comuns e roteamento transparente
│  ├─ orchestration.py             jobs assíncronos: conversa, Secretaria, reunião (+ contexto CFO)
│  ├─ cfo_bridge.py                carrega o motor CFO existente (somente leitura)
│  ├─ cfo_sim.py                   simulação Decimal com parâmetros editáveis
│  ├─ cfo_controls.py              NOVO: ticket, desconto/alçada, cobertura por fase, reserva
│  ├─ cfo_indicadores.py           NOVO: 15 indicadores V1 §13, comparação, briefing
│  ├─ cfo_service.py               NOVO: base TESTE, metodologias em rascunho, snapshots
│  ├─ cfo_context.py               NOVO: contexto calculado injetado no perfil CFO
│  ├─ ledger.py                    NOVO: decisões locais append-only, cadeia SHA-256
│  ├─ integrations.py              NOVO: catálogo Zoho MCP, healthcheck, probes somente leitura
│  └─ voice360.py                  NOVO: lista fixa de políticas oficiais (hash/status)
├─ web/                            frontend vanilla, sem dependências
│  ├─ index.html                   estrutura (sem script/estilo inline)
│  ├─ css/                         camadas @layer: tokens → base → layout → components → views → motion
│  └─ js/
│     ├─ data/api.js               única camada HTTP (CSRF nas escritas)
│     ├─ domain/                   regras puras: formatação, parâmetros, gráfico, salas, controles
│     ├─ service/                  estado e acompanhamento de jobs
│     └─ ui/                       DOM (só textContent), shell, chat, gráfico, telas
├─ engine/                         motor CFO portátil + fixtures sintéticas TESTE
└─ tests/                          unittest (Python) + node:test (JS, sem DOM)
```

### Rotas

| Método | Rota | Uso |
|---|---|---|
| GET | `/api/session` | token CSRF da execução |
| GET | `/api/status` | estado real: provedor, fila, motor CFO, base de controles |
| GET | `/api/rooms`, `/api/rooms/<sala>/messages?after=` | histórico por sala |
| POST | `/api/rooms/<executivo>/messages` | conversa individual → job |
| GET | `/api/route?text=` | prévia do encaminhamento da Secretaria |
| POST | `/api/secretaria` | `{text, target, mode}` → job |
| GET/POST | `/api/meetings` | lista / abre reunião `{topic, participants[≤3]}` → job |
| GET | `/api/jobs/<id>` | estado e etapas do job (conversas e verificações) |
| GET | `/api/cfo/analysis?as_of=&atraso=&propostas=` | análise TESTE do motor + simulação |
| GET/PUT/DELETE | `/api/settings` | rascunho de parâmetros percentuais (simulação) |
| GET | `/api/cfo/briefing?periodo=` | briefing TESTE: status, #1 prioridade, TL;DR, riscos, lacunas, apêndice |
| GET | `/api/cfo/indicadores?periodo=` | 15 indicadores com metodologia, fonte, data, status e comparação |
| GET | `/api/cfo/formularios` | períodos, projetos, recebimentos efetivos, exemplo de fases |
| POST | `/api/cfo/controles/<ticket\|desconto\|fases\|reserva>` | `{entrada}` → cálculo puro (nada é gravado) |
| GET/PUT/DELETE | `/api/cfo/metodologias` | metodologias não definidas pela política (RASCUNHO NÃO OFICIAL) |
| GET/POST | `/api/cfo/decisoes` | registro local + verificação de integridade / nova entrada (confirmação explícita) |
| GET | `/api/integracoes` | catálogo, estados por app, progresso por contagens, evidências sanitizadas |
| POST | `/api/integracoes/health` | job: `claude mcp list` |
| POST | `/api/integracoes/probe` | `{probe: books\|crm\|projects}` → job de leitura de verificação |
| GET | `/api/voice360` | políticas oficiais (hash/status) ou resumo não canônico + consolidação em rascunho |

## Segurança

- Escuta **somente** em `127.0.0.1:8877` (não configurável); segunda instância falha em vez de dividir a porta.
- `Host` precisa ser `127.0.0.1:8877` ou `localhost:8877` (bloqueia DNS rebinding).
- Escritas exigem `Origin` local, `Content-Type: application/json`, token `X-VEOS-CSRF` desta execução e recusam `Sec-Fetch-Site: cross-site`.
- Estáticos saem de uma **lista fixa** (`STATIC` em `http_app.py`); nenhum caminho do disco é derivado da URL.
- CSP `default-src 'none'`, sem script/estilo inline; `nosniff`, `no-referrer`, `frame-ancestors 'none'`.
- Frontend nunca usa `innerHTML`: todo texto (inclusive respostas do modelo) entra por `textContent`.
- Corpo limitado a 64 KB; mensagem limitada a 4.000 caracteres.

## Provedor (Claude Code) nas conversas

Cada chamada executa, **sem shell**, com a pergunta enviada por **stdin**:

```
claude -p --strict-mcp-config --disable-slash-commands --no-session-persistence
       --settings {"disableAllHooks":true} --output-format json
       --permission-mode dontAsk --permission-prompts none
       --tools "" --disallowedTools mcp__* Bash PowerShell Read Write Edit …
       --append-system-prompt <perfil>
```

- Falha (ausente, timeout, envelope com erro, saída inválida) → nota de sistema “sem resposta” + job `failed`. Nada é inventado.
- **Contexto CFO calculado pela aplicação** (`cfo_context.py`): quando o CFO responde — na sala
  CFO, em pergunta encaminhada pela Secretaria ao CFO e na fala do CFO em reunião — o prompt
  recebe, como dado (não instrução), o briefing e os 15 indicadores TESTE, as regras VOICE
  (políticas oficiais por hash ou resumo portátil NÃO CANÔNICO) e o estado das integrações.
  O provedor continua **sem ferramentas**; nenhum `CLAUDE.md` ou memória é anexado por aqui.
  As demais salas e seus históricos não mudam.
- `COMMON_RULES` distingue **acesso conectado** de **registros validados** e proíbe usar dados
  do Zoho em indicador ou diagnóstico (o usuário declarou os dados atuais do Zoho incorretos).

## CFO

### Motor original (inalterado)

`engine/cfo.py` é cópia idêntica do motor e `engine/fixtures/cfo-demo.json` a base fictícia
original (ambos inalterados). A aba **Painel TESTE** mostra caixa 30/60/90, margem, exposição,
aging e recomendações do motor, com os parâmetros percentuais em rascunho ao lado.

### Camada de controles (nova, Decimal)

Base própria **somente TESTE**: `engine/fixtures/cfo-controles-TESTE.json` (2 meses, custo fixo
mensal com mês ausente, projeto sem Valor do Contrato, exposição exatamente 10%, recebimentos
parciais, a receber vencido e a vencer).

| Controle | Regra (fonte) | Convenções declaradas |
|---|---|---|
| Ticket | R$ 100.000 é **desejado**, não bloqueio; abaixo exige justificativa registrada; exceção **não reduz** margem (V1 §2/§3) | “margem superior à meta” exige MC informada > 35% |
| Desconto | recalcula RL e MC com provisão de 2% **uma vez**; ≤ 2% autonomia só com MC ≥ 32%; > 2% até 5% direção; MC < 30% direção; > 5% excepcional com análise integral; MC < 25% extraordinária (V1 §3/§8/§9) | **MC 30–31,99% com desconto ≤ 2%: NÃO RESOLVIDO** (fonte não define); % = desconto / valor bruto (CONVENÇÃO DE SIMULAÇÃO); imposto pós-desconto é entrada explícita |
| Cobertura por fase | recebido **efetivo** cobre custos + encargos da fase antes de aquisição relevante (V1 §10) | alocação explícita; recebimento pode ser dividido, nunca reutilizado acima do valor; a receber não conta; estado atual × proposta **sem aprovar compra**; 50/40/10 editável por cenário |
| Reserva | meta ≥ 3 meses de custos fixos médios; a receber não substitui (V1 §12) | janela e método (média/mediana) **RASCUNHO NÃO OFICIAL**; só meses completos; histórico ausente = desconhecido; caixa restrito separado e fora |
| Indicadores (15) | V1 §13 | origem por indicador (POLÍTICA / CONVENÇÃO / RASCUNHO); `null` com lacuna para denominador zero ou dado ausente; comparação com o mês anterior (Δ R$, variação sobre \|anterior\|, p.p. para margens); sem baseline = indisponível |

Metodologias ambíguas ficam em `/api/cfo/metodologias` como **RASCUNHO NÃO OFICIAL**
(janela/método da reserva, atraso mínimo e denominador da inadimplência, ponderação do PMR).

### Briefing (topo da sala CFO)

Estrutura do skill oficial *business-pulse* (ver [`SKILLS-REUSE.md`](SKILLS-REUSE.md)):
status geral, **#1 prioridade** calculada com evidência (valor, fonte, data, origem),
TL;DR com números e deltas, riscos com próximo passo, reserva, lacunas e apêndice com fontes e
limiares. Badge TESTE uma vez por tela; metodologia recolhida em “Metodologia”.

### Decisões locais auditáveis

`ledger.py` (padrão de `../tools/decisoes_v2.py`, que não foi alterado): SQLite append-only com
triggers que recusam UPDATE/DELETE, transação `BEGIN IMMEDIATE`, cadeia `prev`/`hash` SHA-256,
**snapshot calculado pelo servidor** guardado com o próprio SHA-256 e verificação integral antes
de cada gravação (registro adulterado bloqueia novas gravações). Estados: **proposto**,
**registrado pelo usuário**, **rejeitado**, com motivo, autor declarado e dependências. Toda
gravação exige confirmação explícita na interface; nada é gravado automaticamente. Autoria é
**declarada, não autenticada** (aplicação local no PC). Nenhuma transferência, fatura, e-mail ou
pagamento.

## Integrações Zoho

- Catálogo oficial (`https://www.zoho.com/mcp/services/zoho-services.html`, consultado em
  28/09/2026): **59 serviços** + Voice e Campaigns *upcoming*. Estar no catálogo **não**
  significa contratado nem conectado.
- Estados separados por app: **oferta** · **conta** (não verificada; “acesso de leitura
  demonstrado” só após leitura OK) · **servidor** (do último healthcheck) · **leitura** (probe) ·
  **dados** (sempre não confiáveis) · **ação** (exige aprovação; nenhuma escrita).
  Nenhum estado é fixo no código.
- **Healthcheck**: job assíncrono que executa `claude mcp list` sem shell, com timeout
  (`VEOS_MCP_HEALTH_TIMEOUT`, padrão 60 s). Guarda apenas nome do servidor Zoho e estado
  normalizado; endpoint, comando, token e saída bruta são descartados.
- **Probes somente leitura** (um de três, escolhidos por id fixo; sem prompt livre):
  `mcp__claude_ai_Zoho_Books__list_organizations`, `mcp__claude_ai_Zoho_CRM__getFields`
  (somente módulo Deals) e `mcp__claude_ai_Zoho_Projects__get_portals`. Comando:
  ```
  claude -p --output-format stream-json --verbose --permission-mode dontAsk
         --permission-prompts none --setting-sources "" --settings {"disableAllHooks":true}
         --disable-slash-commands --no-session-persistence --tools ToolSearch
         --allowedTools ToolSearch <operação exata>
         --disallowedTools Bash PowerShell Read Write Edit … Skill Agent Task WebFetch WebSearch
                           mcp__*__create* mcp__*__update* mcp__*__delete* mcp__*__add* mcp__*__send* …
  ```
  A saída é validada: exige `tool_use` da operação **e** `tool_result` correspondente sem erro;
  texto narrativo do modelo não conta; qualquer outra ferramenta invalida. Persistem apenas
  metadados (bytes, contagem de itens, verificação); nenhum conteúdo, valor ou dado pessoal.
  Falha → estado **ERRO**. Configuração gerenciada pela organização continua valendo.
- Demais apps: **autorização pendente**, com link para o guia MCP oficial. Mail não tem
  conector builtin do claude.ai: exige servidor Zoho MCP custom com OAuth. O portal não
  configura contas nem permissões e não tem botões de conexão.
- Progresso: somente contagens verificáveis (conectados, leituras OK/erro, 0 fontes
  confiáveis, 0 ações autorizadas). **Sem percentual global.**

## Contexto VOICE_360

`voice360.py` lê **somente** a lista fixa das políticas ativas (V1 e Clarificação V1.1) em
`VEOS_VOICE360_DIR` (padrão: a pasta `VOICE_360` acima do repositório) para calcular SHA-256 e
o `status` do frontmatter, e confere a V1 com o hash registrado na V1.1. Sem o cofre (cópia
portátil) usa um resumo marcado **NÃO CANÔNICO**. Derivados draft/unverified não são lidos nem
promovidos; o Writer canônico não é executado. A tela **Contexto VOICE_360** mostra também a
consolidação revisável (funções, fontes, dependências) — ver
[`CONSOLIDACAO-VOICE360-RASCUNHO.md`](CONSOLIDACAO-VOICE360-RASCUNHO.md).

## Armazenamento

`runtime/veos-portal.sqlite3` (criado ao iniciar, ignorado pelo git): mensagens por sala, jobs,
reuniões, rascunhos, verificações de integração (evidência sanitizada) e decisões append-only.
Jobs em andamento quando o servidor parou são marcados como interrompidos na próxima
inicialização. Para zerar: feche o portal e apague `runtime/` (isso também apaga o registro de
decisões).

## Testes

```
cd scratch\VEOS-LOCAL\portal
python -m unittest discover -s tests -v
node --test tests/js/domain.test.mjs tests/js/controls.test.mjs
```

Suítes novas: `test_cfo_controls.py`, `test_ledger.py`, `test_integrations.py`,
`test_context.py`, `test_http_cfo.py` e `tests/js/controls.test.mjs`. As suítes existentes
(65 Python, 12 JS) foram preservadas. Nenhum teste chama o Claude Code ou o Zoho: provedor e
runner são simulados, SQLite em memória, HTTP em porta efêmera.

## Publicação e migração

- Publicar somente o que está em `MANIFEST.md`. Nunca `runtime/`, `verification/`, logs,
  credenciais, políticas canônicas, dados reais ou o clone de skills.
- Mudança de esquema: tabelas novas usam `CREATE TABLE IF NOT EXISTS`; bancos existentes
  ganham as tabelas na próxima inicialização sem perder históricos.
