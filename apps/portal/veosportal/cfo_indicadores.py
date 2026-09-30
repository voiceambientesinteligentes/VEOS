"""Quinze indicadores da Politica V1 sec.13, comparacao entre periodos e briefing.

Cada indicador sai com valor, metodologia, data, fonte, status e origem da regra
(POLITICA, CONVENCAO DE SIMULACAO ou RASCUNHO NAO OFICIAL). Denominador zero ou
dado ausente => valor null com lacuna explicita. Comparacao: periodo atual contra
o mes imediatamente anterior (delta em R$/dias, variacao sobre |anterior| e p.p.
para margens); sem baseline => indisponivel.

Tudo e GERENCIAL sobre base TESTE: faturamento, contrato, receita liquida e caixa
sao grandezas distintas e nada aqui e DRE contabil.

O briefing reaproveita a estrutura do skill oficial business-pulse (prioridade
unica com evidencia, TL;DR com numeros e deltas, lacunas e apendice de fontes),
com dados SOMENTE da base TESTE: nenhum provedor externo e consultado."""
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from .cfo_controls import (CEM, CONVENCAO, LIMIAR_EXPOSICAO_PCT, MARGEM_NORMAL, POLITICA,
                           RASCUNHO, ZERO, avaliar_reserva, exposicao, margem, month_id,
                           periodo, periodo_anterior)

META_INADIMPLENCIA = Decimal("2")       # V1 sec.13: inferior a 2% da receita
META_CARTEIRA_ABAIXO30 = Decimal("10")  # V1 sec.13: ate 10% do faturamento do periodo
HORIZONTES = (30, 60, 90)
FLAT_PCT = Decimal("1")                 # business-pulse: seta neutra para variacao < 1%

INDICADORES = (
    ("faturamento", "Faturamento", "BRL"),
    ("receita_liquida", "Receita liquida", "BRL"),
    ("mc_projeto", "Margem de contribuicao por projeto", "lista"),
    ("mc_consolidada", "Margem de contribuicao consolidada", "%"),
    ("margem_operacional", "Margem operacional (gerencial)", "%"),
    ("ticket_medio", "Ticket medio", "BRL"),
    ("pmr", "Prazo medio de recebimento", "dias"),
    ("inadimplencia", "Inadimplencia", "%"),
    ("contas_receber", "Contas a receber", "BRL"),
    ("contas_pagar", "Contas a pagar", "BRL"),
    ("exposicao_projeto", "Exposicao financeira por projeto", "BRL"),
    ("necessidade_caixa", "Necessidade de caixa 30/60/90", "BRL"),
    ("concentracao_cliente", "Concentracao de faturamento por cliente", "%"),
    ("concentracao_parceiro", "Concentracao por parceiro/arquiteto", "%"),
    ("carteira_abaixo_30", "Faturamento de projetos abaixo de 30% de margem", "%"),
)

METODOLOGIA = {
    "faturamento": (CONVENCAO, "Soma das faturas TESTE emitidas no periodo. Faturamento nao e "
                               "contrato, receita liquida nem caixa."),
    "receita_liquida": (CONVENCAO, "V1 sec.4 (bruto - descontos - impostos sobre a venda) dos "
                                   "projetos contratados no periodo; atribuicao pela data de "
                                   "contrato e convencao."),
    "mc_projeto": (POLITICA, "V1 sec.4 e sec.6: RL - custos diretos/variaveis - provisao 2% RL; "
                             "faixas 35/30/25 (sec.3). Base orcada da fotografia."),
    "mc_consolidada": (CONVENCAO, "Soma das MC / soma das RL dos projetos contratados no periodo "
                                  "com RL > 0."),
    "margem_operacional": (CONVENCAO, "(MC consolidada - custos fixos do mes) / RL. Estimativa "
                                      "gerencial, nao DRE; sem impostos sobre lucro, depreciacao ou "
                                      "resultado financeiro."),
    "ticket_medio": (CONVENCAO, "Media do Valor do Contrato dos projetos contratados no periodo; "
                                "contrato ausente torna o indicador indisponivel."),
    "pmr": (RASCUNHO, "Dias entre emissao da fatura e recebimento, para recebimentos do periodo; "
                      "ponderacao configuravel."),
    "inadimplencia": (RASCUNHO, "Saldo vencido em aberto na data-base com atraso minimo "
                                "configuravel / denominador configuravel."),
    "contas_receber": (CONVENCAO, "Saldo em aberto das faturas na data-base (vencidas e a vencer)."),
    "contas_pagar": (CONVENCAO, "Saldo em aberto dos titulos a pagar na data-base."),
    "exposicao_projeto": (POLITICA, "V1.1: posicao = recebido - compromissos assumidos; exposicao = "
                                    "max(0, -posicao); gatilho so acima de 10% do Valor do "
                                    "Contrato; contrato ausente = NAO RESOLVIDO. Estado corrente."),
    "necessidade_caixa": (CONVENCAO, "Caixa livre + a receber com vencimento a partir da data-base - "
                                     "a pagar em aberto ate o horizonte; necessidade = max(0, -saldo). "
                                     "A receber vencido nao entra; caixa restrito nao entra."),
    "concentracao_cliente": (CONVENCAO, "Participacao do maior cliente no faturamento do periodo."),
    "concentracao_parceiro": (CONVENCAO, "Participacao do maior parceiro/arquiteto no faturamento; "
                                         "parceiro nao informado torna o indicador indisponivel."),
    "carteira_abaixo_30": (POLITICA, "V1 sec.13: faturamento de projetos com MC < 30% / faturamento "
                                     "do periodo; limite de 10%."),
}


# ---------------------------------------------------------------- base do periodo

def _base(p):
    ini, fim = p["inicio"], p["fim"]
    proj = {x["id"]: x for x in p["projetos"]}
    rec_f = {f["id"]: sum((r["valor"] for r in f["recebimentos"]), ZERO) for f in p["faturas"]}
    aberto = {f["id"]: f["valor"] - rec_f[f["id"]] for f in p["faturas"]}
    rec_p = defaultdict(lambda: ZERO)
    for f in p["faturas"]:
        rec_p[f["projeto"]] += rec_f[f["id"]]
    fat_per = [f for f in p["faturas"] if ini <= f["emissao"] <= fim]
    return {"p": p, "proj": proj, "aberto": aberto, "recebido_proj": rec_p, "fat_per": fat_per,
            "faturamento": sum((f["valor"] for f in fat_per), ZERO),
            "contratados": [x for x in p["projetos"] if ini <= x["data_contrato"] <= fim],
            "margens": {x["id"]: margem(x["valor_bruto"] - x["descontos"] - x["impostos"],
                                        x["custos_diretos"]) for x in p["projetos"]}}


def _share(por, total):
    return sorted(({"nome": k, "valor": v, "pct": v * CEM / total} for k, v in por.items()),
                  key=lambda x: (-x["valor"], x["nome"]))


def _calc(c, fx, cfg):
    p, m, fim = c["p"], c["margens"], c["p"]["fim"]
    out = {"faturamento": {"valor": c["faturamento"], "extra": {"faturas": len(c["fat_per"])}}}
    out["receita_liquida"] = {"valor": sum((m[x["id"]]["rl"] for x in c["contratados"]), ZERO),
                              "extra": {"projetos": [x["id"] for x in c["contratados"]]}}
    out["mc_projeto"] = {"valor": None, "itens": [
        {"projeto": x["id"], "cliente": x["cliente"], "rl": m[x["id"]]["rl"], "mc": m[x["id"]]["mc"],
         "pct": m[x["id"]]["pct"], "faixa": m[x["id"]]["faixa"]} for x in p["projetos"]]}
    if not p["projetos"]:
        out["mc_projeto"]["lacuna"] = "nenhum projeto na fotografia"

    validos = [x for x in c["contratados"] if m[x["id"]]["rl"] > ZERO]
    rl = sum((m[x["id"]]["rl"] for x in validos), ZERO)
    mc = sum((m[x["id"]]["mc"] for x in validos), ZERO)
    excl = [x["id"] for x in c["contratados"] if m[x["id"]]["rl"] <= ZERO]
    if rl > ZERO:
        out["mc_consolidada"] = {"valor": mc * CEM / rl, "extra": {"mc": mc, "rl": rl, "excluidos": excl}}
    else:
        out["mc_consolidada"] = {"valor": None, "lacuna": "nenhum projeto contratado no periodo com "
                                                          "RL > 0 (denominador zero)"}
    fixo = fx["custos_fixos"].get(p["mes"])
    meta_op = {"texto": "V1 sec.13: meta inicial de 12% a 15% ou superior",
               "situacao": "NAO COMPARADA - a fonte nao define a base da margem operacional"}
    if rl <= ZERO:
        out["margem_operacional"] = {"valor": None, "meta": meta_op,
                                     "lacuna": "RL do periodo zero (denominador zero)"}
    elif fixo is None:
        out["margem_operacional"] = {"valor": None, "meta": meta_op,
                                     "lacuna": f"custo fixo de {p['id']} ausente (ausente nao vira zero)"}
    else:
        out["margem_operacional"] = {"valor": (mc - fixo) * CEM / rl, "meta": meta_op,
                                     "extra": {"mc": mc, "custos_fixos": fixo, "rl": rl}}

    if not c["contratados"]:
        out["ticket_medio"] = {"valor": None, "lacuna": "nenhum projeto contratado no periodo"}
    else:
        sem = [x["id"] for x in c["contratados"] if x["valor_contrato"] is None]
        if sem:
            out["ticket_medio"] = {"valor": None, "lacuna": "Valor do Contrato ausente em "
                                                            + ", ".join(sem)}
        else:
            tot = sum((x["valor_contrato"] for x in c["contratados"]), ZERO)
            out["ticket_medio"] = {"valor": tot / len(c["contratados"]),
                                   "extra": {"projetos": len(c["contratados"])}}

    pares = [(r, f) for f in p["faturas"] for r in f["recebimentos"]
             if p["inicio"] <= r["data"] <= fim]
    if not pares:
        out["pmr"] = {"valor": None, "lacuna": "nenhum recebimento no periodo"}
    elif cfg["pmr_ponderacao"] == "valor":
        tot = sum((r["valor"] for r, _ in pares), ZERO)
        out["pmr"] = {"valor": sum((Decimal((r["data"] - f["emissao"]).days) * r["valor"]
                                    for r, f in pares), ZERO) / tot,
                      "extra": {"recebimentos": len(pares)}}
    else:
        out["pmr"] = {"valor": Decimal(sum((r["data"] - f["emissao"]).days for r, f in pares))
                      / len(pares), "extra": {"recebimentos": len(pares)}}

    minimo = cfg["inadimplencia_atraso_min_dias"]
    venc = [f for f in p["faturas"]
            if c["aberto"][f["id"]] > ZERO and (fim - f["vencimento"]).days >= minimo]
    itens = sorted(({"fatura": f["id"], "projeto": f["projeto"],
                     "cliente": c["proj"][f["projeto"]]["cliente"], "aberto": c["aberto"][f["id"]],
                     "dias_atraso": (fim - f["vencimento"]).days} for f in venc),
                   key=lambda x: (-x["aberto"], x["fatura"]))
    base = c["faturamento"] if cfg["inadimplencia_base"] == "faturamento" else out["receita_liquida"]["valor"]
    meta_in = {"texto": "V1 sec.13: inferior a 2% da receita", "limite_pct": META_INADIMPLENCIA,
               "ressalva": "base e atraso minimo sao RASCUNHO NAO OFICIAL"}
    if base <= ZERO:
        out["inadimplencia"] = {"valor": None, "itens": itens, "meta": meta_in,
                                "lacuna": f"denominador ({cfg['inadimplencia_base']}) zero no periodo"}
    else:
        v = sum((x["aberto"] for x in itens), ZERO) * CEM / base
        out["inadimplencia"] = {"valor": v, "itens": itens,
                                "meta": {**meta_in, "situacao": ("DENTRO DA META" if v < META_INADIMPLENCIA
                                                                 else "ACIMA DA META")}}

    out["contas_receber"] = {"valor": sum((v for v in c["aberto"].values() if v > ZERO), ZERO),
                             "extra": {"titulos": sum(1 for v in c["aberto"].values() if v > ZERO)}}
    ap = [(a, a["valor"] - a["pago"]) for a in p["pagar"]]
    out["contas_pagar"] = {"valor": sum((v for _, v in ap if v > ZERO), ZERO),
                           "extra": {"titulos": sum(1 for _, v in ap if v > ZERO)}}

    exp = []
    for x in p["projetos"]:
        e = exposicao(c["recebido_proj"][x["id"]] - x["compromissos"], x["valor_contrato"])
        exp.append({"projeto": x["id"], "valor_contrato": x["valor_contrato"],
                    "recebido": c["recebido_proj"][x["id"]], "compromissos": x["compromissos"], **e})
    out["exposicao_projeto"] = {"valor": sum((e["exposicao"] for e in exp), ZERO), "itens": exp,
                                "extra": {"acionados": sum(1 for e in exp if e["gatilho"] == "ACIONADO"),
                                          "nao_resolvidos": sum(1 for e in exp
                                                                if e["gatilho"].startswith("NAO RESOLVIDO"))}}

    linhas = []
    for h in HORIZONTES:
        lim = fim + timedelta(days=h)
        ent = sum((c["aberto"][f["id"]] for f in p["faturas"]
                   if c["aberto"][f["id"]] > ZERO and fim <= f["vencimento"] <= lim), ZERO)
        sai = sum((v for a, v in ap if v > ZERO and a["vencimento"] <= lim), ZERO)
        final = p["caixa_livre"] + ent - sai
        linhas.append({"horizonte": h, "caixa_livre": p["caixa_livre"], "entradas": ent,
                       "saidas": sai, "saldo_final": final, "necessidade": max(ZERO, -final)})
    out["necessidade_caixa"] = {"valor": max(x["necessidade"] for x in linhas), "itens": linhas,
                                "extra": {"receber_vencido_nao_projetado": sum(
                                    (c["aberto"][f["id"]] for f in p["faturas"]
                                     if c["aberto"][f["id"]] > ZERO and f["vencimento"] < fim), ZERO)}}

    fat = c["faturamento"]
    if fat <= ZERO:
        for k in ("concentracao_cliente", "concentracao_parceiro", "carteira_abaixo_30"):
            out[k] = {"valor": None, "lacuna": "sem faturamento no periodo (denominador zero)"}
    else:
        por = defaultdict(lambda: ZERO)
        for f in c["fat_per"]:
            por[c["proj"][f["projeto"]]["cliente"]] += f["valor"]
        itens = _share(por, fat)
        out["concentracao_cliente"] = {"valor": itens[0]["pct"], "itens": itens}

        faltam = sorted({f["projeto"] for f in c["fat_per"]
                         if not c["proj"][f["projeto"]]["parceiro_informado"]})
        if faltam:
            out["concentracao_parceiro"] = {"valor": None, "lacuna": "parceiro nao informado em "
                                            + ", ".join(faltam) + " (ausente nao vira 'sem parceiro')"}
        else:
            por, sem = defaultdict(lambda: ZERO), ZERO
            for f in c["fat_per"]:
                parc = c["proj"][f["projeto"]]["parceiro"]
                if parc is None:
                    sem += f["valor"]
                else:
                    por[parc] += f["valor"]
            itens = _share(por, fat)
            out["concentracao_parceiro"] = {"valor": itens[0]["pct"] if itens else ZERO, "itens": itens,
                                            "extra": {"sem_parceiro": sem}}

        nres = sorted({f["projeto"] for f in c["fat_per"] if m[f["projeto"]]["pct"] is None})
        meta_ca = {"texto": "V1 sec.13: projetos abaixo de 30% nao devem passar de 10% do "
                            "faturamento do periodo", "limite_pct": META_CARTEIRA_ABAIXO30}
        if nres:
            out["carteira_abaixo_30"] = {"valor": None, "meta": meta_ca,
                                         "lacuna": "margem NAO RESOLVIDA em " + ", ".join(nres)}
        else:
            abaixo = defaultdict(lambda: ZERO)
            for f in c["fat_per"]:
                if m[f["projeto"]]["pct"] < MARGEM_NORMAL:
                    abaixo[f["projeto"]] += f["valor"]
            v = sum(abaixo.values(), ZERO) * CEM / fat
            out["carteira_abaixo_30"] = {
                "valor": v, "itens": _share(abaixo, fat),
                "meta": {**meta_ca, "situacao": ("ACIMA DO LIMITE" if v > META_CARTEIRA_ABAIXO30
                                                 else "DENTRO DO LIMITE")}}
    return out


# ---------------------------------------------------------------- comparacao

def comparar(atual, anterior, unidade, periodo_ant):
    if periodo_ant is None:
        return {"status": "INDISPONIVEL", "motivo": "sem periodo anterior na base (sem baseline)"}
    a, b = atual.get("valor"), anterior.get("valor")
    if unidade == "lista":
        return {"status": "POR ITEM", "periodo_anterior": periodo_ant}
    if a is None or b is None:
        return {"status": "INDISPONIVEL", "periodo_anterior": periodo_ant, "anterior": b,
                "motivo": "valor " + ("atual" if a is None else "anterior") + " indisponivel"}
    delta = a - b
    if unidade == "%":
        return {"status": "OK", "periodo_anterior": periodo_ant, "anterior": b, "delta_pp": delta}
    out = {"status": "OK", "periodo_anterior": periodo_ant, "anterior": b, "delta": delta,
           "variacao_pct": None if b == ZERO else delta * CEM / abs(b)}
    if b == ZERO:
        out["motivo_variacao"] = "anterior zero: variacao percentual indefinida"
    return out


def _por_item(atual, anterior):
    ant = {x["projeto"]: x for x in (anterior or {}).get("itens") or []}
    for x in atual.get("itens") or []:
        b = ant.get(x["projeto"])
        x["delta_pp"] = (None if b is None or b["pct"] is None or x["pct"] is None
                         else x["pct"] - b["pct"])


def calcular_indicadores(fx, cfg, periodo_id=None, fonte=None):
    p = periodo(fx, periodo_id)
    ant = periodo_anterior(fx, p)
    cur = _calc(_base(p), fx, cfg)
    prev = _calc(_base(ant), fx, cfg) if ant else None
    lista = []
    for key, nome, unidade in INDICADORES:
        r = cur[key]
        if unidade == "lista":
            _por_item(r, prev[key] if prev else None)
            ok = bool(r.get("itens"))
        else:
            ok = r.get("valor") is not None
        origem, texto = METODOLOGIA[key]
        lista.append({
            "id": key, "nome": nome, "unidade": unidade, "valor": r.get("valor"),
            "itens": r.get("itens"), "extra": r.get("extra"), "meta": r.get("meta"),
            "lacuna": r.get("lacuna"), "status": "CALCULADO - TESTE" if ok else "INDISPONIVEL",
            "origem": origem, "metodologia": texto, "data": p["fim"], "periodo": p["id"],
            "fonte": fonte or "base TESTE",
            "comparacao": comparar(r, prev[key] if prev else {}, unidade, ant["id"] if ant else None)})
    return {"periodo": p["id"], "inicio": p["inicio"], "fim": p["fim"],
            "anterior": ant["id"] if ant else None, "indicadores": lista,
            "metodologia": {k: cfg[k] for k in cfg}, "metodologia_status": RASCUNHO}


# ---------------------------------------------------------------- briefing

def brl(v):
    if v is None:
        return "n/d"
    s = format(abs(v.quantize(Decimal("0.01"))), ",.2f").replace(",", "X").replace(".", ",").replace("X", ".")
    return ("-" if v < 0 else "") + "R$ " + s


def pct_txt(v, casas=2):
    if v is None:
        return "n/d"
    return format(v.quantize(Decimal(1).scaleb(-casas)), "f").replace(".", ",") + "%"


def seta(variacao):
    if variacao is None:
        return "▬"
    return "▬" if abs(variacao) < FLAT_PCT else ("▲" if variacao > 0 else "▼")


def _ev(ind, valor_txt):
    return {"indicador": ind["id"], "nome": ind["nome"], "valor": valor_txt, "data": ind["data"],
            "fonte": ind["fonte"], "origem": ind["origem"]}


def _delta_txt(ind):
    c = ind["comparacao"]
    if c["status"] != "OK":
        return f"sem comparacao: {c.get('motivo', 'indisponivel')}"
    if "delta_pp" in c:
        d = c["delta_pp"]
        return f"{'▲' if d > 0 else '▼' if d < 0 else '▬'} {pct_txt(abs(d)).rstrip('%')} p.p. vs {c['periodo_anterior']}"
    var = c.get("variacao_pct")
    base = f"{seta(var)} {brl(abs(c['delta']))}" if ind["unidade"] == "BRL" else f"{seta(var)} {abs(c['delta']).quantize(Decimal('0.01'))}"
    return base + (f" ({pct_txt(var, 1)})" if var is not None else "") + f" vs {c['periodo_anterior']}"


def montar_briefing(fx, cfg, periodo_id=None, fonte=None, fixture_sha=None):
    ind = calcular_indicadores(fx, cfg, periodo_id, fonte)
    by = {i["id"]: i for i in ind["indicadores"]}
    res = avaliar_reserva(fx, cfg, ind["periodo"])
    riscos = []

    def risco(sev, ordem, peso, titulo, evid, passo, regra):
        riscos.append({"severidade": sev, "ordem": ordem, "peso": peso, "titulo": titulo,
                       "evidencias": evid, "proximo_passo": passo, "regra": regra})

    nec = by["necessidade_caixa"]
    for it in nec["itens"]:
        if it["necessidade"] > ZERO:
            risco("critico" if it["horizonte"] == 30 else "atencao", 1 if it["horizonte"] == 30 else 4,
                  it["necessidade"],
                  f"Necessidade de caixa de {brl(it['necessidade'])} em {it['horizonte']} dias",
                  [_ev(nec, f"saldo projetado {brl(it['saldo_final'])} em {it['horizonte']} dias "
                            f"(entradas {brl(it['entradas'])}, saidas {brl(it['saidas'])})")],
                  "Avaliar cobranca, prazo com fornecedor ou adiamento antes do vencimento - decisao humana.",
                  "Convencao de projecao (V1 sec.13 pede acompanhar a necessidade 30/60/90)")
            break
    ex = by["exposicao_projeto"]
    for it in sorted(ex["itens"], key=lambda x: -x["exposicao"]):
        if it["gatilho"] == "ACIONADO":
            risco("critico", 2, it["exposicao"],
                  f"{it['projeto']}: exposicao corrente {brl(it['exposicao'])} = {pct_txt(it['pct'])} "
                  "do Valor do Contrato",
                  [_ev(ex, f"recebido {brl(it['recebido'])}; compromissos {brl(it['compromissos'])}; "
                           f"contrato {brl(it['valor_contrato'])}")],
                  "Exige autorizacao expressa da direcao (V1.1 sec.9); registrar a decisao.",
                  f"V1.1 sec.9: exposicao superior a {LIMIAR_EXPOSICAO_PCT}% do Valor do Contrato")
        elif it["gatilho"].startswith("NAO RESOLVIDO"):
            risco("atencao", 7, it["exposicao"],
                  f"{it['projeto']}: Valor do Contrato ausente - percentual de exposicao NAO RESOLVIDO",
                  [_ev(ex, f"exposicao {brl(it['exposicao'])}; contrato ausente")],
                  "Determinar o Valor do Contrato; decisao por percentual falha fechada (V1.1 sec.8).",
                  "V1.1 sec.8 (falha fechada)")
    ina = by["inadimplencia"]
    if ina["valor"] is not None and ina["valor"] >= META_INADIMPLENCIA:
        top = ina["itens"][0] if ina["itens"] else None
        risco("critico", 3, ina["valor"],
              f"Inadimplencia {pct_txt(ina['valor'])} (meta inferior a 2%)",
              [_ev(ina, "; ".join(f"{x['cliente']} {brl(x['aberto'])}, {x['dias_atraso']} dias ({x['fatura']})"
                                  for x in ina["itens"]))],
              (f"Cobrar {top['cliente']}: {brl(top['aberto'])} em atraso ha {top['dias_atraso']} dias "
               f"({top['fatura']}) - acao humana; o portal nao envia cobranca.") if top else "",
              "V1 sec.13 (meta); base e atraso minimo em RASCUNHO NAO OFICIAL")
    if res["situacao"] == "ABAIXO DA META":
        risco("atencao", 5, res["deficit"],
              f"Reserva de caixa abaixo da meta: faltam {brl(res['deficit'])}",
              [{"indicador": "reserva", "nome": "Reserva de caixa",
                "valor": f"caixa livre {brl(res['caixa_livre'])} cobre "
                         f"{res['cobertura_meses'].quantize(Decimal('0.01'))} meses de custo fixo "
                         f"medio {brl(res['base_mensal'])} (meta {res['meta_meses']} meses = "
                         f"{brl(res['meta_valor'])})",
                "data": res["data_base"], "fonte": fonte or "base TESTE", "origem": POLITICA}],
              "Planejar recomposicao da reserva; a receber nao substitui reserva (V1 sec.12).",
              "V1 sec.12 (meta 3 meses); janela e metodo em RASCUNHO NAO OFICIAL")
    elif res["situacao"] in ("DESCONHECIDA", "NAO RESOLVIDA"):
        risco("atencao", 5, ZERO, "Reserva de caixa nao pode ser avaliada",
              [{"indicador": "reserva", "nome": "Reserva de caixa", "valor": res["lacuna"],
                "data": res["data_base"], "fonte": fonte or "base TESTE", "origem": RASCUNHO}],
              "Completar o historico de custos fixos da janela escolhida.",
              "V1 sec.12; historico ausente e desconhecido, nao zero")
    ca = by["carteira_abaixo_30"]
    if ca["valor"] is not None and ca["valor"] > META_CARTEIRA_ABAIXO30:
        risco("atencao", 6, ca["valor"],
              f"{pct_txt(ca['valor'])} do faturamento vem de projetos abaixo de 30% de margem",
              [_ev(ca, ", ".join(f"{x['nome']} {brl(x['valor'])}" for x in ca["itens"]))],
              "Revisar precificacao e aprovacoes dos projetos listados.",
              "V1 sec.13: ate 10% do faturamento do periodo")
    riscos.sort(key=lambda r: (0 if r["severidade"] == "critico" else 1, r["ordem"], -r["peso"]))
    for r in riscos:
        del r["ordem"], r["peso"]

    crit = sum(1 for r in riscos if r["severidade"] == "critico")
    aten = len(riscos) - crit
    geral = "CRITICO" if crit else ("ATENCAO" if aten else "SEM ALERTA")
    p = periodo(fx, ind["periodo"])
    ant = periodo_anterior(fx, p)
    caixa_delta = (f" ({seta(None if ant['caixa_livre'] == ZERO else (p['caixa_livre'] - ant['caixa_livre']) * CEM / ant['caixa_livre'])} "
                   f"{brl(abs(p['caixa_livre'] - ant['caixa_livre']))} vs {ant['id']})") if ant else " (sem baseline)"
    fat, mcc = by["faturamento"], by["mc_consolidada"]
    tldr = [
        f"Caixa livre {brl(p['caixa_livre'])}{caixa_delta}; restrito {brl(p['caixa_restrito'])} "
        "fora da reserva.",
        f"Faturamento {brl(fat['valor'])} ({_delta_txt(fat)}); MC consolidada "
        f"{pct_txt(mcc['valor'])} ({_delta_txt(mcc)}).",
        riscos[0]["titulo"] + "." if riscos else "Nenhum alerta material na base TESTE.",
    ]
    lacunas = [f"{i['nome']}: {i['lacuna']}" for i in ind["indicadores"] if i["lacuna"]]
    if res["lacuna"]:
        lacunas.append(f"Reserva de caixa: {res['lacuna']}")
    sem_comp = [i["nome"] for i in ind["indicadores"] if i["comparacao"]["status"] == "INDISPONIVEL"]
    return {
        "sintetico": True, "periodo": ind["periodo"], "inicio": ind["inicio"], "fim": ind["fim"],
        "anterior": ind["anterior"], "status_geral": geral,
        "linha": (f"{crit} alerta(s) critico(s) e {aten} de atencao na base TESTE de {ind['periodo']}."
                  if riscos else f"Sem alertas na base TESTE de {ind['periodo']}."),
        "tldr": tldr, "prioridade": riscos[0] if riscos else None, "riscos": riscos,
        "lacunas": lacunas, "comparacao_indisponivel": sem_comp, "reserva": res,
        "apendice": {
            "janela": f"{ind['inicio'].isoformat()} a {ind['fim'].isoformat()}",
            "fontes_usadas": [(fonte or "base TESTE") + (f" sha256 {fixture_sha[:16]}..." if fixture_sha else ""),
                              "Regras da Politica V1 e Clarificacao V1.1 implementadas no codigo"],
            "fontes_indisponiveis": ["Zoho (Books, CRM, Projects e demais): nao usados em indicador "
                                     "ou diagnostico - dados atuais declarados incorretos pelo usuario"],
            "limiares": [
                {"limiar": "Exposicao > 10% do Valor do Contrato", "origem": POLITICA + " V1.1 sec.9"},
                {"limiar": "Faixas de margem 35/30/25", "origem": POLITICA + " V1 sec.3"},
                {"limiar": "Inadimplencia < 2%", "origem": POLITICA + " V1 sec.13; base " + RASCUNHO},
                {"limiar": "Faturamento abaixo de 30% de margem ate 10%", "origem": POLITICA + " V1 sec.13"},
                {"limiar": "Reserva >= 3 meses de custo fixo medio",
                 "origem": POLITICA + " V1 sec.12; janela/metodo " + RASCUNHO},
                {"limiar": "Necessidade em 30 dias = critico; 60/90 = atencao", "origem": CONVENCAO},
            ],
        },
        "referencia": "Estrutura adaptada do skill oficial business-pulse (knowledge-work-plugins "
                      "da38ec1); conectores do skill NAO consultados.",
        "mes_referencia": month_id(p["mes"]),
    }
