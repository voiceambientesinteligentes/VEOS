"""Gera tests/regras/paridade-vigia.json: casos TESTE + resposta do vigia Python
(referencia). O porte TypeScript (supabase/functions/_shared/regras) precisa
reproduzir exatamente as mesmas respostas. Semente fixa: arquivo deterministico.

Uso (na pasta VEOS):  python tests/regras/gerar_paridade.py"""
import json
import random
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "apps" / "portal"))

from veosportal import cfo_controls as cc  # noqa: E402
from veosportal import vigia  # noqa: E402
from veosportal.cfo_bridge import jsonable  # noqa: E402

JUST = list(cc.EXCECOES_TICKET)


def base(**mud):
    o = {"id": "ORC-TESTE-P", "ambiente": "TESTE", "impostos": "12000.00",
         "valor_total_informado": "120000.00",
         "itens": [{"codigo": "CENTRAL", "quantidade": "2", "preco_unitario": "50000.00",
                    "custo_unitario": "25000.00"},
                   {"codigo": "REDE", "quantidade": "1", "preco_unitario": "20000.00",
                    "custo_unitario": "12000.00"}]}
    o.update(mud)
    return o


def fixos():
    c = [base(), base(valor_total_informado="125000.00"), base(desconto_valor="3600.00"),
         base(desconto_valor="2400.00"), base(desconto_valor="6000.00"), base(impostos=None),
         base(ambiente="PRODUCAO"), base(id="ORC-REAL"), base(itens=[]), base(extra="x"),
         base(desconto_valor="999999.00"), base(valor_total_informado="0.00"),
         base(justificativas_ticket=["nao_existe"]), base(valor_total_informado="120000"),
         base(itens=[{"codigo": "B", "quantidade": "1", "preco_unitario": "0.00"}],
              valor_total_informado="1.00"),
         base(desconto_valor="120000.00")]
    sem_custo = base()
    sem_custo["itens"][1]["custo_unitario"] = None
    abaixo = base(valor_total_informado="110000.00")
    abaixo["itens"][1]["preco_unitario"] = "10000.00"
    piso = base()
    piso["itens"][0]["custo_unitario"] = "40000.00"
    faixa_30 = base()  # MC entre 30 e 31,99 com desconto pequeno: NAO RESOLVIDO
    faixa_30["itens"][0]["custo_unitario"] = "30700.00"
    faixa_30["desconto_valor"] = "1000.00"
    rl_neg = base(impostos="200000.00")
    kit = {"id": "ORC-TESTE-KIT", "ambiente": "TESTE", "valor_total_informado": "50000.00",
           "impostos": "5000.00", "itens": [{"codigo": "KIT", "quantidade": "1",
                                             "preco_unitario": "50000.00",
                                             "custo_unitario": "20000.00"}]}
    kit_just = dict(kit, justificativas_ticket=["cliente_recorrente"])
    kit_meta = dict(kit, justificativas_ticket=["margem_superior_meta"])
    kit_ruim = dict(kit, justificativas_ticket=["margem_superior_meta"], impostos="30000.00")
    return c + [sem_custo, abaixo, piso, faixa_30, rl_neg, kit, kit_just, kit_meta, kit_ruim]


def money(rng, lo, hi):
    return f"{rng.randint(lo, hi)}.{rng.randint(0, 99):02d}"


def aleatorio(rng, n):
    itens = []
    for k in range(rng.randint(1, 6)):
        preco = money(rng, 1, 90000)
        custo = None if rng.random() < 0.08 else money(rng, 1, 90000)
        itens.append({"codigo": f"IT{k}", "quantidade": str(rng.randint(1, 20)),
                      "preco_unitario": preco, "custo_unitario": custo})
    soma = sum(int(i["quantidade"]) * round(float(i["preco_unitario"]) * 100) for i in itens)
    total = soma if rng.random() < 0.8 else soma + rng.randint(-5000, 5000)
    o = {"id": f"ORC-TESTE-{n}", "ambiente": "TESTE", "itens": itens,
         "valor_total_informado": f"{max(total, 1) // 100}.{max(total, 1) % 100:02d}"}
    if rng.random() < 0.9:
        o["impostos"] = f"{soma * rng.randint(0, 25) // 10000}.{rng.randint(0, 99):02d}"
    if rng.random() < 0.6:
        d = soma * rng.randint(0, 800) // 10000
        o["desconto_valor"] = f"{d // 100}.{d % 100:02d}"
    if rng.random() < 0.3:
        o["justificativas_ticket"] = rng.sample(JUST, rng.randint(1, 2))
    return o


def main():
    rng = random.Random(20260930)
    casos = fixos() + [aleatorio(rng, n) for n in range(400)]
    saida = []
    for c in casos:
        try:
            esperado = jsonable(vigia.avaliar_orcamento(c))
        except cc.ControlError:
            esperado = {"erro": True}
        saida.append({"entrada": c, "esperado": esperado})
    destino = Path(__file__).with_name("paridade-vigia.json")
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    erros = sum(1 for s in saida if s["esperado"].get("erro"))
    sit = {}
    for s in saida:
        k = s["esperado"].get("situacao", "ERRO")
        sit[k] = sit.get(k, 0) + 1
    print(f"{len(saida)} casos ({erros} com erro de validacao) -> {destino.name}; situacoes: {sit}")


def caixa():
    """Casos de exposicao (V1.1) e cobertura por fase (V1 sec.10) do motor Python."""
    from decimal import Decimal
    rng = random.Random(20260931)
    exp, cob = [], []
    for n in range(500):
        posicao = Decimal(rng.randint(-50_000_000, 50_000_000)) / 100
        vc = None if n % 17 == 0 else (Decimal(0) if n % 23 == 0 else Decimal(rng.randint(1, 90_000_000)) / 100)
        if n % 11 == 0 and vc:  # fronteira exata de 10%
            posicao = -(vc / 10).quantize(Decimal("0.01"))
        r = jsonable(cc.exposicao(posicao, vc))
        exp.append({"posicao": f"{posicao:.2f}", "valor_contrato": None if vc is None else f"{vc:.2f}", "esperado": r})
    for n in range(300):
        coberto = Decimal(rng.randint(0, 5_000_000)) / 100
        nec = coberto if n % 9 == 0 else Decimal(rng.randint(0, 5_000_000)) / 100
        cob.append({"coberto": f"{coberto:.2f}", "necessidade": f"{nec:.2f}", "esperado": jsonable(cc._cobertura(coberto, nec))})
    destino = Path(__file__).with_name("paridade-caixa.json")
    destino.write_text(json.dumps({"exposicao": exp, "cobertura": cob}, indent=1) + "\n", encoding="utf-8")
    print(f"{len(exp)} casos de exposicao + {len(cob)} de cobertura -> {destino.name}")


if __name__ == "__main__":
    main()
    caixa()
