-- FORMULARIO DO CFO: respostas do fundador para preco de produtos, preco da mao de obra e diagnostico
-- de pedidos, impostos e dividas. Cada gravacao de uma secao e uma nova linha (historico completo,
-- nada e editado nem apagado); a resposta vigente e a ultima de cada secao.
-- RLS ligada e sem policies: so a Edge Function (service role) le e grava.
create table public.formulario_respostas (
  id bigint generated always as identity primary key,
  formulario text not null default 'cfo' check (formulario in ('cfo')),
  secao text not null check (secao in ('impostos', 'compras', 'equipe', 'fixos', 'vendas', 'dividas', 'pedidos')),
  dados jsonb not null check (jsonb_typeof(dados) = 'object' and pg_column_size(dados) < 200000),
  autor uuid not null,
  em timestamptz not null default now()
);
create index formulario_respostas_vigente on public.formulario_respostas (formulario, secao, em desc);
create trigger formulario_respostas_imutavel before update or delete on public.formulario_respostas for each row execute function public.recusar_alteracao();
alter table public.formulario_respostas enable row level security;

-- Respostas vigentes (ultima por secao) com quantas versoes cada secao ja teve.
create function public.formulario_vigente(p_formulario text) returns table (secao text, dados jsonb, autor uuid, em timestamptz, versoes bigint)
language sql stable set search_path = '' as $$
  select distinct on (r.secao) r.secao, r.dados, r.autor, r.em, count(*) over (partition by r.secao)
  from public.formulario_respostas r where r.formulario = p_formulario
  order by r.secao, r.em desc, r.id desc
$$;
revoke execute on function public.formulario_vigente(text) from public, anon, authenticated;
