-- Compras de origem: variante/sku vazios contam como iguais na unicidade (reimportar nao duplica).
delete from public.produto_compras_origem a using public.produto_compras_origem b
where a.id > b.id and a.pedido = b.pedido and a.sku_interno is not distinct from b.sku_interno and a.variante is not distinct from b.variante;
alter table public.produto_compras_origem drop constraint produto_compras_origem_pedido_sku_interno_variante_key;
alter table public.produto_compras_origem add constraint produto_compras_origem_unica unique nulls not distinct (pedido, sku_interno, variante);
