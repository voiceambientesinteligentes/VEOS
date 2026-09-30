# VEOS — VOICE Executive Operating System

Camada operacional da VOICE Ambientes Inteligentes: setores, diretores (CFO, CMO…),
ordens, avisos do "sistema vivo" e portal. Usa o **VOICE_360** como cérebro
(políticas, fontes e decisões com versão e hash).

> Estado: **em desenvolvimento, somente dados TESTE, nada online.**
> Veja [docs/ESTADO_ATUAL.md](docs/ESTADO_ATUAL.md).

## Estrutura

```
VEOS/
├─ apps/portal/      portal local (Python stdlib + HTML/CSS/JS vanilla) + vigia
├─ docs/             arquitetura, estado, plano, decisões, continuidade
└─ (futuro) mcp/     servidor MCP autenticado — etapa P05
```

## Rodar

```
cd apps\portal
python -m unittest discover -s tests
node --test tests/js/domain.test.mjs tests/js/controls.test.mjs
ABRIR-PORTAL.cmd
```

Requisitos: Python 3.10+ e Node 18+ (só para testes JS). Sem dependências externas.

## Documentação

| Documento | Conteúdo |
|---|---|
| [ARQUITETURA](docs/ARQUITETURA.md) | VOICE_360, VEOS, vigia, MCP, dados, hospedagem |
| [ESTADO_ATUAL](docs/ESTADO_ATUAL.md) | o que funciona, evidências, bloqueios |
| [PLANO_EXECUCAO](docs/PLANO_EXECUCAO.md) | etapas e critérios verificáveis |
| [DECISOES](docs/DECISOES.md) | confirmadas × propostas |
| [MAPA_DE_PASTAS](docs/MAPA_DE_PASTAS.md) | onde fica cada coisa no disco |
| [MIGRACAO_VSCODE](docs/MIGRACAO_VSCODE.md) | saída do Obsidian, backup, reversão |
| [CONTINUIDADE](docs/CONTINUIDADE.md) | última ação e próximo passo |
