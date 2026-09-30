"""Contexto VOICE_360: SOMENTE uma lista fixa de politicas oficiais locais.

Se o cofre estiver presente, le cada arquivo apenas para calcular sha256 e o
'status' do frontmatter; nada e escrito, promovido ou reclassificado, e o Writer
canonico nao e executado. Memorias derivadas (draft/unverified) nao sao lidas.
Sem cofre (copia portatil), usa o RESUMO_PORTATIL, marcado NAO CANONICO.

Tambem expoe o documento de consolidacao REVISAVEL (funcoes, fontes e
dependencias) exibido no portal; ele e rascunho e nao altera o VOICE_360."""
import hashlib
import re
from pathlib import Path

V1_SHA256_REGISTRADO = "4888E7BAEFCECD1EC5DC2186D774AAD601B59F7F7B57E0119A16E6472F0A9D68"
POLITICAS = (
    ("Politica V1", "04 - PADROES/VOICE - Politica de Saude Financeira - V1.md"),
    ("Clarificacao V1.1", "04 - PADROES/VOICE - Politica de Saude Financeira - V1.1 - "
                          "Clarificacao de posicao e exposicao de caixa.md"),
)
MAX_BYTES = 1024 * 1024
STATUS_RE = re.compile(r"^status:\s*(\S+)\s*$", re.M)

RESUMO_PORTATIL = (
    "RESUMO PORTATIL NAO CANONICO - citacoes das regras implementadas; a fonte oficial e o "
    "arquivo da politica no VOICE_360.",
    "V1 sec.2: ticket desejado R$ 100.000,00; nao e bloqueio; excecao registrada; menor valor "
    "nao justifica reduzir margem.",
    "V1 sec.3: MC alvo >= 35% VERDE; 30-34,99 ACEITAVEL; 25-29,99 ATENCAO (direcao + "
    "justificativa); < 25% NAO APROVADO (extraordinario).",
    "V1 sec.4 e sec.6: RL = bruto - descontos - impostos sobre a venda; MC = RL - custos "
    "diretos/variaveis; provisao de risco 2% da RL como custo variavel.",
    "V1 sec.7: custos fixos nao sao rateados entre projetos.",
    "V1 sec.9: desconto recalcula a margem; ate 2% autonomia se MC >= 32%; > 2% ate 5% direcao; "
    "MC < 30% direcao; > 5% excepcional com nova analise integral.",
    "V1 sec.10: recebido deve cobrir desembolsos da fase antes de aquisicao relevante; "
    "referencia 50/40/10 adaptavel.",
    "V1 sec.12: reserva de pelo menos 3 meses de custos fixos medios; a receber nao substitui.",
    "V1 sec.13: quinze indicadores; metas: inadimplencia < 2%, projetos < 30% ate 10% do "
    "faturamento, margem operacional 12-15%.",
    "V1.1: posicao = recebido - compromissos; exposicao = max(0, -posicao); gatilho se > 10% do "
    "Valor do Contrato; contrato ausente = NAO RESOLVIDO; corrente e pro forma separados.",
    "V1 sec.14: excecao exige responsavel, justificativa, impacto conhecido e registro.",
)

CONSOLIDACAO = {
    "titulo": "Consolidacao CFO no VOICE_360 - RASCUNHO REVISAVEL",
    "status": "RASCUNHO - nao promovido; nenhuma nota canonica criada ou alterada",
    "funcoes": [
        {"funcao": "Margem de contribuicao e faixas", "implementacao": "engine/cfo.py + cfo_controls.margem",
         "fontes": ["V1 sec.3, 4, 6, 7"], "estado": "IMPLEMENTADO - dados sinteticos"},
        {"funcao": "Posicao e exposicao corrente/pro forma", "implementacao": "engine/cfo.py + cfo_controls.exposicao",
         "fontes": ["V1.1 sec.4-10"], "estado": "IMPLEMENTADO - dados sinteticos"},
        {"funcao": "Ticket desejado", "implementacao": "cfo_controls.avaliar_ticket",
         "fontes": ["V1 sec.2"], "estado": "IMPLEMENTADO - simulacao"},
        {"funcao": "Desconto e alcada", "implementacao": "cfo_controls.simular_desconto",
         "fontes": ["V1 sec.9", "V1 sec.3/8"], "estado": "IMPLEMENTADO - simulacao; lacuna 30-31,99% NAO RESOLVIDA"},
        {"funcao": "Cobertura por fase", "implementacao": "cfo_controls.avaliar_fases",
         "fontes": ["V1 sec.10"], "estado": "IMPLEMENTADO - simulacao"},
        {"funcao": "Reserva de caixa", "implementacao": "cfo_controls.avaliar_reserva",
         "fontes": ["V1 sec.12"], "estado": "PARCIAL - janela/metodo RASCUNHO NAO OFICIAL"},
        {"funcao": "Indicadores sec.13 e briefing", "implementacao": "cfo_indicadores",
         "fontes": ["V1 sec.13", "skill business-pulse (estrutura)"], "estado": "IMPLEMENTADO - dados sinteticos"},
        {"funcao": "Registro de decisoes", "implementacao": "ledger.DecisionLedger",
         "fontes": ["V1 sec.14", "tools/decisoes_v2.py (padrao)"], "estado": "IMPLEMENTADO - local, autoria declarada"},
    ],
    "dependencias": [
        {"item": "Base financeira real validada (substitui a base TESTE)", "tipo": "EXTERNA - usuario",
         "estado": "PENDENTE"},
        {"item": "Decisao humana sobre metodologias em RASCUNHO (reserva, inadimplencia, PMR, "
                 "atribuicao de periodo)", "tipo": "EXTERNA - direcao", "estado": "PENDENTE"},
        {"item": "Alcada para desconto <= 2% com MC entre 30% e 31,99%", "tipo": "EXTERNA - politica",
         "estado": "NAO DEFINIDA PELA FONTE"},
        {"item": "Conexao/autorizacao OAuth dos demais apps Zoho via MCP oficial",
         "tipo": "EXTERNA - administrador Zoho", "estado": "PENDENTE"},
        {"item": "Promocao canonica no VOICE_360 (Writer)", "tipo": "EXTERNA - decisao separada",
         "estado": "NAO AUTORIZADA"},
        {"item": "Aprovacao autenticada da direcao", "tipo": "EXTERNA - identidade", "estado": "NAO INICIADA"},
    ],
}


def _vault(config):
    d = getattr(config, "voice360_dir", None)
    if d and (Path(d) / "04 - PADROES").is_dir():
        return Path(d)
    return None


def _status(raw):
    txt = raw[:4096].decode("utf-8", errors="replace")
    if not txt.startswith("---"):
        return None
    fim = txt.find("\n---", 3)
    m = STATUS_RE.search(txt[:fim] if fim > 0 else txt)
    return m.group(1).strip('"\'') if m else None


def politicas(config):
    vault = _vault(config)
    itens = []
    for nome, rel in POLITICAS:
        item = {"nome": nome, "caminho": rel, "presente": False, "sha256": None, "status": None}
        if vault:
            p = vault.joinpath(*rel.split("/"))
            try:
                if p.is_file() and p.stat().st_size <= MAX_BYTES:
                    raw = p.read_bytes()
                    item.update(presente=True, sha256=hashlib.sha256(raw).hexdigest().upper(),
                                status=_status(raw))
            except OSError:
                pass
        if nome == "Politica V1":
            item["confere_registro_v11"] = (item["sha256"] == V1_SHA256_REGISTRADO
                                            if item["sha256"] else None)
        itens.append(item)
    presentes = all(i["presente"] for i in itens)
    return {"cofre_encontrado": vault is not None, "politicas": itens,
            "modo": "POLITICAS OFICIAIS LOCAIS (hash conferido)" if presentes
            else "RESUMO PORTATIL NAO CANONICO",
            "resumo_regras": list(RESUMO_PORTATIL),
            "aviso": "Somente lista fixa; derivados draft/unverified nao sao lidos nem promovidos; "
                     "o Writer canonico nao e executado."}


def contexto(config):
    return {**politicas(config), "consolidacao": CONSOLIDACAO}


def resumo_texto(config):
    pl = politicas(config)
    linhas = []
    for i in pl["politicas"]:
        if i["presente"]:
            extra = ""
            if "confere_registro_v11" in i:
                extra = "; sha256 confere com o registro da V1.1" if i["confere_registro_v11"] \
                    else "; sha256 NAO confere com o registro da V1.1"
            linhas.append(f"{i['nome']}: presente, status {i['status'] or 'desconhecido'}{extra}.")
        else:
            linhas.append(f"{i['nome']}: nao encontrada nesta copia.")
    return "\n".join([f"Politicas VOICE ({pl['modo']}):"] + linhas + list(RESUMO_PORTATIL))
