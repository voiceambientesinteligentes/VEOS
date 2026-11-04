// Teste online da OPERACAO COMERCIAL DO ZERO contra a API real: um robo TESTE da direcao percorre o
// caminho inteiro — contato rapido (lead), prospeccao (parceiro), conteudo do Instagram, cliente,
// orcamento com produto do catalogo, envio, nova versao, aceite -> pedido, retomada de orcamento
// antigo do Zoho — e confere que nada disso aparece para quem usa de verdade (filtro dos robos).
// No fim o pedido TESTE e cancelado e o robo fica INATIVO. Senha aleatoria, nunca impressa.
// Uso: node scripts/online.mjs tests/online/e2e_operacao.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = `teste-operacao${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
const ORIGEM = "https://voiceambientesinteligentes.github.io";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const oks = [];
const ok = (t) => { oks.push(t); console.log(`ok  ${t}`); };
let token = null;

async function api(method, rota, body) {
  const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Origin: ORIGEM, ...(method === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const texto = await r.text();
  let dados = null; try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: r.status, dados };
}
const exige = (r, msg) => { assert.equal(r.status, 200, `${msg}: ${r.status} ${JSON.stringify(r.dados).slice(0, 300)}`); return r.dados; };

const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha, ban_duration: "none" }) })).status, 200);
const membro = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE operacao", papel: "direcao", ativo }) });
assert.ok((await membro(true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");
let pedidoId = null;
const sufixo = Date.now().toString(36);

try {
  // 1. captacao
  const lead = exige(await api("POST", "registros", { setor: "vendas", tipo: "lead", titulo: `Lead TESTE ${sufixo}`, estado: "novo", responsavel: "sdr", dados: { nome_contato: "Lead TESTE", telefone: "(47) 90000-0000", origem: "instagram", tipo_imovel: "casa_alto_padrao" } }), "lead");
  ok(`contato rapido vira lead (cadencia: ${lead.cadencia?.toques_gerados ?? 0} toque(s))`);
  exige(await api("POST", "registros", { setor: "vendas", tipo: "parceiro", titulo: `Studio TESTE ${sufixo}`, estado: "prospectado", dados: { tipo_parceiro: "arquiteto", escritorio: "Studio TESTE", contato: "Marina TESTE", nivel: "B", ultimo_contato: new Date().toISOString().slice(0, 10), email: "studio@veos-teste.invalid" } }), "parceiro");
  ok("prospeccao: alvo vira parceiro prospectado");
  exige(await api("POST", "registros", { setor: "marketing", tipo: "conteudo", titulo: `Post TESTE ${sufixo}`, estado: "ideia", prazo: "2026-12-01", dados: { formato: "carrossel", canal: "instagram", pilar: "cases", data_publicacao: "2026-12-01", imagem_de_cliente: "nao" } }), "conteudo");
  ok("calendario: post vira conteudo no Marketing");

  // 2. cliente
  assert.equal((await api("POST", "comercial/clientes", { nome: "X" })).status, 400); ok("cliente sem contato e recusado");
  const doc = "52998224725";
  const c = exige(await api("POST", "comercial/clientes", { tipo: "pf", nome: `Cliente TESTE ${sufixo}`, telefone: "(47) 99999-0000", email: `cliente-${sufixo}@veos-teste.invalid`, cidade: "Itajaí", uf: "SC", origem: "instagram", tipo_imovel: "casa_alto_padrao", fase_obra: "acabamento" }), "cliente");
  assert.match(c.codigo, /^CLI-T\d{5}$/, "robo usa a serie de teste"); ok(`cliente cadastrado ${c.codigo}`);
  exige(await api("POST", `comercial/clientes/${c.id}`, { documento: doc }), "alterar cliente");
  const dup = await api("POST", "comercial/clientes", { nome: "Outro TESTE", telefone: "4799990001", documento: doc });
  assert.equal(dup.status, 400); assert.match(dup.dados.erro, /já existe/); ok("CPF duplicado e recusado");
  const lc = exige(await api("GET", `comercial/clientes?busca=${encodeURIComponent(c.codigo)}`), "lista");
  assert.ok(lc.clientes.some((x) => x.id === c.id)); ok("busca de cliente pelo codigo");

  // 3. orcamento com produto real do catalogo
  const prods = exige(await api("GET", "produtos?situacao=ativo"), "catalogo").produtos;
  assert.ok(prods.length > 0, "catalogo vazio");
  const p = prods.find((x) => Number(x.custo_ultimo) > 0) ?? prods[0];
  const itens = [
    { secao: "Sala", tipo: "produto", nome: p.nome, quantidade: "2", unidade: p.unidade ?? "un", preco_unit: "800.00", custo_unit: (Number(p.custo_ultimo ?? 100) * 1.205).toFixed(2), produto_id: p.id },
    { secao: "Sala", tipo: "servico", nome: "Programação e configuração", quantidade: "6", unidade: "h", preco_unit: "200.00", custo_unit: "80.00" },
  ];
  const o1 = exige(await api("POST", "comercial/orcamentos", { cliente_id: c.id, cliente_nome: `Cliente TESTE ${sufixo}`, valor_total: "2800.00", condicao: "40% na assinatura, 60% na entrega", validade: "2026-12-31", prazo_execucao: "30 dias", resumo: { mc_politica: 40 }, itens }), "orcamento");
  assert.match(o1.numero, /^ORV-T\d{5}$/, "robo usa a serie de teste"); ok(`orcamento ${o1.numero} criado com produto do catalogo`);
  const f1 = exige(await api("GET", `comercial/orcamentos/${o1.id}`), "ficha");
  assert.equal(f1.cliente.id, c.id); assert.equal(f1.itens[0].produto_id, p.id); assert.equal(f1.itens[0].unidade, p.unidade ?? "un"); ok("ficha do orcamento traz cliente, produto e unidade");
  exige(await api("POST", `comercial/orcamentos/${o1.id}/situacao`, { estado: "enviado" }), "enviado");
  ok("marcado como enviado");
  const o2 = exige(await api("POST", "comercial/orcamentos", { cliente_id: c.id, cliente_nome: `Cliente TESTE ${sufixo}`, valor_total: "2700.00", desconto: "100.00", substitui: o1.id, itens }), "nova versao");
  assert.equal(o2.versao, 2); ok("nova versao a partir do enviado (v2)");
  const lo = exige(await api("GET", `comercial/orcamentos?cliente=${c.id}`), "lista de orcamentos");
  assert.deepEqual(lo.orcamentos.map((x) => x.id), [o2.id], "so a versao vigente"); ok("lista mostra so a versao vigente");
  assert.equal((await api("POST", `comercial/orcamentos/${o2.id}/situacao`, { estado: "recusado" })).status, 400); ok("recusa sem motivo e recusada");

  // 4. aceite -> pedido
  const ped = exige(await api("POST", "fluxo/pedidos", { orcamento_veos_id: o2.id }), "pedido");
  pedidoId = ped.id;
  const fp = exige(await api("GET", `fluxo/pedidos/${pedidoId}`), "pedido completo");
  assert.equal(Number(fp.pedido?.valor_total ?? fp.valor_total), 2700); assert.match(String(fp.pedido?.numero ?? fp.numero), /^PED-T\d{5}$/); ok(`cliente aceitou: pedido criado com o valor do orcamento`);
  const f2 = exige(await api("GET", `comercial/orcamentos/${o2.id}`), "ficha v2");
  assert.equal(f2.orcamento.estado, "aceito"); assert.equal(f2.orcamento.pedido_id, pedidoId); ok("orcamento aceito ligado ao pedido");
  const rep = exige(await api("POST", "fluxo/pedidos", { orcamento_veos_id: o2.id }), "pedido repetido");
  assert.equal(rep.id, pedidoId); ok("gerar o pedido de novo nao duplica");
  const fc = exige(await api("GET", `comercial/clientes/${c.id}`), "ficha do cliente");
  assert.ok(fc.orcamentos.some((x) => x.id === o2.id) && fc.pedidos.some((x) => x.id === pedidoId)); ok("ficha do cliente junta orcamento e pedido");

  // 5. retomada de orcamento antigo do Zoho
  const rz = exige(await api("GET", "comercial/retomar"), "retomar");
  assert.ok(rz.orcamentos.length > 0, "sem orcamentos antigos no espelho"); ok(`${rz.orcamentos.length} orcamento(s) antigos do Zoho para retomar`);
  const alvo = rz.orcamentos.find((x) => x.cliente_id);
  const det = exige(await api("GET", `comercial/retomar/${alvo.zoho_id}`), "itens do antigo");
  assert.ok(det.itens.length > 0); ok(`retomar ${det.numero}: ${det.itens.length} itens, ${det.itens.filter((i) => i.produto).length} ligados ao catalogo`);
  const cz = exige(await api("POST", `comercial/clientes/zoho/${alvo.cliente_id}`, {}), "cliente do zoho");
  const cz2 = exige(await api("POST", `comercial/clientes/zoho/${alvo.cliente_id}`, {}), "cliente do zoho 2");
  assert.equal(cz.id, cz2.id); ok("cliente do contato do Zoho criado uma vez so");

  // 6. robos nao aparecem para quem usa de verdade: o banco confirma que tudo deste teste e do robo
  const meus = await (await fetch(`${URL_BASE}/rest/v1/clientes?id=in.(${c.id},${cz.id})&select=criado_por`, { headers: admin })).json();
  assert.ok(meus.every((x) => x.criado_por === user.id)); ok("dados do teste gravados como do robo (ficam fora da visao real)");
} finally {
  if (pedidoId) { const r = await api("POST", `fluxo/pedidos/${pedidoId}/cancelar`, { motivo: "pedido TESTE do e2e_operacao" }); console.log(r.status === 200 ? "ok  pedido TESTE cancelado" : `aviso: cancelar ${r.status}`); }
  assert.ok((await membro(false)).ok);
  console.log(`\n${oks.length} verificações OK · robo TESTE inativo`);
}
