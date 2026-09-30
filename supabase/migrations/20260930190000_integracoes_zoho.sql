-- Integracoes externas (Zoho): tokens OAuth guardados so no servidor. RLS ligada e sem
-- policies: ninguem le pela API publica; so as Edge Functions (service role).
create table public.integracoes (
  id text primary key check (id in ('zoho')),
  refresh_token text not null,
  access_token text,
  expira_em timestamptz,
  api_domain text not null,
  accounts_server text not null,
  escopos text not null,
  conectado_por uuid not null,
  conectado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.integracoes enable row level security;

-- "state" do OAuth: amarra o retorno do Zoho a quem clicou em Conectar (anti-CSRF), uso unico.
create table public.oauth_estados (
  estado text primary key check (length(estado) >= 32),
  provedor text not null check (provedor in ('zoho')),
  usuario uuid not null,
  criado_em timestamptz not null default now()
);
alter table public.oauth_estados enable row level security;

-- Trilha de conexoes/desconexoes (append-only).
create table public.integracoes_log (
  id bigint generated always as identity primary key,
  provedor text not null,
  acao text not null check (acao in ('conectado', 'falha', 'desconectado')),
  usuario uuid,
  detalhe text,
  criado_em timestamptz not null default now()
);
alter table public.integracoes_log enable row level security;
create trigger integracoes_log_imutavel before update or delete on public.integracoes_log
  for each row execute function public.recusar_alteracao();
