-- OPERACAO COMERCIAL DO ZERO (04/11/2026): cadastro de clientes proprio do VEOS e o ciclo completo
-- do orcamento proprio (rascunho -> enviado -> aceito/recusado/expirado; aceito vira pedido).
-- Dados pessoais: so a Edge Function "api" le e grava (RLS sem policy); leitura da ficha fica no
-- registro de acessos (LGPD). Clientes criados por usuarios TESTE (@veos-teste.invalid) nao
-- aparecem para usuarios reais (filtro na API, via usuarios_teste()).

-- ---------------------------------------------------------------- clientes
create sequence public.cliente_codigo_seq;

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('CLI-' || lpad(nextval('public.cliente_codigo_seq')::text, 5, '0')),
  chave text not null unique,
  tipo text not null default 'pf' check (tipo in ('pf', 'pj')),
  nome text not null check (length(nome) between 2 and 200),
  documento text check (documento is null or documento ~ '^[0-9]{11}$|^[0-9]{14}$'),
  contato_nome text,
  telefone text check (telefone is null or telefone ~ '^[0-9]{10,13}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  endereco_obra text,
  tipo_imovel text,
  fase_obra text,
  origem text,
  parceiro text,                     -- arquiteto/designer/construtora que indicou (texto livre)
  aceita_contato boolean not null default true,   -- LGPD: o cliente aceita receber mensagens da VOICE
  observacao text,
  zoho_contact_id text,              -- quando veio de um contato do Zoho Books (retomada de orcamento antigo)
  estado text not null default 'ativo' check (estado in ('ativo', 'inativo')),
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index clientes_nome on public.clientes (lower(nome));
create unique index clientes_zoho on public.clientes (zoho_contact_id) where zoho_contact_id is not null;

create table public.clientes_historico (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references public.clientes (id),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario uuid,
  em timestamptz not null default now()
);
create trigger clientes_historico_imutavel before update or delete on public.clientes_historico
  for each row execute function public.recusar_alteracao();

alter table public.clientes enable row level security;
alter table public.clientes_historico enable row level security;

-- Cria (sem id) ou altera (com id) um cliente. Idempotente por chave na criacao.
create function public.cliente_salvar(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid; v_ex uuid; d jsonb := p -> 'dados'; v_antes jsonb;
begin
  if p ->> 'id' is null then
    select id into v_ex from public.clientes where chave = p ->> 'chave';
    if v_ex is not null then return jsonb_build_object('id', v_ex, 'repetido', true, 'codigo', (select codigo from public.clientes where id = v_ex)); end if;
    if d ->> 'zoho_contact_id' is not null then
      select id into v_ex from public.clientes where zoho_contact_id = d ->> 'zoho_contact_id';
      if v_ex is not null then return jsonb_build_object('id', v_ex, 'repetido', true, 'codigo', (select codigo from public.clientes where id = v_ex)); end if;
    end if;
    insert into public.clientes (chave, tipo, nome, documento, contato_nome, telefone, email, cidade, uf, endereco_obra, tipo_imovel, fase_obra, origem, parceiro, aceita_contato, observacao, zoho_contact_id, criado_por)
    values (p ->> 'chave', coalesce(d ->> 'tipo', 'pf'), d ->> 'nome', d ->> 'documento', d ->> 'contato_nome', d ->> 'telefone', d ->> 'email', d ->> 'cidade', d ->> 'uf',
            d ->> 'endereco_obra', d ->> 'tipo_imovel', d ->> 'fase_obra', d ->> 'origem', d ->> 'parceiro', coalesce((d ->> 'aceita_contato')::boolean, true), d ->> 'observacao',
            d ->> 'zoho_contact_id', (p ->> 'usuario')::uuid)
    returning id into v_id;
    insert into public.clientes_historico (cliente_id, acao, detalhe, usuario) values (v_id, 'criado', d - 'observacao', (p ->> 'usuario')::uuid);
    return jsonb_build_object('id', v_id, 'repetido', false, 'codigo', (select codigo from public.clientes where id = v_id));
  end if;
  v_id := (p ->> 'id')::uuid;
  select to_jsonb(c) - 'chave' into v_antes from public.clientes c where id = v_id for update;
  if v_antes is null then raise exception 'cliente inexistente'; end if;
  update public.clientes set
    tipo = coalesce(d ->> 'tipo', tipo), nome = coalesce(d ->> 'nome', nome),
    documento = case when d ? 'documento' then d ->> 'documento' else documento end,
    contato_nome = case when d ? 'contato_nome' then d ->> 'contato_nome' else contato_nome end,
    telefone = case when d ? 'telefone' then d ->> 'telefone' else telefone end,
    email = case when d ? 'email' then d ->> 'email' else email end,
    cidade = case when d ? 'cidade' then d ->> 'cidade' else cidade end,
    uf = case when d ? 'uf' then d ->> 'uf' else uf end,
    endereco_obra = case when d ? 'endereco_obra' then d ->> 'endereco_obra' else endereco_obra end,
    tipo_imovel = case when d ? 'tipo_imovel' then d ->> 'tipo_imovel' else tipo_imovel end,
    fase_obra = case when d ? 'fase_obra' then d ->> 'fase_obra' else fase_obra end,
    origem = case when d ? 'origem' then d ->> 'origem' else origem end,
    parceiro = case when d ? 'parceiro' then d ->> 'parceiro' else parceiro end,
    aceita_contato = coalesce((d ->> 'aceita_contato')::boolean, aceita_contato),
    observacao = case when d ? 'observacao' then d ->> 'observacao' else observacao end,
    estado = coalesce(d ->> 'estado', estado),
    atualizado_em = now()
  where id = v_id;
  insert into public.clientes_historico (cliente_id, acao, detalhe, usuario)
  values (v_id, 'alterado', jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(d) k)), (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', v_id, 'repetido', false, 'codigo', v_antes ->> 'codigo');
end $$;
revoke execute on function public.cliente_salvar(jsonb) from public, anon, authenticated;

-- Usuarios TESTE (robos dos testes automaticos): seus dados nao aparecem para usuarios reais.
create function public.usuarios_teste() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from auth.users where coalesce(email, '') like '%@veos-teste.invalid'
$$;
revoke execute on function public.usuarios_teste() from public, anon, authenticated;

-- ---------------------------------------------------------------- orcamento proprio: ciclo completo
alter table public.comercial_orcamentos
  add column cliente_id uuid references public.clientes (id),
  add column validade date,
  add column prazo_execucao text,
  add column enviado_em timestamptz,
  add column decidido_em timestamptz,
  add column motivo_recusa text,
  add column pedido_id uuid references public.pedidos (id);
alter table public.comercial_orcamentos drop constraint comercial_orcamentos_estado_check;
alter table public.comercial_orcamentos add constraint comercial_orcamentos_estado_check
  check (estado in ('rascunho', 'enviado', 'aceito', 'recusado', 'expirado', 'substituido'));
create index comercial_orcamentos_cliente on public.comercial_orcamentos (cliente_id);
alter table public.comercial_orcamento_itens add column produto_id uuid references public.produtos (id);

-- Cria a primeira versao ou uma nova versao (substitui = vigente em rascunho/enviado/expirado).
create or replace function public.orcamento_veos_criar(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_id uuid; v_ex uuid; v_serie uuid; v_versao integer := 1; v_anterior public.comercial_orcamentos;
  i jsonb; n integer := 0;
begin
  select id into v_ex from public.comercial_orcamentos where chave = p ->> 'chave';
  if v_ex is not null then return jsonb_build_object('id', v_ex, 'repetido', true, 'numero', (select numero from public.comercial_orcamentos where id = v_ex)); end if;
  if jsonb_array_length(coalesce(p -> 'itens', '[]')) = 0 then raise exception 'orçamento sem itens'; end if;
  if jsonb_array_length(coalesce(p -> 'itens', '[]')) > 300 then raise exception 'o orçamento precisa de até 300 itens'; end if;
  if p ->> 'cliente_id' is not null and not exists (select 1 from public.clientes where id = (p ->> 'cliente_id')::uuid) then raise exception 'cliente inexistente'; end if;
  if p ->> 'substitui' is not null then
    select * into v_anterior from public.comercial_orcamentos where id = (p ->> 'substitui')::uuid for update;
    if v_anterior.id is null then raise exception 'orçamento anterior inexistente'; end if;
    if v_anterior.estado = 'substituido' then raise exception 'este orçamento já foi substituído por outra versão'; end if;
    if v_anterior.estado not in ('rascunho', 'enviado', 'expirado') then raise exception 'orçamento % não pode ganhar nova versão', v_anterior.estado; end if;
    v_serie := v_anterior.serie; v_versao := v_anterior.versao + 1;
  else
    v_serie := gen_random_uuid();
  end if;
  insert into public.comercial_orcamentos (serie, versao, chave, cliente_nome, cliente_zoho_id, cliente_id, referencia, condicao, valor_total, desconto, resumo, observacao, validade, prazo_execucao, substitui, criado_por)
  values (v_serie, v_versao, p ->> 'chave', p ->> 'cliente_nome', nullif(p ->> 'cliente_zoho_id', ''), nullif(p ->> 'cliente_id', '')::uuid, nullif(p ->> 'referencia', ''), nullif(p ->> 'condicao', ''),
          (p ->> 'valor_total')::numeric, nullif(p ->> 'desconto', '')::numeric, coalesce(p -> 'resumo', '{}'::jsonb), nullif(p ->> 'observacao', ''),
          nullif(p ->> 'validade', '')::date, nullif(p ->> 'prazo_execucao', ''), v_anterior.id, (p ->> 'usuario')::uuid)
  returning id into v_id;
  for i in select * from jsonb_array_elements(p -> 'itens') loop
    n := n + 1;
    insert into public.comercial_orcamento_itens (orcamento_id, ordem, secao, item_id, produto_id, nome, descricao, tipo, quantidade, unidade, preco_unit, custo_unit)
    values (v_id, n, nullif(i ->> 'secao', ''), nullif(i ->> 'item_id', ''), nullif(i ->> 'produto_id', '')::uuid, i ->> 'nome', nullif(i ->> 'descricao', ''), i ->> 'tipo',
            (i ->> 'quantidade')::numeric, nullif(i ->> 'unidade', ''), (i ->> 'preco_unit')::numeric, nullif(i ->> 'custo_unit', '')::numeric);
  end loop;
  if v_anterior.id is not null then
    update public.comercial_orcamentos set estado = 'substituido', atualizado_em = now() where id = v_anterior.id;
    insert into public.comercial_orcamentos_historico (orcamento_id, acao, detalhe, usuario) values (v_anterior.id, 'substituido', jsonb_build_object('por', v_id), (p ->> 'usuario')::uuid);
  end if;
  insert into public.comercial_orcamentos_historico (orcamento_id, acao, detalhe, usuario)
  values (v_id, case when v_anterior.id is null then 'criado' else 'nova_versao' end, jsonb_build_object('versao', v_versao, 'total', p ->> 'valor_total'), (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', v_id, 'numero', (select numero from public.comercial_orcamentos where id = v_id), 'versao', v_versao, 'repetido', false);
end $$;
revoke execute on function public.orcamento_veos_criar(jsonb) from public, anon, authenticated;

-- Muda a situacao do orcamento vigente: enviado | aceito | recusado | expirado | rascunho (reabrir).
-- aceito exige o pedido ja criado (pedido_id); recusado exige motivo. Tudo no historico.
create function public.orcamento_veos_situacao(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare o public.comercial_orcamentos; v_novo text := p ->> 'estado';
begin
  select * into o from public.comercial_orcamentos where id = (p ->> 'id')::uuid for update;
  if o.id is null then raise exception 'orçamento inexistente'; end if;
  if o.estado = v_novo then return jsonb_build_object('id', o.id, 'estado', o.estado, 'repetido', true); end if;
  if o.estado in ('substituido', 'aceito', 'recusado') and not (o.estado = 'recusado' and v_novo = 'rascunho') then
    raise exception 'orçamento % não muda de situação', o.estado;
  end if;
  if v_novo not in ('enviado', 'aceito', 'recusado', 'expirado', 'rascunho') then raise exception 'situação inválida'; end if;
  if v_novo = 'aceito' and (p ->> 'pedido_id') is null then raise exception 'aceito exige o pedido'; end if;
  if v_novo = 'recusado' and coalesce(trim(p ->> 'motivo'), '') = '' then raise exception 'informe o motivo da recusa'; end if;
  update public.comercial_orcamentos set
    estado = v_novo,
    enviado_em = case when v_novo = 'enviado' then coalesce(enviado_em, now()) else enviado_em end,
    decidido_em = case when v_novo in ('aceito', 'recusado') then now() when v_novo = 'rascunho' then null else decidido_em end,
    motivo_recusa = case when v_novo = 'recusado' then p ->> 'motivo' when v_novo = 'rascunho' then null else motivo_recusa end,
    pedido_id = case when v_novo = 'aceito' then (p ->> 'pedido_id')::uuid else pedido_id end,
    atualizado_em = now()
  where id = o.id;
  insert into public.comercial_orcamentos_historico (orcamento_id, acao, detalhe, usuario)
  values (o.id, v_novo, jsonb_strip_nulls(jsonb_build_object('de', o.estado, 'motivo', p ->> 'motivo', 'pedido', p ->> 'pedido_id')), (p ->> 'usuario')::uuid);
  return jsonb_build_object('id', o.id, 'estado', v_novo, 'repetido', false);
end $$;
revoke execute on function public.orcamento_veos_situacao(jsonb) from public, anon, authenticated;
