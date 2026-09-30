"""Camada adicional de controles CFO em Decimal - base SINTETICA (TESTE).

Nao altera o motor (engine/cfo.py) nem o seu resultado oficial. Implementa, a
partir da Politica V1 e da Clarificacao V1.1 (ambas ativas):
- ticket desejado (V1 sec.2): nao bloqueia; excecao justificada nao reduz margem;
- desconto e alcada (V1 sec.9): recalculo de RL/MC com provisao de 2% uma vez;
- cobertura de recebimento por fase (V1 sec.10): so recebimento EFETIVO, alocado
  explicitamente, sem reutilizar o mesmo recebimento entre fases;
- reserva de caixa (V1 sec.12): meta de 3 meses; janela e metodo da media sao
  RASCUNHO NAO OFICIAL (a fonte nao os define).

Onde a fonte nao define metodo, a escolha e rotulada CONVENCAO DE SIMULACAO ou
RASCUNHO NAO OFICIAL. Dado ausente nunca vira zero."""
import calendar
import hashlib
import json
import re
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

ZERO, CENT, CEM = Decimal("0"), Decimal("0.01"), Decimal("100")
FORMATO = "voice-cfo-controles-sintetico-v1"
MAX_BYTES = 2 * 1024 * 1024
MONEY_RE = re.compile(r"\d{1,13}(\.\d{1,2})?")
PCT_RE = re.compile(r"\d{1,3}(\.\d{1,2})?")
SIGNED_PCT_RE = re.compile(r"-?\d{1,3}(\.\d{1,4})?")
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
MONTH_RE = re.compile(r"(\d{4})-(0[1-9]|1[0-2])")
ID_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}")

POLITICA = "POLITICA"
CONVENCAO = "CONVENCAO DE SIMULACAO"
RASCUNHO = "RASCUNHO NAO OFICIAL"

TICKET_DESEJADO = Decimal("100000.00")          # V1 sec.2 (META, nao bloqueio)
RISCO_PCT = Decimal("2")                         # V1 sec.6
MARGEM_ALVO, MARGEM_NORMAL, MARGEM_PISO = Decimal("35"), Decimal("30"), Decimal("25")  # V1 sec.3
DESC_AUTONOMIA_PCT = Decimal("2")                # V1 sec.9
MC_AUTONOMIA_PCT = Decimal("32")
DESC_DIRECAO_PCT = Decimal("5")
LIMIAR_EXPOSICAO_PCT = Decimal("10")             # V1.1 sec.9 (estritamente acima)
RESERVA_META_MESES = 3                           # V1 sec.12
REFERENCIA_FASES = ("50", "40", "10")            # V1 sec.10 (referencia adaptavel)
MAX_FASES = 10
MAX_ALOCACOES = 60

EXCECOES_TICKET = {
    "cliente_recorrente": "cliente recorrente",
    "ampliacao_instalacao": "ampliacao de instalacao existente",
    "baixa_complexidade": "baixa complexidade operacional",
    "margem_superior_meta": "margem superior a meta",
    "recebimento_antecipado": "recebimento antecipado",
    "relacionamento_estrategico": "relacionamento estrategico com arquiteto ou parceiro",
    "continuidade_identificavel": "oportunidade comercial com continuidade concretamente identificavel",
}
ORDEM_NEGOCIACAO = (
    "reducao de escopo", "substituicao de equipamento", "alteracao da condicao de pagamento",
    "retirada de beneficio ou acessorio", "alteracao de prazo ou fase de execucao",
    "somente depois, reducao direta de preco")
NIVEIS_ALCADA = ("FLUXO NORMAL", "AUTONOMIA COMERCIAL", "NAO RESOLVIDO", "DIRECAO",
                 "EXCEPCIONAL - NOVA ANALISE INTEGRAL", "EXTRAORDINARIA")

# Metodologias que a fonte nao define: configuraveis, sempre RASCUNHO NAO OFICIAL.
METODO_BASE = {
    "reserva_janela_meses": 3,
    "reserva_metodo": "media",
    "inadimplencia_atraso_min_dias": 1,
    "inadimplencia_base": "faturamento",
    "pmr_ponderacao": "valor",
}
METODO_OPCOES = {
    "reserva_janela_meses": (1, 24),
    "reserva_metodo": ("media", "mediana"),
    "inadimplencia_atraso_min_dias": (1, 365),
    "inadimplencia_base": ("faturamento", "receita_liquida"),
    "pmr_ponderacao": ("valor", "simples"),
}
METODO_ROTULOS = {
    "reserva_janela_meses": "Reserva: janela de meses completos para 'custos fixos medios'",
    "reserva_metodo": "Reserva: metodo da media (media aritmetica ou mediana)",
    "inadimplencia_atraso_min_dias": "Inadimplencia: atraso minimo (dias apos o vencimento)",
    "inadimplencia_base": "Inadimplencia: denominador ('receita' nao definida pela fonte)",
    "pmr_ponderacao": "Prazo medio de recebimento: ponderacao",
}


class ControlError(ValueError):
    pass


# ---------------------------------------------------------------- validacao

def _keys(obj, ctx, obrig, opc=()):
    if not isinstance(obj, dict):
        raise ControlError(f"{ctx}: deve ser objeto")
    falt = [k for k in obrig if k not in obj]
    if falt:
        raise ControlError(f"{ctx}: campo(s) ausente(s): {', '.join(falt)} (ausente nunca vira zero)")
    extra = sorted(set(obj) - set(obrig) - set(opc))
    if extra:
        raise ControlError(f"{ctx}: campo(s) desconhecido(s): {', '.join(extra)}")


def _list(v, ctx, maximo=None):
    if not isinstance(v, list):
        raise ControlError(f"{ctx}: deve ser lista")
    if maximo is not None and len(v) > maximo:
        raise ControlError(f"{ctx}: no maximo {maximo} itens")
    return v


def money(v, ctx, positivo=False):
    if not isinstance(v, str) or not MONEY_RE.fullmatch(v):
        raise ControlError(f"{ctx}: valor monetario invalido {v!r} "
                           "(texto '1234.56', nao negativo, ate 2 casas, sem separador de milhar)")
    d = Decimal(v)
    if positivo and d <= ZERO:
        raise ControlError(f"{ctx}: deve ser maior que zero")
    return d


def money_or_none(v, ctx):
    return None if v is None else money(v, ctx)


def pct(v, ctx):
    if isinstance(v, bool) or not isinstance(v, (str, int)):
        raise ControlError(f"{ctx}: informe texto decimal, ex. '2.5'")
    s = str(v).strip().replace(",", ".")
    if not PCT_RE.fullmatch(s):
        raise ControlError(f"{ctx}: percentual invalido {v!r} (ate 2 casas)")
    d = Decimal(s)
    if d > CEM:
        raise ControlError(f"{ctx}: percentual acima de 100")
    return d


def signed_pct(v, ctx):
    if isinstance(v, bool) or not isinstance(v, (str, int)):
        raise ControlError(f"{ctx}: informe texto decimal, ex. '31.5'")
    s = str(v).strip().replace(",", ".")
    if not SIGNED_PCT_RE.fullmatch(s):
        raise ControlError(f"{ctx}: percentual invalido {v!r}")
    return Decimal(s)


def iso_date(v, ctx):
    if not isinstance(v, str) or not DATE_RE.fullmatch(v):
        raise ControlError(f"{ctx}: data invalida {v!r} (use AAAA-MM-DD)")
    try:
        return date.fromisoformat(v)
    except ValueError:
        raise ControlError(f"{ctx}: data inexistente {v!r}")


def month(v, ctx):
    m = MONTH_RE.fullmatch(v) if isinstance(v, str) else None
    if not m:
        raise ControlError(f"{ctx}: mes invalido {v!r} (use AAAA-MM)")
    return int(m.group(1)), int(m.group(2))


def text(v, ctx, teste=True, maximo=200):
    if not isinstance(v, str) or not v.strip():
        raise ControlError(f"{ctx}: texto obrigatorio")
    if len(v) > maximo:
        raise ControlError(f"{ctx}: no maximo {maximo} caracteres")
    if teste and "TESTE" not in v:
        raise ControlError(f"{ctx}: entidade sintetica deve conter 'TESTE' ({v!r})")
    return v


def ident(v, ctx, vistos):
    if not isinstance(v, str) or not ID_RE.fullmatch(v):
        raise ControlError(f"{ctx}: ID invalido {v!r}")
    if v in vistos:
        raise ControlError(f"{ctx}: ID duplicado {v!r}")
    vistos.add(v)
    return v


def last_day(y, m):
    return date(y, m, calendar.monthrange(y, m)[1])


def prev_month(y, m):
    return (y - 1, 12) if m == 1 else (y, m - 1)


def month_id(ym):
    return f"{ym[0]:04d}-{ym[1]:02d}"


def q(v):
    return v.quantize(CENT, ROUND_HALF_UP)


def _sem_dup(pares):
    d = {}
    for k, v in pares:
        if k in d:
            raise ControlError(f"chave JSON duplicada: {k!r}")
        d[k] = v
    return d


def _const(nome):
    raise ControlError(f"valor JSON nao permitido: {nome}")


def _periodo(p, ctx, ids):
    _keys(p, ctx, ("id", "inicio", "fim", "caixa_livre", "caixa_restrito", "projetos",
                   "faturas", "pagar"))
    ym = month(p["id"], ctx + ".id")
    if p["id"] in ids:
        raise ControlError(f"{ctx}: periodo duplicado {p['id']}")
    ids.add(p["id"])
    ini, fim = iso_date(p["inicio"], ctx + ".inicio"), iso_date(p["fim"], ctx + ".fim")
    if ini != date(ym[0], ym[1], 1) or not ini <= fim <= last_day(*ym):
        raise ControlError(f"{ctx}: periodo mensal exige inicio no dia 1 e fim dentro de {p['id']}")
    out = {"id": p["id"], "mes": ym, "inicio": ini, "fim": fim,
           "caixa_livre": money(p["caixa_livre"], ctx + ".caixa_livre"),
           "caixa_restrito": money(p["caixa_restrito"], ctx + ".caixa_restrito"),
           "projetos": [], "faturas": [], "pagar": []}
    pids = set()
    for j, pr in enumerate(_list(p["projetos"], ctx + ".projetos")):
        c = f"{ctx}.projetos[{j}]"
        _keys(pr, c, ("id", "nome", "cliente", "data_contrato", "valor_contrato", "valor_bruto",
                      "descontos", "impostos", "custos_diretos", "compromissos"), ("parceiro",))
        item = {"id": ident(pr["id"], c + ".id", pids),
                "nome": text(pr["nome"], c + ".nome"),
                "cliente": text(pr["cliente"], c + ".cliente"),
                "parceiro_informado": "parceiro" in pr,
                "parceiro": (None if pr.get("parceiro") is None
                             else text(pr["parceiro"], c + ".parceiro")),
                "data_contrato": iso_date(pr["data_contrato"], c + ".data_contrato"),
                "valor_contrato": money_or_none(pr["valor_contrato"], c + ".valor_contrato"),
                "valor_bruto": money(pr["valor_bruto"], c + ".valor_bruto", positivo=True),
                "descontos": money(pr["descontos"], c + ".descontos"),
                "impostos": money(pr["impostos"], c + ".impostos"),
                "custos_diretos": money(pr["custos_diretos"], c + ".custos_diretos"),
                "compromissos": money(pr["compromissos"], c + ".compromissos")}
        if item["data_contrato"] > fim:
            raise ControlError(f"{c}: contrato posterior ao fim do periodo")
        out["projetos"].append(item)
    fids, rids = set(), set()
    for j, f in enumerate(_list(p["faturas"], ctx + ".faturas")):
        c = f"{ctx}.faturas[{j}]"
        _keys(f, c, ("id", "projeto", "emissao", "vencimento", "valor", "recebimentos"))
        fid = ident(f["id"], c + ".id", fids)
        if f["projeto"] not in pids:
            raise ControlError(f"{c}.projeto: projeto inexistente no periodo {f['projeto']!r}")
        emissao = iso_date(f["emissao"], c + ".emissao")
        venc = iso_date(f["vencimento"], c + ".vencimento")
        if venc < emissao:
            raise ControlError(f"{c}: vencimento anterior a emissao")
        if emissao > fim:
            raise ControlError(f"{c}: emissao posterior ao fim do periodo")
        valor = money(f["valor"], c + ".valor", positivo=True)
        recs, total = [], ZERO
        for k, r in enumerate(_list(f["recebimentos"], c + ".recebimentos")):
            cc = f"{c}.recebimentos[{k}]"
            _keys(r, cc, ("id", "data", "valor"))
            rr = {"id": ident(r["id"], cc + ".id", rids), "data": iso_date(r["data"], cc + ".data"),
                  "valor": money(r["valor"], cc + ".valor", positivo=True)}
            if rr["data"] < emissao:
                raise ControlError(f"{cc}: recebimento anterior a emissao")
            if rr["data"] > fim:
                raise ControlError(f"{cc}: recebimento posterior ao fim do periodo nao pertence a "
                                   "esta fotografia")
            total += rr["valor"]
            recs.append(rr)
        if total > valor:
            raise ControlError(f"{c}: recebimentos somam {total} e excedem o valor {valor}")
        out["faturas"].append({"id": fid, "projeto": f["projeto"], "emissao": emissao,
                               "vencimento": venc, "valor": valor,
                               "recebimentos": sorted(recs, key=lambda x: (x["data"], x["id"]))})
    aids = set()
    for j, a in enumerate(_list(p["pagar"], ctx + ".pagar")):
        c = f"{ctx}.pagar[{j}]"
        _keys(a, c, ("id", "contraparte", "vencimento", "valor", "pago"))
        item = {"id": ident(a["id"], c + ".id", aids),
                "contraparte": text(a["contraparte"], c + ".contraparte"),
                "vencimento": iso_date(a["vencimento"], c + ".vencimento"),
                "valor": money(a["valor"], c + ".valor", positivo=True),
                "pago": money(a["pago"], c + ".pago")}
        if item["pago"] > item["valor"]:
            raise ControlError(f"{c}: pago acima do valor (sobrepagamento)")
        out["pagar"].append(item)
    return out


def validar(d):
    _keys(d, "raiz", ("formato", "sintetico", "meta", "custos_fixos_mensais", "periodos",
                      "fases_exemplo"))
    if d["formato"] != FORMATO:
        raise ControlError(f"raiz: formato deve ser {FORMATO!r}")
    if d["sintetico"] is not True:
        raise ControlError("raiz: 'sintetico' deve ser true - somente dados TESTE")
    _keys(d["meta"], "meta", ("descricao",))
    out = {"meta": {"descricao": text(d["meta"]["descricao"], "meta.descricao", maximo=400)},
           "custos_fixos": {}, "periodos": [], "fases_exemplo": None}
    for i, c in enumerate(_list(d["custos_fixos_mensais"], "custos_fixos_mensais")):
        ctx = f"custos_fixos_mensais[{i}]"
        _keys(c, ctx, ("mes", "valor"))
        ym = month(c["mes"], ctx + ".mes")
        if ym in out["custos_fixos"]:
            raise ControlError(f"{ctx}: mes repetido {c['mes']}")
        out["custos_fixos"][ym] = money_or_none(c["valor"], ctx + ".valor")
    ids = set()
    for i, p in enumerate(_list(d["periodos"], "periodos")):
        out["periodos"].append(_periodo(p, f"periodos[{i}]", ids))
    if not out["periodos"]:
        raise ControlError("periodos: informe ao menos um periodo")
    out["periodos"].sort(key=lambda p: p["mes"])
    avaliar_fases(d["fases_exemplo"], out)  # o exemplo passa pelas mesmas regras da entrada
    out["fases_exemplo"] = d["fases_exemplo"]
    return out


def carregar_bytes(raw):
    if len(raw) > MAX_BYTES:
        raise ControlError("arquivo maior que 2 MB")
    try:
        txt = raw.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        raise ControlError(f"arquivo nao e UTF-8 ({e})")
    try:
        d = json.loads(txt, object_pairs_hook=_sem_dup, parse_constant=_const)
    except json.JSONDecodeError as e:
        raise ControlError(f"JSON invalido ({e})")
    return validar(d)


def carregar_arquivo(path):
    try:
        with open(path, "rb") as f:
            raw = f.read(MAX_BYTES + 1)
    except OSError as e:
        raise ControlError(f"nao foi possivel ler a base TESTE: {e}")
    return carregar_bytes(raw), hashlib.sha256(raw).hexdigest()


def periodo(fx, pid=None):
    if pid in (None, ""):
        return fx["periodos"][-1]
    for p in fx["periodos"]:
        if p["id"] == pid:
            return p
    raise ControlError(f"periodo inexistente na base TESTE: {pid!r}")


def periodo_anterior(fx, p):
    """Somente o mes imediatamente anterior; lacuna de mes = sem baseline."""
    alvo = prev_month(*p["mes"])
    return next((x for x in fx["periodos"] if x["mes"] == alvo), None)


# ---------------------------------------------------------------- margem

def faixa_margem(v):
    if v is None:
        return "NAO RESOLVIDO"
    if v >= MARGEM_ALVO:
        return "VERDE"
    if v >= MARGEM_NORMAL:
        return "ACEITAVEL"
    if v >= MARGEM_PISO:
        return "ATENCAO"
    return "NAO APROVADO"


def margem(rl, custos):
    """V1 sec.4 e sec.6: MC = RL - custos diretos/variaveis - provisao 2% RL (uma vez)."""
    if rl <= ZERO:
        return {"rl": rl, "custos": custos, "risco": None, "mc": None, "pct": None,
                "faixa": "NAO RESOLVIDO"}
    risco = q(rl * RISCO_PCT / CEM)
    mc = rl - custos - risco
    v = mc * CEM / rl
    return {"rl": rl, "custos": custos, "risco": risco, "mc": mc, "pct": v, "faixa": faixa_margem(v)}


def exposicao(posicao, valor_contrato):
    """V1.1 sec.7-9: exposicao = max(0, -posicao); % so com contrato > 0; gatilho > 10%."""
    exp = max(ZERO, -posicao)
    if valor_contrato is None or valor_contrato <= ZERO:
        return {"posicao": posicao, "exposicao": exp, "pct": None,
                "gatilho": "NAO RESOLVIDO (falha fechada)"}
    return {"posicao": posicao, "exposicao": exp, "pct": exp * CEM / valor_contrato,
            "gatilho": ("ACIONADO" if exp * CEM > LIMIAR_EXPOSICAO_PCT * valor_contrato
                        else "NAO ACIONADO")}


# ---------------------------------------------------------------- ticket (V1 sec.2)

def avaliar_ticket(e):
    _keys(e, "ticket", ("valor_contrato",), ("justificativas", "margem_pct"))
    v = money(e["valor_contrato"], "valor_contrato", positivo=True)
    just = _list(e.get("justificativas") or [], "justificativas", len(EXCECOES_TICKET))
    for j in just:
        if j not in EXCECOES_TICKET:
            raise ControlError(f"justificativa desconhecida: {j!r}")
    if len(set(just)) != len(just):
        raise ControlError("justificativa repetida")
    mg = e.get("margem_pct")
    mg = None if mg in (None, "") else signed_pct(mg, "margem_pct")
    abaixo = v < TICKET_DESEJADO
    inconsistencias = []
    if "margem_superior_meta" in just and (mg is None or mg <= MARGEM_ALVO):
        inconsistencias.append("'margem superior a meta' exige margem informada acima de 35%.")
    if not abaixo:
        situacao = "ATINGE O TICKET DESEJADO"
    elif not just:
        situacao = "ABAIXO DO DESEJADO - SEM JUSTIFICATIVA"
    elif inconsistencias:
        situacao = "ABAIXO DO DESEJADO - JUSTIFICATIVA INCONSISTENTE"
    else:
        situacao = "ABAIXO DO DESEJADO - EXCECAO JUSTIFICADA"
    return {
        "valor_contrato": v, "ticket_desejado": TICKET_DESEJADO, "abaixo_do_desejado": abaixo,
        "diferenca": v - TICKET_DESEJADO, "bloqueio": False, "situacao": situacao,
        "justificativas": [{"codigo": j, "texto": EXCECOES_TICKET[j]} for j in just],
        "inconsistencias": inconsistencias,
        "registro_exigido": abaixo,
        "margem_informada_pct": mg, "faixa_margem": faixa_margem(mg) if mg is not None else None,
        "margem_exigida": {"alvo_pct": MARGEM_ALVO, "normal_pct": MARGEM_NORMAL,
                           "piso_pct": MARGEM_PISO, "reduzida_pela_excecao": False},
        "regra": ("R$ 100.000,00 e ticket DESEJADO, nao bloqueio. Abaixo dele, a analise exige "
                  "justificativa registrada; o menor valor nao justifica reduzir a margem exigida "
                  "(V1 sec.2 e sec.3)."),
        "fonte": "Politica V1 sec.2 e sec.3", "origem": POLITICA,
    }


# ---------------------------------------------------------------- desconto (V1 sec.9)

def alcada_desconto(desc_pct, mc_pct):
    """Aplica as regras da sec.9 e o piso da sec.3/8. Devolve nivel e exigencias."""
    flags = []
    if mc_pct is None:
        return {"nivel": "NAO RESOLVIDO", "autonomia_comercial": False,
                "exigencias": ["Receita Liquida <= 0: margem nao resolvida (falha fechada)."]}
    if desc_pct == ZERO:
        flags.append(("FLUXO NORMAL", "Sem desconto: valem as faixas de margem (sec.3)."))
    elif desc_pct <= DESC_AUTONOMIA_PCT:
        if mc_pct >= MC_AUTONOMIA_PCT:
            flags.append(("AUTONOMIA COMERCIAL", "Desconto ate 2% com MC >= 32%: autonomia comercial "
                                                 "(sec.9)."))
        elif mc_pct >= MARGEM_NORMAL:
            flags.append(("NAO RESOLVIDO", "Desconto ate 2% com MC entre 30% e 31,99%: a sec.9 nao "
                                           "define a alcada (autonomia exige MC >= 32%; direcao e "
                                           "explicita so para desconto > 2% ou MC < 30%). Decisao "
                                           "humana necessaria."))
    elif desc_pct <= DESC_DIRECAO_PCT:
        flags.append(("DIRECAO", "Desconto acima de 2% e ate 5%: exige autorizacao da direcao (sec.9)."))
    else:
        flags.append(("EXCEPCIONAL - NOVA ANALISE INTEGRAL",
                      "Desconto acima de 5%: excepcional; exige nova analise financeira integral "
                      "(sec.9)."))
    if mc_pct < MARGEM_NORMAL:
        flags.append(("DIRECAO", "MC abaixo de 30%: exige autorizacao da direcao independentemente do "
                                 "percentual concedido (sec.9)."))
    if mc_pct < MARGEM_PISO:
        flags.append(("EXTRAORDINARIA", "MC abaixo de 25%: nao e operacao comercial normal; aprovacao "
                                        "extraordinaria, expressa e registrada (sec.3 e sec.8)."))
    nivel = max((f[0] for f in flags), key=NIVEIS_ALCADA.index)
    return {"nivel": nivel, "autonomia_comercial": nivel == "AUTONOMIA COMERCIAL",
            "exigencias": [f[1] for f in flags]}


def simular_desconto(e):
    _keys(e, "desconto", ("valor_bruto", "impostos_sem_desconto", "impostos_com_desconto",
                          "custos_diretos"), ("desconto_valor", "desconto_pct"))
    bruto = money(e["valor_bruto"], "valor_bruto", positivo=True)
    tem_v, tem_p = e.get("desconto_valor") not in (None, ""), e.get("desconto_pct") not in (None, "")
    if tem_v == tem_p:
        raise ControlError("informe exatamente um: desconto_valor ou desconto_pct")
    if tem_v:
        d = money(e["desconto_valor"], "desconto_valor")
        dp = d * CEM / bruto
    else:
        dp = pct(e["desconto_pct"], "desconto_pct")
        d = q(bruto * dp / CEM)
    if d > bruto:
        raise ControlError("desconto maior que o valor bruto")
    imp_sem = money(e["impostos_sem_desconto"], "impostos_sem_desconto")
    imp_com = money(e["impostos_com_desconto"], "impostos_com_desconto")
    custos = money(e["custos_diretos"], "custos_diretos")
    antes = margem(bruto - imp_sem, custos)
    depois = margem(bruto - d - imp_com, custos)
    delta_mc = None if antes["mc"] is None or depois["mc"] is None else depois["mc"] - antes["mc"]
    delta_pp = None if antes["pct"] is None or depois["pct"] is None else depois["pct"] - antes["pct"]
    return {
        "valor_bruto": bruto, "desconto_valor": d, "desconto_pct": dp,
        "antes": antes, "depois": depois, "delta_mc": delta_mc, "delta_pp": delta_pp,
        "alcada": alcada_desconto(dp, depois["pct"]),
        "ordem_negociacao": list(ORDEM_NEGOCIACAO),
        "convencoes": [
            "Percentual de desconto = desconto / valor bruto x 100: CONVENCAO DE SIMULACAO "
            "explicita; a V1 sec.9 nao define o denominador (nao e regra canonica).",
            "Impostos apos o desconto sao entrada explicita; nao se presume proporcionalidade.",
            "Provisao de risco de 2% recalculada sobre a nova Receita Liquida, uma unica vez.",
        ],
        "fonte": "Politica V1 sec.3, 4, 6, 8 e 9", "origem": POLITICA,
    }


# ---------------------------------------------------------------- fases (V1 sec.10)

def _cobertura(coberto, necessidade):
    falta = max(ZERO, necessidade - coberto)
    return {"necessidade": necessidade, "coberto": coberto, "cobre": falta == ZERO,
            "deficit": falta, "situacao": "COBERTA" if falta == ZERO else "DESCOBERTA"}


def avaliar_fases(e, fx):
    _keys(e, "fases", ("projeto", "fases", "alocacoes"), ("periodo", "referencia_pct"))
    p = periodo(fx, e.get("periodo"))
    proj = next((x for x in p["projetos"] if x["id"] == e["projeto"]), None)
    if proj is None:
        raise ControlError(f"projeto inexistente no periodo {p['id']}: {e['projeto']!r}")
    raw = _list(e["fases"], "fases", MAX_FASES)
    if not raw:
        raise ControlError("fases: informe ao menos uma fase")
    fases, fids = [], set()
    for i, f in enumerate(raw):
        c = f"fases[{i}]"
        _keys(f, c, ("id", "nome", "custos", "encargos"), ("compra_proposta",))
        fases.append({"id": ident(f["id"], c + ".id", fids),
                      "nome": text(f["nome"], c + ".nome", teste=False, maximo=120),
                      "custos": money(f["custos"], c + ".custos"),
                      "encargos": money(f["encargos"], c + ".encargos"),
                      "compra_proposta": money(f.get("compra_proposta") or "0.00",
                                               c + ".compra_proposta")})
    ref_raw = e.get("referencia_pct")
    if ref_raw is None:
        ref = [Decimal(x) for x in REFERENCIA_FASES] if len(fases) == len(REFERENCIA_FASES) else None
    else:
        ref = [pct(x, f"referencia_pct[{i}]")
               for i, x in enumerate(_list(ref_raw, "referencia_pct", MAX_FASES))]
        if len(ref) != len(fases):
            raise ControlError("referencia_pct: informe um percentual por fase")
        if sum(ref, ZERO) != CEM:
            raise ControlError(f"referencia_pct: soma {sum(ref, ZERO)}%, deve ser 100%")
    recs, faturas, a_receber = {}, set(), ZERO
    for f in p["faturas"]:
        if f["projeto"] != proj["id"]:
            continue
        faturas.add(f["id"])
        recebido = sum((r["valor"] for r in f["recebimentos"]), ZERO)
        a_receber += f["valor"] - recebido
        for r in f["recebimentos"]:
            recs[r["id"]] = {"id": r["id"], "fatura": f["id"], "data": r["data"], "valor": r["valor"]}
    usado = {rid: ZERO for rid in recs}
    cobertura = {f["id"]: ZERO for f in fases}
    pares = set()
    for i, a in enumerate(_list(e["alocacoes"], "alocacoes", MAX_ALOCACOES)):
        c = f"alocacoes[{i}]"
        _keys(a, c, ("fase", "recebimento", "valor"))
        if a["fase"] not in cobertura:
            raise ControlError(f"{c}: fase inexistente {a['fase']!r}")
        rid = a["recebimento"]
        if rid not in recs:
            if rid in faturas:
                raise ControlError(f"{c}: {rid} e titulo a receber, nao recebimento efetivo - "
                                   "a receber futuro nao cobre fase (V1 sec.10)")
            raise ControlError(f"{c}: recebimento efetivo inexistente no projeto: {rid!r}")
        if (a["fase"], rid) in pares:
            raise ControlError(f"{c}: recebimento {rid} alocado duas vezes a fase {a['fase']}")
        pares.add((a["fase"], rid))
        v = money(a["valor"], c + ".valor", positivo=True)
        usado[rid] += v
        if usado[rid] > recs[rid]["valor"]:
            raise ControlError(f"{c}: reutilizacao do recebimento {rid}: alocado {usado[rid]} acima do "
                               f"recebido {recs[rid]['valor']} - o mesmo recebimento nao cobre fases "
                               "diferentes em duplicidade")
        cobertura[a["fase"]] += v
    vc = proj["valor_contrato"]
    linhas = []
    for i, f in enumerate(fases):
        nec = f["custos"] + f["encargos"]
        ref_pct = ref[i] if ref else None
        ref_val = q(vc * ref_pct / CEM) if ref_pct is not None and vc else None
        linhas.append({
            **f, "coberto_recebido_efetivo": cobertura[f["id"]],
            "atual": _cobertura(cobertura[f["id"]], nec),
            "proposta": (_cobertura(cobertura[f["id"]], nec + f["compra_proposta"])
                         if f["compra_proposta"] > ZERO else None),
            "referencia_pct": ref_pct, "referencia_valor": ref_val,
            "referencia_cobre_necessidade": None if ref_val is None else ref_val >= nec})
    total = sum((r["valor"] for r in recs.values()), ZERO)
    alocado = sum(usado.values(), ZERO)
    return {
        "projeto": proj["id"], "nome": proj["nome"], "periodo": p["id"], "data_base": p["fim"],
        "valor_contrato": vc,
        "recebimentos_efetivos": [{**r, "alocado": usado[r["id"]], "saldo": r["valor"] - usado[r["id"]]}
                                  for r in sorted(recs.values(), key=lambda x: (x["data"], x["id"]))],
        "recebido_efetivo_total": total, "alocado_total": alocado, "nao_alocado": total - alocado,
        "a_receber_nao_conta": a_receber, "fases": linhas,
        "compra_aprovada": False,
        "regra": ("V1 sec.10: antes de aquisicao relevante, os valores JA recebidos devem cobrir os "
                  "desembolsos da fase, incluindo custos e encargos diretamente relacionados."),
        "convencoes": [
            "Somente recebimento efetivo (liquidado ate a data-base) cobre fase; a receber nao conta.",
            "Cada recebimento pode ser dividido entre fases, mas a soma alocada nunca excede o "
            "valor recebido (sem reutilizacao).",
            "Estado 'proposta' soma a compra proposta a necessidade da fase; e verificacao, nao "
            "aprovacao de compra.",
            "Referencia 50/40/10 e editavel por cenario (V1 sec.10: 'referencia adaptavel'); nao e "
            "regra de cobertura.",
        ],
        "fonte": "Politica V1 sec.10", "origem": POLITICA,
    }


# ---------------------------------------------------------------- reserva (V1 sec.12)

def validar_metodologia(raw):
    if not isinstance(raw, dict):
        raise ControlError("metodologia deve ser um objeto")
    extra = sorted(set(raw) - set(METODO_BASE))
    if extra:
        raise ControlError(f"metodologia desconhecida: {', '.join(extra)}")
    out = dict(METODO_BASE)
    for k, v in raw.items():
        opc = METODO_OPCOES[k]
        if isinstance(opc[0], int):
            if isinstance(v, str) and v.strip().isdigit():
                v = int(v.strip())
            if isinstance(v, bool) or not isinstance(v, int) or not opc[0] <= v <= opc[1]:
                raise ControlError(f"{k}: inteiro entre {opc[0]} e {opc[1]}")
        elif v not in opc:
            raise ControlError(f"{k}: use {' ou '.join(opc)}")
        out[k] = v
    return out


def avaliar_reserva(fx, cfg, periodo_id=None, caixa_livre=None):
    p = periodo(fx, periodo_id)
    livre = p["caixa_livre"] if caixa_livre in (None, "") else money(caixa_livre, "caixa_livre")
    janela, metodo = cfg["reserva_janela_meses"], cfg["reserva_metodo"]
    ym, meses = p["mes"], []
    for _ in range(janela):  # o mes da data-base nunca esta completo: comeca no anterior
        ym = prev_month(*ym)
        meses.append(ym)
    meses.reverse()
    linhas, ausentes = [], []
    for m in meses:
        if m not in fx["custos_fixos"]:
            linhas.append({"mes": month_id(m), "valor": None, "situacao": "SEM REGISTRO"})
            ausentes.append(month_id(m))
        elif fx["custos_fixos"][m] is None:
            linhas.append({"mes": month_id(m), "valor": None, "situacao": "VALOR DESCONHECIDO"})
            ausentes.append(month_id(m))
        else:
            linhas.append({"mes": month_id(m), "valor": fx["custos_fixos"][m], "situacao": "INFORMADO"})
    base = meta = cobertura = deficit = None
    if ausentes:
        situacao = "DESCONHECIDA"
        lacuna = (f"custos fixos ausentes em {', '.join(ausentes)}: historico ausente e desconhecido, "
                  "nao zero")
    else:
        vals = [x["valor"] for x in linhas]
        soma, n = sum(vals, ZERO), len(vals)
        if metodo == "media":
            base, meta = soma / n, soma * RESERVA_META_MESES / n
        else:
            s, k = sorted(vals), n // 2
            base = s[k] if n % 2 else (s[k - 1] + s[k]) / 2
            meta = base * RESERVA_META_MESES
        lacuna = None
        if base <= ZERO:
            situacao, base, meta = "NAO RESOLVIDA", None, None
            lacuna = "custo fixo medio zero e implausivel: tratado como nao resolvido"
        else:
            cobertura = livre / base
            deficit = max(ZERO, meta - livre)
            situacao = "ATINGIDA" if livre >= meta else "ABAIXO DA META"
    return {
        "periodo": p["id"], "data_base": p["fim"], "caixa_livre": livre,
        "caixa_restrito": p["caixa_restrito"], "restrito_conta_na_reserva": False,
        "janela_meses": janela, "metodo": metodo, "meses": linhas, "base_mensal": base,
        "meta_meses": RESERVA_META_MESES, "meta_valor": meta, "cobertura_meses": cobertura,
        "deficit": deficit, "situacao": situacao, "lacuna": lacuna,
        "origem": {"meta_3_meses": POLITICA + " V1 sec.12", "janela": RASCUNHO, "metodo": RASCUNHO,
                   "mes_completo": CONVENCAO + ": o mes da data-base nunca conta; usam-se so meses "
                                               "ja encerrados"},
        "notas": ["A receber e faturamento futuro nao substituem a reserva (V1 sec.12) e nao entram "
                  "no calculo.",
                  "Caixa restrito aparece separado e nao conta como reserva disponivel."],
        "fonte": "Politica V1 sec.12",
    }
