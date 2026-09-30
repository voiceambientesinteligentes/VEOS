-- Faltas de estoque dos pedidos confirmados (quanto de cada produto ainda nao esta reservado).
create function public.fluxo_faltas() returns table (pedido_id uuid, numero text, cliente_nome text, item_id text, nome text, falta numeric)
language sql stable set search_path = '' as $$
  select p.id, p.numero, p.cliente_nome, i.item_id, min(i.nome), sum(i.quantidade) - public.reservado_pedido(p.id, i.item_id)
  from public.pedidos p join public.pedido_itens i on i.pedido_id = p.id
  where p.estado = 'confirmado' and i.tipo = 'produto' and i.item_id is not null
  group by p.id, p.numero, p.cliente_nome, i.item_id
  having sum(i.quantidade) - public.reservado_pedido(p.id, i.item_id) > 0
$$;
revoke execute on function public.fluxo_faltas() from public, anon, authenticated;
