"""Importa o inventario do AliExpress (planilha gerada pelo Fernando) para o catalogo do VEOS.

Le: aba Inventario (1 linha por anuncio/variante), Ficha Tecnica (linhas), Pedidos (origem).
Grava (so no banco; nada de dado real no repositorio): produtos (PRD-xxxx, nome interno curto),
produto_fontes (AE-..., nome longo do fornecedor, ficha, descricao), produto_compras_origem,
historico do preco de compra e vinculos com itens do Zoho (mesmo anuncio = mesmo produto,
preferencia pelo novo; so nome parecido = possivel duplicado, a revisar). Fotos -> Storage.
Ligacao foto <-> item SO pelo codigo (PRD-xxxx.jpg / AE-....jpg), nunca por nome ou aparencia.
Idempotente: rodar de novo atualiza, nao duplica.

Uso: node scripts/online.mjs scripts/importar_aliexpress.py <planilha.xlsx> <pasta Imagens_AliExpress>
Requer: pip install openpyxl
"""
import collections, datetime, json, os, re, sys, unicodedata, urllib.request, urllib.error
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")
URL, SERVICE = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
PLANILHA, IMAGENS = sys.argv[1], sys.argv[2]
CAB = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}"}


def req(metodo, caminho, corpo=None, cab=None, bruto=None):
    dados = bruto if bruto is not None else (json.dumps(corpo, ensure_ascii=False, default=str).encode() if corpo is not None else None)
    r = urllib.request.Request(URL + caminho, data=dados, method=metodo, headers={**CAB, "Content-Type": "application/json", **(cab or {})})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            txt = resp.read().decode()
            return json.loads(txt) if txt else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{metodo} {caminho.split('?')[0]}: {e.code} {e.read().decode()[:300]}")


def txt(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def num(v):
    try:
        return round(float(str(v).replace(",", ".")), 3) if v not in (None, "") else None
    except ValueError:
        return None


def data(v):
    if isinstance(v, datetime.datetime):
        return v.date().isoformat()
    if isinstance(v, datetime.date):
        return v.isoformat()
    s = txt(v)
    if not s:
        return None
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", s)
    return f"{m[3]}-{m[2]}-{m[1]}" if m else s[:10]


def aba(wb, prefixo):
    ws = next(w for w in wb.worksheets if w.title.lower().startswith(prefixo))
    linhas = list(ws.iter_rows(values_only=True))
    return [dict(zip(linhas[0], l)) for l in linhas[1:] if any(c is not None for c in l)], linhas[0]


def col(cab, *inicios):
    for c in cab:
        if c and any(str(c).lower().startswith(i) for i in inicios):
            return c
    raise SystemExit(f"coluna nao encontrada: {inicios}")


wb = openpyxl.load_workbook(PLANILHA, read_only=True, data_only=True)
inv, cab = aba(wb, "invent")
ficha, cabf = aba(wb, "ficha")
pedidos, cabp = aba(wb, "pedidos")
C = lambda *i: col(cab, *i)  # noqa: E731
c_cod, c_nome, c_agr, c_sku, c_forn, c_var, c_loja = C("código do produto"), C("nome do produto"), C("agrupamento"), C("código interno"), C("nome do fornecedor"), C("variante comprada"), C("loja")
c_ult, c_data, c_ped, c_stat, c_qtd, c_tot = C("último preço"), C("data da última"), C("nº do último", "n° do último", "no do último"), C("status do último"), C("qtd no último"), C("total do último")
c_qtdt, c_np, c_min, c_max, c_prim, c_link, c_aid, c_sit = C("qtd total"), C("nº de pedidos", "n° de pedidos"), C("menor preço"), C("maior preço"), C("primeira compra"), C("link de compra"), C("id do produto"), C("situação do anúncio")
c_alt, c_snap, c_tit, c_marca, c_mod, c_ficha, c_ffonte, c_desc, c_imgd, c_rot, c_arq, c_url = C("link alternativo"), C("snapshot"), C("título atual"), C("marca"), C("modelo"), C("ficha técnica"), C("fonte da ficha"), C("descrição completa"), C("imagens da descrição"), C("rótulos"), C("arquivo da imagem"), C("url da imagem")

# ---------------------------------------------------------------- ficha tecnica por SKU interno
fs_sku, fs_atr, fs_val = col(cabf, "código interno"), col(cabf, "atributo"), col(cabf, "valor")
fichas = collections.defaultdict(list)
for f in ficha:
    if f[fs_sku] and f[fs_atr]:
        fichas[str(f[fs_sku])].append({"atributo": txt(f[fs_atr]), "valor": txt(f[fs_val])})

# ---------------------------------------------------------------- produtos (PRD)
por_prd = collections.OrderedDict()
for r in inv:
    por_prd.setdefault(str(r[c_cod]), []).append(r)


def mais_comum(valores):
    v = [x for x in (txt(y) for y in valores) if x and x.lower() not in ("nenhum", "none")]
    return collections.Counter(v).most_common(1)[0][0] if v else None


produtos = []
for cod, rs in por_prd.items():
    recente = max(rs, key=lambda r: data(r[c_data]) or "")
    precos = [num(r[c_min]) for r in rs if num(r[c_min])] + [num(r[c_max]) for r in rs if num(r[c_max])]
    produtos.append({
        "codigo": cod, "nome": txt(rs[0][c_nome]), "marca": mais_comum(r[c_marca] for r in rs), "modelo": mais_comum(r[c_mod] for r in rs),
        "unidade": "un", "tipo": "produto", "origem": "aliexpress",
        "situacao": "revisar" if any(txt(r[c_agr]) for r in rs) else "ativo",
        "custo_ultimo": num(recente[c_ult]), "custo_data": data(recente[c_data]),
        "custo_min": min(precos) if precos else None, "custo_max": max(precos) if precos else None,
        "imagem": f"{cod}.jpg" if os.path.exists(os.path.join(IMAGENS, "por_produto", f"{cod}.jpg")) else None,
        "atualizado_em": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
antes = {p["codigo"]: p for p in req("GET", "/rest/v1/produtos?select=id,codigo,custo_ultimo,situacao&limit=10000")}
for p in produtos:  # reimportar nao desfaz decisao manual (excluido, inativo, conferido)
    if p["codigo"] in antes:
        p["situacao"] = antes[p["codigo"]]["situacao"]
req("POST", "/rest/v1/produtos?on_conflict=codigo", produtos, {"Prefer": "resolution=merge-duplicates"})
ids = {p["codigo"]: p["id"] for p in req("GET", "/rest/v1/produtos?select=id,codigo&limit=10000")}
hist = [{"produto_id": ids[p["codigo"]], "campo": "custo_ultimo", "de": antes.get(p["codigo"], {}).get("custo_ultimo"), "para": p["custo_ultimo"],
         "motivo": f"Importação AliExpress: último preço unitário pago em {p['custo_data']} (sem frete/impostos)", "origem": "importacao_aliexpress"}
        for p in produtos if p["custo_ultimo"] is not None and (p["codigo"] not in antes or float(antes[p["codigo"]]["custo_ultimo"] or 0) != p["custo_ultimo"])]
if hist:
    req("POST", "/rest/v1/produto_precos_historico", hist)

# ---------------------------------------------------------------- fontes (AE-... por anuncio/variante)
fontes = []
for r in inv:
    sku = str(r[c_sku])
    fontes.append({
        "produto_id": ids[str(r[c_cod])], "sku_interno": sku, "fornecedor": txt(r[c_loja]), "nome_fornecedor": txt(r[c_forn]), "titulo_atual": txt(r[c_tit]),
        "variante": txt(r[c_var]), "rotulos_variante": txt(r[c_rot]), "aliexpress_id": txt(r[c_aid]), "link": txt(r[c_link]), "link_alternativo": txt(r[c_alt]), "snapshot": txt(r[c_snap]),
        "situacao_anuncio": txt(r[c_sit]), "marca": txt(r[c_marca]), "modelo": txt(r[c_mod]),
        "ultimo_preco": num(r[c_ult]), "ultima_compra": data(r[c_data]), "ultimo_pedido": txt(r[c_ped]), "status_ultimo_pedido": txt(r[c_stat]),
        "qtd_ultimo_pedido": num(r[c_qtd]), "total_ultimo_pedido": num(r[c_tot]), "qtd_total": num(r[c_qtdt]), "n_pedidos": int(num(r[c_np]) or 0) or None,
        "menor_preco": num(r[c_min]), "maior_preco": num(r[c_max]), "primeira_compra": data(r[c_prim]),
        "agrupamento_a_confirmar": bool(txt(r[c_agr])), "ficha": fichas.get(sku, []), "ficha_texto": txt(r[c_ficha]), "fonte_ficha": txt(r[c_ffonte]),
        "descricao": txt(r[c_desc]), "imagens_descricao": [u for u in re.split(r"[\s|,]+", txt(r[c_imgd]) or "") if u.startswith(("http", "//"))][:40],
        "imagem": f"fontes/{txt(r[c_arq])}" if txt(r[c_arq]) and os.path.exists(os.path.join(IMAGENS, "por_codigo_interno", txt(r[c_arq]))) else None,
        "imagem_url_origem": txt(r[c_url]), "atualizado_em": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
req("POST", "/rest/v1/produto_fontes?on_conflict=sku_interno", fontes, {"Prefer": "resolution=merge-duplicates"})

# ---------------------------------------------------------------- historico de compras (pedidos de origem)
P = lambda *i: col(cabp, *i)  # noqa: E731
p_cod, p_ped, p_data, p_stat, p_loja, p_forn, p_var, p_pu, p_qtd, p_tot, p_link, p_sku, p_cls = P("código do produto"), P("nº do pedido", "n° do pedido"), P("data"), P("status"), P("loja"), P("nome do fornecedor"), P("variante"), P("preço unitário"), P("qtd"), P("total do pedido"), P("link"), P("código interno"), P("classificação")
compras = {}
for r in pedidos:
    if str(r[p_cod]) not in ids:
        continue
    chave = (str(r[p_ped]), txt(r[p_sku]), txt(r[p_var]))
    compras[chave] = {"produto_id": ids[str(r[p_cod])], "sku_interno": chave[1], "pedido": chave[0], "data": data(r[p_data]), "status": txt(r[p_stat]), "loja": txt(r[p_loja]),
                      "nome_fornecedor": txt(r[p_forn]), "variante": chave[2], "preco_unit": num(r[p_pu]), "quantidade": num(r[p_qtd]), "total_pedido": num(r[p_tot]), "link": txt(r[p_link]), "classificacao": txt(r[p_cls])}
req("POST", "/rest/v1/produto_compras_origem?on_conflict=pedido,sku_interno,variante", list(compras.values()), {"Prefer": "resolution=merge-duplicates"})

# ---------------------------------------------------------------- vinculos com itens do Zoho
def norm(t):
    return unicodedata.normalize("NFD", str(t or "")).encode("ascii", "ignore").decode().lower()


STOP = set("de da do com para e em kit pcs peca pecas the a o x wifi".split())


def tokens(t):
    return {w for w in re.findall(r"[a-z0-9]+", norm(t)) if len(w) > 1 and w not in STOP}


zoho = req("GET", "/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&excluido=is.false&select=zoho_id,nome,dados&limit=10000")
vinculos = []
for cod, rs in por_prd.items():
    aids = {txt(r[c_aid]) for r in rs if txt(r[c_aid])}
    tp = tokens(rs[0][c_nome]) | tokens(mais_comum(r[c_mod] for r in rs))
    for z in zoho:
        texto = norm(json.dumps(z["dados"], ensure_ascii=False))
        aid = next((a for a in aids if a in texto), None)
        tz = tokens(z["nome"])
        jac = len(tp & tz) / max(1, len(tp | tz))
        if aid:
            vinculos.append({"produto_id": ids[cod], "zoho_item_id": z["zoho_id"], "relacao": "mesmo_produto", "situacao": "confirmado", "preferencia": "novo",
                             "evidencia": f"Mesmo anúncio do AliExpress (ID {aid}) no item do Zoho. Regra do fundador (01/10/2026): duplicado certo -> preferência para o cadastro novo."})
        elif jac >= 0.3:
            vinculos.append({"produto_id": ids[cod], "zoho_item_id": z["zoho_id"], "relacao": "possivel_duplicado", "situacao": "a_revisar", "preferencia": None,
                             "evidencia": f"Só o nome parece ({round(jac * 100)}% das palavras em comum). Mantidos os dois até o fundador decidir."})
if vinculos:
    # nao sobrescreve decisao ja tomada pelo fundador
    decididos = {(v["produto_id"], v["zoho_item_id"]) for v in req("GET", "/rest/v1/produto_vinculos_zoho?decidido_por=not.is.null&select=produto_id,zoho_item_id&limit=10000")}
    novos = [v for v in vinculos if (v["produto_id"], v["zoho_item_id"]) not in decididos]
    if novos:
        req("POST", "/rest/v1/produto_vinculos_zoho?on_conflict=produto_id,zoho_item_id", novos, {"Prefer": "resolution=merge-duplicates"})

# ---------------------------------------------------------------- fotos -> Storage (bucket produtos)
enviadas = 0
for pasta, prefixo in (("por_produto", ""), ("por_codigo_interno", "fontes/")):
    base = os.path.join(IMAGENS, pasta)
    for arq in sorted(os.listdir(base)):
        if not re.match(r"^(PRD-\d+|AE-[\w-]+)\.(jpe?g|png|webp)$", arq, re.I):
            continue
        tipo = "image/png" if arq.lower().endswith("png") else "image/webp" if arq.lower().endswith("webp") else "image/jpeg"
        req("POST", f"/storage/v1/object/produtos/{prefixo}{arq}", bruto=open(os.path.join(base, arq), "rb").read(), cab={"Content-Type": tipo, "x-upsert": "true"})
        enviadas += 1

cont = collections.Counter(v["relacao"] for v in vinculos)
print(f"produtos: {len(produtos)} ({sum(1 for p in produtos if p['situacao'] == 'revisar')} a revisar por agrupamento)")
print(f"anúncios/variantes: {len(fontes)} · ficha técnica: {sum(len(f['ficha']) for f in fontes)} atributos · compras de origem: {len(compras)}")
print(f"vínculos com o Zoho: {cont['mesmo_produto']} mesmo produto (preferência novo) · {cont['possivel_duplicado']} possíveis duplicados a revisar")
print(f"fotos enviadas: {enviadas} · histórico de custo: {len(hist)} registros")
