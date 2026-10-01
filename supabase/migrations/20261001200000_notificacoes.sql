-- NOTIFICACOES (P1): caixa de saida de mensagens e resumo do dia por setor.
-- Nada e enviado pelo VEOS (comunicacao externa automatica e lacuna de alcada): a mensagem nasce
-- como rascunho (de um alerta, proposta ou a mao), uma PESSOA abre no e-mail/WhatsApp e envia, e o
-- VEOS registra quem marcou como enviada e quando. Descartar exige motivo. Trilha append-only.
create table public.mensagens_saida (
  id uuid primary key default gen_random_uuid(),
  chave text unique,
  canal text not null check (canal in ('email', 'whatsapp')),
  destinatario text,                                  -- e-mail ou telefone (opcional: escolhido no app)
  assunto text,
  corpo text not null check (length(corpo) between 1 and 5000),
  setor_id text references public.setores (id),
  origem text not null default 'manual',              -- manual | alerta:<chave> | proposta:<id> | resumo:<setor>
  estado text not null default 'rascunho' check (estado in ('rascunho', 'enviada', 'descartada')),
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  enviada_por uuid,
  enviada_em timestamptz,
  motivo_descarte text
);
create index mensagens_saida_estado on public.mensagens_saida (estado, criado_em desc);
create table public.mensagens_historico (
  id bigint generated always as identity primary key,
  mensagem_id uuid not null references public.mensagens_saida (id),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario uuid not null,
  em timestamptz not null default now()
);
create trigger mensagens_historico_imutavel before update or delete on public.mensagens_historico for each row execute function public.recusar_alteracao();
alter table public.mensagens_saida enable row level security;
alter table public.mensagens_historico enable row level security;

create function public.mensagem_criar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.mensagens_saida where chave = p ->> 'chave';
  if v_id is not null then return jsonb_build_object('id', v_id, 'repetido', true); end if;
  insert into public.mensagens_saida (chave, canal, destinatario, assunto, corpo, setor_id, origem, criado_por)
  values (p ->> 'chave', p ->> 'canal', nullif(trim(coalesce(p ->> 'destinatario', '')), ''), nullif(trim(coalesce(p ->> 'assunto', '')), ''), p ->> 'corpo',
    nullif(p ->> 'setor_id', ''), coalesce(nullif(p ->> 'origem', ''), 'manual'), (p ->> 'usuario')::uuid)
  returning id into v_id;
  insert into public.mensagens_historico (mensagem_id, acao, usuario) values (v_id, 'criada', (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', v_id, 'repetido', false);
end $$;

-- enviada (confirmacao humana de que enviou) ou descartada (com motivo). So a partir de rascunho.
create function public.mensagem_marcar(p_id uuid, p_estado text, p_usuario uuid, p_motivo text) returns jsonb language plpgsql set search_path = '' as $$
declare m public.mensagens_saida;
begin
  select * into m from public.mensagens_saida where id = p_id for update;
  if m.id is null then raise exception 'mensagem inexistente'; end if;
  if m.estado = p_estado then return jsonb_build_object('estado', m.estado, 'repetido', true); end if;
  if m.estado <> 'rascunho' then raise exception 'mensagem ja %', m.estado; end if;
  if p_estado = 'descartada' and coalesce(trim(p_motivo), '') = '' then raise exception 'informe o motivo do descarte'; end if;
  if p_estado not in ('enviada', 'descartada') then raise exception 'estado invalido'; end if;
  update public.mensagens_saida set estado = p_estado,
    enviada_por = case when p_estado = 'enviada' then p_usuario end, enviada_em = case when p_estado = 'enviada' then now() end,
    motivo_descarte = case when p_estado = 'descartada' then p_motivo end where id = p_id;
  insert into public.mensagens_historico (mensagem_id, acao, detalhe, usuario) values (p_id, p_estado, jsonb_build_object('motivo', p_motivo), p_usuario);
  return jsonb_build_object('estado', p_estado, 'repetido', false);
end $$;

-- Resumo do dia de um setor (calculado na hora): alertas, tarefas e rascunhos pendentes.
create function public.resumo_setor(p_setor text, p_agora timestamptz default now()) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'setor', p_setor, 'data', p_agora::date,
    'alertas_ativos', (select count(*) from public.alertas where setor_id = p_setor and estado = 'ativo'),
    'alertas_por_severidade', (select coalesce(jsonb_object_agg(severidade, n), '{}'::jsonb) from (select severidade, count(*) n from public.alertas where setor_id = p_setor and estado = 'ativo' group by 1) x),
    'alertas_novos_24h', (select coalesce(jsonb_agg(jsonb_build_object('titulo', titulo, 'severidade', severidade) order by severidade desc, criado_em desc), '[]'::jsonb)
                          from (select * from public.alertas where setor_id = p_setor and estado = 'ativo' and criado_em > p_agora - interval '24 hours' order by criado_em desc limit 10) a),
    'resolvidos_24h', (select count(*) from public.alertas where setor_id = p_setor and estado = 'resolvido' and resolvido_em > p_agora - interval '24 hours'),
    'tarefas_abertas', (select count(*) from public.tarefas where setor_id = p_setor and estado = 'aberta'),
    'tarefas_atrasadas', (select coalesce(jsonb_agg(jsonb_build_object('titulo', titulo, 'prazo', prazo) order by prazo), '[]'::jsonb)
                          from (select * from public.tarefas where setor_id = p_setor and estado = 'aberta' and prazo < p_agora::date order by prazo limit 10) t),
    'tarefas_hoje', (select count(*) from public.tarefas where setor_id = p_setor and estado = 'aberta' and prazo = p_agora::date),
    'mensagens_rascunho', (select count(*) from public.mensagens_saida where setor_id = p_setor and estado = 'rascunho'))
$$;

do $$
declare f text;
begin
  foreach f in array array['mensagem_criar(jsonb)', 'mensagem_marcar(uuid, text, uuid, text)', 'resumo_setor(text, timestamptz)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
