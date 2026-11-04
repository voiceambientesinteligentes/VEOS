-- CSO-04: orcamento proprio do VEOS, criado a partir da Negociacao ao Vivo, sem depender do Zoho.
-- Nasce em "rascunho"; salvar de novo sobre o mesmo orcamento gera uma NOVA VERSAO (serie estavel,
-- versao crescente) e marca a anterior "substituido" -- so a versao vigente de cada serie conta.
-- Vira proposta em PDF direto (ver #/propostas/orcamento/:id); vira pedido (tabela publica.pedidos,
-- ja existente) quando o cliente aceita, pelo fluxo normal de "Fechar negociacao".
create sequence public.comercial_orcamento_numero_seq;

create table public.comercial_orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default ('ORV-' || lpad(nextval('public.comercial_orcamento_numero_seq')::text, 5, '0')),
  serie uuid not null default gen_random_uuid(),       -- estavel entre as versoes do mesmo orcamento
  versao integer not null default 1 check (versao >= 1),
  chave text not null unique,
  cliente_nome text not null check (length(cliente_nome) between 1 and 200),
  cliente_zoho_id text,                                 -- quando o cliente ja existe no Zoho (opcional)
  referencia text,                                       -- orcamento(s) do Zoho combinados, ou texto livre
  condicao text,
  estado text not null default 'rascunho' check (estado in ('rascunho', 'substituido')),
  valor_total numeric(14, 2) not null check (valor_total >= 0),
  desconto numeric(14, 2) check (desconto is null or desconto >= 0),
  resumo jsonb not null default '{}'::jsonb,            -- margem/faixa/alcada/impostos: conferencia interna, nunca no PDF
  observacao text,
  substitui uuid references public.comercial_orcamentos (id),
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index comercial_orcamentos_serie on public.comercial_orcamentos (serie, versao desc);

create table public.comercial_orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.comercial_orcamentos (id),
  ordem integer not null,
  secao text,
  item_id text,                       -- id do item no Zoho (catalogo espelhado), quando houver
  nome text not null,
  descricao text,
  tipo text not null check (tipo in ('produto', 'servico')),
  quantidade numeric(14, 3) not null check (quantidade > 0),
  unidade text,
  preco_unit numeric(14, 2) not null check (preco_unit >= 0),
  custo_unit numeric(14, 2) check (custo_unit >= 0),
  unique (orcamento_id, ordem)
);

create table public.comercial_orcamentos_historico (
  id bigint generated always as identity primary key,
  orcamento_id uuid not null references public.comercial_orcamentos (id),
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario uuid,
  em timestamptz not null default now()
);
create trigger comercial_orcamentos_historico_imutavel before update or delete on public.comercial_orcamentos_historico
  for each row execute function public.recusar_alteracao();

alter table public.comercial_orcamentos enable row level security;
alter table public.comercial_orcamento_itens enable row level security;
alter table public.comercial_orcamentos_historico enable row level security;

-- Cria a primeira versao (p->>'substitui' nulo) ou uma nova versao da mesma serie (substitui = id da
-- versao vigente). Idempotente por chave. Itens (1 a 300) na mesma transacao.
create function public.orcamento_veos_criar(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_id uuid; v_ex uuid; v_serie uuid; v_versao integer := 1; v_anterior public.comercial_orcamentos;
  i jsonb; n integer := 0;
begin
  select id into v_ex from public.comercial_orcamentos where chave = p ->> 'chave';
  if v_ex is not null then return jsonb_build_object('id', v_ex, 'repetido', true); end if;
  if jsonb_array_length(coalesce(p -> 'itens', '[]')) = 0 then raise exception 'orçamento sem itens'; end if;
  if jsonb_array_length(coalesce(p -> 'itens', '[]')) > 300 then raise exception 'o orçamento precisa de até 300 itens'; end if;
  if p ->> 'substitui' is not null then
    select * into v_anterior from public.comercial_orcamentos where id = (p ->> 'substitui')::uuid for update;
    if v_anterior.id is null then raise exception 'orçamento anterior inexistente'; end if;
    if v_anterior.estado <> 'rascunho' then raise exception 'este orçamento já foi substituído por outra versão'; end if;
    v_serie := v_anterior.serie; v_versao := v_anterior.versao + 1;
  else
    v_serie := gen_random_uuid();
  end if;
  insert into public.comercial_orcamentos (serie, versao, chave, cliente_nome, cliente_zoho_id, referencia, condicao, valor_total, desconto, resumo, observacao, substitui, criado_por)
  values (v_serie, v_versao, p ->> 'chave', p ->> 'cliente_nome', nullif(p ->> 'cliente_zoho_id', ''), nullif(p ->> 'referencia', ''), nullif(p ->> 'condicao', ''),
          (p ->> 'valor_total')::numeric, nullif(p ->> 'desconto', '')::numeric, coalesce(p -> 'resumo', '{}'::jsonb), nullif(p ->> 'observacao', ''),
          v_anterior.id, (p ->> 'usuario')::uuid)
  returning id into v_id;
  for i in select * from jsonb_array_elements(p -> 'itens') loop
    n := n + 1;
    insert into public.comercial_orcamento_itens (orcamento_id, ordem, secao, item_id, nome, descricao, tipo, quantidade, unidade, preco_unit, custo_unit)
    values (v_id, n, nullif(i ->> 'secao', ''), nullif(i ->> 'item_id', ''), i ->> 'nome', nullif(i ->> 'descricao', ''), i ->> 'tipo',
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
