-- ENTREVISTA GUIADA DA EMPRESA (06/11/2026): link do MCP para o ChatGPT conduzir uma entrevista e gravar as respostas.
-- O link e um segredo aleatorio na URL; aqui fica so o HASH (sha-256) dele, com validade e revogacao.
-- O link so permite gravar/ler as respostas da entrevista: nao enxerga nenhum outro dado do VEOS.
create table public.entrevista_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  criado_por uuid not null references auth.users (id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  revogado_em timestamptz,
  ultimo_uso timestamptz,
  usos integer not null default 0
);
create index entrevista_links_ativos on public.entrevista_links (expira_em) where revogado_em is null;

create table public.entrevista_respostas (
  pergunta_id text primary key check (length(pergunta_id) between 3 and 20),
  resposta text not null default '' check (length(resposta) <= 4000),
  certeza text not null check (certeza in ('confirmado', 'estimado', 'nao_sei')),
  observacao text check (observacao is null or length(observacao) <= 500),
  respondido_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  link_id uuid references public.entrevista_links (id) on delete set null
);

create table public.entrevista_arquivos (
  id bigint generated always as identity primary key,
  gerado_em timestamptz not null default now(),
  link_id uuid references public.entrevista_links (id) on delete set null,
  respondidas integer not null,
  total integer not null,
  markdown text not null,
  dados jsonb not null
);

alter table public.entrevista_links enable row level security;
alter table public.entrevista_respostas enable row level security;
alter table public.entrevista_arquivos enable row level security;
-- sem politicas: so a funcao do servidor (service role) le e grava
revoke all on public.entrevista_links, public.entrevista_respostas, public.entrevista_arquivos from anon, authenticated;
