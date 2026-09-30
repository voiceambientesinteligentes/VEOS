# Esquema dos setores do VEOS

Cada setor é um arquivo `VEOS/setores/<id>.json`. O VEOS lê esses catálogos para montar
a página do setor, os formulários dos registros, as rotinas, os indicadores e as
**sentinelas** (regras vivas executadas pelo motor). Tudo em português do Brasil.

## Regra de honestidade
- A política oficial da VOICE está no VOICE_360 (ex.: Política de Saúde Financeira V1/V1.1).
- Tudo que **não** vem de política aprovada é marcado `"status": "PROPOSTA"` e só vale como
  sugestão até a direção aprovar. Nunca apresentar meta, alçada ou prazo inventado como oficial.
- Diretores são **personas fictícias** com métodos de referência reais. Não imitam pessoas reais.

## Contexto da empresa (usar em todos os setores)
VOICE Ambientes Inteligentes: automação residencial e comercial **premium**, redes, áudio e vídeo,
segurança, controle de acesso e integrações. Clientes de alto padrão; **arquitetos, designers e
construtoras são parceiros indicadores** importantes. Projetos por fases (infraestrutura,
equipamentos, programação/comissionamento, entrega). Ticket desejado R$ 100 mil (meta da política,
não bloqueio). Margem de contribuição e caixa seguem a Política V1/V1.1.

## Formato

```jsonc
{
  "id": "vendas",                    // direcao|financas|vendas|marketing|operacoes|tecnologia|posvenda|pessoas|secretaria
  "sigla": "CSO",
  "nome": "Comercial",
  "missao": "frase curta",
  "cor": "gold|cyan|...",           // opcional
  "diretor": {
    "titulo": "Diretor Comercial (CSO)",
    "nome": "Nome fictício",
    "perfil": "2-3 frases: quem é, experiência, estilo",
    "especialidades": ["..."],
    "metodos": [{ "nome": "SPIN Selling", "autor": "Neil Rackham", "uso": "como aplica na VOICE" }],
    "principios": ["..."],
    "como_aconselha": "tom e forma de responder",
    "perguntas_chave": ["perguntas que sempre faz à direção"],
    "limites": ["o que NÃO decide sozinho / exige aprovação"]
  },
  "equipe": [{
    "papel": "consultor",            // id curto [a-z_]
    "nome": "Consultor de vendas",
    "reporta_a": "CSO",
    "responsabilidades": ["..."],
    "indicadores": ["ids de indicadores deste setor"]
  }],
  "processos": [{
    "id": "funil",
    "nome": "Funil de vendas",
    "descricao": "...",
    "etapas": [{ "id": "qualificacao", "nome": "Qualificação", "responsavel": "sdr", "criterio_saida": "..." }]
  }],
  "registros": [{
    "tipo": "oportunidade",          // id [a-z_]
    "nome": "Oportunidade",
    "descricao": "...",
    "responsavel": "consultor",      // papel padrão
    "estados": ["qualificacao", "visita", "proposta", "negociacao", "ganha", "perdida"],
    "estado_inicial": "qualificacao",
    "estados_finais": ["ganha", "perdida"],
    "campos": [{
      "id": "valor_estimado", "rotulo": "Valor estimado",
      "tipo": "texto|texto_longo|dinheiro|numero|data|opcao|email|telefone|sim_nao",
      "opcoes": ["só para tipo opcao"],
      "obrigatorio": true
    }]
  }],
  "rotinas": [{
    "id": "pipeline_semanal", "nome": "Revisão semanal do pipeline",
    "frequencia": "diaria|semanal|quinzenal|mensal|trimestral",
    "responsavel": "CSO ou papel", "passos": ["..."]
  }],
  "indicadores": [{
    "id": "taxa_conversao", "nome": "Taxa de conversão",
    "formula": "texto claro", "meta": "texto (ex.: ≥ 25%)",
    "frequencia": "semanal|mensal|...", "status": "PROPOSTA|POLITICA"
  }],
  "sentinelas": [ /* ver abaixo */ ],
  "modelos": [{
    "id": "followup_proposta", "tipo": "email|whatsapp|roteiro|documento",
    "assunto": "...", "corpo": "texto com {{variaveis}} (ex.: {{titulo}}, {{responsavel}})"
  }],
  "documentos": ["documentos/checklists padrão do setor"],
  "relacoes": [{ "setor": "financas", "fluxo": "o que entrega/recebe" }],
  "fontes": [{ "titulo": "...", "tipo": "skill|livro|metodo|norma|site", "ref": "caminho ou URL" }]
}
```

Registro — campos base que sempre existem (não declarar em `campos`): `titulo`, `estado`,
`responsavel` (papel), `criado_em`, `atualizado_em`, `prazo` (data opcional), `valor` (dinheiro opcional).

## Sentinelas (linguagem que o motor executa)

```jsonc
{
  "id": "COM_SEM_VENDA_SEMANA",       // MAIUSCULAS_COM_UNDERSCORE, único no VEOS
  "titulo": "Nenhuma venda fechada na semana",
  "severidade": "INFO|MEDIO|ALTO|CRITICO",
  "status": "PROPOSTA|POLITICA",
  "gatilho": { ... um dos tipos abaixo ... },
  "mensagem": "texto do aviso ({{titulo}} e {{dias}} disponíveis em regras por registro; {{total}} em agregadas)",
  "acoes": [
    { "tipo": "tarefa", "titulo": "...", "papel": "consultor", "prazo_dias": 1 },
    { "tipo": "rascunho", "modelo": "id de um modelo do setor" },
    { "tipo": "notificar", "para": "direcao|<papel>|<sigla do diretor>" }
  ],
  "fonte": "Política V1 sec.X | PROPOSTA — padrão de mercado (método X)"
}
```

Tipos de gatilho:

| tipo | significado | parâmetros |
|---|---|---|
| `contagem` | quantidade de registros na janela comparada a um valor (alerta agregado) | `registro`, `filtros`, `janela_dias`, `data_campo`, `operador`, `valor` |
| `soma` | soma de um campo numérico/dinheiro na janela comparada a um valor | `registro`, `campo`, `filtros`, `janela_dias`, `data_campo`, `operador`, `valor` |
| `parado` | cada registro sem atualização há mais de N dias (alerta por registro) | `registro`, `filtros`, `dias`, `data_campo` (padrão `atualizado_em`) |
| `vencido` | cada registro cuja data (`campo`) já passou (ou vence em ≤ `antecedencia_dias`) e não está em estado final | `registro`, `campo`, `filtros`, `antecedencia_dias` (padrão 0) |
| `faltando` | cada registro em que um campo está vazio | `registro`, `campo`, `filtros` |

- `filtros`: lista (E lógico) de `{ "campo": "estado", "igual": "x" }` ou `"em": [..]`, `"diferente": "x"`, `"nao_em": [..]`.
- `campo`/`data_campo`: um campo base (`estado`, `criado_em`, `atualizado_em`, `prazo`, `valor`, `titulo`, `responsavel`) ou um id de `campos`.
- `operador`: `<`, `<=`, `>`, `>=`, `==`. `valor`: número (reais para dinheiro).
- Janela: registros cuja `data_campo` está nos últimos `janela_dias` dias.
- `parado`, `vencido` e `faltando` ignoram registros em estado final, **exceto** quando a própria sentinela filtra `estado` (aí vale o filtro, ex.: oportunidade `ganha` sem passagem).

Limites de qualidade por setor: 3–6 papéis, 1–3 processos, 2–5 tipos de registro, 4–8 rotinas,
5–10 indicadores, 5–10 sentinelas, 3–8 modelos. Tudo específico para a VOICE (automação premium),
nada genérico demais.
