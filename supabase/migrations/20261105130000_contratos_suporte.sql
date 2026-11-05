-- CONTRATOS DE SUPORTE (05/11/2026): receita recorrente. Contrato -> cobrancas mensais (parcelas de recorrencia)
-- -> previsao de caixa (13 semanas) e indicador de receita mensal recorrente (MRR).
create sequence public.contrato_suporte_codigo_seq;
create sequence public.contrato_suporte_codigo_teste_seq;

create table public.contratos_suporte (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  chave text not null unique,
  cliente_id uuid references public.clientes (id),
  cliente_nome text not null check (length(cliente_nome) between 2 and 200),
  descricao text not null check (length(descricao) between 2 and 300),
  valor_mensal numeric(14, 2) not null check (valor_mensal > 0),
  dia_vencimento integer not null default 10 check (dia_vencimento between 1 and 28),
  inicio date not null,
  fim date check (fim is null or fim >= inicio),
  estado text not null default 'ativo' check (estado in ('ativo', 'suspenso', 'encerrado')),
  observacao text,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index contratos_suporte_estado on public.contratos_suporte (estado);

create table public.contrato_cobrancas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_suporte (id),
  competencia date not null check (extract(day from competencia) = 1),
  vencimento date not null,
  valor numeric(14, 2) not null check (valor > 0),
  estado text not null default 'aberta' check (estado in ('aberta', 'recebida', 'cancelada')),
  recebido_em date,
  valor_recebido numeric(14, 2),
  unique (contrato_id, competencia)
);
create index contrato_cobrancas_venc on public.contrato_cobrancas (estado, vencimento);

create table public.contratos_suporte_historico (
  id bigint generated always as identity primary key,
  contrato_id uuid not null references public.contratos_suporte (id),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario uuid,
  em timestamptz not null default now()
);
create trigger contratos_suporte_historico_imutavel before update or delete on public.contratos_suporte_historico
  for each row execute function public.recusar_alteracao();
alter table public.contratos_suporte enable row level security;
alter table public.contrato_cobrancas enable row level security;
alter table public.contratos_suporte_historico enable row level security;

create trigger contratos_suporte_numerar before insert on public.contratos_suporte
  for each row execute function public.numerar('codigo', 'SUP-', 'contrato_suporte_codigo');

-- Gera as cobrancas dos contratos ativos ate p_ate (inclusive o mes de p_ate). Nunca gera mes anterior ao atual
-- (contrato com inicio antigo nao cria cobranca vencida de meses passados) e respeita o fim. Idempotente.
-- Cobranca ABERTA de contrato ativo acompanha o valor mensal vigente; cobranca de contrato encerrado/suspenso e cancelada.
create function public.contrato_cobrancas_gerar(p_ate date default null, p_hoje date default current_date) returns integer
language plpgsql set search_path = '' as $$
declare k public.contratos_suporte; m date; v_ate date := coalesce(p_ate, (date_trunc('month', p_hoje) + interval '6 months')::date); n integer := 0; v_venc date;
begin
  for k in select * from public.contratos_suporte where estado = 'ativo' loop
    m := greatest(date_trunc('month', k.inicio)::date, date_trunc('month', p_hoje)::date);
    while m <= v_ate and (k.fim is null or m <= k.fim) loop
      v_venc := m + (k.dia_vencimento - 1);
      if v_venc >= k.inicio and (k.fim is null or v_venc <= k.fim) then
        insert into public.contrato_cobrancas (contrato_id, competencia, vencimento, valor) values (k.id, m, v_venc, k.valor_mensal)
        on conflict (contrato_id, competencia) do nothing;
        if found then n := n + 1; end if;
      end if;
      m := (m + interval '1 month')::date;
    end loop;
    update public.contrato_cobrancas set valor = k.valor_mensal where contrato_id = k.id and estado = 'aberta' and valor <> k.valor_mensal;
  end loop;
  update public.contrato_cobrancas c set estado = 'cancelada'
    from public.contratos_suporte kk where c.contrato_id = kk.id and c.estado = 'aberta' and (kk.estado = 'encerrado' or (kk.fim is not null and c.competencia > kk.fim));
  return n;
end $$;
revoke execute on function public.contrato_cobrancas_gerar(date, date) from public, anon, authenticated;

create function public.contrato_suporte_salvar(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid; v_ex uuid; d jsonb := p -> 'dados'; v_cod text; v_estado text;
begin
  if p ->> 'id' is null then
    select id into v_ex from public.contratos_suporte where chave = p ->> 'chave';
    if v_ex is not null then return jsonb_build_object('id', v_ex, 'repetido', true, 'codigo', (select codigo from public.contratos_suporte where id = v_ex)); end if;
    if d ->> 'cliente_id' is not null and not exists (select 1 from public.clientes where id = (d ->> 'cliente_id')::uuid) then raise exception 'cliente inexistente'; end if;
    insert into public.contratos_suporte (chave, cliente_id, cliente_nome, descricao, valor_mensal, dia_vencimento, inicio, fim, observacao, criado_por)
    values (p ->> 'chave', (d ->> 'cliente_id')::uuid, d ->> 'cliente_nome', d ->> 'descricao', (d ->> 'valor_mensal')::numeric, coalesce((d ->> 'dia_vencimento')::integer, 10),
            (d ->> 'inicio')::date, (d ->> 'fim')::date, d ->> 'observacao', (p ->> 'usuario')::uuid)
    returning id, codigo into v_id, v_cod;
    insert into public.contratos_suporte_historico (contrato_id, acao, detalhe, usuario) values (v_id, 'criado', d - 'observacao', (p ->> 'usuario')::uuid);
    perform public.contrato_cobrancas_gerar();
    return jsonb_build_object('id', v_id, 'repetido', false, 'codigo', v_cod);
  end if;
  v_id := (p ->> 'id')::uuid;
  select codigo, estado into v_cod, v_estado from public.contratos_suporte where id = v_id for update;
  if v_cod is null then raise exception 'contrato inexistente'; end if;
  if v_estado = 'encerrado' then raise exception 'contrato encerrado nao pode ser alterado'; end if;
  update public.contratos_suporte set
    descricao = coalesce(d ->> 'descricao', descricao),
    valor_mensal = coalesce((d ->> 'valor_mensal')::numeric, valor_mensal),
    dia_vencimento = coalesce((d ->> 'dia_vencimento')::integer, dia_vencimento),
    fim = case when d ? 'fim' then (d ->> 'fim')::date else fim end,
    observacao = case when d ? 'observacao' then d ->> 'observacao' else observacao end,
    estado = coalesce(d ->> 'estado', estado), atualizado_em = now()
  where id = v_id;
  insert into public.contratos_suporte_historico (contrato_id, acao, detalhe, usuario)
  values (v_id, case when d ->> 'estado' is not null then d ->> 'estado' else 'alterado' end, jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(d) k), 'motivo', p ->> 'motivo'), (p ->> 'usuario')::uuid);
  -- suspenso: cobrancas abertas ainda nao vencidas deixam de contar; ativo de novo: voltam a ser geradas
  if d ->> 'estado' = 'suspenso' then update public.contrato_cobrancas set estado = 'cancelada' where contrato_id = v_id and estado = 'aberta' and competencia >= date_trunc('month', current_date)::date; end if;
  if d ->> 'estado' = 'ativo' and v_estado = 'suspenso' then
    update public.contrato_cobrancas c set estado = 'aberta' from public.contratos_suporte k
      where c.contrato_id = v_id and k.id = v_id and c.estado = 'cancelada' and c.recebido_em is null and c.competencia >= date_trunc('month', current_date)::date and (k.fim is null or c.competencia <= k.fim);
  end if;
  perform public.contrato_cobrancas_gerar();
  return jsonb_build_object('id', v_id, 'repetido', false, 'codigo', v_cod);
end $$;
revoke execute on function public.contrato_suporte_salvar(jsonb) from public, anon, authenticated;

create function public.contrato_cobranca_receber(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare c public.contrato_cobrancas;
begin
  select * into c from public.contrato_cobrancas where id = (p ->> 'cobranca')::uuid for update;
  if c.id is null then raise exception 'cobranca inexistente'; end if;
  if c.estado = 'recebida' then return jsonb_build_object('estado', 'recebida', 'repetido', true); end if;
  if c.estado <> 'aberta' then raise exception 'cobranca % nao pode ser recebida', c.estado; end if;
  if (p ->> 'data')::date > current_date then raise exception 'data de recebimento no futuro'; end if;
  update public.contrato_cobrancas set estado = 'recebida', recebido_em = (p ->> 'data')::date, valor_recebido = (p ->> 'valor')::numeric where id = c.id;
  insert into public.contratos_suporte_historico (contrato_id, acao, detalhe, usuario)
  values (c.contrato_id, 'recebida', jsonb_build_object('competencia', c.competencia, 'valor', p ->> 'valor', 'data', p ->> 'data'), (p ->> 'usuario')::uuid);
  return jsonb_build_object('estado', 'recebida', 'repetido', false);
end $$;
revoke execute on function public.contrato_cobranca_receber(jsonb) from public, anon, authenticated;

-- A cada dia (06:20), mantem 6 meses de cobrancas a frente.
select cron.schedule('veos-contratos-cobrancas', '20 6 * * *', $$select public.contrato_cobrancas_gerar()$$);
