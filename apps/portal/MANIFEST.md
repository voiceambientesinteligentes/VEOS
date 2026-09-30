# Manifesto da entrega portátil

Publicar dentro de `veos/` na branch `veos/portal-executivo-20260928` do repositório `voiceambientesinteligentes/voice-frentes-dashboard`:

- `.gitignore`, `ABRIR-PORTAL.cmd`, `run.py`, `package.json`.
- `README.md`, `MANIFEST.md`, `VERIFICACAO.md`, `CRITERIOS-CONCLUSAO.md`, `SKILLS-REUSE.md`, `CONSOLIDACAO-VOICE360-RASCUNHO.md`.
- `veosportal/*.py`: servidor, persistência, provedor, orquestração, simulação, controles CFO (`cfo_controls.py`, `cfo_indicadores.py`, `cfo_service.py`, `cfo_context.py`), decisões (`ledger.py`), integrações (`integrations.py`) e contexto VOICE_360 (`voice360.py`).
- `web/index.html`, `web/favicon.svg`, `web/css/*.css`, `web/js/**/*.js`.
- `engine/cfo.py`, `engine/README.md`, `engine/fixtures/cfo-demo.json` e `engine/fixtures/cfo-controles-TESTE.json` (somente dados fictícios TESTE).
- `tests/*.py`, `tests/js/*.mjs`, `verify_live_integration.py`, `verify_browser.mjs`.

Excluir `runtime/`, `verification/`, `__pycache__/`, bancos, logs, perfis de navegador, credenciais, políticas canônicas (arquivos originais do VOICE_360), dados reais e o clone `scratch/references/knowledge-work-plugins`. O aplicativo preexistente na raiz do repositório permanece como está.
