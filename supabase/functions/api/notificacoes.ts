// NOTIFICACOES na funcao "api": caixa de saida (rascunhos; e-mail ENVIADO pelo Gmail da VOICE com confirmacao) e
// resumo do dia.
//   GET  /mensagens?estado=rascunho|enviada|descartada&origem=&registro=
//   POST /mensagens            {canal, destinatario?, assunto?, corpo, setor_id?, origem?, tipo?, registro_id?, cliente_id?,
//                               responder_a?, alvo?}   -> rascunho (o destino pode vir do cliente/registro; {{nome}} etc.)
//   POST /mensagens/:id/enviar {confirmacao?}          -> envia o e-mail pelo Gmail (ponte), com as travas abaixo
//   POST /mensagens/:id/(enviada|descartada)   {motivo?}  -> confirmacao manual (enviado por fora) ou descarte
//   GET  /resumo               resumo do dia dos setores que o perfil acessa
// Travas do envio (decisao do Fernando de 10/11/2026: a IA pode enviar quando ele pedir, sempre com confirmacao):
// so e-mail; so rascunho; destinatario valido e fora da lista de bloqueio; limite diario (80; prospeccao 30);
// prospeccao para o mesmo endereco no maximo 1 vez em 30 dias; linha de "sair" na prospeccao; robos de teste so simulam.
// deno-lint-ignore-file no-explicit-any
import { HttpError, lerCorpo, type Membro, servico } from "../_shared/banco.ts";
import { acessiveis, podeVer } from "./setores.ts";
import { chavePublica, enviarPush } from "../_shared/push.ts";
import { CATALOGO } from "../_shared/setores/catalogo.ts";
import type { Setor } from "../_shared/setores/motor.ts";
import { tipoDoSetor, validarRegistro } from "../_shared/setores/registros.ts";
import { varrer } from "../_shared/setores/varredura.ts";
import { vigiarCadencias } from "../_shared/comercial_vigia.ts";
import { chamarPonte, ponteLigada } from "../_shared/google.ts";
import { registrarAcao } from "../_shared/integracoes.ts";
import { comRodapeSaida, dominioDe, emailValido, limparTextoEmail, preencherModelo, primeiroNome, prometeAnexo, telefoneBR } from "../_shared/dominio/web_contatos.js";
import { ehTeste, filtroAutor } from "../_shared/teste.ts";
import { enviadosHoje, LIMITE_EMAILS_DIA, LIMITE_PROSPECCAO_DIA } from "./acoes.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const TIPOS = ["avulsa", "prospeccao", "cobranca", "resposta", "proposta", "pos_venda", "interna"];
const TIPOS_PARCEIRO = ["arquiteto", "designer_interiores", "construtora", "incorporadora", "engenheiro", "outro"];
const ORIGEM_RE = /^(manual|ia:[0-9a-f-]{36}|mcp:[a-z0-9_-]{1,40}|(alerta|proposta|resumo|pedido|registro|cliente):[^\s]{1,110})$/;
const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });
const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const hojeSP = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const SETORES = CATALOGO as unknown as Setor[];

/** Parceiro "prospectado" do Comercial para a empresa achada na web (ou o que ja existe com o mesmo e-mail). */
async function parceiroDoAlvo(eu: Membro, alvo: Record<string, unknown>, email: string, chave: string) {
  const [ja] = await servico(`/rest/v1/registros?setor_id=eq.vendas&tipo=eq.parceiro&dados->>email=eq.${encodeURIComponent(email)}${await filtroAutor(eu)}&select=id,titulo,estado,dados&limit=1`);
  if (ja) return { ...ja, novo: false };
  const s = SETORES.find((x) => x.id === "vendas")!;
  const escritorio = txt(alvo.nome, 180) ?? dominioDe(`https://${email.split("@")[1]}`) ?? "Empresa";
  const tel = telefoneBR(alvo.telefone);
  const dados: Record<string, unknown> = {
    tipo_parceiro: TIPOS_PARCEIRO.includes(String(alvo.tipo_parceiro)) ? alvo.tipo_parceiro : "arquiteto",
    escritorio, contato: txt(alvo.contato, 120) ?? "a descobrir", email, nivel: "B", ultimo_contato: hojeSP(),
    ...(tel ? { telefone: tel.exibir } : {}),
  };
  const campos = validarRegistro(s, tipoDoSetor(s, "parceiro"), { titulo: `${escritorio} (prospecção)`.slice(0, 200), dados }, null);
  const reg = await rpc("salvar_registro", { p: { chave: `${chave}:parceiro`, usuario_id: eu.user_id, modo: "criar", registro_id: null, setor: "vendas", tipo: "parceiro", campos } });
  await varrer(SETORES, ["vendas"], `registro:${eu.email}`).catch((e) => console.error("varredura (parceiro da IA)", e));
  await vigiarCadencias(Date.now(), reg.id).catch((e) => console.error("cadencia (parceiro da IA)", e));
  return { id: reg.id, titulo: campos.titulo, estado: "prospectado", dados, novo: true };
}

export async function rotearNotificacoes(req: Request, partes: string[], eu: Membro) {
  const [raiz, id, acao] = partes;
  const post = req.method === "POST";
  const corpo = post ? ((await lerCorpo(req)) ?? {}) : {};
  const chave = req.headers.get("Idempotency-Key") ?? "";
  if (post && !CHAVE_RE.test(chave)) throw new HttpError(400, "Idempotency-Key obrigatorio");
  const setores = acessiveis(eu);
  // direcao ve tudo; os demais, as mensagens dos setores que acessam e as que criaram
  const visivel = eu.papel === "direcao" ? "" : `&or=(setor_id.in.(${setores.join(",")}),criado_por.eq.${eu.user_id})`;

  // ---- aviso com o navegador fechado (Web Push)
  if (raiz === "push" && id === "chave" && !post) return { chave: chavePublica() };
  if (raiz === "push" && id === "inscrever" && post) {
    const endpoint = txt(corpo.endpoint, 1000), keys = (corpo.keys ?? {}) as Record<string, unknown>;
    const p256dh = txt(keys.p256dh, 200), auth = txt(keys.auth, 100);
    if (!endpoint || !endpoint.startsWith("https://") || !p256dh || !auth) throw new HttpError(400, "inscrição de aviso inválida");
    await servico("/rest/v1/push_inscricoes?on_conflict=endpoint", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: eu.user_id, endpoint, p256dh, auth, agente: (req.headers.get("User-Agent") ?? "").slice(0, 200) || null, falhas: 0 }) });
    return { ok: true };
  }
  if (raiz === "push" && id === "cancelar" && post) {
    const endpoint = txt(corpo.endpoint, 1000);
    if (!endpoint) throw new HttpError(400, "informe o aparelho");
    await servico(`/rest/v1/push_inscricoes?user_id=eq.${eu.user_id}&endpoint=eq.${encodeURIComponent(endpoint)}`, { method: "DELETE" });
    return { ok: true };
  }
  if (raiz === "push" && id === "testar" && post) {
    const minhas = await servico(`/rest/v1/push_inscricoes?user_id=eq.${eu.user_id}&select=id,user_id,endpoint,p256dh,auth,falhas`);
    if (!minhas.length) throw new HttpError(400, "este aparelho não está inscrito nos avisos");
    const r: string[] = [];
    for (const i of minhas) r.push(await enviarPush(i, { titulo: "VEOS · teste", corpo: "Se você viu este aviso com o VEOS fechado, está funcionando.", href: "#/hoje", tag: "teste" }));
    return { aparelhos: minhas.length, resultados: r };
  }
  if (raiz === "resumo" && !post) {
    return { resumos: await Promise.all(setores.map((s) => rpc("resumo_setor", { p_setor: s }))) };
  }
  if (raiz === "mensagens" && !post && !id) {
    const q = new URL(req.url).searchParams;
    const est = ["rascunho", "enviada", "descartada"].includes(q.get("estado") ?? "") ? q.get("estado") : "rascunho";
    const origem = /^[a-z]{2,10}:[A-Za-z0-9:_-]{1,110}$/.test(q.get("origem") ?? "") ? `&origem=eq.${encodeURIComponent(q.get("origem")!)}` : "";
    const registro = UUID_RE.test(q.get("registro") ?? "") ? `&registro_id=eq.${q.get("registro")}` : "";
    // rascunhos dos robos de teste nao aparecem para quem usa de verdade (e vice-versa): ninguem envia um deles por engano
    const autor = await filtroAutor(eu);
    const [mensagens, membros] = await Promise.all([
      servico(`/rest/v1/mensagens_saida?estado=eq.${est}${origem}${registro}${visivel}${autor}&select=*&order=criado_em.desc&limit=300`),
      servico("/rest/v1/membros?select=user_id,nome"),
    ]);
    const nome = new Map(membros.map((m: { user_id: string; nome: string }) => [m.user_id, m.nome]));
    return { mensagens: mensagens.map((m: Record<string, string>) => ({ ...m, chave: undefined, autor: nome.get(m.criado_por) ?? "—", enviada_por_nome: m.enviada_por ? nome.get(m.enviada_por) ?? "—" : null })) };
  }

  // ---- preparar (rascunho)
  if (raiz === "mensagens" && post && !id) {
    const canal = String(corpo.canal);
    if (!["email", "whatsapp"].includes(canal)) throw new HttpError(400, "canal: email ou whatsapp");
    const tipo = TIPOS.includes(String(corpo.tipo ?? "")) ? String(corpo.tipo) : "avulsa";
    let texto = txt(corpo.corpo, canal === "email" ? 4700 : 5000);
    if (!texto) throw new HttpError(400, "escreva a mensagem");
    const setor = txt(corpo.setor_id, 20);
    if (setor && !podeVer(eu, setor)) throw new HttpError(403, "setor fora do seu acesso");
    const origem = txt(corpo.origem, 120) ?? "manual";
    if (!ORIGEM_RE.test(origem)) throw new HttpError(400, "origem inválida");
    // destino a partir do cliente ou do registro (a IA nao precisa ver o e-mail/telefone do cliente)
    let cliente: any = null, registro: any = null;
    if (corpo.cliente_id) {
      if (!UUID_RE.test(String(corpo.cliente_id))) throw new HttpError(400, "cliente_id inválido");
      [cliente] = await servico(`/rest/v1/clientes?id=eq.${corpo.cliente_id}&select=id,codigo,nome,contato_nome,email,telefone,aceita_contato`);
      if (!cliente) throw new HttpError(404, "cliente não encontrado");
    }
    if (corpo.registro_id) {
      if (!UUID_RE.test(String(corpo.registro_id))) throw new HttpError(400, "registro_id inválido");
      [registro] = await servico(`/rest/v1/registros?id=eq.${corpo.registro_id}&select=id,setor_id,tipo,titulo,dados`);
      if (!registro || !podeVer(eu, registro.setor_id)) throw new HttpError(404, "registro não encontrado");
    }
    const d = registro?.dados ?? {};
    let destino = txt(corpo.destinatario, 200)?.toLowerCase() ?? null;
    if (!destino) destino = canal === "email" ? (cliente?.email || d.email || null) : (cliente?.telefone || d.telefone || null);
    if (canal === "email" && destino && !emailValido(destino)) throw new HttpError(400, `e-mail do destinatário inválido: ${destino}`);
    if (canal === "email" && !destino && corpo.alvo) throw new HttpError(400, "informe o e-mail da empresa (para) — sem e-mail não dá para prospectar por e-mail");
    if (destino) {
      const contato = canal === "email" ? destino.toLowerCase() : String(destino).replace(/\D/g, "");
      const [b] = await servico(`/rest/v1/contatos_bloqueio?contato=eq.${encodeURIComponent(contato)}&select=contato`);
      if (b) throw new HttpError(409, "este contato pediu para não receber mensagens (lista de bloqueio): nada foi preparado");
    }
    if (tipo === "prospeccao" && cliente?.aceita_contato === false) throw new HttpError(409, "o cliente não aceita contato comercial (LGPD)");
    // prospeccao de empresa achada na web: cadastra (ou reaproveita) o parceiro prospectado
    let parceiro: any = null;
    if (canal === "email" && tipo === "prospeccao" && !registro && corpo.alvo && typeof corpo.alvo === "object" && destino) {
      if (!podeVer(eu, "vendas")) throw new HttpError(403, "prospecção é do Comercial");
      parceiro = await parceiroDoAlvo(eu, corpo.alvo as Record<string, unknown>, destino, `${eu.user_id}:${chave}`);
      registro = { id: parceiro.id, setor_id: "vendas", tipo: "parceiro", titulo: parceiro.titulo, dados: parceiro.dados };
    }
    const dd = registro?.dados ?? {};
    const nomePessoa = cliente?.contato_nome || cliente?.nome || dd.nome_contato || dd.contato || dd.cliente_nome || "";
    const vars = { nome: nomePessoa && !/a descobrir/i.test(nomePessoa) ? nomePessoa : "", primeiro_nome: primeiroNome(nomePessoa), empresa: dd.escritorio || dd.empresa || (corpo.alvo as any)?.nome || cliente?.nome || "", codigo: cliente?.codigo ?? "" };
    texto = preencherModelo(texto, vars).trim();
    if (canal === "email") texto = limparTextoEmail(texto);
    // o VEOS ainda nao anexa arquivos: texto que promete anexo e recusado para a IA corrigir (a pessoa pode anexar no Gmail)
    if (canal === "email" && /^(ia|mcp):/.test(origem) && prometeAnexo(texto)) throw new HttpError(400, "o texto fala em anexo, mas o VEOS ainda não anexa arquivos: reescreva oferecendo enviar o material depois (ex.: 'posso te enviar nosso caderno técnico')");
    // e-mail escrito pela IA sem assinatura: assina com o nome de quem pediu (quem vai confirmar o envio)
    if (canal === "email" && /^(ia|mcp):/.test(origem) && !/VOICE/i.test(texto.slice(-250))) texto = `${texto}\n\n${primeiroNome(eu.nome) || "Equipe"}\nVOICE Ambientes Inteligentes`;
    const assunto = txt(corpo.assunto, 300) ? limparTextoEmail(preencherModelo(String(corpo.assunto), vars)).slice(0, 300) : null;
    const responder = txt(corpo.responder_a, 100);
    if (responder && !/^[A-Za-z0-9_-]{6,100}$/.test(responder)) throw new HttpError(400, "responder_a inválido (thread do Gmail)");
    // a IA preparou de novo para o mesmo destinatario no mesmo pedido: atualiza o rascunho (nunca dois e-mails iguais)
    if (destino && /^(ia|mcp):/.test(origem)) {
      const [ja] = await servico(`/rest/v1/mensagens_saida?origem=eq.${encodeURIComponent(origem)}&estado=eq.rascunho&canal=eq.${canal}&destinatario=eq.${encodeURIComponent(destino)}&criado_por=eq.${eu.user_id}${origem.startsWith("mcp:") ? `&criado_em=gt.${encodeURIComponent(new Date(Date.now() - 30 * 60_000).toISOString())}` : ""}&select=id&limit=1`);
      if (ja) {
        await servico(`/rest/v1/mensagens_saida?id=eq.${ja.id}&estado=eq.rascunho`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ assunto, corpo: texto, registro_id: registro?.id ?? null, cliente_id: cliente?.id ?? null }) });
        return { id: ja.id, repetido: true, atualizado: true, canal, destinatario: destino, assunto, corpo: texto, tipo, registro_id: registro?.id ?? null, envio: "rascunho atualizado (já existia um para este destinatário)" };
      }
    }
    const r = await rpc("mensagem_criar", { p: { chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, canal, destinatario: destino, assunto, corpo: texto, setor_id: setor ?? registro?.setor_id ?? null, origem,
      tipo: responder ? "resposta" : tipo, registro_id: registro?.id ?? null, cliente_id: cliente?.id ?? null, responder_a: responder } });
    // o 1o toque da cadencia de parceiro vira ESTE e-mail personalizado (o modelo generico e descartado)
    if (registro?.id && tipo === "prospeccao") {
      await servico(`/rest/v1/mensagens_saida?chave=like.CAD:${registro.id}:*&estado=eq.rascunho&canal=eq.email&id=neq.${r.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ estado: "descartada", motivo_descarte: "substituído pelo e-mail personalizado preparado pela IA" }) }).catch((e) => console.error("descartar modelo da cadencia", e));
    }
    const ponte = canal === "email" ? await ponteLigada().catch(() => null) : null;
    return { ...r, canal, destinatario: destino, assunto, corpo: texto, tipo, registro_id: registro?.id ?? null, cliente_id: cliente?.id ?? null,
      parceiro: parceiro ? { id: parceiro.id, titulo: parceiro.titulo, novo: parceiro.novo } : undefined,
      envio: canal === "email" ? (ponte ? "pronto para enviar pelo Gmail (precisa da confirmação do dono)" : "Gmail não conectado: abra no e-mail e envie, ou conecte em Integrações") : "WhatsApp: abra no aplicativo e envie",
      falta_destinatario: !destino || undefined };
  }

  // ---- enviar pelo Gmail (confirmado por uma pessoa: clique, voz ou MCP com confirmado=true)
  if (raiz === "mensagens" && post && id && UUID_RE.test(id) && acao === "enviar") {
    const [m] = await servico(`/rest/v1/mensagens_saida?id=eq.${id}${visivel}${await filtroAutor(eu)}&select=*`);
    if (!m) throw new HttpError(404, "mensagem não encontrada");
    if (m.canal !== "email") throw new HttpError(400, "pelo VEOS só sai e-mail; WhatsApp é enviado pelo aplicativo");
    if (m.estado !== "rascunho") throw new HttpError(409, `esta mensagem já está ${m.estado}`);
    if (eu.papel !== "direcao" && eu.papel !== m.setor_id && m.criado_por !== eu.user_id) throw new HttpError(403, "só a direção, o setor da mensagem ou quem a preparou envia");
    const para = String(m.destinatario ?? "").trim().toLowerCase();
    if (!emailValido(para)) throw new HttpError(400, "falta um e-mail válido no destinatário: edite na Caixa de saída");
    const [b] = await servico(`/rest/v1/contatos_bloqueio?contato=eq.${encodeURIComponent(para)}&select=contato`);
    if (b) throw new HttpError(409, "este contato pediu para não receber mensagens (lista de bloqueio)");
    const hoje = await enviadosHoje();
    if (hoje.todos >= LIMITE_EMAILS_DIA) throw new HttpError(429, `limite de ${LIMITE_EMAILS_DIA} e-mails por dia pelo VEOS atingido (o Gmail gratuito aceita cerca de 100); o restante fica para amanhã`);
    const prospeccao = m.tipo === "prospeccao";
    if (prospeccao && hoje.prospeccao >= LIMITE_PROSPECCAO_DIA) throw new HttpError(429, `limite de ${LIMITE_PROSPECCAO_DIA} e-mails de prospecção por dia (contato 1:1, nada de disparo em massa)`);
    if (prospeccao) {
      const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
      // envio simulado (robo de teste) nao conta: so o que saiu de verdade (Gmail ou marcado como enviado por uma pessoa)
      const [ja] = await servico(`/rest/v1/mensagens_saida?estado=eq.enviada&tipo=eq.prospeccao&destinatario=ilike.${encodeURIComponent(para)}&enviada_em=gt.${encodeURIComponent(desde)}${ehTeste(eu) ? "&via=eq.simulado" : "&or=(via.is.null,via.neq.simulado)"}&select=enviada_em&limit=1`);
      if (ja) throw new HttpError(409, `este endereço já recebeu uma apresentação em ${new Date(ja.enviada_em).toLocaleDateString("pt-BR")}; o próximo toque é pela cadência`);
    }
    // reserva (evita envio em dobro com dois cliques ou duas abas)
    const solta = new Date(Date.now() - 2 * 60_000).toISOString();
    const reservada = await servico(`/rest/v1/mensagens_saida?id=eq.${id}&estado=eq.rascunho&or=(enviando_em.is.null,enviando_em.lt.${encodeURIComponent(solta)})`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ enviando_em: new Date().toISOString() }) });
    if (!reservada.length) throw new HttpError(409, "este e-mail já está sendo enviado");
    const texto = prospeccao ? comRodapeSaida(m.corpo).slice(0, 5000) : m.corpo;
    const confirmacao = ["tela", "voz", "mcp", "lote"].includes(String(corpo.confirmacao)) ? String(corpo.confirmacao) : "tela";
    let envio: any;
    try {
      envio = ehTeste(eu)
        ? { id: `simulado-${id.slice(0, 8)}`, thread_id: null, cota_email: null, simulado: true }
        : await chamarPonte("enviar", { para, assunto: m.assunto ?? "", corpo: texto, thread_id: m.responder_a ?? undefined, nome_remetente: "VOICE Ambientes Inteligentes" });
    } catch (e) {
      const msg = (e as Error).message ?? "falha";
      await servico(`/rest/v1/mensagens_saida?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ enviando_em: null, erro_envio: msg.slice(0, 300) }) }).catch(() => {});
      await registrarAcao(eu.user_id, "email_enviado", `FALHOU para ${para}: ${msg}`, false, req.headers.get("X-VEOS-Origem") ?? confirmacao);
      throw e;
    }
    await rpc("mensagem_registrar_envio", { p: { id, usuario: eu.user_id, via: envio.simulado ? "simulado" : "gmail", provedor_id: envio.id, thread_id: envio.thread_id, corpo: texto, confirmacao } });
    // o toque da cadencia que este e-mail cumpre vira "feito"
    const chaves = [m.chave, m.registro_id && prospeccao ? `CAD:${m.registro_id}:parceiro_prospeccao:1` : null].filter((c) => typeof c === "string" && c.startsWith("CAD:"));
    if (chaves.length) {
      await servico(`/rest/v1/tarefas?chave=in.(${chaves.map((c) => `"${c}"`).join(",")})&estado=eq.aberta`, { method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ estado: "feita", concluida_em: new Date().toISOString(), concluida_por: eu.user_id }) }).catch((e) => console.error("toque da cadencia", e));
    }
    await registrarAcao(eu.user_id, "email_enviado", `${m.tipo} para ${para}: ${String(m.assunto ?? "").slice(0, 120)}`, true, req.headers.get("X-VEOS-Origem") ?? confirmacao);
    return { ok: true, id, estado: "enviada", para, via: envio.simulado ? "simulado" : "gmail", cota_restante: envio.cota_email ?? null, enviados_hoje: hoje.todos + 1, limite_dia: LIMITE_EMAILS_DIA };
  }

  if (raiz === "mensagens" && post && id && UUID_RE.test(id) && ["enviada", "descartada"].includes(acao)) {
    const [m] = await servico(`/rest/v1/mensagens_saida?id=eq.${id}${visivel}&select=id`);
    if (!m) throw new HttpError(404, "mensagem não encontrada");
    return await rpc("mensagem_marcar", { p_id: id, p_estado: acao, p_usuario: eu.user_id, p_motivo: txt(corpo.motivo, 500) });
  }
  throw new HttpError(404, "rota inexistente");
}
