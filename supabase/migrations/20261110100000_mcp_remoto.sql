-- MCP REMOTO DEFINITIVO do VEOS (10/11/2026): link secreto que o dono cola no ChatGPT ou no Claude (conector) para
-- consultar e pedir coisas ao VEOS. O link age COMO o dono que o criou (mesmas permissoes e regras do banco) e so aparece
-- uma vez. Aqui fica so o HASH (sha-256). Escopo: 'consulta' (so leitura) ou 'completo' (leitura + cadastros e rascunhos;
-- pagar, enviar, aceitar orcamento e gerar pedido nunca sao feitos por aqui). Toda chamada fica registrada.
create table public.mcp_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  rotulo text not null default '' check (length(rotulo) <= 60),
  escopo text not null check (escopo in ('consulta', 'completo')),
  criado_por uuid not null references auth.users (id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  revogado_em timestamptz,
  ultimo_uso timestamptz,
  usos integer not null default 0
);
create index mcp_links_ativos on public.mcp_links (expira_em) where revogado_em is null;

create table public.mcp_chamadas (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  link_id uuid references public.mcp_links (id) on delete cascade,
  ferramenta text not null,
  rota text,
  ok boolean not null,
  detalhe text check (detalhe is null or length(detalhe) <= 300)
);
create index mcp_chamadas_link_em on public.mcp_chamadas (link_id, em desc);

alter table public.mcp_links enable row level security;
alter table public.mcp_chamadas enable row level security;
revoke all on public.mcp_links, public.mcp_chamadas from anon, authenticated;

-- historico do pg_cron ja e limpo; aqui guarda 90 dias de chamadas
do $$ begin
  perform cron.unschedule('veos-limpa-mcp') where exists (select 1 from cron.job where jobname = 'veos-limpa-mcp');
  perform cron.schedule('veos-limpa-mcp', '50 6 * * *', $c$delete from public.mcp_chamadas where em < now() - interval '90 days'$c$);
end $$;

alter table public.membros_historico drop constraint if exists membros_historico_acao_check;
alter table public.membros_historico add constraint membros_historico_acao_check
  check (acao in ('convidado', 'papel', 'desativado', 'reativado', 'mfa_exigido', 'mfa_dispensado', 'mcp_acesso', 'cargo', 'mcp_remoto_link', 'mcp_remoto_revogado'));
