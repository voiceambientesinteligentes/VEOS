-- COMPRAS E CONTAS A PAGAR (P1): pedido de compra (normalmente a partir da falta de estoque),
-- recebimento de mercadoria -> entrada no estoque (com custo), contas a pagar (das parcelas da
-- compra ou avulsas) e previsao de caixa (entradas - saidas). Regras no banco, atomicas:
-- parcelas da compra somam o total; recebe-se no maximo o comprado; compra com recebimento nao
-- e cancelada; pagar/cancelar conta exige estado aberto; cancelar exige motivo. Historico append-only.
-- O VEOS nao envia pedido ao fornecedor: registra o que a equipe comprou.
create sequence public.compra_numero_seq;

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default ('COM-' || lpad(nextval('public.compra_numero_seq')::text, 5, '0')),
  chave text not null unique,
  fornecedor_nome text not null check (length(fornecedor_nome) between 1 and 200),
  fornecedor_zoho_id text,
  pedido_id uuid references public.pedidos (id),          -- comprada para atender este pedido (opcional)
  estado text not null default 'aberta' check (estado in ('aberta', 'parcial', 'recebida', 'cancelada')),
  previsao_entrega date,
  valor_total numeric(14, 2) not null check (valor_total > 0),
  observacao text,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  recebida_em timestamptz,
  cancelada_em timestamptz
);
create table public.compra_itens (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id),
  ordem integer not null,
  item_id text not null,
  nome text not null,
  quantidade numeric(14, 3) not null check (quantidade > 0),
  custo_unit numeric(14, 2) not null check (custo_unit >= 0),
  recebido numeric(14, 3) not null default 0 check (recebido >= 0 and recebido <= quantidade),
  unique (compra_id, ordem)
);
create table public.contas_pagar (
  id uuid primary key default gen_random_uuid(),
  chave text unique,
  compra_id uuid references public.compras (id),
  pedido_id uuid references public.pedidos (id),          -- custo atribuido a um pedido (caixa do pedido V1.1)
  numero integer,
  descricao text not null check (length(descricao) between 1 and 300),
  fornecedor text not null check (length(fornecedor) between 1 and 200),
  categoria text not null check (categoria in ('compra', 'servico_terceiro', 'frete', 'imposto', 'despesa_fixa', 'outro')),
  vencimento date not null,
  valor numeric(14, 2) not null check (valor > 0),
  estado text not null default 'aberta' check (estado in ('aberta', 'paga', 'cancelada')),
  pago_em date,
  valor_pago numeric(14, 2) check (valor_pago is null or valor_pago > 0),
  motivo_cancelamento text,
  criado_por uuid not null,
  criado_em timestamptz not null default now()
);
create index contas_pagar_venc on public.contas_pagar (estado, vencimento);
create table public.compras_historico (
  id bigint generated always as identity primary key,
  compra_id uuid references public.compras (id),
  conta_id uuid references public.contas_pagar (id),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario uuid not null,
  em timestamptz not null default now()
);
create trigger compras_historico_imutavel before update or delete on public.compras_historico for each row execute function public.recusar_alteracao();
alter table public.estoque_movimentos add column compra_id uuid references public.compras (id);
alter table public.compras enable row level security;
alter table public.compra_itens enable row level security;
alter table public.contas_pagar enable row level security;
alter table public.compras_historico enable row level security;

-- Criar compra (idempotente pela chave). p: {chave, usuario, fornecedor_nome, fornecedor_zoho_id?, pedido_id?,
-- previsao_entrega?, observacao?, itens:[{item_id, nome, quantidade, custo_unit}], parcelas:[{vencimento, valor}]}
create function public.compra_criar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare v_id uuid; v_num text; v_total numeric := 0; v_soma numeric := 0; i jsonb; k int := 0; v_ped uuid := nullif(p ->> 'pedido_id', '')::uuid;
begin
  select id, numero into v_id, v_num from public.compras where chave = p ->> 'chave';
  if v_id is not null then return jsonb_build_object('id', v_id, 'numero', v_num, 'repetido', true); end if;
  if jsonb_array_length(coalesce(p -> 'itens', '[]')) = 0 then raise exception 'a compra precisa de ao menos um item'; end if;
  if jsonb_array_length(coalesce(p -> 'parcelas', '[]')) = 0 then raise exception 'informe as parcelas a pagar (vencimento e valor)'; end if;
  if v_ped is not null and not exists (select 1 from public.pedidos where id = v_ped and estado <> 'cancelado') then raise exception 'pedido inexistente ou cancelado'; end if;
  for i in select * from jsonb_array_elements(p -> 'itens') loop v_total := v_total + round((i ->> 'quantidade')::numeric * (i ->> 'custo_unit')::numeric, 2); end loop;
  for i in select * from jsonb_array_elements(p -> 'parcelas') loop v_soma := v_soma + (i ->> 'valor')::numeric; end loop;
  if v_soma <> v_total then raise exception 'as parcelas (%) devem somar o total da compra (%)', v_soma, v_total; end if;
  insert into public.compras (chave, fornecedor_nome, fornecedor_zoho_id, pedido_id, previsao_entrega, valor_total, observacao, criado_por)
  values (p ->> 'chave', trim(p ->> 'fornecedor_nome'), nullif(p ->> 'fornecedor_zoho_id', ''), v_ped, nullif(p ->> 'previsao_entrega', '')::date, v_total, nullif(p ->> 'observacao', ''), (p ->> 'usuario')::uuid)
  returning id, numero into v_id, v_num;
  for i in select * from jsonb_array_elements(p -> 'itens') loop
    k := k + 1;
    insert into public.compra_itens (compra_id, ordem, item_id, nome, quantidade, custo_unit) values (v_id, k, i ->> 'item_id', i ->> 'nome', (i ->> 'quantidade')::numeric, (i ->> 'custo_unit')::numeric);
  end loop;
  k := 0;
  for i in select * from jsonb_array_elements(p -> 'parcelas') order by (value ->> 'vencimento') loop
    k := k + 1;
    insert into public.contas_pagar (compra_id, pedido_id, numero, descricao, fornecedor, categoria, vencimento, valor, criado_por)
    values (v_id, v_ped, k, v_num || ' parcela ' || k, trim(p ->> 'fornecedor_nome'), 'compra', (i ->> 'vencimento')::date, (i ->> 'valor')::numeric, (p ->> 'usuario')::uuid);
  end loop;
  insert into public.compras_historico (compra_id, acao, detalhe, usuario) values (v_id, 'criada', jsonb_build_object('total', v_total, 'itens', jsonb_array_length(p -> 'itens')), (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', v_id, 'numero', v_num, 'repetido', false, 'total', v_total);
end $$;

-- Receber mercadoria: entrada no estoque pelo custo da compra. p: {compra_id, usuario, chave, itens:[{ordem, quantidade}]}
create function public.compra_receber(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare c public.compras; i jsonb; it public.compra_itens; v_q numeric; recebidos text[] := '{}';
begin
  select * into c from public.compras where id = (p ->> 'compra_id')::uuid for update;
  if c.id is null then raise exception 'compra inexistente'; end if;
  if c.estado in ('recebida', 'cancelada') then raise exception 'compra % esta %', c.numero, c.estado; end if;
  if exists (select 1 from public.estoque_movimentos where chave like (p ->> 'chave') || ':%') then return jsonb_build_object('repetido', true, 'itens', '[]'::jsonb); end if;
  for i in select * from jsonb_array_elements(coalesce(p -> 'itens', '[]')) loop
    v_q := (i ->> 'quantidade')::numeric;
    if v_q is null or v_q <= 0 then continue; end if;
    select * into it from public.compra_itens where compra_id = c.id and ordem = (i ->> 'ordem')::int for update;
    if it.id is null then raise exception 'item % nao pertence a compra', i ->> 'ordem'; end if;
    if it.recebido + v_q > it.quantidade then raise exception 'item %: recebendo % mas faltam so %', it.nome, v_q, it.quantidade - it.recebido; end if;
    update public.compra_itens set recebido = recebido + v_q where id = it.id;
    insert into public.estoque_movimentos (item_id, tipo, quantidade, custo_unit, observacao, usuario, chave, compra_id)
    values (it.item_id, 'entrada', v_q, it.custo_unit, 'Recebimento ' || c.numero, (p ->> 'usuario')::uuid, (p ->> 'chave') || ':' || it.ordem, c.id);
    recebidos := recebidos || it.item_id;
  end loop;
  if cardinality(recebidos) = 0 then raise exception 'informe a quantidade recebida de ao menos um item'; end if;
  update public.compras set estado = case when exists (select 1 from public.compra_itens where compra_id = c.id and recebido < quantidade) then 'parcial' else 'recebida' end,
    recebida_em = case when exists (select 1 from public.compra_itens where compra_id = c.id and recebido < quantidade) then null else now() end, atualizado_em = now() where id = c.id;
  insert into public.compras_historico (compra_id, acao, detalhe, usuario) values (c.id, 'recebimento', jsonb_build_object('itens', p -> 'itens'), (p ->> 'usuario')::uuid);
  return jsonb_build_object('repetido', false, 'itens', to_jsonb(recebidos), 'estado', (select estado from public.compras where id = c.id));
end $$;

create function public.compra_cancelar(p_compra uuid, p_usuario uuid, p_motivo text) returns jsonb language plpgsql set search_path = '' as $$
declare c public.compras;
begin
  select * into c from public.compras where id = p_compra for update;
  if c.id is null then raise exception 'compra inexistente'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'informe o motivo do cancelamento'; end if;
  if c.estado <> 'aberta' or exists (select 1 from public.compra_itens where compra_id = c.id and recebido > 0) then raise exception 'so compra aberta e sem recebimento pode ser cancelada'; end if;
  if exists (select 1 from public.contas_pagar where compra_id = c.id and estado = 'paga') then raise exception 'ha parcela paga: registre a devolucao com o fornecedor antes'; end if;
  update public.compras set estado = 'cancelada', cancelada_em = now(), atualizado_em = now() where id = c.id;
  update public.contas_pagar set estado = 'cancelada', motivo_cancelamento = 'Compra cancelada: ' || p_motivo where compra_id = c.id and estado = 'aberta';
  insert into public.compras_historico (compra_id, acao, detalhe, usuario) values (c.id, 'cancelada', jsonb_build_object('motivo', p_motivo), p_usuario);
  return jsonb_build_object('estado', 'cancelada');
end $$;

-- Conta avulsa (frete, servico de terceiro, imposto, despesa fixa...). p: {chave, usuario, descricao, fornecedor, categoria, vencimento, valor, pedido_id?}
create function public.conta_pagar_criar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare v_id uuid; v_ped uuid := nullif(p ->> 'pedido_id', '')::uuid;
begin
  select id into v_id from public.contas_pagar where chave = p ->> 'chave';
  if v_id is not null then return jsonb_build_object('id', v_id, 'repetido', true); end if;
  if (p ->> 'categoria') = 'compra' then raise exception 'conta de compra nasce da compra (Compras)'; end if;
  if v_ped is not null and not exists (select 1 from public.pedidos where id = v_ped and estado <> 'cancelado') then raise exception 'pedido inexistente ou cancelado'; end if;
  insert into public.contas_pagar (chave, pedido_id, descricao, fornecedor, categoria, vencimento, valor, criado_por)
  values (p ->> 'chave', v_ped, trim(p ->> 'descricao'), trim(p ->> 'fornecedor'), p ->> 'categoria', (p ->> 'vencimento')::date, (p ->> 'valor')::numeric, (p ->> 'usuario')::uuid)
  returning id into v_id;
  insert into public.compras_historico (conta_id, acao, detalhe, usuario) values (v_id, 'conta_criada', p - 'usuario' - 'chave', (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', v_id, 'repetido', false);
end $$;

create function public.conta_pagar_pagar(p_conta uuid, p_data date, p_valor numeric, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
declare k public.contas_pagar;
begin
  select * into k from public.contas_pagar where id = p_conta for update;
  if k.id is null then raise exception 'conta inexistente'; end if;
  if k.estado = 'paga' then return jsonb_build_object('estado', 'paga', 'repetido', true); end if;
  if k.estado <> 'aberta' then raise exception 'conta %', k.estado; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'valor pago invalido'; end if;
  if p_data > current_date then raise exception 'data do pagamento no futuro'; end if;
  update public.contas_pagar set estado = 'paga', pago_em = p_data, valor_pago = p_valor where id = k.id;
  insert into public.compras_historico (compra_id, conta_id, acao, detalhe, usuario) values (k.compra_id, k.id, 'paga', jsonb_build_object('data', p_data, 'valor', p_valor), p_usuario);
  return jsonb_build_object('estado', 'paga', 'repetido', false);
end $$;

create function public.conta_pagar_cancelar(p_conta uuid, p_usuario uuid, p_motivo text) returns jsonb language plpgsql set search_path = '' as $$
declare k public.contas_pagar;
begin
  select * into k from public.contas_pagar where id = p_conta for update;
  if k.id is null then raise exception 'conta inexistente'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'informe o motivo do cancelamento'; end if;
  if k.estado <> 'aberta' then raise exception 'so conta aberta pode ser cancelada'; end if;
  if k.compra_id is not null then raise exception 'parcela de compra: cancele a compra (ou ajuste com o fornecedor)'; end if;
  update public.contas_pagar set estado = 'cancelada', motivo_cancelamento = p_motivo where id = k.id;
  insert into public.compras_historico (conta_id, acao, detalhe, usuario) values (k.id, 'conta_cancelada', jsonb_build_object('motivo', p_motivo), p_usuario);
  return jsonb_build_object('estado', 'cancelada');
end $$;

-- Previsao de caixa por mes: entradas (parcelas de pedidos) e saidas (contas a pagar), previstas
-- (abertas, pelo vencimento) e realizadas (pela data do recebimento/pagamento). Vencidos a parte.
create function public.caixa_previsao(p_de date, p_ate date) returns jsonb language sql stable set search_path = '' as $$
  with meses as (select to_char(m, 'YYYY-MM') mes from generate_series(date_trunc('month', p_de), date_trunc('month', p_ate), interval '1 month') m),
  ent as (select x.* from public.parcelas x join public.pedidos p on p.id = x.pedido_id where p.estado <> 'cancelado' and x.estado <> 'cancelada'),
  sai as (select * from public.contas_pagar where estado <> 'cancelada')
  select jsonb_build_object(
    'meses', (select jsonb_agg(jsonb_build_object('mes', m.mes,
        'entradas_previstas', (select coalesce(sum(valor), 0) from ent where estado = 'aberta' and to_char(vencimento, 'YYYY-MM') = m.mes),
        'entradas_realizadas', (select coalesce(sum(coalesce(valor_recebido, valor)), 0) from ent where estado = 'recebida' and to_char(recebido_em, 'YYYY-MM') = m.mes),
        'saidas_previstas', (select coalesce(sum(valor), 0) from sai where estado = 'aberta' and to_char(vencimento, 'YYYY-MM') = m.mes),
        'saidas_realizadas', (select coalesce(sum(coalesce(valor_pago, valor)), 0) from sai where estado = 'paga' and to_char(pago_em, 'YYYY-MM') = m.mes)) order by m.mes) from meses m),
    'entradas_vencidas', (select coalesce(sum(valor), 0) from ent where estado = 'aberta' and vencimento < current_date),
    'saidas_vencidas', (select coalesce(sum(valor), 0) from sai where estado = 'aberta' and vencimento < current_date))
$$;

-- Faltas com o que ja esta comprado (aberta/parcial, ainda nao recebido) por item.
create function public.fluxo_faltas_compra() returns table (pedido_id uuid, numero text, cliente_nome text, item_id text, nome text, falta numeric, em_compra numeric, compras text)
language sql stable set search_path = '' as $$
  select f.pedido_id, f.numero, f.cliente_nome, f.item_id, f.nome, f.falta,
    coalesce((select sum(ci.quantidade - ci.recebido) from public.compra_itens ci join public.compras c on c.id = ci.compra_id where ci.item_id = f.item_id and c.estado in ('aberta', 'parcial')), 0),
    (select string_agg(distinct c.numero, ', ') from public.compra_itens ci join public.compras c on c.id = ci.compra_id where ci.item_id = f.item_id and c.estado in ('aberta', 'parcial') and ci.recebido < ci.quantidade)
  from public.fluxo_faltas() f
$$;

do $$
declare f text;
begin
  foreach f in array array['compra_criar(jsonb)', 'compra_receber(jsonb)', 'compra_cancelar(uuid, uuid, text)', 'conta_pagar_criar(jsonb)', 'conta_pagar_pagar(uuid, date, numeric, uuid)',
    'conta_pagar_cancelar(uuid, uuid, text)', 'caixa_previsao(date, date)', 'fluxo_faltas_compra()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
