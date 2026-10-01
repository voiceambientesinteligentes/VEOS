-- Listagem da Biblioteca com filtros, ja respeitando a visibilidade de cada usuario.
create function public.bib_listar(p_usuario uuid, f jsonb) returns setof public.biblioteca_registros
language sql stable set search_path = '' as $$
  select b.* from public.biblioteca_registros b
  where public.bib_pode_ver(p_usuario, b.id)
    and (coalesce(f ->> 'tipos', '') = '' or b.tipo = any (string_to_array(f ->> 'tipos', ',')))
    and (coalesce(f ->> 'estado', '') = '' or b.estado = f ->> 'estado')
    and (coalesce(f ->> 'setor', '') = '' or f ->> 'setor' = any (b.setores) or cardinality(b.setores) = 0)
    and (coalesce(f ->> 'responsavel', '') = '' or b.responsavel ilike '%' || (f ->> 'responsavel') || '%' or b.autor_nome ilike '%' || (f ->> 'responsavel') || '%')
    and (coalesce(f ->> 'de', '') = '' or b.registrado_em >= (f ->> 'de')::date)
    and (coalesce(f ->> 'ate', '') = '' or b.registrado_em < (f ->> 'ate')::date + 1)
    and (coalesce(f ->> 'busca', '') = '' or public.bib_tsv(b.titulo, b.conteudo, b.assuntos) @@ websearch_to_tsquery('pg_catalog.portuguese'::regconfig, f ->> 'busca')
         or b.codigo ilike (f ->> 'busca') or b.titulo ilike '%' || (f ->> 'busca') || '%')
    and (coalesce((f ->> 'so_atuais')::boolean, false) is false or b.estado not in ('substituida'))
  order by b.registrado_em desc
  limit 300
$$;
revoke execute on function public.bib_listar(uuid, jsonb) from public, anon, authenticated;
