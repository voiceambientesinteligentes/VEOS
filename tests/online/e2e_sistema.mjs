// Teste online da area Sistema (saude; usuarios e exportacao quando existirem). Usuario TESTE
// proprio com senha aleatoria renovada a cada execucao (nunca impressa); fica INATIVO no fim.
// Uso: node scripts/online.mjs tests/online/e2e_sistema.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
// GitHub Actions usa usuarios TESTE proprios (nao colide com execucao local ao mesmo tempo)
const EMAIL = `teste-sistema${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
const ORIGEM = "https://voiceambientesinteligentes.github.io";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const resultados = [];
const ok = (nome) => resultados.push(`ok  ${nome}`);

async function req(path, { method = "GET", token, body, headers = {} } = {}) {
  const r = await fetch(`${URL_BASE}${path}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, "Content-Type": "application/json", Origin: ORIGEM, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: r.status, dados };
}
const papel = (user_id, p, ativo = true) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id, nome: "Usuario TESTE sistema", papel: p, ativo }) });

const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha }) })).status, 200);
const token = (await req("/auth/v1/token?grant_type=password", { method: "POST", body: { email: EMAIL, password: senha } })).dados.access_token;
assert.ok(token, "login TESTE");

try {
  assert.ok((await papel(user.id, "vendas")).ok);
  assert.equal((await req("/functions/v1/api/sistema/saude", { token })).status, 403); ok("vendas nao ve a saude do sistema -> 403");
  assert.ok((await papel(user.id, "direcao")).ok);
  const s = await req("/functions/v1/api/sistema/saude", { token });
  assert.equal(s.status, 200, JSON.stringify(s.dados));
  assert.ok(s.dados.banco_bytes > 0 && Array.isArray(s.dados.alertas) && Array.isArray(s.dados.zoho_modulos));
  assert.ok(s.dados.agendamentos.some((j) => j.nome === "veos-saude-sistema"));
  ok(`direcao le a saude: banco ${Math.round(s.dados.banco_bytes / 1048576)} MB, ${s.dados.alertas.length} alerta(s), ${s.dados.agendamentos.length} agendamentos`);
  assert.equal((await req("/rest/v1/rpc/sistema_saude", { method: "POST", token, body: {} })).status >= 400, true); ok("usuario nao chama sistema_saude direto no banco");

  // usuarios e acessos
  const chave = () => ({ "Idempotency-Key": crypto.randomUUID() });
  const lista1 = await req("/functions/v1/api/sistema/membros", { token });
  assert.equal(lista1.status, 200); assert.ok(lista1.dados.membros.some((m) => m.user_id === user.id && m.teste)); ok("direcao lista membros (TESTE marcado)");
  const CONV = "convite-teste@veos-teste.invalid";
  let conv = lista1.dados.membros.find((m) => m.email === CONV);
  if (!conv) {
    const c = await req("/functions/v1/api/sistema/membros", { method: "POST", token, headers: chave(), body: { nome: "Convite TESTE", email: CONV, papel: "operacoes" } });
    assert.equal(c.status, 200, JSON.stringify(c.dados));
    conv = { user_id: c.dados.user_id, ativo: true };
    ok("convite cria login e membro (sem enviar e-mail)");
  } else ok("convite TESTE ja existia (execucao anterior)");
  if (!conv.ativo) assert.equal((await req(`/functions/v1/api/sistema/membros/${conv.user_id}`, { method: "POST", token, headers: chave(), body: { acao: "reativar" } })).status, 200);
  const dup = await req("/functions/v1/api/sistema/membros", { method: "POST", token, headers: chave(), body: { nome: "Convite TESTE", email: CONV, papel: "operacoes" } });
  assert.equal(dup.status, 400); ok("convidar de novo -> 400 (ja tem cadastro)");
  assert.equal((await req(`/functions/v1/api/sistema/membros/${conv.user_id}`, { method: "POST", token, headers: chave(), body: { acao: "desativar" } })).status, 400); ok("desativar sem motivo -> 400");
  assert.equal((await req(`/functions/v1/api/sistema/membros/${conv.user_id}`, { method: "POST", token, headers: chave(), body: { acao: "desativar", motivo: "TESTE automatizado" } })).status, 200);
  const banido = await (await fetch(`${URL_BASE}/auth/v1/admin/users/${conv.user_id}`, { headers: admin })).json();
  assert.ok(banido.banned_until && Date.parse(banido.banned_until) > Date.now()); ok("desativar bloqueia o login no Auth");
  assert.equal((await req(`/functions/v1/api/sistema/membros/${user.id}`, { method: "POST", token, headers: chave(), body: { acao: "exigir_mfa" } })).status, 400); ok("exigir MFA de quem nao cadastrou -> 400");

  // MFA exigido: sessao sem codigo (aal1) recebe 403 mfa_necessario
  await fetch(`${URL_BASE}/rest/v1/membros?user_id=eq.${user.id}`, { method: "PATCH", headers: admin, body: JSON.stringify({ exige_mfa: true }) });
  const me = await req("/functions/v1/api/me", { token });
  assert.equal(me.status, 403); assert.equal(me.dados.erro, "mfa_necessario"); ok("MFA exigido e sessao sem codigo -> 403 mfa_necessario");
  await fetch(`${URL_BASE}/rest/v1/membros?user_id=eq.${user.id}`, { method: "PATCH", headers: admin, body: JSON.stringify({ exige_mfa: false }) });
  assert.equal((await req("/functions/v1/api/me", { token })).dados.aal, "aal1"); ok("/me informa o nivel da sessao (aal1)");
  // painel executivo
  const pn = await req("/functions/v1/api/painel", { token });
  assert.equal(pn.status, 200, JSON.stringify(pn.dados)); assert.equal(pn.dados.meses.length, 12); assert.ok(Array.isArray(pn.dados.funil_crm));
  ok(`painel executivo: 12 meses, ${pn.dados.orcamentos.length} situacoes de orcamento, ${pn.dados.funil_crm.length} etapas no CRM`);

  // compras, contas a pagar e caixa (so leitura e recusas: nada e gravado no estoque real)
  for (const r of ["fluxo/compras", "fluxo/compras/faltas", "fluxo/compras/fornecedores", "fluxo/contas-pagar", "fluxo/caixa"]) {
    const x = await req(`/functions/v1/api/${r}`, { token });
    assert.equal(x.status, 200, `${r}: ${JSON.stringify(x.dados).slice(0, 200)}`);
  }
  ok("compras, faltas, fornecedores, contas a pagar e previsao de caixa respondem");
  const pj = await req("/functions/v1/api/fluxo/projetos", { token });
  assert.equal(pj.status, 200); ok(`projetos do Zoho para ligar ao pedido: ${pj.dados.projetos.length}`);
  const semPed = await req("/functions/v1/api/fluxo/pedidos/00000000-0000-0000-0000-000000000000/horas", { method: "POST", token, headers: chave(), body: { data: "2026-10-01", pessoa: "TESTE", horas: "30" } });
  assert.equal(semPed.status, 400); ok("horas acima de 24 por lancamento -> 400");
  const apr = await req("/functions/v1/api/fluxo/pedidos/00000000-0000-0000-0000-000000000000/aprendizado", { method: "POST", token, headers: chave(), body: {} });
  assert.equal(apr.status, 404, JSON.stringify(apr.dados)); ok("aprendizado de margem de pedido inexistente -> 404 (nada gravado)");
  const cx = await req("/functions/v1/api/fluxo/caixa", { token });
  assert.equal(cx.dados.meses.length, 9); ok("previsao de caixa: 2 meses atras ate 6 a frente");
  const inval = await req("/functions/v1/api/fluxo/compras", { method: "POST", token, headers: chave(), body: { fornecedor_nome: "Fornecedor TESTE", itens: [{ item_id: "nao-existe-TESTE", quantidade: "1", custo_unit: "10.00" }], parcelas: [{ vencimento: "2026-12-01", valor: "10.00" }] } });
  assert.equal(inval.status, 400); assert.match(inval.dados.erro, /catálogo/); ok("compra de produto fora do catalogo -> 400");
  const catc = await req("/functions/v1/api/fluxo/contas-pagar", { method: "POST", token, headers: chave(), body: { descricao: "x", fornecedor: "y", categoria: "compra", vencimento: "2026-12-01", valor: "10.00" } });
  assert.equal(catc.status, 400); ok("conta avulsa com categoria compra -> 400");
  const vr = await req("/functions/v1/api/radar/varrer", { method: "POST", token, headers: chave(), body: {} });
  assert.equal(vr.status, 200, JSON.stringify(vr.dados).slice(0, 300)); assert.ok(vr.dados.fluxo && vr.dados.biblioteca);
  ok("varredura da direcao roda as vigias do fluxo (compras/contas/exposicao) e da Biblioteca sem erro");

  // catalogo de produtos (so leitura e recusas)
  const cat = await req("/functions/v1/api/produtos", { token });
  assert.equal(cat.status, 200); assert.ok(cat.dados.total >= 1, "catalogo vazio");
  const comFoto = cat.dados.produtos.find((p) => p.foto);
  assert.ok(comFoto); assert.equal((await fetch(comFoto.foto)).status, 200); ok(`catalogo: ${cat.dados.total} produtos; foto abre pela URL assinada`);
  const ficha = await req(`/functions/v1/api/produtos/${comFoto.id}`, { token });
  assert.equal(ficha.status, 200); assert.ok(Array.isArray(ficha.dados.fontes) && ficha.dados.pode.preco); ok("ficha do produto com fontes, compras e vinculos");
  assert.equal((await req(`/functions/v1/api/produtos/${comFoto.id}/preco`, { method: "POST", token, headers: chave(), body: { campo: "preco_venda", valor: "0.00", motivo: "TESTE" } })).status, 400); ok("preco zero recusado (sem valor = lacuna)");
  const rev = await req("/functions/v1/api/produtos/revisao", { token });
  assert.equal(rev.status, 200); ok(`revisao: ${rev.dados.vinculos.length} possivel(is) duplicado(s), ${rev.dados.agrupamentos.length} agrupamento(s) a conferir`);

  // perguntas aos diretores (pergunta TESTE criada e cancelada)
  const pq = await req("/functions/v1/api/diretores/perguntas", { method: "POST", token, headers: chave(), body: { setor_id: "marketing", pergunta: "[TESTE automatizado] pergunta de teste" } });
  assert.equal(pq.status, 200, JSON.stringify(pq.dados));
  assert.equal((await req(`/functions/v1/api/diretores/perguntas/${pq.dados.id}/responder`, { method: "POST", token, headers: chave(), body: { resposta: "curta", motor: "TESTE" } })).status, 400); ok("resposta vazia/curta recusada");
  assert.equal((await req(`/functions/v1/api/diretores/perguntas/${pq.dados.id}/cancelar`, { method: "POST", token, headers: chave(), body: {} })).status, 200);
  const lp = await req("/functions/v1/api/diretores/perguntas", { token });
  assert.ok(lp.dados.perguntas.some((p) => p.id === pq.dados.id && p.estado === "cancelada")); ok("pergunta ao diretor: criada, listada e cancelada");

  // ferramentas do CFO (somente leitura aqui: o formulario real do fundador nao recebe dado TESTE)
  const cf = await req("/functions/v1/api/cfo/formulario", { token });
  assert.equal(cf.status, 200); assert.equal(typeof cf.dados.respostas, "object"); ok("CFO: formulario vigente lido");
  assert.equal((await req("/functions/v1/api/cfo/formulario", { method: "POST", token, headers: chave(), body: { secao: "inexistente", dados: {} } })).status, 400); ok("CFO: secao invalida recusada");
  assert.equal((await req("/functions/v1/api/cfo/formulario", { method: "POST", token, headers: chave(), body: { secao: "fixos", dados: { "x y": 1 } } })).status, 400); ok("CFO: campo com nome invalido recusado");
  const co = await req("/functions/v1/api/cfo/orcamentos", { token });
  assert.equal(co.status, 200); assert.ok(Array.isArray(co.dados.orcamentos) && co.dados.rbt12); ok(`CFO: orcamentos resumidos (${co.dados.orcamentos.length}) e faturamento 12 meses`);
  const cp = await req("/functions/v1/api/cfo/produtos", { token });
  assert.equal(cp.status, 200); assert.ok(cp.dados.produtos.every((x) => Array.isArray(x.compras))); ok(`CFO: produtos com compras (${cp.dados.produtos.length})`);
  const cc = await req("/functions/v1/api/cfo/cambio", { token });
  assert.equal(cc.status, 200); assert.ok(Array.isArray(cc.dados.serie)); ok(`CFO: dolar PTAX do Banco Central (${cc.dados.serie.length} dias${cc.dados.ok ? "" : ", indisponivel agora"})`);
  // plano: leitura e regras (sem alterar os itens reais do fundador)
  const pl = await req("/functions/v1/api/plano", { token });
  assert.equal(pl.status, 200); assert.ok(Array.isArray(pl.dados.itens) && pl.dados.pode.aprovar); ok(`plano: ${pl.dados.itens.length} itens lidos`);
  assert.equal((await req("/functions/v1/api/plano/itens", { method: "POST", token, headers: chave(), body: { area: "financas", fase: "99", tipo: "meta", titulo: "TESTE", descricao: "TESTE" } })).status, 400); ok("plano: fase invalida recusada");
  if (pl.dados.itens.length) assert.equal((await req(`/functions/v1/api/plano/itens/${pl.dados.itens[0].id}`, { method: "POST", token, headers: chave(), body: {} })).status, 400), ok("plano: mudanca vazia recusada");

  // caixa de saida e resumo do dia (a mensagem TESTE e descartada no fim)
  const rs = await req("/functions/v1/api/resumo", { token });
  assert.equal(rs.status, 200); assert.equal(rs.dados.resumos.length, 9); ok("resumo do dia dos 9 setores (direcao)");
  const nm = await req("/functions/v1/api/mensagens", { method: "POST", token, headers: chave(), body: { canal: "email", destinatario: "teste@veos-teste.invalid", assunto: "TESTE automatizado", corpo: "Mensagem TESTE automatizado (descartada pelo teste)", origem: "manual" } });
  assert.equal(nm.status, 200, JSON.stringify(nm.dados));
  assert.equal((await req(`/functions/v1/api/mensagens/${nm.dados.id}/descartada`, { method: "POST", token, headers: chave(), body: {} })).status, 400); ok("descartar sem motivo -> 400");
  assert.equal((await req(`/functions/v1/api/mensagens/${nm.dados.id}/descartada`, { method: "POST", token, headers: chave(), body: { motivo: "TESTE automatizado" } })).status, 200);
  const desc = await req("/functions/v1/api/mensagens?estado=descartada", { token });
  assert.ok(desc.dados.mensagens.some((m) => m.id === nm.dados.id)); ok("rascunho criado e descartado com motivo (nada enviado)");
  assert.equal((await req("/functions/v1/api/mensagens", { method: "POST", token, headers: chave(), body: { canal: "sms", corpo: "x" } })).status, 400); ok("canal fora de e-mail/WhatsApp -> 400");

  // exportacao
  const conj = await req("/functions/v1/api/sistema/exportar", { token });
  assert.equal(conj.status, 200); assert.ok(conj.dados.conjuntos.length >= 10);
  for (const c of conj.dados.conjuntos) {
    const e = await req(`/functions/v1/api/sistema/exportar/${c.id}`, { token });
    assert.equal(e.status, 200, `${c.id}: ${JSON.stringify(e.dados).slice(0, 200)}`);
    assert.ok(Array.isArray(e.dados.linhas) && Array.isArray(e.dados.colunas));
    assert.ok(e.dados.linhas.every((l) => Object.values(l).every((v) => v === null || typeof v !== "object")), `${c.id}: linhas planas`);
  }
  ok(`exporta ${conj.dados.conjuntos.length} conjuntos em linhas planas`);
  assert.equal((await req("/functions/v1/api/sistema/exportar/membros", { token })).status, 404); ok("conjunto fora da lista -> 404");
  const acs = await req(`/functions/v1/api/sistema/acessos?usuario=${user.id}`, { token });
  assert.equal(acs.status, 200); assert.ok(acs.dados.acessos.some((x) => x.recurso === "exportar:pedidos" && x.acao === "exportacao")); ok("LGPD: exportacao registrada com pessoa e horario");

  await papel(user.id, "vendas");
  assert.equal((await req("/functions/v1/api/sistema/membros", { token })).status, 403); ok("vendas nao gere usuarios -> 403");
  assert.equal((await req("/functions/v1/api/sistema/exportar/pedidos", { token })).status, 403); ok("vendas nao exporta -> 403");
  assert.equal((await req("/functions/v1/api/painel", { token })).status, 403); ok("vendas nao ve o painel executivo -> 403");
  assert.equal((await req("/functions/v1/api/fluxo/compras", { token })).status, 403); ok("vendas nao ve compras -> 403");
  assert.equal((await req("/functions/v1/api/fluxo/contas-pagar", { token })).status, 403); ok("vendas nao ve contas a pagar -> 403");
  const rv = await req("/functions/v1/api/resumo", { token });
  assert.ok(!rv.dados.resumos.some((r) => r.setor === "financas")); ok("vendas nao recebe o resumo do Financeiro (setor restrito)");
  assert.equal((await req(`/functions/v1/api/produtos/${comFoto.id}/preco`, { method: "POST", token, headers: chave(), body: { campo: "preco_venda", valor: "100.00", motivo: "TESTE" } })).status, 403); ok("vendas nao define preco de venda -> 403");
  assert.equal((await req(`/functions/v1/api/diretores/perguntas/${pq.dados.id}/responder`, { method: "POST", token, headers: chave(), body: { resposta: "resposta TESTE longa o bastante", motor: "TESTE" } })).status, 403); ok("vendas nao grava resposta de IA -> 403");
  assert.equal((await req("/functions/v1/api/cfo/orcamentos", { token })).status, 403); ok("vendas nao abre o diagnostico do CFO -> 403");
  const plv = await req("/functions/v1/api/plano", { token });
  assert.equal(plv.status, 200); assert.ok(!plv.dados.pode.aprovar && plv.dados.itens.every((i) => i.area !== "financas")); ok("vendas ve o plano sem o Financeiro e sem aprovar");
  const itemV = plv.dados.itens.find((i) => i.estado === "proposto");
  if (itemV) assert.equal((await req(`/functions/v1/api/plano/itens/${itemV.id}`, { method: "POST", token, headers: chave(), body: { estado: "aprovado" } })).status, 403), ok("vendas nao aprova item do plano -> 403");
} finally {
  await papel(user.id, "vendas", false); // TESTE fica inativo
}
console.log(resultados.join("\n"));
console.log(`\n${resultados.length} verificacoes OK`);
