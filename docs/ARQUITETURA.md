# Arquitetura — VEOS + VOICE_360

Atualizado: 30/09/2026. Itens marcados **(proposta)** ainda não foram decididos nem implantados.

## Camadas

```
            Fernando / equipe
     (navegador no site  |  cliente de IA via MCP)
                 │                    │
        ┌────────▼────────────────────▼────────┐
        │                VEOS                  │
        │  Portal  ·  API  ·  Servidor MCP     │
        │  Diretores (perfis): CEO CFO CMO …   │
        │  VIGIA: eventos → regras → avisos    │
        │  Ordens · tarefas · decisões         │
        └────────────────┬─────────────────────┘
                         │ leitura com permissão
        ┌────────────────▼─────────────────────┐
        │            VOICE_360 (cérebro)       │
        │ políticas por versão/hash · fontes · │
        │ decisões · cadastros compartilhados  │
        └──────────────────────────────────────┘
```

- **VOICE_360** guarda o que é verdade para a empresa: políticas aprovadas (ex.: Política de
  Saúde Financeira V1 e V1.1 em `04 - PADROES`), fontes, decisões e versões. Rascunho não vira
  regra sozinho.
- **VEOS** usa o cérebro para agir: cada diretor é um **perfil** (competência + permissões +
  fontes), não um servidor nem uma assinatura separada.

## Sistema vivo (vigia)

Objetivo do dono: o sistema reage sozinho quando algo contraria uma regra. Exemplo: o vendedor
salva um orçamento e o CFO avisa que a margem não fecha ou que a soma dos produtos não bate.

```
evento (orcamento.salvo) ──► vigia ──► regras do setor (código, com fonte) ──► avisos
                                                                   │
                                   diretor responsável · severidade · regra · fonte · lacunas
```

Princípios:
1. **Regras são código determinístico com fonte citada** (ex.: "Política V1 sec.9"). Não dependem
   de IA, logo não gastam tokens e funcionam online 24h.
2. **A IA entra depois, opcional**: redige o aviso na "voz" do diretor e responde perguntas. Se a
   IA falhar, o aviso determinístico continua valendo.
3. **Dado ausente = lacuna**, nunca zero. Sem custo ou impostos, a margem fica "não resolvida".
4. **Aviso não é aprovação.** Aprovar exige identidade autenticada e registro.

Implementado (protótipo, TESTE): [`apps/portal/veosportal/vigia.py`](../apps/portal/veosportal/vigia.py)
- evento `orcamento.salvo`: total × soma dos itens, item abaixo do custo, custo/impostos
  ausentes, margem e faixa (V1 sec.3/4/6), alçada de desconto (V1 sec.8/9), ticket desejado
  (V1 sec.2, alerta sem bloqueio);
- situação: `OK`, `REVISAR` ou `BLOQUEAR_ENVIO`;
- reutiliza `cfo_controls.py` sem alterá-lo. Testes: `tests/test_vigia.py`.

Próximos eventos candidatos (dependem de regra aprovada por setor): pagamento vencido,
exposição de caixa > 10% (V1.1), compra sem cobertura da fase (V1 sec.10), case sem
autorização de uso (CMO).

## Design: luxo orbital

Direção visual confirmada pelo Fernando (30/09): futurista, luxuosa e orbital.
- Paleta existente: obsidiana (`--bg-*`), ouro (`--gold*`) para identidade e ciano (`--cyan*`) para estado ativo/fluxo.
- **Órbita** (`apps/web/js/ui/views/orbita.js`, `apps/web/css/orbita.css`) é a tela inicial do VEOS online: o núcleo VEOS no centro e cada setor em órbita inclinada; um campo de "células" (inspirado no grafo do Obsidian) se agrupa em cada setor e acende ao ativá-lo; as conexões mostram fluxos reais entre setores (`FLUXOS`), com partículas viajando.
- Dados reais: setores/diretores do banco; atividade do CFO = avisos registrados; demais setores aparecem como "Estrutura criada" até terem regras.
- Sem biblioteca e sem estilo embutido (CSP): canvas para células, botões reais para setores (teclado, Esc, leitor de tela), `prefers-reduced-motion` respeitado, pausa quando a aba fica oculta.

### IA VEOS (voz)
- Aba **IA VEOS** (símbolo ✦ no menu): onda de voz em WebGL (porte do shader "wave" estilo Siri, nas cores ouro→ciano, reage ao estado: repouso, ouvindo, falando) — `apps/web/js/ui/onda.js`, `apps/web/js/ui/views/ia.js`, `apps/web/css/ia.css`.
- Comando por voz: reconhecimento de fala do **navegador** (pt-BR; Chrome/Edge). O áudio pode ir ao fornecedor do navegador (aviso na tela); o VEOS não grava áudio. Campo de texto como alternativa.
- Hoje, sem IA: `apps/web/js/domain/comandos.js` interpreta de forma determinística (navegação entre telas + indica o diretor que receberia o pedido). Testes: `tests/web/comandos.test.mjs`.
- Quando a IA for integrada (decisão P-3), o texto reconhecido vai ao diretor indicado via `api`/MCP; a tela já reserva esse lugar.
- `Permissions-Policy`: microfone liberado só para o próprio site (`microphone=(self)`).

## MCP

MCP é o canal pelo qual um cliente de IA dá ordens ao VEOS. As ferramentas previstas estão no
Plano Mestre (listar_setores, obter_contexto_setor, buscar_conhecimento, registrar_ordem…).
Regras:
- autenticação e autorização pela identidade real; o argumento `setor=CFO` não concede nada;
- escrita com chave de idempotência;
- o MCP não é o modelo de IA nem o banco.

## Hospedagem (proposta, validar na etapa P05)

| Peça | Recomendação | Motivo |
|---|---|---|
| Código | GitHub `voiceambientesinteligentes/VEOS`, **privado** | decisão do dono: público só no final |
| Portal + API + MCP | Cloudflare Workers (+ Static Assets) | plano gratuito permite uso comercial |
| Banco | Cloudflare D1 (alternativa: Turso) | SQLite gerenciado, próximo do SQLite atual |
| Documentos | Cloudflare R2 | PDFs/XML privados |
| Login | Cloudflare Access ou OAuth do MCP | só identidades VOICE |
| Domínio | subdomínio, ex. `veos.<domínio>` | o site atual segue na Netlify sem mudança |

Vercel: o dono aceitou usar. Porém o plano Hobby (gratuito) é restrito a uso **não comercial**, e
o VEOS é uso comercial. Só serve no plano pago (Pro), o que exige decisão de custo. Por isso a
recomendação continua Cloudflare. Ver [DECISOES.md](DECISOES.md).

Portabilidade: o backend atual é Python só com biblioteca padrão. As regras (`cfo_controls`,
`vigia`) são puras e podem ir para Python Workers ou ser portadas para TypeScript. A escolha
depende da medição de CPU no P05.

## IA no servidor

Com o PC desligado, qualquer resposta gerada por IA exige uma API paga por uso (ex.: API da
Anthropic). A assinatura pessoal do Claude não serve para execução autônoma no servidor. O
vigia funciona sem IA. As respostas "na voz do diretor" dependem de orçamento aprovado.
