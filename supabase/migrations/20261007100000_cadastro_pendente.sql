-- CADASTRO PENDENTE: produto que entra num orcamento sem cadastro no catalogo do VEOS vira pendencia
-- (pedido do fundador em 07/10/2026). Duas origens:
--   sem_item_zoho     linha digitada direto no orcamento do Zoho, sem item cadastrado;
--   sem_produto_veos  item do Zoho (produto, nao servico) sem produto do VEOS ligado.
-- Conta a partir do inicio do controle (06/10/2026): os ~246 itens antigos do Zoho ficam para a
-- mesclagem combinada para o fim do projeto (BIB-0077). Servicos se conferem pelas horas e ficam fora.
-- Resolver: cadastrar (cria o produto, custo e preco ficam como lacuna), ligar a um produto que ja
-- existe ou dispensar com motivo (ex.: item generico de orcamento). Nada e apagado.
create table public.cadastro_pendente (
  id bigint generated always as identity primary key,
  chave text not null unique,                       -- zoho:<item_id> ou texto:<nome normalizado>
  zoho_item_id text,
  nome text not null,
  unidade text,
  tipo text,                                        -- product_type do Zoho, quando houver
  motivo text not null check (motivo in ('sem_item_zoho', 'sem_produto_veos')),
  primeiro_orcamento text,
  primeiro_em date,
  orcamentos text[] not null default '{}',
  ocorrencias integer not null default 0,
  ultimo_preco_venda numeric(14, 2),                -- preco cobrado no orcamento mais recente
  situacao text not null default 'pendente' check (situacao in ('pendente', 'cadastrado', 'dispensado')),
  produto_id uuid references public.produtos (id),
  motivo_dispensa text,
  resolvido_por uuid,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index cadastro_pendente_situacao on public.cadastro_pendente (situacao, ocorrencias desc);
alter table public.cadastro_pendente enable row level security;

-- Codigos novos seguem os importados (PRD-0001 a PRD-0139): a sequencia continua do maior codigo.
select setval('public.produto_numero_seq', greatest(1, (select coalesce(max(substring(codigo from '^PRD-([0-9]+)$')::int), 0) from public.produtos)));

/** Le os orcamentos do espelho desde p_desde e atualiza a fila; resolve sozinho o que ja ganhou produto. */
create function public.cadastro_pendente_atualizar(p_desde date default '2026-10-06') returns jsonb language plpgsql set search_path = '' as $$
declare mudou integer; resolvidos integer;
begin
  with linhas as (
    select r.dados->>'estimate_number' as est, nullif(r.dados->>'date', '')::date as data,
           nullif(l->>'item_id', '') as item_id, regexp_replace(trim(coalesce(l->>'name', '')), '\s+', ' ', 'g') as nome,
           nullif(l->>'unit', '') as unidade, nullif(l->>'rate', '')::numeric as preco
    from public.zoho_registros r, jsonb_array_elements(coalesce(r.dados->'line_items', '[]'::jsonb)) l
    where r.produto = 'books' and r.modulo = 'estimates' and not r.excluido and nullif(r.dados->>'date', '')::date >= p_desde
  ), itens as (
    select zoho_id, dados->>'product_type' as tipo from public.zoho_registros where produto = 'books' and modulo = 'items' and not excluido
  ), cat as (
    select zoho_item_id from public.produtos where zoho_item_id is not null and situacao <> 'excluido'
    union select zoho_item_id from public.produto_vinculos_zoho where relacao = 'mesmo_produto' and situacao <> 'descartado'
  ), faltas as (
    select case when l.item_id is null then 'texto:' || lower(l.nome) else 'zoho:' || l.item_id end as chave,
           l.item_id, l.nome, l.unidade, i.tipo, l.est, l.data, l.preco,
           case when l.item_id is null then 'sem_item_zoho' else 'sem_produto_veos' end as motivo
    from linhas l left join itens i on i.zoho_id = l.item_id
    where l.nome <> '' and (l.item_id is null or (coalesce(i.tipo, 'goods') <> 'service' and l.item_id not in (select zoho_item_id from cat)))
  ), agrup as (
    select chave, max(item_id) as item_id, (array_agg(nome order by data desc, est desc))[1] as nome,
           (array_agg(unidade order by data desc, est desc) filter (where unidade is not null))[1] as unidade, max(tipo) as tipo, max(motivo) as motivo,
           (array_agg(est order by data, est))[1] as primeiro_orcamento, min(data) as primeiro_em,
           array_agg(distinct est order by est) as orcamentos, count(*)::int as ocorrencias,
           (array_agg(preco order by data desc, est desc) filter (where preco is not null))[1] as preco
    from faltas group by chave
  )
  insert into public.cadastro_pendente as c (chave, zoho_item_id, nome, unidade, tipo, motivo, primeiro_orcamento, primeiro_em, orcamentos, ocorrencias, ultimo_preco_venda)
  select chave, item_id, left(nome, 200), unidade, tipo, motivo, primeiro_orcamento, primeiro_em, orcamentos, ocorrencias, preco from agrup
  on conflict (chave) do update set nome = excluded.nome, unidade = coalesce(excluded.unidade, c.unidade), orcamentos = excluded.orcamentos,
    ocorrencias = excluded.ocorrencias, ultimo_preco_venda = excluded.ultimo_preco_venda, atualizado_em = now()
  where c.situacao = 'pendente' and (c.orcamentos is distinct from excluded.orcamentos or c.ultimo_preco_venda is distinct from excluded.ultimo_preco_venda or c.nome is distinct from excluded.nome);
  get diagnostics mudou = row_count;

  -- item do Zoho que ganhou produto do VEOS por outro caminho (vinculo ou cadastro direto)
  with ligados as (
    select zoho_item_id, id as produto_id from public.produtos where zoho_item_id is not null and situacao <> 'excluido'
    union select zoho_item_id, produto_id from public.produto_vinculos_zoho where relacao = 'mesmo_produto' and situacao <> 'descartado'
  )
  update public.cadastro_pendente c set situacao = 'cadastrado', produto_id = g.produto_id, resolvido_em = now(), atualizado_em = now()
  from ligados g where c.situacao = 'pendente' and c.zoho_item_id = g.zoho_item_id;
  get diagnostics resolvidos = row_count;
  return jsonb_build_object('atualizados', mudou, 'resolvidos', resolvidos, 'pendentes', (select count(*) from public.cadastro_pendente where situacao = 'pendente'));
end $$;

/** Cadastra o produto a partir da pendencia. Custo e preco de venda NAO entram aqui (lacuna; alcada propria). */
create function public.cadastro_pendente_cadastrar(p_id bigint, p_dados jsonb, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
declare c public.cadastro_pendente; novo uuid; cod text; nome text;
begin
  select * into c from public.cadastro_pendente where id = p_id for update;
  if c.id is null then raise exception 'pendência inexistente'; end if;
  if c.situacao <> 'pendente' then raise exception 'pendência já resolvida (%)', c.situacao; end if;
  nome := left(trim(coalesce(p_dados->>'nome', c.nome)), 200);
  if length(nome) < 2 then raise exception 'informe o nome do produto'; end if;
  cod := 'PRD-' || lpad(nextval('public.produto_numero_seq')::text, 4, '0');
  insert into public.produtos (codigo, nome, marca, modelo, unidade, tipo, categoria, situacao, descricao, zoho_item_id, origem, observacao)
  values (cod, nome, nullif(trim(p_dados->>'marca'), ''), nullif(trim(p_dados->>'modelo'), ''), coalesce(nullif(trim(p_dados->>'unidade'), ''), c.unidade, 'un'),
          'produto', nullif(trim(p_dados->>'categoria'), ''), 'ativo', nullif(trim(p_dados->>'descricao'), ''), c.zoho_item_id,
          case when c.zoho_item_id is null then 'manual' else 'zoho' end,
          format('Cadastrado pela fila de pendências: apareceu em %s (%s vez(es)).', array_to_string(c.orcamentos, ', '), c.ocorrencias))
  returning id into novo;
  update public.cadastro_pendente set situacao = 'cadastrado', produto_id = novo, resolvido_por = p_usuario, resolvido_em = now(), atualizado_em = now() where id = p_id;
  return jsonb_build_object('ok', true, 'produto_id', novo, 'codigo', cod);
end $$;

/** Liga a pendencia a um produto que ja existe (item do Zoho vira vinculo confirmado "mesmo produto"). */
create function public.cadastro_pendente_ligar(p_id bigint, p_produto uuid, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
declare c public.cadastro_pendente; p public.produtos;
begin
  select * into c from public.cadastro_pendente where id = p_id for update;
  if c.id is null then raise exception 'pendência inexistente'; end if;
  if c.situacao <> 'pendente' then raise exception 'pendência já resolvida (%)', c.situacao; end if;
  select * into p from public.produtos where id = p_produto;
  if p.id is null or p.situacao = 'excluido' then raise exception 'produto inexistente'; end if;
  if c.zoho_item_id is not null then
    insert into public.produto_vinculos_zoho (produto_id, zoho_item_id, relacao, evidencia, situacao, decidido_por, decidido_em)
    values (p.id, c.zoho_item_id, 'mesmo_produto', format('Ligado pela fila de pendências (orçamentos %s).', array_to_string(c.orcamentos, ', ')), 'confirmado', p_usuario, now())
    on conflict (produto_id, zoho_item_id) do update set relacao = 'mesmo_produto', situacao = 'confirmado', decidido_por = p_usuario, decidido_em = now();
  end if;
  update public.cadastro_pendente set situacao = 'cadastrado', produto_id = p.id, resolvido_por = p_usuario, resolvido_em = now(), atualizado_em = now() where id = p_id;
  return jsonb_build_object('ok', true, 'produto_id', p.id, 'codigo', p.codigo);
end $$;

/** Dispensa com motivo (ex.: item generico de orcamento, kit de componentes). Continua visivel na lista. */
create function public.cadastro_pendente_dispensar(p_id bigint, p_motivo text, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
declare c public.cadastro_pendente;
begin
  select * into c from public.cadastro_pendente where id = p_id for update;
  if c.id is null then raise exception 'pendência inexistente'; end if;
  if c.situacao <> 'pendente' then raise exception 'pendência já resolvida (%)', c.situacao; end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then raise exception 'informe o motivo da dispensa'; end if;
  update public.cadastro_pendente set situacao = 'dispensado', motivo_dispensa = left(trim(p_motivo), 500), resolvido_por = p_usuario, resolvido_em = now(), atualizado_em = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.cadastro_pendente_atualizar(date), public.cadastro_pendente_cadastrar(bigint, jsonb, uuid), public.cadastro_pendente_ligar(bigint, uuid, uuid), public.cadastro_pendente_dispensar(bigint, text, uuid) from public, anon, authenticated;
