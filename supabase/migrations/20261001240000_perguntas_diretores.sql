-- PERGUNTAS AOS DIRETORES (IA pela assinatura do fundador, sem API paga): a pergunta feita no site
-- entra numa fila; uma sessao do Claude Code (plano Claude Max do fundador) le a fila pelo MCP, usa o
-- manual do diretor e os dados do VEOS e grava a resposta. Resposta de IA = OPINIAO rotulada, nunca
-- decisao. Historico preservado (respostas nao sao editadas: nova resposta = nova linha).
create table public.perguntas_diretores (
  id uuid primary key default gen_random_uuid(),
  setor_id text not null references public.setores (id),
  pergunta text not null check (length(pergunta) between 5 and 4000),
  contexto text,                                  -- referencia opcional (pedido:<id>, produto:<id>...)
  autor uuid not null,
  estado text not null default 'pendente' check (estado in ('pendente', 'respondida', 'cancelada')),
  criada_em timestamptz not null default now(),
  respondida_em timestamptz
);
create index perguntas_diretores_fila on public.perguntas_diretores (estado, criada_em);

create table public.respostas_diretores (
  id bigint generated always as identity primary key,
  pergunta_id uuid not null references public.perguntas_diretores (id),
  resposta text not null check (length(resposta) between 10 and 20000),
  procedimento text,                              -- procedimento do manual usado
  fontes jsonb not null default '[]'::jsonb,      -- [{titulo, url?, natureza}]
  motor text not null,                            -- ex.: 'Claude (Claude Code, plano Max)'
  gerada_por uuid,                                -- sessao que gravou (o proprio usuario no Claude Code)
  em timestamptz not null default now()
);
create trigger respostas_diretores_imutavel before update or delete on public.respostas_diretores for each row execute function public.recusar_alteracao();
alter table public.perguntas_diretores enable row level security;
alter table public.respostas_diretores enable row level security;

create function public.pergunta_responder(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare q public.perguntas_diretores; v_id bigint;
begin
  select * into q from public.perguntas_diretores where id = (p ->> 'pergunta_id')::uuid for update;
  if q.id is null then raise exception 'pergunta inexistente'; end if;
  if q.estado = 'cancelada' then raise exception 'pergunta cancelada'; end if;
  insert into public.respostas_diretores (pergunta_id, resposta, procedimento, fontes, motor, gerada_por)
  values (q.id, p ->> 'resposta', nullif(p ->> 'procedimento', ''), coalesce(p -> 'fontes', '[]'::jsonb), coalesce(nullif(p ->> 'motor', ''), 'IA'), nullif(p ->> 'usuario', '')::uuid)
  returning id into v_id;
  update public.perguntas_diretores set estado = 'respondida', respondida_em = now() where id = q.id;
  return jsonb_build_object('resposta_id', v_id);
end $$;
revoke execute on function public.pergunta_responder(jsonb) from public, anon, authenticated;
