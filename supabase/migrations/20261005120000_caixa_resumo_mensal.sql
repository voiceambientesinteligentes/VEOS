-- Resumo mensal do extrato por grupo do plano de contas (base do DRE pelo caixa e dos indicadores).
-- Transferencias entre contas (8.1) ficam fora de receita/despesa; o que nao foi classificado aparece
-- a parte ("a_classificar"), nunca somado em grupo nenhum.
create function public.caixa_resumo_mensal(p_de date, p_ate date) returns jsonb language sql stable set search_path = '' as $$
  with m as (
    select to_char(x.data, 'YYYY-MM') as mes, coalesce(p.grupo, 'a_classificar') as grupo, x.categoria, x.valor
    from public.movimentos_bancarios x left join public.plano_contas p on p.codigo = x.categoria
    where x.data between p_de and p_ate
  )
  select coalesce(jsonb_agg(jsonb_build_object('mes', mes, 'grupo', grupo, 'categoria', categoria, 'entradas', entradas, 'saidas', saidas, 'quantidade', quantidade) order by mes, grupo, categoria), '[]'::jsonb)
  from (select mes, grupo, categoria, sum(valor) filter (where valor > 0) as entradas, sum(valor) filter (where valor < 0) as saidas, count(*) as quantidade from m group by mes, grupo, categoria) t
$$;
revoke execute on function public.caixa_resumo_mensal(date, date) from public, anon, authenticated;
