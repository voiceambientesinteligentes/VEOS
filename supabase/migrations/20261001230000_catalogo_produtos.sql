-- CATALOGO DE PRODUTOS PROPRIO DO VEOS (independencia do Zoho). Campos completos que o Zoho nao
-- tem: nomes do fornecedor, anuncios/variantes de origem, ficha tecnica, historico de compras,
-- fotos, vinculos com itens do Zoho (duplicados confirmados ou a revisar) e historico de precos.
-- Preco de COMPRA = ultimo preco unitario pago (antes de frete/impostos). Preco de VENDA so existe
-- quando definido por quem tem alcada (sem valor = lacuna, nunca zero).
create sequence public.produto_numero_seq start 1000;

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z]{2,5}-[0-9A-Z-]{2,40}$'),   -- PRD-0001
  nome text not null check (length(nome) between 2 and 200),                     -- nome interno (curto)
  marca text,
  modelo text,
  unidade text not null default 'un',
  tipo text not null default 'produto' check (tipo in ('produto', 'servico')),
  categoria text,
  situacao text not null default 'ativo' check (situacao in ('ativo', 'inativo', 'revisar')),
  descricao text,                                   -- descricao interna (para proposta)
  custo_ultimo numeric(14, 2) check (custo_ultimo is null or custo_ultimo >= 0),
  custo_data date,
  custo_min numeric(14, 2), custo_max numeric(14, 2),
  preco_venda numeric(14, 2) check (preco_venda is null or preco_venda > 0),
  zoho_item_id text,                                -- item correspondente no Zoho Books (quando houver)
  origem text not null default 'manual' check (origem in ('manual', 'aliexpress', 'zoho')),
  imagem text,                                      -- caminho no Storage (bucket produtos)
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index produtos_busca on public.produtos using gin (to_tsvector('pg_catalog.portuguese'::regconfig, coalesce(nome, '') || ' ' || coalesce(marca, '') || ' ' || coalesce(modelo, '') || ' ' || codigo));

-- Cada anuncio/variante de onde o produto veio (um produto pode ter varios fornecedores/anuncios).
create table public.produto_fontes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id),
  sku_interno text not null unique,                 -- AE-1005008477848028-01
  fornecedor text,                                  -- loja
  nome_fornecedor text,                             -- titulo longo exatamente como no pedido
  titulo_atual text,
  variante text,
  rotulos_variante text,
  aliexpress_id text,
  link text, link_alternativo text, snapshot text,
  situacao_anuncio text,
  marca text, modelo text,
  ultimo_preco numeric(14, 2), ultima_compra date, ultimo_pedido text, status_ultimo_pedido text,
  qtd_ultimo_pedido numeric(14, 3), total_ultimo_pedido numeric(14, 2),
  qtd_total numeric(14, 3), n_pedidos integer, menor_preco numeric(14, 2), maior_preco numeric(14, 2), primeira_compra date,
  agrupamento_a_confirmar boolean not null default false,
  ficha jsonb not null default '[]'::jsonb,         -- [{atributo, valor}]
  ficha_texto text, fonte_ficha text,
  descricao text,
  imagens_descricao text[] not null default '{}',
  imagem text, imagem_url_origem text,
  atualizado_em timestamptz not null default now()
);
create index produto_fontes_produto on public.produto_fontes (produto_id);

-- Historico de compras de origem (pedidos do AliExpress), uma linha por item de pedido.
create table public.produto_compras_origem (
  id bigint generated always as identity primary key,
  produto_id uuid not null references public.produtos (id),
  sku_interno text,
  pedido text not null, data date, status text, loja text, nome_fornecedor text, variante text,
  preco_unit numeric(14, 2), quantidade numeric(14, 3), total_pedido numeric(14, 2), link text, classificacao text,
  unique (pedido, sku_interno, variante)
);
create index produto_compras_origem_produto on public.produto_compras_origem (produto_id, data desc);

-- Vinculo com itens do Zoho: mesmo produto (confirmado) ou possivel duplicado (a revisar pelo fundador).
create table public.produto_vinculos_zoho (
  id bigint generated always as identity primary key,
  produto_id uuid not null references public.produtos (id),
  zoho_item_id text not null,
  relacao text not null check (relacao in ('mesmo_produto', 'possivel_duplicado')),
  evidencia text not null,
  situacao text not null default 'a_revisar' check (situacao in ('a_revisar', 'confirmado', 'descartado')),
  preferencia text check (preferencia in ('novo', 'antigo', 'ambos')),
  decidido_por uuid, decidido_em timestamptz,
  unique (produto_id, zoho_item_id)
);

-- Historico de custo/preco (append-only): quem mudou, de quanto para quanto e por que.
create table public.produto_precos_historico (
  id bigint generated always as identity primary key,
  produto_id uuid not null references public.produtos (id),
  campo text not null check (campo in ('custo_ultimo', 'preco_venda')),
  de numeric(14, 2), para numeric(14, 2),
  motivo text, origem text not null default 'manual',
  usuario uuid,
  em timestamptz not null default now()
);
create trigger produto_precos_historico_imutavel before update or delete on public.produto_precos_historico for each row execute function public.recusar_alteracao();

alter table public.produtos enable row level security;
alter table public.produto_fontes enable row level security;
alter table public.produto_compras_origem enable row level security;
alter table public.produto_vinculos_zoho enable row level security;
alter table public.produto_precos_historico enable row level security;

-- Alterar custo/preco: so pela funcao (registra historico; preco de venda exige motivo).
create function public.produto_preco(p_produto uuid, p_campo text, p_valor numeric, p_motivo text, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
declare v public.produtos; antes numeric;
begin
  select * into v from public.produtos where id = p_produto for update;
  if v.id is null then raise exception 'produto inexistente'; end if;
  if p_campo not in ('custo_ultimo', 'preco_venda') then raise exception 'campo invalido'; end if;
  if p_valor is not null and p_valor <= 0 then raise exception 'valor deve ser maior que zero (sem valor = lacuna)'; end if;
  if p_campo = 'preco_venda' and coalesce(trim(p_motivo), '') = '' then raise exception 'informe o motivo/base do preco de venda'; end if;
  antes := case p_campo when 'custo_ultimo' then v.custo_ultimo else v.preco_venda end;
  if antes is not distinct from p_valor then return jsonb_build_object('ok', true, 'repetido', true); end if;
  if p_campo = 'custo_ultimo' then update public.produtos set custo_ultimo = p_valor, custo_data = current_date, atualizado_em = now() where id = p_produto;
  else update public.produtos set preco_venda = p_valor, atualizado_em = now() where id = p_produto; end if;
  insert into public.produto_precos_historico (produto_id, campo, de, para, motivo, usuario) values (p_produto, p_campo, antes, p_valor, p_motivo, p_usuario);
  return jsonb_build_object('ok', true, 'repetido', false);
end $$;

create function public.produto_vinculo_decidir(p_vinculo bigint, p_situacao text, p_preferencia text, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
begin
  if p_situacao not in ('confirmado', 'descartado') then raise exception 'situacao invalida'; end if;
  if p_situacao = 'confirmado' and p_preferencia not in ('novo', 'antigo', 'ambos') then raise exception 'informe qual manter: novo, antigo ou ambos'; end if;
  update public.produto_vinculos_zoho set situacao = p_situacao, preferencia = case when p_situacao = 'confirmado' then p_preferencia end, decidido_por = p_usuario, decidido_em = now() where id = p_vinculo;
  if not found then raise exception 'vinculo inexistente'; end if;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.produto_preco(uuid, text, numeric, text, uuid), public.produto_vinculo_decidir(bigint, text, text, uuid) from public, anon, authenticated;

-- Fotos dos produtos: bucket privado (URL assinada de curta duracao, como os anexos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
