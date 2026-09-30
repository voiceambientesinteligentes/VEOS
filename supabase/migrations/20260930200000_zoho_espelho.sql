-- Espelho do Zoho (Books, CRM, Projects): cada registro guardado inteiro (jsonb), do jeito
-- que a API entrega, para a aba Zoho do VEOS mostrar todos os campos sem excecao.
-- RLS ligada e sem policies: so as Edge Functions (service role) leem e gravam.
create table public.zoho_registros (
  produto text not null check (produto in ('books', 'crm', 'projects')),
  modulo text not null check (modulo ~ '^[A-Za-z0-9_]{2,60}$'),
  zoho_id text not null check (zoho_id ~ '^[0-9A-Za-z_-]{1,40}$'),
  nome text,
  dados jsonb not null,
  resumo jsonb,                       -- linha da listagem (Books: detalhe busca o completo)
  modificado_em timestamptz,          -- ultima alteracao no Zoho
  detalhe_em timestamptz,             -- quando o registro completo foi lido
  sincronizado_em timestamptz not null default now(),
  excluido boolean not null default false,
  primary key (produto, modulo, zoho_id)
);
create index zoho_registros_lista on public.zoho_registros (produto, modulo, excluido, modificado_em desc);
create index zoho_registros_nome on public.zoho_registros using gin (to_tsvector('simple', coalesce(nome, '')));
alter table public.zoho_registros enable row level security;

-- Estado da sincronizacao por modulo (cursor de paginacao, ultima execucao, erros).
create table public.zoho_sync (
  produto text not null,
  modulo text not null,
  estado text not null default 'pendente' check (estado in ('pendente', 'listando', 'detalhando', 'ok', 'erro')),
  cursor jsonb not null default '{}'::jsonb,
  vistos text[] not null default '{}',  -- ids vistos na volta completa (para marcar excluidos)
  total integer,
  ultima_volta_em timestamptz,
  ultima_execucao_em timestamptz,
  erro text,
  primary key (produto, modulo)
);
alter table public.zoho_sync enable row level security;

-- Trilha de execucoes (append-only).
create table public.zoho_sync_log (
  id bigint generated always as identity primary key,
  origem text not null,
  chamadas integer not null,
  gravados integer not null,
  detalhes integer not null,
  erros jsonb not null default '[]'::jsonb,
  ms integer not null,
  em timestamptz not null default now()
);
alter table public.zoho_sync_log enable row level security;
create trigger zoho_sync_log_imutavel before update or delete on public.zoho_sync_log
  for each row execute function public.recusar_alteracao();

-- Contagem por modulo para a tela (uma consulta so).
create function public.zoho_contagens() returns table (produto text, modulo text, total bigint, atualizado timestamptz)
language sql stable set search_path = '' as $$
  select produto, modulo, count(*) filter (where not excluido), max(sincronizado_em)
  from public.zoho_registros group by produto, modulo
$$;
revoke execute on function public.zoho_contagens() from public, anon, authenticated;

-- Grava lote vindo da API. Resumo (listagem do Books) nao apaga o registro completo ja lido;
-- registro completo (CRM, Projects, detalhe do Books) substitui os dados.
create function public.zoho_gravar(linhas jsonb) returns integer
language plpgsql set search_path = '' as $$
declare n integer;
begin
  insert into public.zoho_registros as z (produto, modulo, zoho_id, nome, dados, resumo, modificado_em, detalhe_em, sincronizado_em, excluido)
  select x.produto, x.modulo, x.zoho_id, left(x.nome, 300), coalesce(x.dados, x.resumo), x.resumo, x.modificado_em,
         case when x.completo then now() end, now(), false
  from jsonb_to_recordset(linhas) as x(produto text, modulo text, zoho_id text, nome text, dados jsonb, resumo jsonb, modificado_em timestamptz, completo boolean)
  on conflict (produto, modulo, zoho_id) do update set
    nome = excluded.nome,
    resumo = coalesce(excluded.resumo, z.resumo),
    modificado_em = coalesce(excluded.modificado_em, z.modificado_em),
    dados = case when excluded.detalhe_em is not null or z.detalhe_em is null then excluded.dados else z.dados end,
    detalhe_em = coalesce(excluded.detalhe_em, z.detalhe_em),
    sincronizado_em = now(),
    excluido = false;
  get diagnostics n = row_count;
  return n;
end $$;

-- Depois de uma listagem completa: o que nao apareceu foi excluido no Zoho.
create function public.zoho_marcar_excluidos(p_produto text, p_modulo text, p_ids text[]) returns integer
language plpgsql set search_path = '' as $$
declare n integer;
begin
  update public.zoho_registros set excluido = true, sincronizado_em = now()
  where produto = p_produto and modulo = p_modulo and not excluido and not (zoho_id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end $$;

-- Registros do Books cujo detalhe completo ainda nao foi lido ou ficou desatualizado.
create function public.zoho_detalhes_pendentes(p_limite integer) returns table (modulo text, zoho_id text)
language sql stable set search_path = '' as $$
  select modulo, zoho_id from public.zoho_registros
  where produto = 'books' and not excluido and (detalhe_em is null or (modificado_em is not null and detalhe_em < modificado_em))
  order by detalhe_em nulls first, modificado_em desc nulls last
  limit p_limite
$$;
revoke execute on function public.zoho_gravar(jsonb) from public, anon, authenticated;
revoke execute on function public.zoho_marcar_excluidos(text, text, text[]) from public, anon, authenticated;
revoke execute on function public.zoho_detalhes_pendentes(integer) from public, anon, authenticated;
