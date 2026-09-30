#!/usr/bin/env python3
"""VOICE CFO TESTE - sandbox financeiro local com dados SINTETICOS.

Contas a pagar/receber com liquidacoes parciais e aging, caixa 30/60/90 com
cenarios separados do estado corrente, margem de contribuicao por projeto
(Politica V1 secoes 3, 4, 6 e 7), posicao/exposicao de caixa corrente e pro forma
(Clarificacao V1.1), orcado x realizado gerencial e estimativa operacional
consolidada com base e janela declaradas.

Somente biblioteca padrao. Nao consulta Zoho nem servico externo, nao usa
credenciais, nao executa transacao. So aceita arquivos marcados como sinteticos
com entidades identificadas como TESTE. Politicas canonicas sao apenas LIDAS
(caminho + sha256). Nenhuma aprovacao humana e registrada ou simulada: o registro
de execucao usa sempre ator "sistema"."""
import argparse
import hashlib
import html
import json
import os
import re
import sys
import unicodedata
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMO = os.path.join(ROOT, "data", "cfo-demo.json")
FORMATO = "voice-cfo-sintetico-v1"
ATOR = "sistema"
MAX_BYTES = 2 * 1024 * 1024
MAX_ATRASO = 365
ZERO, CENT, CEM = Decimal("0"), Decimal("0.01"), Decimal("100")
RISCO_PCT = Decimal("2")             # V1 secao 6: 2% da Receita Liquida
LIMIAR_EXPOSICAO_PCT = Decimal("10")  # V1.1 secao 9: gatilho "superior a 10%"
HORIZONTES = (30, 60, 90)
AGING = ((0, "a vencer"), (30, "1-30 dias"), (60, "31-60 dias"), (90, "61-90 dias"))
AGING_ACIMA = "acima de 90 dias"
AGING_NOMES = tuple(n for _, n in AGING) + (AGING_ACIMA,)
MONEY_RE = re.compile(r"\d{1,13}(\.\d{1,2})?")
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
ID_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}")
V1_SHA256_REGISTRADO = "4888E7BAEFCECD1EC5DC2186D774AAD601B59F7F7B57E0119A16E6472F0A9D68"
PAD = "04 - PADROES"
FONTES = (
    ("Politica V1", PAD + "/VOICE - Politica de Saude Financeira - V1.md",
     "sec.3 faixas; sec.4 formula; sec.6 provisao 2% RL; sec.7 custos fixos fora da MC; "
     "sec.13 necessidade de caixa 30/60/90"),
    ("Clarificacao V1.1", PAD + "/VOICE - Politica de Saude Financeira - V1.1 - "
     "Clarificacao de posicao e exposicao de caixa.md",
     "sec.4-10 posicao, exposicao, Valor do Contrato, falha fechada, gatilho >10%, pro forma"),
    ("Calculo da margem V2", PAD + "/VOICE - Calculo oficial da margem de contribuicao - V2.md",
     "Receita Liquida, MC em reais e %, markup nao substitui MC"),
    ("Faixas de margem V2", PAD + "/VOICE - Faixas de margem e alcada de aprovacao - V2.md",
     "VERDE / ACEITAVEL / ATENCAO / NAO APROVADO"),
    ("Provisao de risco", PAD + "/VOICE - Provisao de risco do projeto.md",
     "2% da Receita Liquida, tratada como custo variavel"),
)
BANNER = ("DADOS SINTETICOS - TESTE. Nenhum numero deste painel descreve a VOICE real. "
          "Dados do Zoho NAO foram usados (declarados nao confiaveis pelo usuario). "
          "Software testado nao significa financas reais corretas.")
ESCOPO = (
    (1, "Validacao estrita de dados (Decimal, datas, IDs, sobrepagamento, ausente nunca vira zero)",
     "IMPLEMENTADO - dados sinteticos"),
    (2, "Contas a pagar/receber com liquidacoes parciais, saldo em aberto e aging na data-base",
     "IMPLEMENTADO - dados sinteticos"),
    (3, "Caixa 30/60/90 com cenarios (atraso de recebimentos, gasto proposto) separados do corrente",
     "IMPLEMENTADO - dados sinteticos"),
    (4, "Margem de contribuicao por projeto (V1 sec.4, provisao 2% uma unica vez, sem rateio fixo)",
     "IMPLEMENTADO - dados sinteticos"),
    (5, "Posicao e exposicao de caixa corrente e pro forma (V1.1)",
     "IMPLEMENTADO - dados sinteticos"),
    (6, "Orcado x realizado gerencial e estimativa operacional consolidada",
     "IMPLEMENTADO PARCIAL - estimativa gerencial, nao e demonstrativo contabil"),
    (7, "Painel HTML/TXT, interface local e registro de execucao (ator sistema)",
     "IMPLEMENTADO - dados sinteticos"),
    (8, "Operacao real: reconciliacao com dados de producao, agendamento, autenticacao, "
        "aprovacoes reais da direcao", "NAO INICIADO"),
)
PENDENCIAS = (
    "Reconciliacao e validacao dos lancamentos reais (fase posterior; Zoho atual nao confiavel).",
    "Agendamento/execucao continua, autenticacao de usuarios e registro de aprovacoes reais da direcao.",
    "Reserva de caixa (V1 sec.12): a base 'custos fixos medios' nao tem janela/metodo definidos.",
    "Descontos e alcada (V1 sec.9), ticket (sec.2) e cobertura por fase (sec.10) nao calculados.",
    "Indicadores sec.13 restantes: inadimplencia, prazo medio, concentracao por cliente/parceiro.",
    "Consolidacao no VOICE_360: NAO realizada; nenhuma nota canonica foi criada ou alterada.",
)
CONVENCOES = (
    "Liquidacao com data posterior a data-base e ignorada: o titulo continua em aberto nessa data.",
    "Titulo com emissao posterior a data-base nao existe nessa data (fora de tudo).",
    "Saldo de caixa informado ja inclui liquidacoes ate a data do saldo; somam-se as posteriores "
    "ate a data-base.",
    "Projecao (convencao da ferramenta, nao politica): a pagar vencido entra como saida imediata; "
    "a receber vencido NAO entra como entrada e aparece separado; a receber com vencimento na "
    "propria data-base entra como entrada.",
    "Saldo de caixa informado pode ser negativo (saldo devedor); demais valores nunca.",
    "Projeto com data de contrato posterior a data-base fica fora das tabelas de projeto.",
    "Compromisso firme do projeto = titulo a pagar de natureza direto_variavel emitido ate a "
    "data-base; compromissos = pago + saldo em aberto (sem dupla contagem).",
    "Realizado gerencial = comprometido firme (pago + a pagar), nao apenas o pago.",
    "Faixa de margem pelo valor exato: >=35 VERDE; >=30 ACEITAVEL; >=25 ATENCAO; abaixo NAO APROVADO "
    "(a fonte escreve 30,00-34,99; valores entre 34,99 e 35 sao tratados como ACEITAVEL).",
    "Provisao de risco arredondada ao centavo (meio para cima); categoria 'provisao de risco' "
    "informada no arquivo e rejeitada para nao contar duas vezes.",
    "'Valor Bruto Vendido' nao e definido pela fonte: usa-se o valor informado no arquivo sintetico.",
    "Margem operacional nao e comparada a meta de 12-15% (V1 sec.13): a fonte nao define a base.",
)


class CFOError(Exception):
    pass


# ---------------------------------------------------------------- validacao

def _sem_duplicadas(pares):
    d = {}
    for k, v in pares:
        if k in d:
            raise CFOError(f"chave JSON duplicada: {k!r}")
        d[k] = v
    return d


def _constante(nome):
    raise CFOError(f"valor JSON nao permitido: {nome}")


def _chaves(obj, ctx, obrig):
    if not isinstance(obj, dict):
        raise CFOError(f"{ctx}: deve ser objeto")
    falt = [k for k in obrig if k not in obj]
    if falt:
        raise CFOError(f"{ctx}: campo(s) ausente(s): {', '.join(falt)} (ausente nunca vira zero)")
    extra = sorted(set(obj) - set(obrig))
    if extra:
        raise CFOError(f"{ctx}: campo(s) desconhecido(s): {', '.join(extra)}")


def _lista(v, ctx):
    if not isinstance(v, list):
        raise CFOError(f"{ctx}: deve ser lista")
    return v


def dinheiro(v, ctx, positivo=False, assinado=False):
    candidato = v[1:] if assinado and isinstance(v, str) and v.startswith('-') else v
    if not isinstance(v, str) or not MONEY_RE.fullmatch(candidato):
        raise CFOError(f"{ctx}: valor monetario invalido {v!r} "
                       "(texto '1234.56', nao negativo, ate 2 casas, sem separador de milhar)")
    d = Decimal(v)
    if positivo and d <= ZERO:
        raise CFOError(f"{ctx}: deve ser maior que zero")
    return d


def data_iso(v, ctx):
    if not isinstance(v, str) or not DATE_RE.fullmatch(v):
        raise CFOError(f"{ctx}: data invalida {v!r} (use AAAA-MM-DD)")
    try:
        return date.fromisoformat(v)
    except ValueError:
        raise CFOError(f"{ctx}: data inexistente {v!r}")


def texto(v, ctx, teste=True):
    if not isinstance(v, str) or not v.strip():
        raise CFOError(f"{ctx}: texto obrigatorio")
    if teste and "TESTE" not in v:
        raise CFOError(f"{ctx}: entidade sintetica deve conter 'TESTE' ({v!r})")
    return v


def ident(v, ctx, vistos):
    if not isinstance(v, str) or not ID_RE.fullmatch(v):
        raise CFOError(f"{ctx}: ID invalido {v!r}")
    if v in vistos:
        raise CFOError(f"{ctx}: ID duplicado {v!r}")
    vistos.add(v)
    return v


def ref_projeto(v, ctx, ids):
    if v is not None and (not isinstance(v, str) or v not in ids):
        raise CFOError(f"{ctx}: projeto inexistente {v!r}")
    return v


def _norm(s):
    s = unicodedata.normalize("NFKD", s)
    return " ".join("".join(c for c in s if not unicodedata.combining(c)).lower()
                    .replace("_", " ").split())


def categoria(v, ctx):
    texto(v, ctx, teste=False)
    n = _norm(v)
    if "provisao de risco" in n or n in ("risco", "provisao risco"):
        raise CFOError(f"{ctx}: provisao de risco e calculada pela ferramenta (2% da Receita "
                       "Liquida) e nao pode ser informada como custo (evita contagem dupla)")
    return v


def validar(d):
    _chaves(d, "raiz", ("formato", "sintetico", "meta", "caixa", "projetos", "titulos", "propostas"))
    if d["formato"] != FORMATO:
        raise CFOError(f"raiz: formato deve ser {FORMATO!r}")
    if d["sintetico"] is not True:
        raise CFOError("raiz: 'sintetico' deve ser true - esta ferramenta so aceita dados TESTE")
    _chaves(d["meta"], "meta", ("descricao",))
    _chaves(d["caixa"], "caixa", ("saldo", "data"))
    out = {"meta": {"descricao": texto(d["meta"]["descricao"], "meta.descricao")},
           "caixa": {"saldo": dinheiro(d["caixa"]["saldo"], "caixa.saldo", assinado=True),
                     "data": data_iso(d["caixa"]["data"], "caixa.data")},
           "projetos": [], "titulos": [], "propostas": []}
    ids_p, ids_t, ids_l, ids_pr = set(), set(), set(), set()
    for i, p in enumerate(_lista(d["projetos"], "projetos")):
        c = f"projetos[{i}]"
        _chaves(p, c, ("id", "nome", "cliente", "data_contrato", "valor_contrato",
                       "valor_bruto_vendido", "descontos", "impostos_venda", "custos_orcados"))
        cats, custos = set(), []
        for j, co in enumerate(_lista(p["custos_orcados"], c + ".custos_orcados")):
            cc = f"{c}.custos_orcados[{j}]"
            _chaves(co, cc, ("categoria", "valor"))
            cat = categoria(co["categoria"], cc + ".categoria")
            if _norm(cat) in cats:
                raise CFOError(f"{cc}: categoria repetida {cat!r}")
            cats.add(_norm(cat))
            custos.append({"categoria": cat, "valor": dinheiro(co["valor"], cc + ".valor")})
        out["projetos"].append({
            "id": ident(p["id"], c + ".id", ids_p),
            "nome": texto(p["nome"], c + ".nome"),
            "cliente": texto(p["cliente"], c + ".cliente"),
            "data_contrato": data_iso(p["data_contrato"], c + ".data_contrato"),
            "valor_contrato": (None if p["valor_contrato"] is None
                               else dinheiro(p["valor_contrato"], c + ".valor_contrato")),
            "valor_bruto_vendido": dinheiro(p["valor_bruto_vendido"], c + ".valor_bruto_vendido",
                                            positivo=True),
            "descontos": dinheiro(p["descontos"], c + ".descontos"),
            "impostos_venda": dinheiro(p["impostos_venda"], c + ".impostos_venda"),
            "custos_orcados": custos})
    for i, t in enumerate(_lista(d["titulos"], "titulos")):
        c = f"titulos[{i}]"
        if not isinstance(t, dict) or t.get("tipo") not in ("pagar", "receber"):
            raise CFOError(f"{c}: 'tipo' deve ser 'pagar' ou 'receber'")
        campos = ("id", "tipo", "projeto", "contraparte", "emissao", "vencimento", "valor",
                  "liquidacoes")
        _chaves(t, c, campos + (("natureza", "categoria") if t["tipo"] == "pagar" else ()))
        n = {"id": ident(t["id"], c + ".id", ids_t), "tipo": t["tipo"],
             "contraparte": texto(t["contraparte"], c + ".contraparte"),
             "emissao": data_iso(t["emissao"], c + ".emissao"),
             "vencimento": data_iso(t["vencimento"], c + ".vencimento"),
             "valor": dinheiro(t["valor"], c + ".valor", positivo=True),
             "projeto": ref_projeto(t["projeto"], c + ".projeto", ids_p),
             "natureza": None, "categoria": None}
        if n["vencimento"] < n["emissao"]:
            raise CFOError(f"{c}: vencimento anterior a emissao")
        if t["tipo"] == "pagar":
            if t["natureza"] not in ("direto_variavel", "fixo"):
                raise CFOError(f"{c}.natureza: use 'direto_variavel' ou 'fixo'")
            if t["natureza"] == "direto_variavel" and n["projeto"] is None:
                raise CFOError(f"{c}: custo direto/variavel exige projeto")
            if t["natureza"] == "fixo" and n["projeto"] is not None:
                raise CFOError(f"{c}: custo fixo nao pode ser atribuido a projeto (V1 sec.7)")
            n["natureza"], n["categoria"] = t["natureza"], categoria(t["categoria"], c + ".categoria")
        liqs, total = [], ZERO
        for j, lq in enumerate(_lista(t["liquidacoes"], c + ".liquidacoes")):
            cl = f"{c}.liquidacoes[{j}]"
            _chaves(lq, cl, ("id", "data", "valor"))
            li = {"id": ident(lq["id"], cl + ".id", ids_l), "data": data_iso(lq["data"], cl + ".data"),
                  "valor": dinheiro(lq["valor"], cl + ".valor", positivo=True)}
            if li["data"] < n["emissao"]:
                raise CFOError(f"{cl}: liquidacao anterior a emissao")
            total += li["valor"]
            liqs.append(li)
        if total > n["valor"]:
            raise CFOError(f"{c}: liquidacoes somam {total} e excedem o valor {n['valor']} "
                           "(sobrepagamento)")
        n["liquidacoes"] = sorted(liqs, key=lambda x: (x["data"], x["id"]))
        out["titulos"].append(n)
    for i, pr in enumerate(_lista(d["propostas"], "propostas")):
        c = f"propostas[{i}]"
        _chaves(pr, c, ("id", "projeto", "descricao", "valor", "data_prevista"))
        out["propostas"].append({
            "id": ident(pr["id"], c + ".id", ids_pr),
            "projeto": ref_projeto(pr["projeto"], c + ".projeto", ids_p),
            "descricao": texto(pr["descricao"], c + ".descricao"),
            "valor": dinheiro(pr["valor"], c + ".valor", positivo=True),
            "data_prevista": data_iso(pr["data_prevista"], c + ".data_prevista")})
    return out


def carregar_bytes(raw):
    if len(raw) > MAX_BYTES:
        raise CFOError("arquivo maior que 2 MB")
    try:
        txt = raw.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        raise CFOError(f"arquivo nao e UTF-8 ({e})")
    try:
        d = json.loads(txt, object_pairs_hook=_sem_duplicadas, parse_constant=_constante)
    except json.JSONDecodeError as e:
        raise CFOError(f"JSON invalido ({e})")
    return validar(d)


def ler_arquivo(path):
    try:
        if os.path.getsize(path) > MAX_BYTES:
            raise CFOError("arquivo maior que 2 MB")
        with open(path, "rb") as f:
            return f.read()
    except OSError as e:
        raise CFOError(f"nao foi possivel ler {path}: {e}")


def carregar_arquivo(path):
    return carregar_bytes(ler_arquivo(path))


# ---------------------------------------------------------------- calculo

def faixa_aging(dias):
    for lim, nome in AGING:
        if dias <= lim:
            return nome
    return AGING_ACIMA


def faixa_margem(pct):
    if pct is None:
        return "NAO RESOLVIDO"
    if pct >= 35:
        return "VERDE"
    if pct >= 30:
        return "ACEITAVEL"
    if pct >= 25:
        return "ATENCAO"
    return "NAO APROVADO"


def exposicao(posicao, valor_contrato):
    """V1.1 sec.7-9: exposicao = max(0, -posicao); % so com Valor do Contrato > 0;
    gatilho apenas quando SUPERIOR a 10% (10,00% exato nao aciona)."""
    exp = max(ZERO, -posicao)
    if valor_contrato is None or valor_contrato <= ZERO:
        return {"posicao": posicao, "exposicao": exp, "pct": None,
                "gatilho": "NAO RESOLVIDO (falha fechada)"}
    return {"posicao": posicao, "exposicao": exp, "pct": exp * CEM / valor_contrato,
            "gatilho": ("ACIONADO" if exp * CEM > LIMIAR_EXPOSICAO_PCT * valor_contrato
                        else "NAO ACIONADO")}


def margem(rl, custos, risco):
    if rl <= ZERO:
        return {"custos": custos, "mc": None, "pct": None, "faixa": "NAO RESOLVIDO"}
    mc = rl - custos - risco
    pct = mc * CEM / rl
    return {"custos": custos, "mc": mc, "pct": pct, "faixa": faixa_margem(pct)}


def analisar(dados, as_of, atraso_dias=0, propostas=(), janela=None):
    if dados["caixa"]["data"] > as_of:
        raise CFOError("data do saldo de caixa posterior a data-base")
    if isinstance(atraso_dias, bool) or not isinstance(atraso_dias, int) \
            or not 0 <= atraso_dias <= MAX_ATRASO:
        raise CFOError(f"atraso de recebimentos deve ser inteiro entre 0 e {MAX_ATRASO} dias")
    por_id = {p["id"]: p for p in dados["propostas"]}
    if len(set(propostas)) != len(propostas):
        raise CFOError("proposta selecionada mais de uma vez")
    faltam = [x for x in propostas if x not in por_id]
    if faltam:
        raise CFOError(f"proposta inexistente: {', '.join(faltam)}")
    sel = [por_id[x] for x in propostas]
    ini, fim = janela or (as_of.replace(day=1), as_of)
    if ini > fim or fim > as_of:
        raise CFOError("janela invalida: exige inicio <= fim <= data-base")

    tits = [t for t in dados["titulos"] if t["emissao"] <= as_of]
    pago = {t["id"]: sum((l["valor"] for l in t["liquidacoes"] if l["data"] <= as_of), ZERO)
            for t in tits}
    aberto = {t["id"]: t["valor"] - pago[t["id"]] for t in tits}
    liq_futuras = sum(1 for t in tits for l in t["liquidacoes"] if l["data"] > as_of)
    receber = [t for t in tits if t["tipo"] == "receber"]
    pagar = [t for t in tits if t["tipo"] == "pagar"]

    aging = {tp: {n: ZERO for n in AGING_NOMES} for tp in ("receber", "pagar")}
    abertos = []
    for t in tits:
        if aberto[t["id"]] > ZERO:
            dias = (as_of - t["vencimento"]).days
            fx = faixa_aging(dias)
            aging[t["tipo"]][fx] += aberto[t["id"]]
            abertos.append({"id": t["id"], "tipo": t["tipo"], "contraparte": t["contraparte"],
                            "projeto": t["projeto"], "vencimento": t["vencimento"],
                            "valor": t["valor"], "pago": pago[t["id"]], "aberto": aberto[t["id"]],
                            "dias_atraso": max(0, dias), "faixa": fx})
    abertos.sort(key=lambda a: (a["tipo"], a["vencimento"], a["id"]))

    cd = dados["caixa"]["data"]
    mov = ZERO
    for t in dados["titulos"]:
        for l in t["liquidacoes"]:
            if cd < l["data"] <= as_of:
                mov += l["valor"] if t["tipo"] == "receber" else -l["valor"]
    saldo = dados["caixa"]["saldo"] + mov

    def projetar(atraso, props):
        linhas = []
        for h in HORIZONTES:
            lim = as_of + timedelta(days=h)
            ent = sum((aberto[t["id"]] for t in receber if t["vencimento"] >= as_of
                       and t["vencimento"] + timedelta(days=atraso) <= lim), ZERO)
            sai = sum((aberto[t["id"]] for t in pagar if t["vencimento"] <= lim), ZERO)
            pr = sum((p["valor"] for p in props if p["data_prevista"] <= lim), ZERO)
            final = saldo + ent - sai - pr
            linhas.append({"horizonte": h, "entradas": ent, "saidas": sai, "propostas": pr,
                           "saldo_final": final, "necessidade": max(ZERO, -final)})
        return linhas

    projetos = []
    for p in dados["projetos"]:
        if p["data_contrato"] > as_of:
            continue
        pg = [t for t in pagar if t["projeto"] == p["id"]]
        rc = [t for t in receber if t["projeto"] == p["id"]]
        recebido = sum((pago[t["id"]] for t in rc), ZERO)
        pago_p = sum((pago[t["id"]] for t in pg), ZERO)
        aberto_p = sum((aberto[t["id"]] for t in pg), ZERO)
        compromissos = pago_p + aberto_p
        posicao = recebido - compromissos
        vc = p["valor_contrato"]
        prop_p = [x for x in sel if x["projeto"] == p["id"]]
        proposto = sum((x["valor"] for x in prop_p), ZERO)
        rl = p["valor_bruto_vendido"] - p["descontos"] - p["impostos_venda"]
        risco = (rl * RISCO_PCT / CEM).quantize(CENT, ROUND_HALF_UP) if rl > ZERO else None
        orcado = sum((c["valor"] for c in p["custos_orcados"]), ZERO)
        cats = {}
        for c in p["custos_orcados"]:
            cats.setdefault(_norm(c["categoria"]), [c["categoria"], ZERO, ZERO, ZERO])[1] += c["valor"]
        for t in pg:
            e = cats.setdefault(_norm(t["categoria"]), [t["categoria"], ZERO, ZERO, ZERO])
            e[2] += t["valor"]
            e[3] += pago[t["id"]]
        projetos.append({
            "id": p["id"], "nome": p["nome"], "cliente": p["cliente"],
            "data_contrato": p["data_contrato"], "valor_contrato": vc,
            "receita_liquida": rl, "risco": risco,
            "margem_orcada": margem(rl, orcado, risco or ZERO),
            "margem_realizada": margem(rl, compromissos, risco or ZERO),
            "categorias": [{"categoria": v[0], "orcado": v[1], "realizado": v[2], "pago": v[3],
                            "variacao": v[2] - v[1]} for _, v in sorted(cats.items())],
            "recebido": recebido, "pago": pago_p, "firme_aberto": aberto_p,
            "compromissos": compromissos,
            "corrente": exposicao(posicao, vc),
            "proposto": proposto, "propostas": [x["id"] for x in prop_p],
            "pro_forma": exposicao(posicao - proposto, vc) if prop_p else None})

    no_j = [p for p in projetos if ini <= p["data_contrato"] <= fim]
    fixos = sum((t["valor"] for t in pagar if t["natureza"] == "fixo"
                 and ini <= t["emissao"] <= fim), ZERO)
    validos = [p for p in no_j if p["receita_liquida"] > ZERO]
    rl_tot = sum((p["receita_liquida"] for p in validos), ZERO)
    consolidado = {"inicio": ini, "fim": fim, "projetos": [p["id"] for p in validos],
                   "excluidos": [p["id"] for p in no_j if p["receita_liquida"] <= ZERO],
                   "receita_liquida": rl_tot, "custos_fixos": fixos}
    for base in ("orcada", "realizada"):
        mc = sum((p["margem_" + base]["mc"] for p in validos), ZERO)
        res = mc - fixos
        consolidado[base] = {"mc": mc, "resultado": res,
                             "pct": res * CEM / rl_tot if rl_tot > ZERO else None}

    corrente, cenario = projetar(0, []), projetar(atraso_dias, sel)
    return {"as_of": as_of, "atraso_dias": atraso_dias, "propostas_sel": [p["id"] for p in sel],
            "caixa_saldo_informado": dados["caixa"]["saldo"], "caixa_data": cd, "saldo": saldo,
            "corrente": corrente, "cenario": cenario,
            "receber_vencido_nao_projetado": sum((aberto[t["id"]] for t in receber
                                                  if t["vencimento"] < as_of), ZERO),
            "titulos_futuros_ignorados": len(dados["titulos"]) - len(tits),
            "liquidacoes_futuras_ignoradas": liq_futuras,
            "aging": aging, "abertos": abertos, "projetos": projetos,
            "consolidado": consolidado, "recomendacoes": recomendacoes(projetos, corrente, cenario)}


def recomendacoes(projetos, corrente, cenario):
    r, P = [], "PROPOSTA (nao e aprovacao; nenhuma aprovacao registrada): "
    for p in projetos:
        g = p["corrente"]["gatilho"]
        if g == "ACIONADO":
            r.append(P + f"{p['id']}: exposicao corrente superior a 10% do Valor do Contrato - "
                         "exige autorizacao expressa da direcao (V1.1 sec.9).")
        elif g.startswith("NAO RESOLVIDO"):
            r.append(P + f"{p['id']}: determinar o Valor do Contrato; decisao por percentual "
                         "falha fechada (V1.1 sec.8).")
        pf = p["pro_forma"]
        if pf and pf["gatilho"] == "ACIONADO":
            r.append(P + f"{p['id']}: gasto proposto levaria a exposicao pro forma acima de 10% - "
                         "exige autorizacao expressa da direcao ANTES de assumir (V1.1 sec.10).")
        for base in ("orcada", "realizada"):
            f = p["margem_" + base]["faixa"]
            if f == "ATENCAO":
                r.append(P + f"{p['id']}: margem {base} em ATENCAO - so com autorizacao expressa "
                             "da direcao e justificativa registrada (V1 sec.3).")
            elif f == "NAO APROVADO":
                r.append(P + f"{p['id']}: margem {base} abaixo de 25% - nao e operacao comercial "
                             "normal (V1 sec.3).")
    for rot, linhas in (("corrente", corrente), ("cenario", cenario)):
        for l in linhas:
            if l["necessidade"] > ZERO:
                r.append(P + f"caixa {rot}: necessidade de {brl(l['necessidade'])} em "
                             f"{l['horizonte']} dias - avaliar cobranca, prazo ou adiamento.")
                break
    return r


# ---------------------------------------------------------------- fontes e formato

def cofre_padrao(root):
    return os.path.normpath(os.path.join(root, os.pardir, os.pardir, os.pardir))


def fontes(vault):
    out = []
    for nome, rel, uso in FONTES:
        p = os.path.join(vault, *rel.split("/"))
        try:
            with open(p, "rb") as f:
                h = hashlib.sha256(f.read()).hexdigest().upper()
        except OSError:
            h = "INDISPONIVEL"
        out.append({"nome": nome, "caminho": rel, "sha256": h, "uso": uso})
    return out


def brl(v):
    if v is None:
        return "-"
    q = v.quantize(CENT, ROUND_HALF_UP)
    s = format(abs(q), ",.2f").replace(",", "X").replace(".", ",").replace("X", ".")
    return ("-" if q < 0 else "") + "R$ " + s


def pct(v, casas=2):
    if v is None:
        return "NAO RESOLVIDO"
    return str(v.quantize(Decimal(1).scaleb(-casas), ROUND_HALF_UP)).replace(".", ",") + "%"


def dt(d):
    return d.strftime("%d/%m/%Y")


def secoes(res, meta):
    S = []

    def sec(titulo, notas=(), tabelas=()):
        S.append({"titulo": titulo, "notas": list(notas), "tabelas": list(tabelas)})

    sec("Execucao", [
        f"Entrada: {meta['entrada']} (sha256 {meta['entrada_sha256']})",
        f"Descricao do arquivo: {meta['descricao']}",
        f"Data-base (as_of): {dt(res['as_of'])} | Gerado em: {meta['gerado_em']} | ator: {ATOR}",
        f"Cenario: atraso de recebimentos {res['atraso_dias']} dia(s); gastos propostos "
        f"selecionados: {', '.join(res['propostas_sel']) or 'nenhum'}",
        "Nenhuma transacao externa executada. Nenhuma aprovacao humana registrada ou simulada."])
    sec("Escopo CFO - 8 etapas (o CFO NAO esta 100% concluido)", ["Pendente:"] + list(PENDENCIAS),
        [{"cab": ["#", "Etapa", "Status"], "linhas": [[str(n), e, s] for n, e, s in ESCOPO]}])
    v1 = next(f for f in meta["fontes"] if f["nome"] == "Politica V1")
    sec("Fontes de regra (somente leitura)", [
        "Regras implementadas a partir da V1 ativa e da clarificacao V1.1 ativa. Memorias derivadas V2 permanecem draft/unverified; nao foram promovidas.",
        "Politica V1 confere com o sha256 registrado na V1.1: "
        + ("SIM" if v1["sha256"] == V1_SHA256_REGISTRADO else "NAO / indisponivel - verificar")],
        [{"cab": ["Fonte", "Caminho", "sha256", "Regras usadas"],
          "linhas": [[f["nome"], f["caminho"], f["sha256"], f["uso"]] for f in meta["fontes"]]}])

    def tab_caixa(linhas):
        return {"cab": ["Horizonte", "Entradas", "Saidas", "Gastos propostos", "Saldo projetado",
                        "Necessidade de caixa"],
                "linhas": [[f"{l['horizonte']} dias", brl(l["entradas"]), brl(l["saidas"]),
                            brl(l["propostas"]), brl(l["saldo_final"]), brl(l["necessidade"])]
                           for l in linhas]}
    sec("Caixa 30/60/90 - CORRENTE (sem cenario)", [
        f"Saldo informado {brl(res['caixa_saldo_informado'])} em {dt(res['caixa_data'])}; "
        f"saldo na data-base {brl(res['saldo'])}.",
        f"A receber vencido NAO projetado como entrada: {brl(res['receber_vencido_nao_projetado'])}.",
        f"Titulos com emissao futura ignorados: {res['titulos_futuros_ignorados']}; "
        f"liquidacoes futuras ignoradas: {res['liquidacoes_futuras_ignoradas']}."],
        [tab_caixa(res["corrente"])])
    sec("Caixa 30/60/90 - CENARIO (simulacao; nao altera o corrente)", [
        f"Atraso aplicado a recebimentos a vencer: {res['atraso_dias']} dia(s). Gastos propostos "
        "nao sao compromissos assumidos."], [tab_caixa(res["cenario"])])
    sec("Contas a receber e a pagar - aging na data-base", [], [
        {"cab": ["Faixa", "A receber", "A pagar"],
         "linhas": [[n, brl(res["aging"]["receber"][n]), brl(res["aging"]["pagar"][n])]
                    for n in AGING_NOMES]},
        {"cab": ["Titulo", "Tipo", "Contraparte", "Projeto", "Vencimento", "Valor", "Liquidado",
                 "Em aberto", "Dias atraso", "Faixa"],
         "linhas": [[a["id"], a["tipo"], a["contraparte"], a["projeto"] or "-", dt(a["vencimento"]),
                     brl(a["valor"]), brl(a["pago"]), brl(a["aberto"]), str(a["dias_atraso"]),
                     a["faixa"]] for a in res["abertos"]]}])
    ps = res["projetos"]
    sec("Margem de contribuicao por projeto", [
        "Receita Liquida = Valor Bruto - descontos - impostos sobre a venda; MC = RL - custos "
        "diretos e variaveis - provisao de risco 2% RL (uma unica vez). Custos fixos NAO rateados.",
        "Base orcada = custos orcados do projeto; base realizada = compromissos firmes ate a data-base."],
        [{"cab": ["Projeto", "Nome", "Receita Liquida", "Provisao 2%", "Custos orcados",
                  "MC orcada", "% / faixa", "Custos realizados", "MC realizada", "% / faixa"],
          "linhas": [[p["id"], p["nome"], brl(p["receita_liquida"]), brl(p["risco"]),
                      brl(p["margem_orcada"]["custos"]), brl(p["margem_orcada"]["mc"]),
                      f"{pct(p['margem_orcada']['pct'])} {p['margem_orcada']['faixa']}",
                      brl(p["margem_realizada"]["custos"]), brl(p["margem_realizada"]["mc"]),
                      f"{pct(p['margem_realizada']['pct'])} {p['margem_realizada']['faixa']}"]
                     for p in ps]}])
    sec("Orcado x realizado gerencial por categoria", [
        "Realizado = comprometido firme (pago + a pagar) ate a data-base; variacao = realizado - orcado."],
        [{"cab": ["Projeto", "Categoria", "Orcado", "Realizado", "Pago", "Variacao"],
          "linhas": [[p["id"], c["categoria"], brl(c["orcado"]), brl(c["realizado"]), brl(c["pago"]),
                      brl(c["variacao"])] for p in ps for c in p["categorias"]]}])
    sec("Exposicao de caixa - ESTADO CORRENTE (V1.1)", [
        "Posicao = recebido - (pago + compromissos firmes nao pagos); exposicao = max(0, -posicao); "
        "gatilho somente se exposicao SUPERIOR a 10% do Valor do Contrato."],
        [{"cab": ["Projeto", "Valor do Contrato", "Recebido", "Pago", "Firme a pagar", "Posicao",
                  "Exposicao", "Exposicao %", "Gatilho 10%"],
          "linhas": [[p["id"], brl(p["valor_contrato"]) if p["valor_contrato"] else "NAO RESOLVIDO",
                      brl(p["recebido"]), brl(p["pago"]), brl(p["firme_aberto"]),
                      brl(p["corrente"]["posicao"]), brl(p["corrente"]["exposicao"]),
                      pct(p["corrente"]["pct"], 4), p["corrente"]["gatilho"]] for p in ps]}])
    pf = [p for p in ps if p["pro_forma"]]
    sec("Exposicao de caixa - ESTADO PRO FORMA (simulacao de gasto proposto)",
        ["Gasto proposto nao e compromisso assumido."] if pf else
        ["Nenhum gasto proposto de projeto selecionado."],
        [{"cab": ["Projeto", "Propostas", "Proposto", "Posicao pro forma", "Exposicao pro forma",
                  "Exposicao pro forma %", "Gatilho 10%"],
          "linhas": [[p["id"], ", ".join(p["propostas"]), brl(p["proposto"]),
                      brl(p["pro_forma"]["posicao"]), brl(p["pro_forma"]["exposicao"]),
                      pct(p["pro_forma"]["pct"], 4), p["pro_forma"]["gatilho"]] for p in pf]}]
        if pf else [])
    c = res["consolidado"]
    sec("Estimativa operacional consolidada (GERENCIAL - nao e DRE nem demonstrativo contabil)", [
        f"Janela: {dt(c['inicio'])} a {dt(c['fim'])}. Base: MC de projetos com data de contrato na "
        "janela, menos titulos a pagar de natureza fixa emitidos na janela.",
        "Nao inclui impostos sobre lucro, depreciacao, resultado financeiro nem regime contabil.",
        f"Projetos incluidos: {', '.join(c['projetos']) or 'nenhum'}; excluidos por RL <= 0: "
        f"{', '.join(c['excluidos']) or 'nenhum'}."],
        [{"cab": ["Base", "Receita Liquida", "MC", "Custos fixos", "Resultado estimado", "% da RL"],
          "linhas": [[b, brl(c["receita_liquida"]), brl(c[k]["mc"]), brl(c["custos_fixos"]),
                      brl(c[k]["resultado"]), pct(c[k]["pct"])]
                     for b, k in (("MC orcada", "orcada"), ("MC realizada", "realizada"))]}])
    sec("Recomendacoes (propostas - nenhuma aprovacao foi registrada)",
        res["recomendacoes"] or ["Nenhuma recomendacao gerada."])
    sec("Convencoes da ferramenta e ambiguidades das fontes", CONVENCOES)
    tecnicas = ("Execucao", "Escopo CFO", "Fontes de regra", "Convencoes")
    return [s for s in S if not s["titulo"].startswith(tecnicas)] + [s for s in S if s["titulo"].startswith(tecnicas)]


def render_txt(S):
    out = ["=" * 78, BANNER, "=" * 78, "VOICE | CFO TESTE - painel sintetico", ""]
    for s in S:
        out += [s["titulo"], "-" * min(78, len(s["titulo"]))]
        out += [f"  {n}" for n in s["notas"]]
        for t in s["tabelas"]:
            rows = [t["cab"]] + t["linhas"]
            w = [max(len(r[i]) for r in rows) for i in range(len(t["cab"]))]
            for k, r in enumerate(rows):
                out.append("  " + " | ".join(x.ljust(w[i]) for i, x in enumerate(r)))
                if k == 0:
                    out.append("  " + "-+-".join("-" * x for x in w))
            if not t["linhas"]:
                out.append("  (sem linhas)")
        out.append("")
    out.append(BANNER)
    return "\n".join(out) + "\n"


CSS = """body{background:#17181b;color:#e7e4dc;font-family:Segoe UI,Arial,sans-serif;margin:0}
.banner{background:#c9a54c;color:#17181b;font-weight:700;padding:12px 24px;position:sticky;top:0}
main{padding:20px 24px;max-width:1300px}h1{color:#c9a54c;margin:8px 0 16px}
section{background:#212329;border:1px solid #34373f;border-radius:6px;padding:14px 18px;margin:14px 0}
h2{color:#c9a54c;font-size:17px;margin:0 0 8px}p{color:#9d998e;margin:4px 0;font-size:13px}
table{border-collapse:collapse;width:100%;margin-top:8px;font-size:13px}
th{color:#c9a54c;text-align:left;border-bottom:1px solid #c9a54c;padding:5px 6px}
td{border-bottom:1px solid #34373f;padding:5px 6px;word-break:break-word}
.table-wrap{overflow-x:auto}main{margin:auto}table{min-width:660px}.banner{z-index:2}
@media(max-width:700px){main{padding:12px}section{padding:12px}.banner{position:static}}"""


def render_html(S):
    e = html.escape
    parts = ["<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'>",
             "<meta name='viewport' content='width=device-width, initial-scale=1'><title>VOICE CFO TESTE (sintetico)</title><style>", CSS, "</style></head><body>",
             f"<div class='banner'>{e(BANNER)}</div><main><h1>VOICE | CFO TESTE</h1>"]
    for s in S:
        parts.append(f"<section><h2>{e(s['titulo'])}</h2>")
        parts += [f"<p>{e(n)}</p>" for n in s["notas"]]
        for t in s["tabelas"]:
            parts.append("<div class='table-wrap'><table><tr>" + "".join(f"<th>{e(c)}</th>" for c in t["cab"]) + "</tr>")
            parts += ["<tr>" + "".join(f"<td>{e(c)}</td>" for c in r) + "</tr>" for r in t["linhas"]]
            parts.append("</table></div>")
        parts.append("</section>")
    parts.append(f"</main><div class='banner'>{e(BANNER)}</div></body></html>")
    return "\n".join(parts)


# ---------------------------------------------------------------- execucao

def registrar(root, reg):
    d = os.path.join(root, "data", "cfo")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "execucoes.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(reg, ensure_ascii=False, sort_keys=True) + "\n")


def ler_execucoes(root):
    p = os.path.join(root, "data", "cfo", "execucoes.jsonl")
    if not os.path.exists(p):
        return []
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def _pasta_saida(root, now):
    base = os.path.join(root, "out-cfo", now.strftime("%Y%m%d-%H%M%S"))
    p, n = base, 1
    while os.path.exists(p):
        n += 1
        p = f"{base}-{n}"
    os.makedirs(p)
    return p


def gerar_relatorio(root, dados_path, as_of, atraso_dias=0, propostas=(), janela=None,
                    canal="cli", now=None, vault=None):
    now = now or datetime.now().astimezone()
    entrada = os.path.abspath(dados_path)
    reg = {"ts": now.isoformat(timespec="seconds"), "tipo": "relatorio_cfo", "ator": ATOR,
           "canal": canal, "entrada": entrada, "as_of": as_of.isoformat(),
           "parametros": {"atraso_dias": atraso_dias, "propostas": list(propostas),
                          "janela": [d.isoformat() for d in janela] if janela else None},
           "aprovacoes_humanas": "nenhuma registrada (ferramenta nao registra aprovacao)"}
    try:
        raw = ler_arquivo(entrada)
        reg["entrada_sha256"] = hashlib.sha256(raw).hexdigest()
        dados = carregar_bytes(raw)
        res = analisar(dados, as_of, atraso_dias, list(propostas), janela)
        meta = {"entrada": entrada, "entrada_sha256": reg["entrada_sha256"],
                "descricao": dados["meta"]["descricao"], "gerado_em": reg["ts"],
                "fontes": fontes(vault or cofre_padrao(root))}
        S = secoes(res, meta)
        pasta = _pasta_saida(root, now)
        for nome, conteudo in (("cfo.html", render_html(S)), ("cfo.txt", render_txt(S))):
            with open(os.path.join(pasta, nome), "x", encoding="utf-8", newline="\n") as f:
                f.write(conteudo)
    except (CFOError, OSError) as err:
        reg.update(resultado="rejeitado", erro=str(err))
        registrar(root, reg)
        raise CFOError(str(err)) from err
    reg.update(resultado="ok", saida=pasta)
    registrar(root, reg)
    return pasta


def data_arg(s):
    try:
        return data_iso(s, "data")
    except CFOError as e:
        raise argparse.ArgumentTypeError(str(e))


def main(argv=None):
    ap = argparse.ArgumentParser(description="VOICE CFO TESTE (dados sinteticos)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validar", help="valida o arquivo sintetico")
    v.add_argument("--dados", default=DEMO)
    r = sub.add_parser("relatorio", help="gera painel HTML/TXT")
    r.add_argument("--dados", default=DEMO)
    r.add_argument("--as-of", type=data_arg, required=True)
    r.add_argument("--atraso-dias", type=int, default=0)
    r.add_argument("--proposta", action="append", default=[])
    r.add_argument("--janela-inicio", type=data_arg)
    r.add_argument("--janela-fim", type=data_arg)
    r.add_argument("--root", default=ROOT)
    a = ap.parse_args(argv)
    try:
        if a.cmd == "validar":
            d = carregar_arquivo(a.dados)
            print(f"OK: {len(d['projetos'])} projeto(s), {len(d['titulos'])} titulo(s), "
                  f"{len(d['propostas'])} proposta(s) - dados sinteticos TESTE")
            return 0
        if (a.janela_inicio is None) != (a.janela_fim is None):
            raise CFOError("informe --janela-inicio e --janela-fim juntos")
        jan = (a.janela_inicio, a.janela_fim) if a.janela_inicio else None
        pasta = gerar_relatorio(a.root, a.dados, a.as_of, a.atraso_dias, a.proposta, jan)
        print(os.path.join(pasta, "cfo.html"))
        print(os.path.join(pasta, "cfo.txt"))
        return 0
    except CFOError as e:
        print(f"ERRO: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
