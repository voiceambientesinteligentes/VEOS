-- Produto excluido do catalogo (ex.: compra pessoal): some das listas, mas o historico de precos
-- (append-only) e as compras de origem ficam preservados para auditoria.
alter table public.produtos drop constraint produtos_situacao_check;
alter table public.produtos add constraint produtos_situacao_check check (situacao in ('ativo', 'inativo', 'revisar', 'excluido'));
