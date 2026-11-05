-- FORNECEDORES PROPRIOS do VEOS (05/11/2026): cadastro da VOICE, ligado a compras e contas a pagar.
-- Codigo FOR-00001 (robos de teste usam a serie FOR-T00001, como clientes e pedidos).
create sequence public.fornecedor_codigo_seq;
create sequence public.fornecedor_codigo_teste_seq;

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  chave text not null unique,
  nome text not null check (length(nome) between 2 and 200),
  documento text check (documento is null or documento ~ '^[0-9]{11}$|^[0-9]{14}$'),
  categoria text not null default 'outro' check (categoria in ('equipamentos', 'importacao', 'infraestrutura', 'servico_terceiro', 'frete', 'software', 'outro')),
  contato_nome text,
  telefone text check (telefone is null or telefone ~ '^[0-9]{10,13}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  prazo_pagamento_dias integer check (prazo_pagamento_dias is null or prazo_pagamento_dias between 0 and 365),
  prazo_entrega_dias integer check (prazo_entrega_dias is null or prazo_entrega_dias between 0 and 365),
  condicao text,
  observacao text,
  zoho_vendor_id text,
  estado text not null default 'ativo' check (estado in ('ativo', 'inativo')),
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index fornecedores_nome on public.fornecedores (lower(nome));
create unique index fornecedores_zoho on public.fornecedores (zoho_vendor_id) where zoho_vendor_id is not null;
create unique index fornecedores_documento on public.fornecedores (documento) where documento is not null;

create table public.fornecedores_historico (
  id bigint generated always as identity primary key,
  fornecedor_id uuid not null references public.fornecedores (id),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario uuid,
  em timestamptz not null default now()
);
create trigger fornecedores_historico_imutavel before update or delete on public.fornecedores_historico
  for each row execute function public.recusar_alteracao();
alter table public.fornecedores enable row level security;
alter table public.fornecedores_historico enable row level security;

create trigger fornecedores_numerar before insert on public.fornecedores
  for each row execute function public.numerar('codigo', 'FOR-', 'fornecedor_codigo');

alter table public.compras add column fornecedor_id uuid references public.fornecedores (id);
alter table public.contas_pagar add column fornecedor_id uuid references public.fornecedores (id);
create index compras_fornecedor on public.compras (fornecedor_id);
create index contas_pagar_fornecedor on public.contas_pagar (fornecedor_id);

create function public.fornecedor_salvar(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid; v_ex uuid; d jsonb := p -> 'dados'; v_cod text;
begin
  if p ->> 'id' is null then
    select id into v_ex from public.fornecedores where chave = p ->> 'chave';
    if v_ex is not null then return jsonb_build_object('id', v_ex, 'repetido', true, 'codigo', (select codigo from public.fornecedores where id = v_ex)); end if;
    insert into public.fornecedores (chave, nome, documento, categoria, contato_nome, telefone, email, cidade, uf, prazo_pagamento_dias, prazo_entrega_dias, condicao, observacao, zoho_vendor_id, criado_por)
    values (p ->> 'chave', d ->> 'nome', d ->> 'documento', coalesce(d ->> 'categoria', 'outro'), d ->> 'contato_nome', d ->> 'telefone', d ->> 'email', d ->> 'cidade', d ->> 'uf',
            (d ->> 'prazo_pagamento_dias')::integer, (d ->> 'prazo_entrega_dias')::integer, d ->> 'condicao', d ->> 'observacao', d ->> 'zoho_vendor_id', (p ->> 'usuario')::uuid)
    returning id, codigo into v_id, v_cod;
    insert into public.fornecedores_historico (fornecedor_id, acao, detalhe, usuario) values (v_id, 'criado', d - 'observacao', (p ->> 'usuario')::uuid);
    return jsonb_build_object('id', v_id, 'repetido', false, 'codigo', v_cod);
  end if;
  v_id := (p ->> 'id')::uuid;
  select codigo into v_cod from public.fornecedores where id = v_id for update;
  if v_cod is null then raise exception 'fornecedor inexistente'; end if;
  update public.fornecedores set
    nome = coalesce(d ->> 'nome', nome), categoria = coalesce(d ->> 'categoria', categoria),
    documento = case when d ? 'documento' then d ->> 'documento' else documento end,
    contato_nome = case when d ? 'contato_nome' then d ->> 'contato_nome' else contato_nome end,
    telefone = case when d ? 'telefone' then d ->> 'telefone' else telefone end,
    email = case when d ? 'email' then d ->> 'email' else email end,
    cidade = case when d ? 'cidade' then d ->> 'cidade' else cidade end,
    uf = case when d ? 'uf' then d ->> 'uf' else uf end,
    prazo_pagamento_dias = case when d ? 'prazo_pagamento_dias' then (d ->> 'prazo_pagamento_dias')::integer else prazo_pagamento_dias end,
    prazo_entrega_dias = case when d ? 'prazo_entrega_dias' then (d ->> 'prazo_entrega_dias')::integer else prazo_entrega_dias end,
    condicao = case when d ? 'condicao' then d ->> 'condicao' else condicao end,
    observacao = case when d ? 'observacao' then d ->> 'observacao' else observacao end,
    estado = coalesce(d ->> 'estado', estado), atualizado_em = now()
  where id = v_id;
  insert into public.fornecedores_historico (fornecedor_id, acao, detalhe, usuario)
  values (v_id, 'alterado', jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(d) k)), (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', v_id, 'repetido', false, 'codigo', v_cod);
end $$;
revoke execute on function public.fornecedor_salvar(jsonb) from public, anon, authenticated;
