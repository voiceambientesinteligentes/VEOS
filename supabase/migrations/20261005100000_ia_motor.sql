-- MOTOR DE RACIOCINIO DOS DIRETORES (IA no servidor): a pergunta feita no site e respondida por um
-- provedor de IA (Gemini com chave gratuita; OpenAI quando houver chave), que usa as ferramentas do
-- VEOS (mesmas contas das telas, precedentes da Biblioteca). Sem provedor disponivel, a pergunta
-- continua na fila para o Claude Code. Resposta de IA = OPINIAO rotulada, nunca decisao.

-- Controle do processamento por pergunta (um de cada vez; a reserva expira se a funcao cair).
alter table public.perguntas_diretores
  add column ia_inicio timestamptz,
  add column ia_tentativas integer not null default 0,
  add column ia_erro text;

create function public.pergunta_ia_reservar(p_id uuid) returns jsonb language plpgsql set search_path = '' as $$
declare q public.perguntas_diretores;
begin
  update public.perguntas_diretores
     set ia_inicio = now(), ia_tentativas = ia_tentativas + 1, ia_erro = null
   where id = p_id and estado = 'pendente'
     and (ia_inicio is null or ia_inicio < now() - interval '4 minutes')
     and ia_tentativas < 8
  returning * into q;
  if q.id is null then return null; end if;
  return to_jsonb(q);
end $$;

create function public.pergunta_ia_liberar(p_id uuid, p_erro text) returns void language sql set search_path = '' as $$
  update public.perguntas_diretores set ia_inicio = null, ia_erro = left(p_erro, 500) where id = p_id and estado = 'pendente';
$$;

-- Trilha de cada execucao do motor (append-only): provedor, modelo, ferramentas chamadas, tokens, erro.
create table public.ia_execucoes (
  id bigint generated always as identity primary key,
  pergunta_id uuid references public.perguntas_diretores (id),
  setor_id text,
  provedor text not null,
  modelo text,
  ok boolean not null,
  passos jsonb not null default '[]'::jsonb,      -- [{ferramenta, argumentos, ms, ok, erro?}]
  uso jsonb,                                      -- tokens informados pelo provedor
  ms integer,
  erro text,
  em timestamptz not null default now()
);
create index ia_execucoes_pergunta on public.ia_execucoes (pergunta_id, em desc);
create trigger ia_execucoes_imutavel before update or delete on public.ia_execucoes for each row execute function public.recusar_alteracao();
alter table public.ia_execucoes enable row level security;

-- Texto integral das politicas canonicas (lido de 04 - PADROES do VOICE_360 por
-- scripts/carregar-politicas.mjs, sem alterar os arquivos). Fica so no banco: o repositorio e publico.
-- Nova versao do arquivo = nova linha (hash diferente); vale a mais recente de cada codigo.
create table public.documentos_canonicos (
  id bigint generated always as identity primary key,
  codigo text not null check (codigo ~ '^[A-Z0-9-]{3,40}$'),
  titulo text not null,
  biblioteca text,                               -- registro BIB correspondente
  texto text not null check (length(texto) between 100 and 200000),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  origem text not null,                          -- caminho relativo no VOICE_360
  carregado_em timestamptz not null default now(),
  unique (codigo, sha256)
);
create trigger documentos_canonicos_imutavel before update or delete on public.documentos_canonicos for each row execute function public.recusar_alteracao();
alter table public.documentos_canonicos enable row level security;

revoke execute on function public.pergunta_ia_reservar(uuid) from public, anon, authenticated;
revoke execute on function public.pergunta_ia_liberar(uuid, text) from public, anon, authenticated;
