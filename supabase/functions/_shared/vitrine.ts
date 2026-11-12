// VITRINE: produtos em destaque nos e-mails (cartao com foto, nome e uma frase). O leitor de e-mail do cliente
// precisa abrir a foto sem login, entao a foto do produto que ENTRA num e-mail e copiada do bucket privado "produtos"
// para o bucket PUBLICO "vitrine" (so essa; o catalogo continua privado). O nome do arquivo leva a data da ultima
// alteracao do produto: foto nova -> endereco novo (o leitor de e-mail nao mostra a antiga guardada).
// deno-lint-ignore-file no-explicit-any
import { HttpError, SERVICE, servico, URL_BASE } from "./banco.ts";
import { nomeNaVitrine } from "./dominio/email_visual.js";

const CODIGO_RE = /^[A-Z]{2,5}-[0-9A-Z-]{2,40}$/;
const AUTH = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
export type ProdutoNoEmail = { codigo: string; titulo?: string; destaque?: string };

const limpo = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim().slice(0, max) : undefined);

/**
 * Confere os produtos pedidos para um e-mail: ate 3, codigos do catalogo e ativos. Aceita "PRD-0125" ou
 * {codigo, titulo?, destaque?}. Devolve a lista limpa para gravar em mensagens_saida.produtos ([] se nao veio nada).
 */
export async function conferirProdutosDoEmail(lista: unknown): Promise<ProdutoNoEmail[]> {
  if (lista == null || lista === "") return [];
  // modelo que manda a lista como texto: '[{"codigo":"PRD-0125"}]' ou "PRD-0125, PRD-0130"
  if (typeof lista === "string") {
    const s: string = lista;
    try { lista = JSON.parse(s); } catch { lista = s.split(/[,;\s]+/).filter(Boolean); }
  }
  if (!Array.isArray(lista)) throw new HttpError(400, "produtos: lista de {codigo, destaque?} (ex.: [{\"codigo\":\"PRD-0125\",\"destaque\":\"...\"}])");
  if (lista.length > 3) throw new HttpError(400, "no máximo 3 produtos por e-mail");
  const itens: ProdutoNoEmail[] = [];
  for (const x of lista) {
    const o: any = typeof x === "string" ? { codigo: x } : x;
    const codigo = String(o?.codigo ?? "").trim().toUpperCase();
    if (!CODIGO_RE.test(codigo)) throw new HttpError(400, `código de produto inválido: ${String(o?.codigo ?? "").slice(0, 40)} (use o código do catálogo, ex.: PRD-0125)`);
    if (itens.some((i) => i.codigo === codigo)) continue;
    const titulo = limpo(o?.titulo, 80), destaque = limpo(o?.destaque, 200);
    itens.push({ codigo, ...(titulo ? { titulo } : {}), ...(destaque ? { destaque } : {}) });
  }
  if (!itens.length) return [];
  const achados: { codigo: string }[] = await servico(`/rest/v1/produtos?codigo=in.(${itens.map((i) => `"${i.codigo}"`).join(",")})&situacao=eq.ativo&select=codigo`);
  const faltam = itens.filter((i) => !achados.some((a) => a.codigo === i.codigo)).map((i) => i.codigo);
  if (faltam.length) throw new HttpError(400, `produto não encontrado no catálogo (ou inativo): ${faltam.join(", ")}. Procure o código certo na busca de produtos (buscar_produtos)`);
  return itens;
}

/** Endereco publico da foto do produto (copia para a "vitrine" na primeira vez). null se nao tem foto ou falhou. */
async function fotoPublica(p: { codigo: string; imagem: string | null; atualizado_em: string | null }): Promise<string | null> {
  if (!p.imagem) return null;
  const ext = (/\.(jpe?g|png|webp)$/i.exec(p.imagem)?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");
  const versao = Math.floor((Date.parse(p.atualizado_em ?? "") || 0) / 1000).toString(36);
  const caminho = `produtos/${p.codigo}-${versao}.${ext}`;
  const publica = `${URL_BASE}/storage/v1/object/public/vitrine/${caminho}`;
  try {
    const ja = await fetch(publica, { method: "HEAD", signal: AbortSignal.timeout(8_000) });
    if (ja.ok) return publica;
    const orig = await fetch(`${URL_BASE}/storage/v1/object/produtos/${p.imagem.split("/").map(encodeURIComponent).join("/")}`, { headers: AUTH, signal: AbortSignal.timeout(15_000) });
    if (!orig.ok) {
      console.error("vitrine: ler foto", p.codigo, orig.status);
      return null;
    }
    const tipo = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const up = await fetch(`${URL_BASE}/storage/v1/object/vitrine/${caminho}`, {
      method: "POST", headers: { ...AUTH, "content-type": tipo, "x-upsert": "true", "cache-control": "max-age=31536000" },
      body: await orig.arrayBuffer(), signal: AbortSignal.timeout(15_000),
    });
    if (!up.ok) {
      console.error("vitrine: publicar foto", p.codigo, up.status, (await up.text()).slice(0, 200));
      return null;
    }
    return publica;
  } catch (e) {
    console.error("vitrine", p.codigo, e);
    return null;
  }
}

/** Produtos gravados no e-mail -> cartoes do visual: {titulo, destaque, foto}. Produto sumido do catalogo fica de fora. */
export async function produtosParaEmail(lista: unknown) {
  const itens = (Array.isArray(lista) ? lista : []).filter((x: any) => CODIGO_RE.test(String(x?.codigo ?? ""))).slice(0, 3) as ProdutoNoEmail[];
  if (!itens.length) return [];
  const linhas: any[] = await servico(`/rest/v1/produtos?codigo=in.(${itens.map((i) => `"${i.codigo}"`).join(",")})&select=codigo,nome,imagem,atualizado_em`);
  const por = new Map(linhas.map((l) => [l.codigo, l]));
  const fotos = await Promise.all(itens.map((i) => (por.has(i.codigo) ? fotoPublica(por.get(i.codigo)) : Promise.resolve(null))));
  return itens.flatMap((i, k) => {
    const p = por.get(i.codigo);
    return p ? [{ codigo: i.codigo, titulo: i.titulo || nomeNaVitrine(p.nome), destaque: i.destaque ?? null, foto: fotos[k] }] : [];
  });
}
