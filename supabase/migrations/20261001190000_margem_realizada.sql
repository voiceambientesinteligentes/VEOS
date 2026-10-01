-- MARGEM REALIZADA (P1): custo real do pedido x custo orcado. Margem BRUTA (preco - custo direto),
-- nao a margem de contribuicao oficial da Politica V1. Partes do custo real:
--  - materiais comprados: itens RECEBIDOS das compras ligadas ao pedido (quantidade x custo da compra)
--  - materiais do estoque: produtos do pedido alem do comprado para ele, pelo custo medio do estoque
--  - outras despesas: contas a pagar avulsas ligadas ao pedido (frete, terceiros...)
--  - mao de obra: horas lancadas x custo/hora
-- Parte sem dado (ex.: hora sem custo, item sem custo medio) vira LACUNA e o total fica parcial.
create function public.pedido_margem(p_pedido uuid) returns jsonb language plpgsql stable set search_path = '' as $$
declare v public.pedidos; r jsonb; v_comp numeric; v_est numeric; v_est_lacuna text[]; v_av numeric; v_h numeric; v_h_lac boolean; v_real numeric; lac text[] := '{}';
begin
  select * into v from public.pedidos where id = p_pedido;
  if v.id is null then raise exception 'pedido inexistente'; end if;
  select coalesce(sum(ci.recebido * ci.custo_unit), 0) into v_comp
    from public.compra_itens ci join public.compras c on c.id = ci.compra_id where c.pedido_id = v.id and c.estado <> 'cancelada';
  -- produtos alem do recebido nas compras do pedido: custo medio do estoque
  with itens as (select item_id, min(nome) nome, sum(quantidade) q from public.pedido_itens where pedido_id = v.id and tipo = 'produto' and item_id is not null group by item_id),
  comprado as (select ci.item_id, sum(ci.recebido) q from public.compra_itens ci join public.compras c on c.id = ci.compra_id where c.pedido_id = v.id and c.estado <> 'cancelada' group by ci.item_id),
  resto as (select i.item_id, i.nome, greatest(i.q - coalesce(c.q, 0), 0) q, s.custo_medio from itens i left join comprado c on c.item_id = i.item_id left join public.estoque_saldos s on s.item_id = i.item_id)
  select coalesce(sum(q * custo_medio) filter (where custo_medio is not null), 0), array_agg(nome) filter (where q > 0 and custo_medio is null) into v_est, v_est_lacuna from resto;
  select coalesce(sum(valor), 0) into v_av from public.contas_pagar where pedido_id = v.id and compra_id is null and estado <> 'cancelada';
  select coalesce(sum(horas * custo_hora), 0), bool_or(custo_hora is null) into v_h, v_h_lac from public.pedido_horas where pedido_id = v.id;
  if v_est_lacuna is not null then lac := lac || ('produtos sem custo médio no estoque: ' || array_to_string(v_est_lacuna, ', ')); end if;
  if coalesce(v_h_lac, false) then lac := lac || 'horas lançadas sem custo/hora'::text; end if;
  if v.custo_total is null then lac := lac || 'custo orçado incompleto (item sem preço de compra no cadastro)'::text; end if;
  v_real := v_comp + v_est + v_av + v_h;
  return jsonb_build_object(
    'receita', v.valor_total,
    'custo_orcado', v.custo_total,
    'margem_orcada', case when v.custo_total is not null then v.valor_total - v.custo_total end,
    'margem_orcada_pct', case when v.custo_total is not null and v.valor_total > 0 then round(100 * (v.valor_total - v.custo_total) / v.valor_total, 2) end,
    'custo_real', jsonb_build_object('materiais_comprados', round(v_comp, 2), 'materiais_estoque', round(v_est, 2), 'outras_despesas', round(v_av, 2), 'mao_de_obra', round(v_h, 2), 'total', round(v_real, 2)),
    'margem_realizada', round(v.valor_total - v_real, 2),
    'margem_realizada_pct', case when v.valor_total > 0 then round(100 * (v.valor_total - v_real) / v.valor_total, 2) end,
    'desvio_pp', case when v.custo_total is not null and v.valor_total > 0 then round(100 * (v.custo_total - v_real) / v.valor_total, 2) end,
    'completo', cardinality(lac) = 0, 'lacunas', to_jsonb(lac), 'estado', v.estado);
end $$;
revoke execute on function public.pedido_margem(uuid) from public, anon, authenticated;
