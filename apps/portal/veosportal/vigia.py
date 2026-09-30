"""Vigia - o "sistema vivo" do VEOS (prototipo, somente TESTE).

Recebe um EVENTO de negocio (ex.: vendedor salvou um orcamento), aplica as
regras ja implementadas em cfo_controls (Politica V1, sem reinterpretar) e
devolve AVISOS atribuidos ao diretor responsavel. Deterministico: nao chama
modelo de IA, nao grava nada, nao aprova nada. A personalidade do diretor e
uma camada de apresentacao posterior; aqui so ha fatos, regra e fonte.

Dado ausente nunca vira zero: vira LACUNA e a margem fica NAO RESOLVIDO."""
import re
from decimal import Decimal

from . import cfo_controls as cc

ZERO, CEM = Decimal("0"), Decimal("100")
QTD_RE = re.compile(r"[1-9]\d{0,5}")
MAX_ITENS = 300
SEVERIDADES = ("INFO", "MEDIO", "ALTO", "CRITICO")
INTEGRIDADE = "INTEGRIDADE DO REGISTRO"


def _aviso(codigo, diretor, severidade, titulo, mensagem, fonte, origem):
    return {"codigo": codigo, "diretor": diretor, "severidade": severidade, "titulo": titulo,
            "mensagem": mensagem, "fonte": fonte, "origem": origem}


def _r2(v):
    return None if v is None else cc.q(v)


def _itens(lista):
    itens = []
    for i, it in enumerate(cc._list(lista, "itens", MAX_ITENS)):
        ctx = f"itens[{i}]"
        cc._keys(it, ctx, ("codigo", "quantidade", "preco_unitario"), ("descricao", "custo_unitario"))
        qtd = it["quantidade"]
        if not isinstance(qtd, str) or not QTD_RE.fullmatch(qtd):
            raise cc.ControlError(f"{ctx}.quantidade: inteiro positivo em texto, ex. '2'")
        q = Decimal(qtd)
        preco = cc.money(it["preco_unitario"], f"{ctx}.preco_unitario")
        custo = cc.money_or_none(it.get("custo_unitario"), f"{ctx}.custo_unitario")
        itens.append({"codigo": cc.text(it["codigo"], f"{ctx}.codigo", teste=False, maximo=64),
                      "quantidade": q, "preco_unitario": preco, "custo_unitario": custo,
                      "total_preco": preco * q,
                      "total_custo": None if custo is None else custo * q})
    if not itens:
        raise cc.ControlError("itens: orcamento sem itens")
    return itens


def avaliar_orcamento(o):
    """Evento 'orcamento.salvo'. Retorna avisos, lacunas e o resumo calculado."""
    cc._keys(o, "orcamento", ("id", "ambiente", "itens", "valor_total_informado"),
             ("desconto_valor", "impostos", "justificativas_ticket", "vendedor", "cliente"))
    cc.text(o["id"], "id", maximo=64)
    if o["ambiente"] != "TESTE":
        raise cc.ControlError("ambiente: somente TESTE esta habilitado (producao depende de dados "
                              "validados e de decisao registrada)")
    itens = _itens(o["itens"])
    informado = cc.money(o["valor_total_informado"], "valor_total_informado", positivo=True)
    desconto = cc.money(o.get("desconto_valor") or "0", "desconto_valor")
    impostos = cc.money_or_none(o.get("impostos"), "impostos")

    avisos, lacunas = [], []
    soma = sum((i["total_preco"] for i in itens), ZERO)

    # 1. A lista de produtos fecha com o total informado pelo vendedor?
    if soma != informado:
        avisos.append(_aviso(
            "ORC_TOTAL_DIVERGENTE", "CFO", "CRITICO", "Total nao fecha com a lista de produtos",
            f"Soma dos itens R$ {soma:.2f} x total informado R$ {informado:.2f} "
            f"(diferenca R$ {informado - soma:.2f}). Nenhuma analise de margem vale ate corrigir.",
            "soma quantidade x preco unitario dos itens", INTEGRIDADE))
    if desconto > soma:
        raise cc.ControlError("desconto_valor maior que a soma dos itens")

    # 2. Itens vendidos abaixo do custo e itens sem custo.
    sem_custo = [i["codigo"] for i in itens if i["custo_unitario"] is None]
    if sem_custo:
        lacunas.append(f"Custo unitario ausente: {', '.join(sem_custo)}. Margem nao calculada.")
    for i in itens:
        if i["custo_unitario"] is not None and i["preco_unitario"] < i["custo_unitario"]:
            avisos.append(_aviso(
                "ORC_ITEM_ABAIXO_CUSTO", "CFO", "ALTO", f"Item {i['codigo']} abaixo do custo",
                f"Preco R$ {i['preco_unitario']:.2f} < custo R$ {i['custo_unitario']:.2f}.",
                "comparacao preco x custo do item", INTEGRIDADE))
    if impostos is None:
        lacunas.append("Impostos nao informados: Receita Liquida e margem nao calculadas "
                       "(Politica V1 sec.4).")

    # 3. Margem e alcada (V1 sec.3, 4, 6, 8, 9) - so sem lacunas.
    liquido = soma - desconto
    desc_pct = desconto * CEM / soma
    mg, alcada = None, None
    if not lacunas:
        custos = sum((i["total_custo"] for i in itens), ZERO)
        mg = cc.margem(liquido - impostos, custos)
        alcada = cc.alcada_desconto(desc_pct, mg["pct"])
        pct_txt = "nao resolvida" if mg["pct"] is None else f"{_r2(mg['pct'])}%"
        sev = {"VERDE": "INFO", "ACEITAVEL": "INFO", "ATENCAO": "ALTO",
               "NAO APROVADO": "CRITICO"}.get(mg["faixa"], "ALTO")
        avisos.append(_aviso(
            "ORC_MARGEM", "CFO", sev, f"Margem de contribuicao {pct_txt} - faixa {mg['faixa']}",
            "Margem calculada com provisao de risco de 2% da Receita Liquida (uma vez).",
            "Politica V1 sec.3, 4 e 6", cc.POLITICA))
        if alcada["nivel"] not in ("FLUXO NORMAL", "AUTONOMIA COMERCIAL"):
            sev = "CRITICO" if alcada["nivel"] == "EXTRAORDINARIA" else "ALTO"
            avisos.append(_aviso(
                "ORC_ALCADA", "CFO", sev, f"Alcada exigida: {alcada['nivel']}",
                " ".join(alcada["exigencias"]), "Politica V1 sec.3, 8 e 9", cc.POLITICA))

    # 4. Ticket desejado (V1 sec.2): alerta, nunca bloqueio.
    mg_pct = None if mg is None else _r2(mg["pct"])
    tk = cc.avaliar_ticket({
        "valor_contrato": f"{liquido:.2f}",
        "justificativas": o.get("justificativas_ticket") or [],
        "margem_pct": None if mg_pct is None else f"{mg_pct:.2f}"})
    if tk["abaixo_do_desejado"] and tk["situacao"] != "ABAIXO DO DESEJADO - EXCECAO JUSTIFICADA":
        avisos.append(_aviso(
            "ORC_TICKET", "CFO", "MEDIO", tk["situacao"].capitalize(),
            f"Valor R$ {liquido:.2f} abaixo do ticket desejado R$ {cc.TICKET_DESEJADO:.2f}. "
            + " ".join(tk["inconsistencias"]), tk["fonte"], cc.POLITICA))

    avisos.sort(key=lambda a: -SEVERIDADES.index(a["severidade"]))
    pior = avisos[0]["severidade"] if avisos else "INFO"
    return {
        "evento": "orcamento.salvo", "orcamento": o["id"], "ambiente": "TESTE",
        "situacao": "BLOQUEAR_ENVIO" if pior == "CRITICO" else
                    ("REVISAR" if pior == "ALTO" or lacunas else "OK"),
        "avisos": avisos, "lacunas": lacunas,
        "resumo": {"soma_itens": soma, "valor_informado": informado, "desconto": desconto,
                   "desconto_pct": _r2(desc_pct), "valor_liquido": liquido,
                   "margem_pct": None if mg is None else _r2(mg["pct"]),
                   "faixa_margem": None if mg is None else mg["faixa"],
                   "alcada": None if alcada is None else alcada["nivel"]},
        "nota": "Avisos deterministicos sobre dados TESTE. Nada foi gravado ou aprovado.",
    }
