-- (1) Formulario do CFO v2: secoes novas "tempos" (catalogo de tempos-padrao estruturado) e "voce"
--     (retirada, pro-labore e papel do fundador).
-- (2) PLANO DA VOICE: metas, acoes, rotinas e regras propostas pelos diretores (IA) e decididas pelo
--     fundador. Itens nascem "proposto"; so a direcao aprova. Toda mudanca fica no historico
--     (append-only). RLS ligada e sem policies: so a Edge Function (service role) le e grava.
alter table public.formulario_respostas drop constraint formulario_respostas_secao_check;
alter table public.formulario_respostas add constraint formulario_respostas_secao_check
  check (secao in ('impostos', 'compras', 'equipe', 'tempos', 'voce', 'fixos', 'vendas', 'dividas', 'pedidos'));

create sequence public.plano_codigo_seq;
create table public.plano_itens (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('PL-' || lpad(nextval('public.plano_codigo_seq')::text, 3, '0')),
  area text not null references public.setores (id),   -- setor responsavel (diretor)
  fase text not null check (fase in ('0-30', '30-90', '90-180', '180-365')),
  tipo text not null check (tipo in ('meta', 'acao', 'rotina', 'regra', 'decisao')),
  titulo text not null check (length(titulo) between 3 and 200),
  descricao text not null check (length(descricao) between 3 and 6000),
  responsavel text,                                    -- quem executa (pessoa ou cargo)
  indicador text,                                      -- como medir
  alvo text,                                           -- valor-alvo (meta e PROPOSTA ate aprovar)
  prazo date,
  estado text not null default 'proposto' check (estado in ('proposto', 'aprovado', 'em_andamento', 'feito', 'cancelado')),
  origem text not null,                                -- ex.: 'CFO (Claude, plano Max)'
  fontes jsonb not null default '[]'::jsonb,
  ordem integer not null default 0,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index plano_itens_fase on public.plano_itens (fase, ordem);
alter table public.plano_itens enable row level security;

create table public.plano_historico (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.plano_itens (id),
  acao text not null,                                  -- criado | estado | edicao | nota
  de jsonb, para jsonb, nota text,
  usuario uuid not null,
  em timestamptz not null default now()
);
create trigger plano_historico_imutavel before update or delete on public.plano_historico for each row execute function public.recusar_alteracao();
alter table public.plano_historico enable row level security;

-- Muda estado, campos editaveis ou registra nota, sempre com historico. Aprovar/cancelar so direcao
-- (checado na API); aqui a regra de transicao.
create function public.plano_mudar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare i public.plano_itens; v_novo text := nullif(p ->> 'estado', ''); u uuid := (p ->> 'usuario')::uuid; campos jsonb := coalesce(p -> 'campos', '{}'::jsonb); antes jsonb;
begin
  select * into i from public.plano_itens where id = (p ->> 'item_id')::uuid for update;
  if i.id is null then raise exception 'item inexistente'; end if;
  if v_novo is not null and v_novo <> i.estado then
    if not ((i.estado = 'proposto' and v_novo in ('aprovado', 'cancelado'))
         or (i.estado = 'aprovado' and v_novo in ('em_andamento', 'feito', 'cancelado'))
         or (i.estado = 'em_andamento' and v_novo in ('feito', 'cancelado', 'aprovado'))
         or (i.estado in ('feito', 'cancelado') and v_novo = 'aprovado')) then
      raise exception 'transição inválida: % -> %', i.estado, v_novo;
    end if;
    insert into public.plano_historico (item_id, acao, de, para, nota, usuario) values (i.id, 'estado', to_jsonb(i.estado), to_jsonb(v_novo), nullif(p ->> 'nota', ''), u);
    update public.plano_itens set estado = v_novo, atualizado_em = now() where id = i.id;
  end if;
  if campos <> '{}'::jsonb then
    if exists (select 1 from jsonb_object_keys(campos) k where k not in ('responsavel', 'indicador', 'alvo', 'prazo', 'titulo', 'descricao')) then raise exception 'campo não editável'; end if;
    antes := (select jsonb_object_agg(k, to_jsonb(i) -> k) from jsonb_object_keys(campos) k);
    update public.plano_itens set
      responsavel = case when campos ? 'responsavel' then nullif(campos ->> 'responsavel', '') else responsavel end,
      indicador = case when campos ? 'indicador' then nullif(campos ->> 'indicador', '') else indicador end,
      alvo = case when campos ? 'alvo' then nullif(campos ->> 'alvo', '') else alvo end,
      prazo = case when campos ? 'prazo' then nullif(campos ->> 'prazo', '')::date else prazo end,
      titulo = case when campos ? 'titulo' then campos ->> 'titulo' else titulo end,
      descricao = case when campos ? 'descricao' then campos ->> 'descricao' else descricao end,
      atualizado_em = now()
    where id = i.id;
    insert into public.plano_historico (item_id, acao, de, para, nota, usuario) values (i.id, 'edicao', antes, campos, nullif(p ->> 'nota', ''), u);
  elsif v_novo is null or v_novo = i.estado then
    if coalesce(p ->> 'nota', '') = '' then raise exception 'nada a registrar'; end if;
    insert into public.plano_historico (item_id, acao, nota, usuario) values (i.id, 'nota', p ->> 'nota', u);
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.plano_mudar(jsonb) from public, anon, authenticated;
