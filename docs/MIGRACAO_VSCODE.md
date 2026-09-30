# Migração Obsidian → VS Code

## Inventário de dependências do Obsidian (30/09/2026)

| Recurso | Achado | Impacto ao remover o Obsidian |
|---|---|---|
| Plugins da comunidade (Dataview etc.) | **nenhum** instalado | nenhum |
| Blocos `dataview`/`base`, arquivos `.base`/`.canvas` | **nenhum** | nenhum |
| Links `obsidian://` | nenhum nas notas (só 1 na fila SHADOW, que é texto capturado desta sessão) | nenhum |
| Wikilinks `[[...]]` no acervo | 96 ocorrências | continuam como texto legível; o VS Code abre os arquivos normalmente. Navegação por clique é opcional (extensão, não instalada) |
| Scripts `99 - SISTEMA/SCRIPTS` | só **excluem** `.obsidian` da busca | nenhum: arquivar a pasta não quebra nada |
| Snippet `voice360.css` | estilo visual da HOME no Obsidian | só visual; arquivado junto |
| Core plugins ativos | templates, daily-notes, bookmarks, **sync** | ver alerta abaixo |
| Hook de busca do Claude Code | PowerShell + arquivos Markdown | **já independente** do Obsidian |

**Conclusão:** o núcleo (busca, hook, pipeline V2, portal) não depende do Obsidian. A
dependência é só de interface.

### Alerta: Obsidian Sync
O plugin "Sync" está ativado na configuração. Se você usa o Obsidian Sync (pago) em outro
dispositivo, feche o Obsidian **em todos os dispositivos** antes de arquivar a configuração. Depois
disso, cancele o Sync se não for mais usar. Mudanças feitas com o app aberto podem ser propagadas.

## Backup

- Destino: `C:\Users\voice\VOICE_360_BACKUPS\transicao-vscode-20260930-100353\VOICE_360`
- Método: robocopy `/E /XJ` (não segue junctions, evita ciclos) + manifesto SHA-256 da origem
  e da cópia (`manifest-origem.sha256`, `manifest-copia.sha256`, `diferencas.txt`,
  `resultado.json`).
- Diferenças esperadas: arquivos escritos durante a cópia (`.obsidian/workspace.json` com o app
  aberto, fila SHADOW desta sessão e a pasta `VEOS/`, criada durante a cópia).

## Mudanças feitas

| Mudança | Tipo | Reversão |
|---|---|---|
| Criado `VEOS/` (cópia do portal + vigia + docs) | adição | apagar `VEOS/` |
| Criados `CLAUDE.md` e `VOICE_ECOSYSTEM.code-workspace` na raiz | adição | apagar os dois arquivos |
| Nada movido, renomeado ou apagado no acervo ou nas evidências | — | — |

## Pendente: arquivar `.obsidian`

Pré-requisitos: backup verificado e Obsidian fechado.
Passo: mover `VOICE_360\.obsidian` → `VOICE_360_BACKUPS\obsidian-config-arquivada-20260930\.obsidian`
e conferir os hashes.
Reversão: mover de volta.
Observação: se o Obsidian for aberto nesta pasta de novo, ele recria uma `.obsidian` vazia. Não é
erro, mas convém evitar.
