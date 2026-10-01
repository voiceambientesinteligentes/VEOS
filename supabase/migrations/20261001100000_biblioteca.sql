-- BIBLIOTECA: memoria institucional do VEOS (decisoes, politicas, excecoes, propostas, ideias,
-- preferencias, erros/incidentes, aprendizados, pesquisas/referencias), com governanca:
-- autoridade para aprovar, versoes (revisao preserva a anterior), divergencias fundamentadas,
-- pareceres entre setores (informado / consultado / aprovador), encaminhamento de conflitos e
-- trilha das consultas a precedentes. As MESMAS regras valem para fundador, direcao, gestores e
-- secretaria: toda mudanca passa pelas funcoes abaixo; ninguem altera conteudo vigente em silencio.
-- RLS ligada e sem policies (acesso so pelas Edge Functions, que checam o membro).

-- ---------------------------------------------------------------- autoridades pessoais
-- Quem exerce "fundador" e "ceo" (pessoas reais). Papeis de setor continuam em membros.papel.
create table public.governanca_autoridades (
  user_id uuid not null references auth.users (id),
  autoridade text not null check (autoridade in ('fundador', 'ceo')),
  desde date not null default current_date,
  primary key (user_id, autoridade)
);
alter table public.governanca_autoridades enable row level security;

-- Alcadas conhecidas (com fonte) e LACUNAS (assuntos sem alcada definida). Nada inventado.
create table public.governanca_alcadas (
  id text primary key check (id ~ '^[a-z0-9_]{3,60}$'),
  assunto text not null,
  regra text not null,
  autoridade text not null check (autoridade ~ '^(fundador|ceo|direcao|lacuna|setor:[a-z]+)$'),
  fonte text not null,
  registro_id uuid,
  atualizado_em timestamptz not null default now()
);
alter table public.governanca_alcadas enable row level security;

-- ---------------------------------------------------------------- registros
create sequence public.biblioteca_codigo_seq;
create table public.biblioteca_registros (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('BIB-' || lpad(nextval('public.biblioteca_codigo_seq')::text, 4, '0')),
  serie uuid not null,                 -- todas as versoes de um mesmo registro
  versao integer not null default 1 check (versao >= 1),
  substitui uuid references public.biblioteca_registros (id),
  substituido_por uuid references public.biblioteca_registros (id),
  tipo text not null check (tipo in ('preferencia', 'ideia', 'proposta', 'decisao', 'politica', 'excecao', 'incidente', 'aprendizado', 'referencia')),
  estado text not null,
  titulo text not null check (length(titulo) between 3 and 200),
  conteudo text not null check (length(conteudo) between 3 and 20000),
  assuntos text[] not null default '{}',
  setores text[] not null default '{}',        -- escopo; vazio = empresa toda
  autor uuid not null,                         -- quem registrou
  autor_nome text not null,
  autoridade text check (autoridade is null or autoridade ~ '^(fundador|ceo|direcao|setor:[a-z]+)$'), -- quem decide este assunto
  aprovado_por uuid,
  aprovado_em timestamptz,
  registrado_em timestamptz not null default now(),
  vigente_desde date,                          -- data em que passa a valer (pode ser diferente do registro)
  valido_ate date,
  contexto text,
  justificativa text,
  condicoes text,
  revisar_quando text,
  responsavel text,                            -- papel/sigla responsavel pela execucao
  resultado_esperado text,
  resultado_observado text,
  restrito boolean not null default false,     -- so autor, direcao e setores do escopo
  dados jsonb not null default '{}'::jsonb,    -- campos do tipo (incidente, divergencia, verificacao...)
  atualizado_em timestamptz not null default now(),
  check (valido_ate is null or vigente_desde is null or valido_ate >= vigente_desde)
);
create function public.bib_tsv(p_titulo text, p_conteudo text, p_assuntos text[]) returns tsvector
language sql immutable parallel safe set search_path = '' as $$
  select to_tsvector('pg_catalog.portuguese'::regconfig, coalesce(p_titulo, '') || ' ' || coalesce(p_conteudo, '') || ' ' || coalesce(array_to_string(p_assuntos, ' '), ''))
$$;
create index biblioteca_busca on public.biblioteca_registros using gin (public.bib_tsv(titulo, conteudo, assuntos));
create index biblioteca_tipo_estado on public.biblioteca_registros (tipo, estado);
create index biblioteca_serie on public.biblioteca_registros (serie, versao);
alter table public.biblioteca_registros enable row level security;

-- Estados validos por tipo e estados "fechados" (conteudo nao muda mais: so por nova versao).
create function public.bib_estados(p_tipo text) returns text[] language sql immutable as $$
  select case p_tipo
    when 'preferencia' then array['ativa', 'inativa']
    when 'ideia' then array['aberta', 'em_analise', 'virou_proposta', 'arquivada']
    when 'proposta' then array['rascunho', 'em_consulta', 'aprovada', 'rejeitada', 'retirada']
    when 'decisao' then array['vigente', 'substituida', 'revogada', 'expirada']
    when 'politica' then array['vigente', 'substituida', 'revogada']
    when 'excecao' then array['vigente', 'expirada', 'revogada']
    when 'incidente' then array['aberto', 'em_investigacao', 'corrigido', 'verificado', 'encerrado']
    when 'aprendizado' then array['hipotese', 'em_verificacao', 'validado', 'refutado']
    when 'referencia' then array['ativa', 'desatualizada']
  end
$$;
create function public.bib_fechado(p_tipo text, p_estado text) returns boolean language sql immutable as $$
  select (p_tipo in ('decisao', 'politica', 'excecao')) or (p_tipo = 'proposta' and p_estado in ('aprovada', 'rejeitada', 'retirada'))
      or (p_tipo = 'aprendizado' and p_estado in ('validado', 'refutado')) or (p_tipo = 'incidente' and p_estado = 'encerrado')
$$;

-- Trava contra alteracao silenciosa: em registro fechado, titulo/conteudo/justificativa/escopo
-- nao mudam (revisao = nova versao). Vale para qualquer usuario, inclusive o fundador.
create function public.bib_trava() returns trigger language plpgsql set search_path = '' as $$
begin
  if not (new.estado = any (public.bib_estados(new.tipo))) then raise exception 'estado % invalido para %', new.estado, new.tipo; end if;
  if tg_op = 'UPDATE' then
    if new.tipo <> old.tipo or new.serie <> old.serie or new.versao <> old.versao or new.codigo <> old.codigo then raise exception 'identidade do registro nao muda'; end if;
    if public.bib_fechado(old.tipo, old.estado) and (new.titulo, new.conteudo, coalesce(new.justificativa, ''), new.setores, coalesce(new.autoridade, ''), coalesce(new.condicoes, ''), coalesce(new.vigente_desde, '1900-01-01'), new.restrito)
         is distinct from (old.titulo, old.conteudo, coalesce(old.justificativa, ''), old.setores, coalesce(old.autoridade, ''), coalesce(old.condicoes, ''), coalesce(old.vigente_desde, '1900-01-01'), old.restrito) then
      raise exception 'registro % esta fechado (%): para mudar, abra uma revisao (nova versao)', old.codigo, old.estado;
    end if;
    new.atualizado_em := now();
  end if;
  return new;
end $$;
create trigger biblioteca_trava before insert or update on public.biblioteca_registros for each row execute function public.bib_trava();
create trigger biblioteca_sem_exclusao before delete on public.biblioteca_registros for each row execute function public.recusar_alteracao();

-- Trilha de tudo que acontece com um registro (append-only).
create table public.biblioteca_historico (
  id bigint generated always as identity primary key,
  registro_id uuid not null references public.biblioteca_registros (id),
  acao text not null,
  de_estado text,
  para_estado text,
  usuario uuid not null,
  detalhe jsonb not null default '{}'::jsonb,
  em timestamptz not null default now()
);
create trigger biblioteca_historico_imutavel before update or delete on public.biblioteca_historico for each row execute function public.recusar_alteracao();
alter table public.biblioteca_historico enable row level security;

-- Fontes e evidencias (natureza explicita: fato verificado, opiniao da fonte, inferencia, hipotese).
create table public.biblioteca_fontes (
  id bigint generated always as identity primary key,
  registro_id uuid not null references public.biblioteca_registros (id),
  tipo text not null check (tipo in ('interna', 'especialista', 'pesquisa', 'documentacao', 'metodo')),
  natureza text not null check (natureza in ('fato_verificado', 'opiniao_fonte', 'inferencia', 'hipotese')),
  autor text,
  titulo text not null,
  data_fonte text,
  link text check (link is null or link ~ '^https?://'),
  trecho text,
  versao_periodo text,               -- para fontes internas: origem, versao e periodo
  acessada boolean not null,         -- false = citada sem ter sido lida (nao vale como evidencia)
  adicionada_por uuid not null,
  em timestamptz not null default now()
);
create trigger biblioteca_fontes_imutavel before update or delete on public.biblioteca_fontes for each row execute function public.recusar_alteracao();
alter table public.biblioteca_fontes enable row level security;

-- Relacoes entre registros e com objetos do VEOS (pedido, proposta, orcamento...).
create table public.biblioteca_vinculos (
  id bigint generated always as identity primary key,
  de_id uuid not null references public.biblioteca_registros (id),
  para_id uuid references public.biblioteca_registros (id),
  para_externo text check (para_externo is null or para_externo ~ '^[a-z_]+:[A-Za-z0-9_-]{1,64}$'),
  relacao text not null check (relacao in ('substitui', 'questiona', 'revisa', 'baseado_em', 'contradiz', 'excecao_de', 'aprendizado_de', 'aplicado_em', 'execucao', 'relacionado')),
  criado_por uuid not null,
  em timestamptz not null default now(),
  check ((para_id is null) <> (para_externo is null))
);
create trigger biblioteca_vinculos_imutavel before update or delete on public.biblioteca_vinculos for each row execute function public.recusar_alteracao();
alter table public.biblioteca_vinculos enable row level security;

-- Pareceres: setor INFORMADO (ciencia), CONSULTADO (parecer) ou APROVADOR (quando a alcada exige).
-- Sem resposta no prazo vira 'sem_resposta' (nunca aprovacao).
create table public.biblioteca_pareceres (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references public.biblioteca_registros (id),
  setor_id text not null references public.setores (id),
  participacao text not null check (participacao in ('informado', 'consultado', 'aprovador')),
  motivo text not null,
  encaminhamento text check (encaminhamento in ('ceo', 'fundador')),
  solicitado_por uuid not null,
  solicitado_em timestamptz not null default now(),
  prazo date,
  responsavel_conclusao text not null,          -- quem fecha o assunto (evita ciclo sem dono)
  estado text not null default 'pendente' check (estado in ('pendente', 'respondido', 'ciente', 'sem_resposta', 'cancelado')),
  posicao text check (posicao in ('concorda', 'concorda_com_ressalvas', 'discorda', 'aprova', 'nao_aprova', 'abstem')),
  argumento text,
  respondido_por uuid,
  respondido_em timestamptz,
  check (estado <> 'respondido' or (posicao is not null and argumento is not null and respondido_por is not null))
);
create index biblioteca_pareceres_estado on public.biblioteca_pareceres (estado, setor_id);
alter table public.biblioteca_pareceres enable row level security;

-- Consultas a precedentes feitas antes de recomendar/executar (rastreabilidade).
create table public.biblioteca_consultas (
  id uuid primary key default gen_random_uuid(),
  contexto text not null,               -- ex.: negociacao, proposta, pedido, biblioteca
  referencia text,                      -- objeto do VEOS (pedido:uuid...)
  termos text not null,
  setor text,
  considerados jsonb not null,          -- [{id, codigo, tipo, estado, aplicavel, motivo}]
  conflitos jsonb not null default '[]'::jsonb,
  faltantes text,
  usuario uuid not null,
  em timestamptz not null default now()
);
create trigger biblioteca_consultas_imutavel before update or delete on public.biblioteca_consultas for each row execute function public.recusar_alteracao();
alter table public.biblioteca_consultas enable row level security;

-- ---------------------------------------------------------------- regras (funcoes)
create function public.bib_papel(p_usuario uuid) returns text language sql stable set search_path = '' as $$
  select papel from public.membros where user_id = p_usuario and ativo
$$;

-- Tem autoridade? fundador > ceo > direcao > setor. Mesma regra para todos.
create function public.bib_tem_autoridade(p_usuario uuid, p_autoridade text) returns boolean language sql stable set search_path = '' as $$
  select case
    when p_autoridade is null then false
    when exists (select 1 from public.governanca_autoridades where user_id = p_usuario and autoridade = 'fundador') then true
    when p_autoridade = 'fundador' then false
    when p_autoridade = 'ceo' then exists (select 1 from public.governanca_autoridades where user_id = p_usuario and autoridade = 'ceo')
    when p_autoridade = 'direcao' then public.bib_papel(p_usuario) = 'direcao' or exists (select 1 from public.governanca_autoridades where user_id = p_usuario)
    when p_autoridade like 'setor:%' then public.bib_papel(p_usuario) in (substr(p_autoridade, 7), 'direcao') or exists (select 1 from public.governanca_autoridades where user_id = p_usuario)
    else false end
$$;

-- Pode ver? Registros restritos ou de setores sensiveis: autor, direcao/autoridades e setores do escopo.
create function public.bib_pode_ver(p_usuario uuid, p_registro uuid) returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.biblioteca_registros r
    where r.id = p_registro and (
      r.autor = p_usuario
      or public.bib_papel(p_usuario) = 'direcao'
      or exists (select 1 from public.governanca_autoridades where user_id = p_usuario)
      or (not r.restrito and not (r.setores && array['financas', 'pessoas']))
      or public.bib_papel(p_usuario) = any (r.setores)))
$$;

create function public.bib_log(p_registro uuid, p_acao text, p_de text, p_para text, p_usuario uuid, p_detalhe jsonb) returns void
language sql set search_path = '' as $$
  insert into public.biblioteca_historico (registro_id, acao, de_estado, para_estado, usuario, detalhe) values (p_registro, p_acao, p_de, p_para, p_usuario, coalesce(p_detalhe, '{}'::jsonb))
$$;

-- Estado inicial permitido ao CRIAR. Decisao/politica/excecao ja nascem vigentes, mas so com
-- autoridade E confirmacao explicita de aprovacao (frase solta nao vira decisao).
create function public.bib_criar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare
  u uuid := (p ->> 'usuario')::uuid; v_tipo text := p ->> 'tipo'; v_estado text := p ->> 'estado'; v_id uuid := gen_random_uuid();
  v_nome text; v_codigo text; f jsonb;
begin
  select nome into v_nome from public.membros where user_id = u and ativo;
  if v_nome is null then raise exception 'usuario sem acesso ao VEOS'; end if;
  if v_tipo is null or public.bib_estados(v_tipo) is null then raise exception 'tipo invalido'; end if;
  v_estado := coalesce(v_estado, case v_tipo when 'proposta' then 'rascunho' when 'ideia' then 'aberta' when 'incidente' then 'aberto' when 'aprendizado' then 'hipotese' when 'preferencia' then 'ativa' when 'referencia' then 'ativa' else 'vigente' end);
  if v_tipo in ('decisao', 'politica', 'excecao') then
    if v_estado <> 'vigente' then raise exception '% nasce vigente; para discutir antes, registre uma proposta', v_tipo; end if;
    if coalesce((p ->> 'confirmo_aprovacao')::boolean, false) is not true then raise exception 'confirme explicitamente a aprovacao (uma frase ou ideia nao vira %)', v_tipo; end if;
    if not public.bib_tem_autoridade(u, p ->> 'autoridade') then raise exception 'sem autoridade (%) para aprovar este %', coalesce(p ->> 'autoridade', 'nao informada'), v_tipo; end if;
    if coalesce(trim(p ->> 'justificativa'), '') = '' then raise exception '% exige justificativa', v_tipo; end if;
    if v_tipo = 'excecao' and coalesce(p ->> 'excecao_de', '') = '' then raise exception 'excecao precisa apontar a regra que excepciona'; end if;
  elsif v_estado not in ('rascunho', 'aberta', 'aberto', 'hipotese', 'ativa', 'em_consulta', 'em_investigacao') then
    raise exception 'estado inicial % nao permitido para %', v_estado, v_tipo;
  end if;
  insert into public.biblioteca_registros (id, serie, tipo, estado, titulo, conteudo, assuntos, setores, autor, autor_nome, autoridade, aprovado_por, aprovado_em,
    vigente_desde, valido_ate, contexto, justificativa, condicoes, revisar_quando, responsavel, resultado_esperado, restrito, dados)
  values (v_id, v_id, v_tipo, v_estado, p ->> 'titulo', p ->> 'conteudo', coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'assuntos') x), '{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'setores') x), '{}'), u, v_nome, p ->> 'autoridade',
    case when v_estado = 'vigente' then u end, case when v_estado = 'vigente' then now() end,
    coalesce((p ->> 'vigente_desde')::date, case when v_estado = 'vigente' then current_date end), (p ->> 'valido_ate')::date,
    p ->> 'contexto', p ->> 'justificativa', p ->> 'condicoes', p ->> 'revisar_quando', p ->> 'responsavel', p ->> 'resultado_esperado',
    coalesce((p ->> 'restrito')::boolean, false), coalesce(p -> 'dados', '{}'::jsonb))
  returning codigo into v_codigo;
  for f in select * from jsonb_array_elements(coalesce(p -> 'fontes', '[]')) loop
    insert into public.biblioteca_fontes (registro_id, tipo, natureza, autor, titulo, data_fonte, link, trecho, versao_periodo, acessada, adicionada_por)
    values (v_id, f ->> 'tipo', f ->> 'natureza', f ->> 'autor', f ->> 'titulo', f ->> 'data_fonte', nullif(f ->> 'link', ''), f ->> 'trecho', f ->> 'versao_periodo', coalesce((f ->> 'acessada')::boolean, false), u);
  end loop;
  if coalesce(p ->> 'excecao_de', '') <> '' then
    insert into public.biblioteca_vinculos (de_id, para_id, relacao, criado_por) values (v_id, (p ->> 'excecao_de')::uuid, 'excecao_de', u);
  end if;
  perform public.bib_log(v_id, 'criado', null, v_estado, u, jsonb_build_object('tipo', v_tipo));
  return jsonb_build_object('id', v_id, 'codigo', v_codigo, 'estado', v_estado);
end $$;

-- Mudanca de estado. Aprovar/rejeitar/revogar exige autoridade; rejeicao exige motivo (preservado);
-- aprendizado so e validado com verificacao registrada; incidente so e verificado com evidencia.
create function public.bib_transicao(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare
  u uuid := (p ->> 'usuario')::uuid; r public.biblioteca_registros; v_para text := p ->> 'para'; v_motivo text := nullif(trim(p ->> 'motivo'), '');
  v_aut text;
begin
  select * into r from public.biblioteca_registros where id = (p ->> 'registro_id')::uuid for update;
  if r.id is null then raise exception 'registro inexistente'; end if;
  if not (v_para = any (public.bib_estados(r.tipo))) then raise exception 'estado % invalido para %', v_para, r.tipo; end if;
  v_aut := coalesce(r.autoridade, p ->> 'autoridade');
  if r.tipo = 'proposta' and v_para in ('aprovada', 'rejeitada') then
    if v_aut is null then raise exception 'defina a autoridade que decide esta proposta'; end if;
    if not public.bib_tem_autoridade(u, v_aut) then raise exception 'sem autoridade (%) para decidir esta proposta', v_aut; end if;
    if v_motivo is null then raise exception 'registre o motivo da % (fica preservado)', v_para; end if;
    if v_para = 'aprovada' and coalesce((p ->> 'confirmo_aprovacao')::boolean, false) is not true then raise exception 'confirme explicitamente a aprovacao'; end if;
    update public.biblioteca_registros set estado = v_para, autoridade = v_aut, aprovado_por = case when v_para = 'aprovada' then u end,
      aprovado_em = case when v_para = 'aprovada' then now() end, dados = dados || jsonb_build_object('motivo_' || v_para, v_motivo) where id = r.id;
  elsif r.tipo in ('decisao', 'politica', 'excecao') and v_para in ('revogada', 'expirada') then
    if not public.bib_tem_autoridade(u, r.autoridade) then raise exception 'sem autoridade (%) para %', r.autoridade, v_para; end if;
    if v_motivo is null then raise exception 'registre o motivo'; end if;
    if r.estado <> 'vigente' then raise exception 'so registro vigente pode ser %', v_para; end if;
    update public.biblioteca_registros set estado = v_para, dados = dados || jsonb_build_object('motivo_' || v_para, v_motivo) where id = r.id;
  elsif r.tipo in ('decisao', 'politica', 'excecao') then
    raise exception 'decisao/politica/excecao muda por revisao (nova versao), revogacao ou expiracao';
  elsif r.tipo = 'aprendizado' and v_para = 'validado' then
    if coalesce(trim(p ->> 'verificacao'), '') = '' then raise exception 'aprendizado so e validado com o resultado da verificacao de eficacia'; end if;
    if not (r.autor = u or public.bib_tem_autoridade(u, coalesce(r.autoridade, 'direcao'))) then raise exception 'sem autoridade para validar'; end if;
    update public.biblioteca_registros set estado = v_para, resultado_observado = p ->> 'verificacao', dados = dados || jsonb_build_object('verificacao', p ->> 'verificacao', 'verificado_em', now()) where id = r.id;
  elsif r.tipo = 'incidente' and v_para in ('verificado', 'encerrado') then
    if coalesce(trim(p ->> 'verificacao'), coalesce(r.dados ->> 'verificacao', '')) = '' then raise exception 'registre como a eficacia da correcao foi verificada'; end if;
    update public.biblioteca_registros set estado = v_para, dados = dados || jsonb_build_object('verificacao', coalesce(p ->> 'verificacao', r.dados ->> 'verificacao')) where id = r.id;
  else
    if public.bib_fechado(r.tipo, r.estado) then raise exception 'registro % esta fechado (%)', r.codigo, r.estado; end if;
    if not (r.autor = u or public.bib_papel(u) = 'direcao' or public.bib_tem_autoridade(u, coalesce(r.autoridade, 'direcao'))) then raise exception 'so o autor ou a direcao muda este registro'; end if;
    update public.biblioteca_registros set estado = v_para, dados = dados || coalesce(p -> 'dados', '{}'::jsonb) where id = r.id;
  end if;
  perform public.bib_log(r.id, 'estado', r.estado, v_para, u, jsonb_build_object('motivo', v_motivo, 'verificacao', p ->> 'verificacao'));
  return jsonb_build_object('estado', v_para);
end $$;

-- Revisao de decisao/politica/excecao: nova versao vigente; a anterior fica preservada como
-- 'substituida' e aponta para a nova. So quem tem a autoridade do registro.
create function public.bib_revisar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare u uuid := (p ->> 'usuario')::uuid; r public.biblioteca_registros; v_id uuid := gen_random_uuid(); v_codigo text; v_nome text;
begin
  select * into r from public.biblioteca_registros where id = (p ->> 'registro_id')::uuid for update;
  if r.id is null then raise exception 'registro inexistente'; end if;
  if r.tipo not in ('decisao', 'politica', 'excecao') or r.estado <> 'vigente' then raise exception 'so decisao/politica/excecao vigente pode ser revisada'; end if;
  if not public.bib_tem_autoridade(u, r.autoridade) then raise exception 'sem autoridade (%) para revisar %', r.autoridade, r.codigo; end if;
  if coalesce((p ->> 'confirmo_aprovacao')::boolean, false) is not true then raise exception 'confirme explicitamente a aprovacao da nova versao'; end if;
  if coalesce(trim(p ->> 'justificativa'), '') = '' then raise exception 'a revisao exige justificativa (o que muda e por que)'; end if;
  select nome into v_nome from public.membros where user_id = u;
  insert into public.biblioteca_registros (id, serie, versao, substitui, tipo, estado, titulo, conteudo, assuntos, setores, autor, autor_nome, autoridade, aprovado_por, aprovado_em,
    vigente_desde, valido_ate, contexto, justificativa, condicoes, revisar_quando, responsavel, resultado_esperado, restrito, dados)
  values (v_id, r.serie, r.versao + 1, r.id, r.tipo, 'vigente', coalesce(p ->> 'titulo', r.titulo), coalesce(p ->> 'conteudo', r.conteudo), r.assuntos,
    coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'setores') x), r.setores), u, v_nome, r.autoridade, u, now(),
    coalesce((p ->> 'vigente_desde')::date, current_date), (p ->> 'valido_ate')::date, coalesce(p ->> 'contexto', r.contexto), p ->> 'justificativa',
    coalesce(p ->> 'condicoes', r.condicoes), coalesce(p ->> 'revisar_quando', r.revisar_quando), coalesce(p ->> 'responsavel', r.responsavel), coalesce(p ->> 'resultado_esperado', r.resultado_esperado), r.restrito,
    jsonb_build_object('motivada_por', p ->> 'motivada_por'))
  returning codigo into v_codigo;
  update public.biblioteca_registros set estado = 'substituida', substituido_por = v_id where id = r.id;
  insert into public.biblioteca_vinculos (de_id, para_id, relacao, criado_por) values (v_id, r.id, 'substitui', u);
  if coalesce(p ->> 'motivada_por', '') <> '' then
    insert into public.biblioteca_vinculos (de_id, para_id, relacao, criado_por) values (v_id, (p ->> 'motivada_por')::uuid, 'baseado_em', u);
    update public.biblioteca_registros set estado = 'aprovada', aprovado_por = u, aprovado_em = now(), dados = dados || jsonb_build_object('motivo_aprovada', 'gerou a versao ' || v_codigo)
      where id = (p ->> 'motivada_por')::uuid and tipo = 'proposta' and estado in ('rascunho', 'em_consulta');
  end if;
  perform public.bib_log(r.id, 'substituida', 'vigente', 'substituida', u, jsonb_build_object('por', v_codigo));
  perform public.bib_log(v_id, 'revisao', null, 'vigente', u, jsonb_build_object('substitui', r.codigo, 'justificativa', p ->> 'justificativa'));
  return jsonb_build_object('id', v_id, 'codigo', v_codigo, 'substitui', r.codigo);
end $$;

-- Divergencia/sugestao fundamentada: vira PROPOSTA ligada ao registro questionado. O registro
-- questionado NAO muda. Sem evidencia acessada -> marcada HIPOTESE A VALIDAR.
create function public.bib_divergir(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare u uuid := (p ->> 'usuario')::uuid; alvo public.biblioteca_registros; d jsonb := p -> 'divergencia'; v_hip boolean; res jsonb; k text;
begin
  select * into alvo from public.biblioteca_registros where id = (p ->> 'registro_id')::uuid;
  if alvo.id is null then raise exception 'registro questionado inexistente'; end if;
  foreach k in array array['problema', 'argumento', 'aplicacao', 'beneficios', 'riscos', 'alternativa'] loop
    if coalesce(trim(d ->> k), '') = '' then raise exception 'divergencia fundamentada exige: %', k; end if;
  end loop;
  v_hip := not exists (select 1 from jsonb_array_elements(coalesce(p -> 'fontes', '[]')) f where coalesce((f ->> 'acessada')::boolean, false) and f ->> 'natureza' in ('fato_verificado', 'opiniao_fonte'));
  res := public.bib_criar(jsonb_build_object('usuario', u, 'tipo', 'proposta', 'estado', 'rascunho',
    'titulo', coalesce(p ->> 'titulo', 'Revisão proposta: ' || alvo.titulo), 'conteudo', d ->> 'argumento', 'assuntos', to_jsonb(alvo.assuntos), 'setores', to_jsonb(alvo.setores),
    'autoridade', alvo.autoridade, 'justificativa', d ->> 'problema', 'restrito', alvo.restrito, 'fontes', coalesce(p -> 'fontes', '[]'),
    'dados', jsonb_build_object('divergencia', d, 'questiona', alvo.codigo, 'hipotese_a_validar', v_hip, 'como_testar', d ->> 'como_testar')));
  insert into public.biblioteca_vinculos (de_id, para_id, relacao, criado_por) values ((res ->> 'id')::uuid, alvo.id, 'questiona', u);
  perform public.bib_log(alvo.id, 'questionado', alvo.estado, alvo.estado, u, jsonb_build_object('por', res ->> 'codigo', 'hipotese', v_hip));
  return res || jsonb_build_object('hipotese_a_validar', v_hip);
end $$;

-- Pedido de parecer a um setor (com responsavel pela conclusao e prazo opcional).
create function public.bib_pedir_parecer(p jsonb) returns uuid language plpgsql set search_path = '' as $$
declare u uuid := (p ->> 'usuario')::uuid; v uuid;
begin
  if not exists (select 1 from public.biblioteca_registros where id = (p ->> 'registro_id')::uuid) then raise exception 'registro inexistente'; end if;
  if coalesce(trim(p ->> 'motivo'), '') = '' then raise exception 'informe o impacto/motivo do parecer'; end if;
  insert into public.biblioteca_pareceres (registro_id, setor_id, participacao, motivo, encaminhamento, solicitado_por, prazo, responsavel_conclusao)
  values ((p ->> 'registro_id')::uuid, p ->> 'setor_id', p ->> 'participacao', p ->> 'motivo', nullif(p ->> 'encaminhamento', ''), u, (p ->> 'prazo')::date, coalesce(nullif(p ->> 'responsavel_conclusao', ''), 'CEO'))
  returning id into v;
  update public.biblioteca_registros set estado = 'em_consulta' where id = (p ->> 'registro_id')::uuid and tipo = 'proposta' and estado = 'rascunho';
  perform public.bib_log((p ->> 'registro_id')::uuid, 'parecer_pedido', null, null, u, jsonb_build_object('setor', p ->> 'setor_id', 'participacao', p ->> 'participacao', 'encaminhamento', p ->> 'encaminhamento'));
  return v;
end $$;

-- Resposta: so quem pertence ao setor (direcao responde pelo setor direcao). Ninguem responde
-- por outro setor; nenhum parecer e simulado.
create function public.bib_responder_parecer(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare u uuid := (p ->> 'usuario')::uuid; x public.biblioteca_pareceres;
begin
  select * into x from public.biblioteca_pareceres where id = (p ->> 'parecer_id')::uuid for update;
  if x.id is null then raise exception 'parecer inexistente'; end if;
  if x.estado <> 'pendente' then raise exception 'parecer ja %', x.estado; end if;
  if public.bib_papel(u) is distinct from x.setor_id and not (x.setor_id = 'direcao' and exists (select 1 from public.governanca_autoridades where user_id = u)) then
    raise exception 'so membros do setor % respondem este parecer', x.setor_id;
  end if;
  if x.participacao = 'informado' then
    update public.biblioteca_pareceres set estado = 'ciente', respondido_por = u, respondido_em = now(), argumento = nullif(p ->> 'argumento', '') where id = x.id;
  else
    if coalesce(trim(p ->> 'argumento'), '') = '' or coalesce(p ->> 'posicao', '') = '' then raise exception 'parecer exige posicao e argumento'; end if;
    if x.participacao = 'consultado' and p ->> 'posicao' in ('aprova', 'nao_aprova') then raise exception 'setor consultado opina (concorda/discorda); aprovar e da alcada aprovadora'; end if;
    update public.biblioteca_pareceres set estado = 'respondido', posicao = p ->> 'posicao', argumento = p ->> 'argumento', respondido_por = u, respondido_em = now() where id = x.id;
  end if;
  perform public.bib_log(x.registro_id, 'parecer_respondido', null, null, u, jsonb_build_object('setor', x.setor_id, 'posicao', p ->> 'posicao'));
  return jsonb_build_object('estado', case when x.participacao = 'informado' then 'ciente' else 'respondido' end);
end $$;

-- Prazos vencidos: 'sem_resposta' (nao e aprovacao). Rodado pela varredura.
create function public.bib_expirar_pareceres() returns integer language plpgsql set search_path = '' as $$
declare n integer;
begin
  update public.biblioteca_pareceres set estado = 'sem_resposta' where estado = 'pendente' and prazo is not null and prazo < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

-- Conflito: encaminha a CEO (coordenacao) ou, acima da alcada dela, ao fundador.
create function public.bib_encaminhar(p jsonb) returns uuid language plpgsql set search_path = '' as $$
declare v uuid;
begin
  if p ->> 'nivel' not in ('ceo', 'fundador') then raise exception 'encaminhamento: ceo ou fundador'; end if;
  if coalesce(trim(p ->> 'motivo'), '') = '' then raise exception 'descreva o conflito'; end if;
  v := public.bib_pedir_parecer(jsonb_build_object('usuario', p ->> 'usuario', 'registro_id', p ->> 'registro_id', 'setor_id', 'direcao', 'participacao', 'aprovador',
    'motivo', p ->> 'motivo', 'encaminhamento', p ->> 'nivel', 'prazo', p ->> 'prazo', 'responsavel_conclusao', case p ->> 'nivel' when 'ceo' then 'CEO' else 'Fundador' end));
  return v;
end $$;

-- Busca de precedentes: classifica cada registro relacionado (aplicavel ou nao, e por que),
-- aponta conflitos e grava a consulta. Busca por texto e escopo: NAO e raciocinio de IA.
create function public.bib_consultar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare
  u uuid := (p ->> 'usuario')::uuid; v_setor text := nullif(p ->> 'setor', ''); v_data date := coalesce((p ->> 'data')::date, current_date);
  q tsquery; res jsonb := '[]'; conflitos jsonb := '[]'; r record; v_aplic boolean; v_motivo text; v_id uuid; v_falt text;
begin
  q := websearch_to_tsquery('pg_catalog.portuguese'::regconfig, coalesce(p ->> 'termos', ''));
  for r in
    select b.*, (select codigo from public.biblioteca_registros s where s.id = b.substituido_por) as substituto
    from public.biblioteca_registros b
    where public.bib_tsv(b.titulo, b.conteudo, b.assuntos) @@ q
      and b.tipo in ('decisao', 'politica', 'excecao', 'proposta', 'aprendizado', 'incidente', 'preferencia')
      and public.bib_pode_ver(u, b.id)
    order by ts_rank(public.bib_tsv(b.titulo, b.conteudo, b.assuntos), q) desc
    limit 30
  loop
    v_aplic := false;
    if r.tipo in ('decisao', 'politica') and r.estado = 'vigente' then
      if r.vigente_desde is not null and r.vigente_desde > v_data then v_motivo := 'ainda não vale (vigente a partir de ' || r.vigente_desde || ')';
      elsif r.valido_ate is not null and r.valido_ate < v_data then v_motivo := 'validade vencida em ' || r.valido_ate;
      elsif v_setor is not null and cardinality(r.setores) > 0 and not (v_setor = any (r.setores)) then v_motivo := 'fora do escopo (vale para ' || array_to_string(r.setores, ', ') || ')';
      else v_aplic := true; v_motivo := 'vigente, dentro do escopo e da validade; autoridade: ' || coalesce(r.autoridade, '—') || '. Orienta a análise, não autoriza executar.';
      end if;
    elsif r.estado = 'substituida' then v_motivo := 'substituída por ' || coalesce(r.substituto, 'nova versão') || ': não vale mais';
    elsif r.estado in ('revogada', 'expirada') then v_motivo := r.estado || ': não vale mais';
    elsif r.tipo = 'excecao' then v_motivo := 'exceção do caso de origem: não vira regra geral';
    elsif r.tipo = 'proposta' and r.estado = 'rejeitada' then v_motivo := 'proposta rejeitada (motivo preservado: ' || coalesce(r.dados ->> 'motivo_rejeitada', '—') || '); não é proibição permanente';
    elsif r.tipo = 'proposta' then v_motivo := 'proposta ainda não decidida (' || r.estado || '): não vale como regra';
    elsif r.tipo = 'aprendizado' and r.estado = 'validado' then v_aplic := true; v_motivo := 'aprendizado validado: considerar para não repetir o erro';
    elsif r.tipo = 'aprendizado' then v_motivo := 'aprendizado ainda não validado (' || r.estado || ')';
    elsif r.tipo = 'incidente' then v_aplic := true; v_motivo := 'caso anterior relacionado (' || r.estado || ')';
    else v_motivo := r.tipo || ' (' || r.estado || '): referência, não regra';
    end if;
    res := res || jsonb_build_object('id', r.id, 'codigo', r.codigo, 'tipo', r.tipo, 'estado', r.estado, 'titulo', r.titulo, 'autoridade', r.autoridade, 'versao', r.versao, 'aplicavel', v_aplic, 'motivo', v_motivo);
  end loop;
  -- conflito: mais de uma decisao/politica aplicavel com autoridades diferentes sobre o mesmo tema
  if (select count(distinct x ->> 'autoridade') from jsonb_array_elements(res) x where (x ->> 'aplicavel')::boolean and x ->> 'tipo' in ('decisao', 'politica')) > 1 then
    conflitos := jsonb_build_array(jsonb_build_object('motivo', 'há decisões/políticas aplicáveis de autoridades diferentes; a precedência não está definida: encaminhar à autoridade apropriada', 'registros',
      (select jsonb_agg(x ->> 'codigo') from jsonb_array_elements(res) x where (x ->> 'aplicavel')::boolean and x ->> 'tipo' in ('decisao', 'politica'))));
  end if;
  v_falt := case when jsonb_array_length(res) = 0 then 'Nenhum precedente encontrado: a análise segue, mas sem base anterior registrada.' end;
  insert into public.biblioteca_consultas (contexto, referencia, termos, setor, considerados, conflitos, faltantes, usuario)
  values (coalesce(p ->> 'contexto', 'biblioteca'), p ->> 'referencia', coalesce(p ->> 'termos', ''), v_setor, res, conflitos, v_falt, u)
  returning id into v_id;
  return jsonb_build_object('consulta_id', v_id, 'considerados', res, 'conflitos', conflitos, 'faltantes', v_falt);
end $$;

do $$
declare f text;
begin
  foreach f in array array['bib_estados(text)', 'bib_fechado(text, text)', 'bib_papel(uuid)', 'bib_tem_autoridade(uuid, text)', 'bib_pode_ver(uuid, uuid)',
    'bib_log(uuid, text, text, text, uuid, jsonb)', 'bib_criar(jsonb)', 'bib_transicao(jsonb)', 'bib_revisar(jsonb)', 'bib_divergir(jsonb)',
    'bib_pedir_parecer(jsonb)', 'bib_responder_parecer(jsonb)', 'bib_expirar_pareceres()', 'bib_encaminhar(jsonb)', 'bib_consultar(jsonb)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
