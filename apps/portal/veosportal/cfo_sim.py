"""Simulacao CFO com percentuais editaveis - SOMENTE RASCUNHO.

As regras oficiais (Politica V1 / Clarificacao V1.1, implementadas em
tools/cfo.py) nao sao alteradas. Este modulo recalcula, em Decimal, provisao de
risco, margem, faixa e gatilho de exposicao com parametros de cenario e devolve
o resultado oficial e o simulado lado a lado."""
import re
from decimal import ROUND_HALF_UP, Decimal

ZERO, CENT, CEM = Decimal("0"), Decimal("0.01"), Decimal("100")
PCT_RE = re.compile(r"\d{1,3}(\.\d{1,2})?")

# Base oficial: V1 sec.3 (faixas), sec.6 (provisao 2% RL), V1.1 sec.9 (gatilho > 10%).
BASE = {
    "risco_pct": Decimal("2"),
    "limiar_exposicao_pct": Decimal("10"),
    "margem_alvo_pct": Decimal("35"),
    "margem_aceitavel_pct": Decimal("30"),
    "margem_minima_pct": Decimal("25"),
}
LIMITS = {
    "risco_pct": (Decimal("0"), Decimal("20")),
    "limiar_exposicao_pct": (Decimal("0"), Decimal("100")),
    "margem_alvo_pct": (Decimal("0"), Decimal("100")),
    "margem_aceitavel_pct": (Decimal("0"), Decimal("100")),
    "margem_minima_pct": (Decimal("0"), Decimal("100")),
}
LABELS = {
    "risco_pct": "Provisao de risco (% da Receita Liquida)",
    "limiar_exposicao_pct": "Gatilho de exposicao (% do Valor do Contrato, estritamente acima)",
    "margem_alvo_pct": "Margem alvo - faixa VERDE a partir de",
    "margem_aceitavel_pct": "Margem ACEITAVEL a partir de",
    "margem_minima_pct": "Margem minima - ATENCAO a partir de (abaixo: NAO APROVADO)",
}


class SettingsError(ValueError):
    pass


def parse_pct(v, key):
    if isinstance(v, bool) or not isinstance(v, (str, int)):
        raise SettingsError(f"{key}: informe texto decimal, ex. '2.5'")
    s = str(v).strip().replace(",", ".")
    if not PCT_RE.fullmatch(s):
        raise SettingsError(f"{key}: valor invalido {v!r} (0 a 999, ate 2 casas)")
    d = Decimal(s)
    lo, hi = LIMITS[key]
    if not lo <= d <= hi:
        raise SettingsError(f"{key}: fora do intervalo {lo} a {hi}")
    return d


def validate(raw):
    if not isinstance(raw, dict):
        raise SettingsError("parametros devem ser um objeto")
    extra = sorted(set(raw) - set(BASE))
    if extra:
        raise SettingsError(f"parametro(s) desconhecido(s): {', '.join(extra)}")
    p = dict(BASE)
    for k, v in raw.items():
        p[k] = parse_pct(v, k)
    if not p["margem_minima_pct"] <= p["margem_aceitavel_pct"] <= p["margem_alvo_pct"]:
        raise SettingsError("exige margem minima <= aceitavel <= alvo")
    return p


def to_strings(params):
    return {k: format(v.quantize(CENT), "f") for k, v in params.items()}


def faixa(pct, p):
    if pct is None:
        return "NAO RESOLVIDO"
    if pct >= p["margem_alvo_pct"]:
        return "VERDE"
    if pct >= p["margem_aceitavel_pct"]:
        return "ACEITAVEL"
    if pct >= p["margem_minima_pct"]:
        return "ATENCAO"
    return "NAO APROVADO"


def risco(rl, p):
    if rl <= ZERO:
        return None
    return (rl * p["risco_pct"] / CEM).quantize(CENT, ROUND_HALF_UP)


def margem(rl, custos, r, p):
    if rl <= ZERO:
        return {"custos": custos, "mc": None, "pct": None, "faixa": "NAO RESOLVIDO"}
    mc = rl - custos - (r or ZERO)
    pct = mc * CEM / rl
    return {"custos": custos, "mc": mc, "pct": pct, "faixa": faixa(pct, p)}


def exposicao(posicao, valor_contrato, p):
    exp = max(ZERO, -posicao)
    if valor_contrato is None or valor_contrato <= ZERO:
        return {"posicao": posicao, "exposicao": exp, "pct": None,
                "gatilho": "NAO RESOLVIDO (falha fechada)"}
    return {"posicao": posicao, "exposicao": exp, "pct": exp * CEM / valor_contrato,
            "gatilho": ("ACIONADO" if exp * CEM > p["limiar_exposicao_pct"] * valor_contrato
                        else "NAO ACIONADO")}


def _diff(a, b):
    return None if a is None or b is None else b - a


def simulate(projetos, params):
    """projetos: lista 'projetos' de cfo.analisar (valores Decimal, oficial)."""
    out = []
    for pr in projetos:
        rl = pr["receita_liquida"]
        r = risco(rl, params)
        mo = margem(rl, pr["margem_orcada"]["custos"], r, params)
        mr = margem(rl, pr["margem_realizada"]["custos"], r, params)
        ex = exposicao(pr["corrente"]["posicao"], pr["valor_contrato"], params)
        pf = (exposicao(pr["pro_forma"]["posicao"], pr["valor_contrato"], params)
              if pr.get("pro_forma") else None)
        out.append({
            "id": pr["id"], "nome": pr["nome"], "receita_liquida": rl,
            "valor_contrato": pr["valor_contrato"],
            "oficial": {"risco": pr["risco"], "margem_orcada": pr["margem_orcada"],
                        "margem_realizada": pr["margem_realizada"],
                        "exposicao": pr["corrente"], "pro_forma": pr.get("pro_forma")},
            "cenario": {"risco": r, "margem_orcada": mo, "margem_realizada": mr,
                        "exposicao": ex, "pro_forma": pf},
            "delta_pp": {"margem_orcada": _diff(pr["margem_orcada"]["pct"], mo["pct"]),
                         "margem_realizada": _diff(pr["margem_realizada"]["pct"], mr["pct"])},
            "mudou_classificacao": (mo["faixa"] != pr["margem_orcada"]["faixa"]
                                    or mr["faixa"] != pr["margem_realizada"]["faixa"]
                                    or ex["gatilho"] != pr["corrente"]["gatilho"]),
        })
    return out
