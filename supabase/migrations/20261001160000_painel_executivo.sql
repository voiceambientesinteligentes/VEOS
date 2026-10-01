-- PAINEL EXECUTIVO (P1): agregados para a Visao geral da direcao. So numeros que existem:
-- dado ausente volta como lacuna (null / lista vazia), nunca como zero inventado.
--  - vendas: orcamentos ACEITOS no Zoho Books por mes (data do orcamento)
--  - faturado: notas fiscais registradas no VEOS (NF manual) + faturas do Zoho Books, se houver
--  - caixa: parcelas previstas (vencimento) x recebidas (data do recebimento), por mes
--  - pedidos: valor e custo direto orcados -> margem BRUTA orcada (preco - custo direto).
--    NAO e a margem de contribuicao oficial da Politica V1 (que desconta impostos, comissao e provisao).
--  - funil: negocios do CRM por etapa; orcamentos do Books por situacao
--  - alertas ativos por setor e severidade
create function public.painel_executivo(p_meses int default 12, p_agora timestamptz default now()) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_de date := (date_trunc('month', p_agora) - make_interval(months => greatest(p_meses, 1) - 1))::date; r jsonb;
begin
  with meses as (select to_char(m, 'YYYY-MM') as mes from generate_series(v_de, date_trunc('month', p_agora)::date, interval '1 month') m),
  est as (select to_char((dados ->> 'date')::date, 'YYYY-MM') as mes, (dados ->> 'total')::numeric as total, dados ->> 'status' as status
          from public.zoho_registros where produto = 'books' and modulo = 'estimates' and not excluido and dados ->> 'date' ~ '^\d{4}-\d{2}-\d{2}$'),
  inv as (select to_char((dados ->> 'date')::date, 'YYYY-MM') as mes, (dados ->> 'total')::numeric as total
          from public.zoho_registros where produto = 'books' and modulo = 'invoices' and not excluido and dados ->> 'date' ~ '^\d{4}-\d{2}-\d{2}$'
            and coalesce(dados ->> 'status', '') not in ('void', 'draft')),
  nf as (select to_char(n.emitida_em, 'YYYY-MM') as mes, n.valor from public.notas_fiscais n join public.pedidos p on p.id = n.pedido_id where p.estado <> 'cancelado'),
  par as (select x.* from public.parcelas x join public.pedidos p on p.id = x.pedido_id where p.estado <> 'cancelado' and x.estado <> 'cancelada')
  select jsonb_build_object(
    'de', v_de, 'ate', p_agora::date,
    'meses', (select jsonb_agg(jsonb_build_object(
        'mes', m.mes,
        'vendas_qtd', (select count(*) from est where est.mes = m.mes and status = 'accepted'),
        'vendas_total', (select sum(total) from est where est.mes = m.mes and status = 'accepted'),
        'nf_total', (select sum(valor) from nf where nf.mes = m.mes),
        'faturas_zoho_total', (select sum(total) from inv where inv.mes = m.mes),
        'caixa_previsto', (select sum(valor) from par where to_char(vencimento, 'YYYY-MM') = m.mes),
        'caixa_recebido', (select sum(coalesce(valor_recebido, valor)) from par where estado = 'recebida' and to_char(recebido_em, 'YYYY-MM') = m.mes)
      ) order by m.mes) from meses m),
    'tem_faturas_zoho', exists (select 1 from inv),
    'tem_nf', exists (select 1 from nf),
    'tem_parcelas', exists (select 1 from par),
    'pedidos', (select jsonb_build_object('qtd', count(*), 'valor', sum(valor_total), 'custo', sum(custo_total) filter (where custo_total is not null),
        'qtd_com_custo', count(*) filter (where custo_total is not null),
        'margem_bruta_orcada_pct', case when sum(valor_total) filter (where custo_total is not null) > 0
          then round(100 * (sum(valor_total) filter (where custo_total is not null) - sum(custo_total) filter (where custo_total is not null)) / sum(valor_total) filter (where custo_total is not null), 2) end,
        'por_estado', (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb) from (select estado, count(*) n from public.pedidos group by estado) e))
      from public.pedidos where estado <> 'cancelado' and criado_em::date >= v_de),
    'a_receber', (select jsonb_build_object('aberto', sum(valor) filter (where estado = 'aberta'), 'vencido', sum(valor) filter (where estado = 'aberta' and vencimento < p_agora::date)) from par),
    'orcamentos', (select coalesce(jsonb_agg(jsonb_build_object('status', status, 'qtd', n, 'total', t) order by n desc), '[]'::jsonb)
      from (select status, count(*) n, sum(total) t from est where mes >= to_char(v_de, 'YYYY-MM') group by status) s),
    'funil_crm', (select coalesce(jsonb_agg(jsonb_build_object('etapa', etapa, 'qtd', n, 'valor', v, 'probabilidade', pr) order by pr nulls last, etapa), '[]'::jsonb)
      from (select dados ->> 'Stage' as etapa, count(*) n, sum(nullif(dados ->> 'Amount', '')::numeric) v, max(nullif(dados ->> 'Probability', '')::numeric) pr
            from public.zoho_registros where produto = 'crm' and modulo = 'Deals' and not excluido group by 1) f),
    'alertas', (select coalesce(jsonb_agg(jsonb_build_object('setor', setor_id, 'severidade', severidade, 'qtd', n) order by setor_id, severidade desc), '[]'::jsonb)
      from (select setor_id, severidade, count(*) n from public.alertas where estado = 'ativo' group by 1, 2) a)
  ) into r;
  return r;
end $$;
revoke execute on function public.painel_executivo(int, timestamptz) from public, anon, authenticated;
