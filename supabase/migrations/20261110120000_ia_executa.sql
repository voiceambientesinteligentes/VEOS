-- IA QUE EXECUTA (10/11/2026, pedido do Fernando): a IA do VEOS (tela IA VEOS e MCP do ChatGPT/Claude) passa a FAZER o
-- que o dono pede em todos os setores: pesquisa na web, contato publico de empresas, cadastros de qualquer setor,
-- tarefas, e-mails preparados e ENVIADOS pelo Gmail da VOICE (sempre com a confirmacao de uma pessoa: um clique na
-- tela, "confirmo" por voz ou confirmado=true no MCP depois de mostrar o texto), leitura das respostas e agenda.
-- Substitui "envio sempre humano" (registro tecnico de 30/09) por "envio confirmado pelo dono" para e-mail.

-- 1. Segredos das integracoes (ponte do Gmail/Agenda, chaves de pesquisa), CIFRADOS com a chave VEOS_CIFRA dos
--    segredos do servidor (AES-GCM). So o servidor le; nada disso chega ao navegador.
create table if not exists public.integracoes_segredos (
  id text primary key check (id ~ '^[a-z_]{3,40}$'),
  cifrado text not null,
  conta text check (conta is null or length(conta) <= 200),
  situacao text not null default 'aguardando' check (situacao in ('aguardando', 'conectado', 'erro')),
  detalhe text check (detalhe is null or length(detalhe) <= 300),
  conectado_por uuid references auth.users (id),
  conectado_em timestamptz,
  atualizado_em timestamptz not null default now()
);
alter table public.integracoes_segredos enable row level security;
revoke all on public.integracoes_segredos from anon, authenticated;

-- 2. Caixa de saida: envio pelo VEOS (Gmail), ligacao com o registro/cliente e acompanhamento da resposta.
alter table public.mensagens_saida
  add column if not exists registro_id uuid references public.registros (id),
  add column if not exists cliente_id uuid references public.clientes (id),
  add column if not exists tipo text not null default 'avulsa',
  add column if not exists via text,
  add column if not exists provedor_id text,
  add column if not exists thread_id text,
  add column if not exists responder_a text,
  add column if not exists enviando_em timestamptz,
  add column if not exists respondida_em timestamptz,
  add column if not exists resposta_de text,
  add column if not exists resposta_trecho text,
  add column if not exists conferida_em timestamptz,
  add column if not exists erro_envio text;
alter table public.mensagens_saida drop constraint if exists mensagens_saida_tipo_check;
alter table public.mensagens_saida add constraint mensagens_saida_tipo_check check (tipo in ('avulsa', 'prospeccao', 'cobranca', 'resposta', 'proposta', 'pos_venda', 'interna'));
alter table public.mensagens_saida drop constraint if exists mensagens_saida_via_check;
alter table public.mensagens_saida add constraint mensagens_saida_via_check check (via is null or via in ('manual', 'gmail', 'simulado'));
alter table public.mensagens_saida drop constraint if exists mensagens_saida_textos_check;
alter table public.mensagens_saida add constraint mensagens_saida_textos_check check (
  (resposta_trecho is null or length(resposta_trecho) <= 700) and (resposta_de is null or length(resposta_de) <= 300) and (erro_envio is null or length(erro_envio) <= 300)
  and (provedor_id is null or length(provedor_id) <= 100) and (thread_id is null or length(thread_id) <= 100) and (responder_a is null or length(responder_a) <= 100));
create index if not exists mensagens_saida_acompanhar on public.mensagens_saida (enviada_em) where via = 'gmail' and respondida_em is null;
create index if not exists mensagens_saida_origem on public.mensagens_saida (origem);
create index if not exists mensagens_saida_destino on public.mensagens_saida (lower(destinatario), enviada_em desc) where estado = 'enviada';

-- criar rascunho: agora com tipo, registro, cliente e resposta a uma conversa (mesma chave = nao duplica)
create or replace function public.mensagem_criar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.mensagens_saida where chave = p ->> 'chave';
  if v_id is not null then return jsonb_build_object('id', v_id, 'repetido', true); end if;
  insert into public.mensagens_saida (chave, canal, destinatario, assunto, corpo, setor_id, origem, criado_por, tipo, registro_id, cliente_id, responder_a)
  values (p ->> 'chave', p ->> 'canal', nullif(trim(coalesce(p ->> 'destinatario', '')), ''), nullif(trim(coalesce(p ->> 'assunto', '')), ''), p ->> 'corpo',
    nullif(p ->> 'setor_id', ''), coalesce(nullif(p ->> 'origem', ''), 'manual'), (p ->> 'usuario')::uuid,
    coalesce(nullif(p ->> 'tipo', ''), 'avulsa'), nullif(p ->> 'registro_id', '')::uuid, nullif(p ->> 'cliente_id', '')::uuid, nullif(p ->> 'responder_a', ''))
  returning id into v_id;
  insert into public.mensagens_historico (mensagem_id, acao, detalhe, usuario) values (v_id, 'criada', jsonb_build_object('origem', coalesce(nullif(p ->> 'origem', ''), 'manual')), (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', v_id, 'repetido', false);
end $$;

-- envio feito pelo VEOS (Gmail): grava quem confirmou, por onde, os ids do Gmail e o texto que saiu de fato
create or replace function public.mensagem_registrar_envio(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare m public.mensagens_saida;
begin
  select * into m from public.mensagens_saida where id = (p ->> 'id')::uuid for update;
  if m.id is null then raise exception 'mensagem inexistente'; end if;
  if m.estado <> 'rascunho' then raise exception 'mensagem ja %', m.estado; end if;
  update public.mensagens_saida set estado = 'enviada', enviada_por = (p ->> 'usuario')::uuid, enviada_em = now(),
    via = coalesce(nullif(p ->> 'via', ''), 'gmail'), provedor_id = nullif(p ->> 'provedor_id', ''), thread_id = nullif(p ->> 'thread_id', ''),
    destinatario = coalesce(nullif(p ->> 'destinatario', ''), destinatario), corpo = coalesce(nullif(p ->> 'corpo', ''), corpo),
    enviando_em = null, erro_envio = null
  where id = m.id;
  insert into public.mensagens_historico (mensagem_id, acao, detalhe, usuario)
  values (m.id, 'enviada', jsonb_build_object('via', coalesce(nullif(p ->> 'via', ''), 'gmail'), 'provedor_id', p ->> 'provedor_id', 'confirmacao', p ->> 'confirmacao'), (p ->> 'usuario')::uuid);
  return jsonb_build_object('estado', 'enviada', 'id', m.id);
end $$;

revoke execute on function public.mensagem_criar(jsonb), public.mensagem_registrar_envio(jsonb) from public, anon, authenticated;

-- 3. Cache das pesquisas na web (economiza a cota dos provedores; 24 h) e registro das acoes externas (pesquisa,
--    leitura de pagina, e-mail enviado/lido, agenda), usado tambem como limite por hora.
create table if not exists public.pesquisa_cache (
  chave text primary key check (chave ~ '^[0-9a-f]{64}$'),
  resultado jsonb not null,
  em timestamptz not null default now()
);
alter table public.pesquisa_cache enable row level security;
revoke all on public.pesquisa_cache from anon, authenticated;

create table if not exists public.acoes_registro (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  usuario uuid,
  acao text not null check (acao ~ '^[a-z_]{3,40}$'),
  origem text check (origem is null or length(origem) <= 60),
  detalhe text check (detalhe is null or length(detalhe) <= 300),
  ok boolean not null default true
);
create index if not exists acoes_registro_usuario_em on public.acoes_registro (usuario, acao, em desc);
alter table public.acoes_registro enable row level security;
revoke all on public.acoes_registro from anon, authenticated;

do $$ begin
  perform cron.unschedule('veos-limpa-pesquisa') where exists (select 1 from cron.job where jobname = 'veos-limpa-pesquisa');
  perform cron.schedule('veos-limpa-pesquisa', '40 6 * * *', $c$delete from public.pesquisa_cache where em < now() - interval '7 days'; delete from public.acoes_registro where em < now() - interval '180 days'$c$);
end $$;
