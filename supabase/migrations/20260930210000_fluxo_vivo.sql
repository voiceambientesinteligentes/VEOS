-- Fluxo vivo da VOICE: orcamento (Zoho) -> pedido -> reserva/baixa de estoque -> parcelas a
-- receber -> nota fiscal (emitida manualmente, registrada aqui) -> recebimento.
-- Tudo com RLS ligada e sem policies (so as Edge Functions acessam); operacoes criticas em
-- funcoes plpgsql atomicas com bloqueio de linha; trilhas append-only.

-- ---------------------------------------------------------------- escritas no Zoho (trilha)
create table public.zoho_escritas (
  id bigint generated always as identity primary key,
  chave text not null unique,
  usuario uuid not null,
  produto text not null,
  modulo text not null,
  zoho_id text,
  acao text not null check (acao in ('criar', 'alterar')),
  enviado jsonb not null,
  ok boolean not null,
  resposta text,
  criado_em timestamptz not null default now()
);
alter table public.zoho_escritas enable row level security;
create trigger zoho_escritas_imutavel before update or delete on public.zoho_escritas
  for each row execute function public.recusar_alteracao();

-- ---------------------------------------------------------------- pedidos
create sequence public.pedido_numero_seq;
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default ('PED-' || lpad(nextval('public.pedido_numero_seq')::text, 5, '0')),
  chave text not null unique,
  orcamento_zoho_id text unique,
  orcamento_numero text,
  cliente_zoho_id text,
  cliente_nome text not null check (length(cliente_nome) between 1 and 200),
  estado text not null default 'rascunho' check (estado in ('rascunho', 'confirmado', 'entregue', 'faturado', 'concluido', 'cancelado')),
  valor_total numeric(14, 2) not null check (valor_total >= 0),
  custo_total numeric(14, 2),
  condicao text,
  observacao text,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  confirmado_em timestamptz,
  entregue_em timestamptz,
  faturado_em timestamptz,
  concluido_em timestamptz,
  cancelado_em timestamptz
);
create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id),
  ordem integer not null,
  item_id text,                       -- id do item no Zoho (catalogo espelhado)
  nome text not null,
  tipo text not null check (tipo in ('produto', 'servico')),
  quantidade numeric(14, 3) not null check (quantidade > 0),
  preco_unit numeric(14, 2) not null check (preco_unit >= 0),
  custo_unit numeric(14, 2) check (custo_unit >= 0),
  unique (pedido_id, ordem)
);
create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id),
  numero integer not null check (numero >= 1),
  descricao text,
  vencimento date not null,
  valor numeric(14, 2) not null check (valor > 0),
  estado text not null default 'aberta' check (estado in ('aberta', 'recebida', 'cancelada')),
  recebido_em date,
  valor_recebido numeric(14, 2),
  unique (pedido_id, numero)
);
create index parcelas_vencimento on public.parcelas (estado, vencimento);
create table public.notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id),
  tipo text not null check (tipo in ('NF-e', 'NFS-e')),
  numero text not null check (numero ~ '^[0-9A-Za-z./-]{1,30}$'),
  serie text not null default '',
  emitida_em date not null,
  valor numeric(14, 2) not null check (valor > 0),
  chave_acesso text check (chave_acesso is null or chave_acesso ~ '^[0-9]{44}$'),
  observacao text,
  registrada_por uuid not null,
  criado_em timestamptz not null default now(),
  unique (tipo, serie, numero)
);
create table public.pedidos_historico (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos (id),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario uuid,
  em timestamptz not null default now()
);
create trigger pedidos_historico_imutavel before update or delete on public.pedidos_historico
  for each row execute function public.recusar_alteracao();

-- ---------------------------------------------------------------- estoque
create table public.estoque_movimentos (
  id bigint generated always as identity primary key,
  item_id text not null,
  tipo text not null check (tipo in ('entrada', 'saida', 'reserva', 'liberacao', 'ajuste')),
  quantidade numeric(14, 3) not null check (quantidade <> 0),
  custo_unit numeric(14, 2) check (custo_unit >= 0),
  pedido_id uuid references public.pedidos (id),
  observacao text,
  usuario uuid,
  chave text unique,
  criado_em timestamptz not null default now(),
  check (tipo = 'ajuste' or quantidade > 0)
);
create index estoque_mov_item on public.estoque_movimentos (item_id, criado_em);
create trigger estoque_movimentos_imutavel before update or delete on public.estoque_movimentos
  for each row execute function public.recusar_alteracao();

create view public.estoque_saldos with (security_invoker = true) as
select item_id,
  sum(case tipo when 'entrada' then quantidade when 'saida' then -quantidade when 'ajuste' then quantidade else 0 end) as fisico,
  sum(case tipo when 'reserva' then quantidade when 'liberacao' then -quantidade else 0 end) as reservado,
  round(sum(case when tipo = 'entrada' and custo_unit is not null then quantidade * custo_unit else 0 end)
        / nullif(sum(case when tipo = 'entrada' and custo_unit is not null then quantidade else 0 end), 0), 2) as custo_medio,
  max(criado_em) as ultimo_movimento
from public.estoque_movimentos group by item_id;

alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.parcelas enable row level security;
alter table public.notas_fiscais enable row level security;
alter table public.pedidos_historico enable row level security;
alter table public.estoque_movimentos enable row level security;

-- ---------------------------------------------------------------- operacoes atomicas
create function public.saldo_item(p_item text) returns table (fisico numeric, reservado numeric)
language sql stable set search_path = '' as $$
  select coalesce(sum(case tipo when 'entrada' then quantidade when 'saida' then -quantidade when 'ajuste' then quantidade else 0 end), 0),
         coalesce(sum(case tipo when 'reserva' then quantidade when 'liberacao' then -quantidade else 0 end), 0)
  from public.estoque_movimentos where item_id = p_item
$$;

-- Reserva ainda ativa de um pedido para um item.
create function public.reservado_pedido(p_pedido uuid, p_item text) returns numeric
language sql stable set search_path = '' as $$
  select coalesce(sum(case tipo when 'reserva' then quantidade when 'liberacao' then -quantidade else 0 end), 0)
  from public.estoque_movimentos where pedido_id = p_pedido and item_id = p_item
$$;

create function public.pedido_criar(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_id uuid; v_ex uuid; v_total numeric(14,2) := 0; v_custo numeric(14,2) := 0; v_sem_custo boolean := false;
  i jsonb; n integer := 0;
begin
  select id into v_ex from public.pedidos where chave = p ->> 'chave';
  if v_ex is not null then return jsonb_build_object('id', v_ex, 'repetido', true); end if;
  if jsonb_array_length(coalesce(p -> 'itens', '[]')) = 0 then raise exception 'pedido sem itens'; end if;
  for i in select * from jsonb_array_elements(p -> 'itens') loop
    v_total := v_total + round((i ->> 'quantidade')::numeric * (i ->> 'preco_unit')::numeric, 2);
    if i ->> 'custo_unit' is null then v_sem_custo := true;
    else v_custo := v_custo + round((i ->> 'quantidade')::numeric * (i ->> 'custo_unit')::numeric, 2); end if;
  end loop;
  if (p ->> 'valor_total') is not null then v_total := (p ->> 'valor_total')::numeric; end if;
  insert into public.pedidos (chave, orcamento_zoho_id, orcamento_numero, cliente_zoho_id, cliente_nome, valor_total, custo_total, condicao, observacao, criado_por)
  values (p ->> 'chave', nullif(p ->> 'orcamento_zoho_id', ''), p ->> 'orcamento_numero', p ->> 'cliente_zoho_id', p ->> 'cliente_nome',
          v_total, case when v_sem_custo then null else v_custo end, p ->> 'condicao', p ->> 'observacao', (p ->> 'usuario')::uuid)
  returning id into v_id;
  for i in select * from jsonb_array_elements(p -> 'itens') loop
    n := n + 1;
    insert into public.pedido_itens (pedido_id, ordem, item_id, nome, tipo, quantidade, preco_unit, custo_unit)
    values (v_id, n, nullif(i ->> 'item_id', ''), i ->> 'nome', i ->> 'tipo', (i ->> 'quantidade')::numeric, (i ->> 'preco_unit')::numeric, (i ->> 'custo_unit')::numeric);
  end loop;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario)
  values (v_id, 'criado', jsonb_build_object('orcamento', p ->> 'orcamento_numero', 'total', v_total), (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', v_id, 'repetido', false);
end $$;

-- Substitui as parcelas de um pedido ainda nao confirmado (soma deve bater com o total).
create function public.pedido_parcelas(p_pedido uuid, p_parcelas jsonb, p_usuario uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare v public.pedidos; v_soma numeric(14,2); x jsonb; n integer := 0;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null then raise exception 'pedido inexistente'; end if;
  if v.estado <> 'rascunho' then raise exception 'parcelas so podem ser alteradas com o pedido em rascunho'; end if;
  select coalesce(sum((e ->> 'valor')::numeric), 0) into v_soma from jsonb_array_elements(p_parcelas) e;
  if v_soma <> v.valor_total then raise exception 'soma das parcelas (%) diferente do total do pedido (%)', v_soma, v.valor_total; end if;
  delete from public.parcelas where pedido_id = p_pedido;
  for x in select * from jsonb_array_elements(p_parcelas) loop
    n := n + 1;
    insert into public.parcelas (pedido_id, numero, descricao, vencimento, valor)
    values (p_pedido, n, x ->> 'descricao', (x ->> 'vencimento')::date, (x ->> 'valor')::numeric);
  end loop;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario) values (p_pedido, 'parcelas', jsonb_build_object('quantidade', n, 'soma', v_soma), p_usuario);
  update public.pedidos set atualizado_em = now() where id = p_pedido;
  return jsonb_build_object('parcelas', n);
end $$;

-- Confirma: exige parcelas somando o total; reserva o estoque disponivel de cada produto.
create function public.pedido_confirmar(p_pedido uuid, p_usuario uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare v public.pedidos; it record; v_soma numeric(14,2); s record; v_res numeric; faltas jsonb := '[]';
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null then raise exception 'pedido inexistente'; end if;
  if v.estado <> 'rascunho' then raise exception 'so pedidos em rascunho podem ser confirmados (estado atual: %)', v.estado; end if;
  select coalesce(sum(valor), 0) into v_soma from public.parcelas where pedido_id = p_pedido and estado <> 'cancelada';
  if v_soma <> v.valor_total then raise exception 'defina as parcelas: soma % diferente do total %', v_soma, v.valor_total; end if;
  for it in select item_id, sum(quantidade) q, min(nome) nome from public.pedido_itens where pedido_id = p_pedido and tipo = 'produto' and item_id is not null group by item_id loop
    perform pg_advisory_xact_lock(hashtext('estoque:' || it.item_id));
    select * into s from public.saldo_item(it.item_id);
    v_res := least(it.q, greatest(s.fisico - s.reservado, 0));
    if v_res > 0 then
      insert into public.estoque_movimentos (item_id, tipo, quantidade, pedido_id, usuario, observacao)
      values (it.item_id, 'reserva', v_res, p_pedido, p_usuario, 'reserva do pedido ' || v.numero);
    end if;
    if v_res < it.q then faltas := faltas || jsonb_build_object('item_id', it.item_id, 'nome', it.nome, 'falta', it.q - v_res); end if;
  end loop;
  update public.pedidos set estado = 'confirmado', confirmado_em = now(), atualizado_em = now() where id = p_pedido;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario) values (p_pedido, 'confirmado', jsonb_build_object('faltas', faltas), p_usuario);
  return jsonb_build_object('estado', 'confirmado', 'faltas', faltas);
end $$;

-- Tenta completar reservas de um pedido confirmado (depois de uma entrada de estoque).
create function public.pedido_reservar(p_pedido uuid, p_usuario uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare v public.pedidos; it record; s record; v_ja numeric; v_res numeric; faltas jsonb := '[]';
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.estado <> 'confirmado' then raise exception 'pedido nao esta confirmado'; end if;
  for it in select item_id, sum(quantidade) q, min(nome) nome from public.pedido_itens where pedido_id = p_pedido and tipo = 'produto' and item_id is not null group by item_id loop
    perform pg_advisory_xact_lock(hashtext('estoque:' || it.item_id));
    v_ja := public.reservado_pedido(p_pedido, it.item_id);
    select * into s from public.saldo_item(it.item_id);
    v_res := least(it.q - v_ja, greatest(s.fisico - s.reservado, 0));
    if v_res > 0 then
      insert into public.estoque_movimentos (item_id, tipo, quantidade, pedido_id, usuario, observacao)
      values (it.item_id, 'reserva', v_res, p_pedido, p_usuario, 'reserva complementar do pedido ' || v.numero);
    end if;
    if v_ja + greatest(v_res, 0) < it.q then faltas := faltas || jsonb_build_object('item_id', it.item_id, 'nome', it.nome, 'falta', it.q - v_ja - greatest(v_res, 0)); end if;
  end loop;
  return jsonb_build_object('faltas', faltas);
end $$;

-- Entrega: baixa o estoque dos produtos (libera a reserva e registra a saida). Exige saldo fisico.
create function public.pedido_entregar(p_pedido uuid, p_usuario uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare v public.pedidos; it record; s record; v_ja numeric;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.estado <> 'confirmado' then raise exception 'so pedidos confirmados podem ser entregues (estado atual: %)', v.estado; end if;
  for it in select item_id, sum(quantidade) q, min(nome) nome from public.pedido_itens where pedido_id = p_pedido and tipo = 'produto' and item_id is not null group by item_id loop
    perform pg_advisory_xact_lock(hashtext('estoque:' || it.item_id));
    v_ja := public.reservado_pedido(p_pedido, it.item_id);
    select * into s from public.saldo_item(it.item_id);
    if s.fisico - (s.reservado - v_ja) < it.q then
      raise exception 'estoque insuficiente para entregar %: precisa %, disponivel %', it.nome, it.q, s.fisico - (s.reservado - v_ja);
    end if;
    if v_ja > 0 then
      insert into public.estoque_movimentos (item_id, tipo, quantidade, pedido_id, usuario, observacao) values (it.item_id, 'liberacao', v_ja, p_pedido, p_usuario, 'baixa do pedido ' || v.numero);
    end if;
    insert into public.estoque_movimentos (item_id, tipo, quantidade, pedido_id, usuario, observacao) values (it.item_id, 'saida', it.q, p_pedido, p_usuario, 'entrega do pedido ' || v.numero);
  end loop;
  update public.pedidos set estado = 'entregue', entregue_em = now(), atualizado_em = now() where id = p_pedido;
  insert into public.pedidos_historico (pedido_id, acao, usuario) values (p_pedido, 'entregue', p_usuario);
  return jsonb_build_object('estado', 'entregue');
end $$;

-- Cancela (antes da entrega): libera reservas e cancela parcelas abertas.
create function public.pedido_cancelar(p_pedido uuid, p_usuario uuid, p_motivo text) returns jsonb
language plpgsql set search_path = '' as $$
declare v public.pedidos; r record;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.estado not in ('rascunho', 'confirmado') then raise exception 'pedido % nao pode ser cancelado (estado %)', v.numero, v.estado; end if;
  for r in select item_id, public.reservado_pedido(p_pedido, item_id) q from public.pedido_itens where pedido_id = p_pedido and tipo = 'produto' and item_id is not null group by item_id loop
    if r.q > 0 then insert into public.estoque_movimentos (item_id, tipo, quantidade, pedido_id, usuario, observacao) values (r.item_id, 'liberacao', r.q, p_pedido, p_usuario, 'cancelamento do pedido ' || v.numero); end if;
  end loop;
  update public.parcelas set estado = 'cancelada' where pedido_id = p_pedido and estado = 'aberta';
  update public.pedidos set estado = 'cancelado', cancelado_em = now(), atualizado_em = now() where id = p_pedido;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario) values (p_pedido, 'cancelado', jsonb_build_object('motivo', p_motivo), p_usuario);
  return jsonb_build_object('estado', 'cancelado');
end $$;

-- Registra a NF emitida manualmente. Pedido entregue (ou confirmado so com servicos) vira faturado.
create function public.pedido_faturar(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v public.pedidos; v_nf uuid; v_so_servico boolean; v_soma_nf numeric(14,2);
begin
  select * into v from public.pedidos where id = (p ->> 'pedido_id')::uuid for update;
  if v.id is null then raise exception 'pedido inexistente'; end if;
  select not exists (select 1 from public.pedido_itens where pedido_id = v.id and tipo = 'produto') into v_so_servico;
  if not (v.estado in ('entregue', 'faturado') or (v.estado = 'confirmado' and v_so_servico)) then
    raise exception 'registre a NF depois da entrega (estado atual: %)', v.estado;
  end if;
  insert into public.notas_fiscais (pedido_id, tipo, numero, serie, emitida_em, valor, chave_acesso, observacao, registrada_por)
  values (v.id, p ->> 'tipo', p ->> 'numero', coalesce(p ->> 'serie', ''), (p ->> 'emitida_em')::date, (p ->> 'valor')::numeric,
          nullif(p ->> 'chave_acesso', ''), p ->> 'observacao', (p ->> 'usuario')::uuid)
  returning id into v_nf;
  select coalesce(sum(valor), 0) into v_soma_nf from public.notas_fiscais where pedido_id = v.id;
  if v_soma_nf > v.valor_total then raise exception 'notas fiscais (%) acima do valor do pedido (%)', v_soma_nf, v.valor_total; end if;
  update public.pedidos set estado = case when v_soma_nf >= v.valor_total then 'faturado' else estado end,
    faturado_em = case when v_soma_nf >= v.valor_total then now() else faturado_em end, atualizado_em = now() where id = v.id;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario)
  values (v.id, 'nota_fiscal', jsonb_build_object('tipo', p ->> 'tipo', 'numero', p ->> 'numero', 'valor', p ->> 'valor', 'total_nf', v_soma_nf), (p ->> 'usuario')::uuid);
  perform public.pedido_concluir_se_pronto(v.id, (p ->> 'usuario')::uuid);
  return jsonb_build_object('nota_id', v_nf, 'total_nf', v_soma_nf);
end $$;

create function public.pedido_concluir_se_pronto(p_pedido uuid, p_usuario uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.pedidos where id = p_pedido and estado = 'faturado')
     and not exists (select 1 from public.parcelas where pedido_id = p_pedido and estado = 'aberta') then
    update public.pedidos set estado = 'concluido', concluido_em = now(), atualizado_em = now() where id = p_pedido;
    insert into public.pedidos_historico (pedido_id, acao, usuario) values (p_pedido, 'concluido', p_usuario);
  end if;
end $$;

-- Baixa de parcela recebida (valor efetivo pode diferir; fica registrado).
create function public.parcela_receber(p_parcela uuid, p_data date, p_valor numeric, p_usuario uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare x public.parcelas;
begin
  select * into x from public.parcelas where id = p_parcela for update;
  if x.id is null then raise exception 'parcela inexistente'; end if;
  if x.estado <> 'aberta' then raise exception 'parcela ja %', x.estado; end if;
  if p_valor <= 0 then raise exception 'valor recebido deve ser maior que zero'; end if;
  update public.parcelas set estado = 'recebida', recebido_em = p_data, valor_recebido = p_valor where id = p_parcela;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario)
  values (x.pedido_id, 'parcela_recebida', jsonb_build_object('numero', x.numero, 'valor', p_valor, 'data', p_data), p_usuario);
  perform public.pedido_concluir_se_pronto(x.pedido_id, p_usuario);
  return jsonb_build_object('estado', 'recebida');
end $$;

do $$
declare f text;
begin
  foreach f in array array['saldo_item(text)', 'reservado_pedido(uuid, text)', 'pedido_criar(jsonb)', 'pedido_parcelas(uuid, jsonb, uuid)',
    'pedido_confirmar(uuid, uuid)', 'pedido_reservar(uuid, uuid)', 'pedido_entregar(uuid, uuid)', 'pedido_cancelar(uuid, uuid, text)',
    'pedido_faturar(jsonb)', 'pedido_concluir_se_pronto(uuid, uuid)', 'parcela_receber(uuid, date, numeric, uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
revoke all on public.estoque_saldos from anon, authenticated;
