-- Testes da MARGEM REALIZADA do pedido. Dados TESTE isolados; tudo desfeito no fim.
-- Uso: npx supabase db query --linked -f tests/banco/margem.sql
-- Conta a mao: receita 10.000; orcado 6.000 (40%). Real: compra recebida 5 x 480 = 2.400; produto B
-- do estoque 2 x 100 = 200; frete 150; horas 4 x 50 = 200 -> 2.950 (margem 70,50%; desvio +30,50 p.p.).
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare u uuid := '00000000-0000-0000-0000-0000000a0001'; ped uuid; c jsonb; m jsonb;
begin
  insert into public.pedidos (chave, cliente_nome, estado, valor_total, custo_total, criado_por, confirmado_em) values ('TESTE-MARGEM', 'Cliente TESTE', 'confirmado', 10000, 6000, u, now()) returning id into ped;
  insert into public.pedido_itens (pedido_id, ordem, item_id, nome, tipo, quantidade, preco_unit, custo_unit) values
    (ped, 1, 'TESTE-MG-A', 'Central TESTE', 'produto', 5, 1200, 500), (ped, 2, 'TESTE-MG-B', 'Sensor TESTE', 'produto', 2, 1000, 1500), (ped, 3, null, 'Programação TESTE', 'servico', 1, 2000, 0);
  m := public.pedido_margem(ped);
  insert into resultado (passo, ok, detalhe) values ('1. sem custo real ainda: lacuna do produto sem custo médio e sem desvio', not (m ->> 'completo')::boolean and m -> 'lacunas' ->> 0 like '%Sensor TESTE%' and (m ->> 'margem_orcada_pct')::numeric = 40 and m -> 'desvio_pp' = 'null'::jsonb, m::text);

  insert into public.estoque_movimentos (item_id, tipo, quantidade, custo_unit, chave) values ('TESTE-MG-B', 'entrada', 10, 100, 'TESTE-MG-ENT');
  c := public.compra_criar(jsonb_build_object('chave', 'TESTE-MG-C', 'usuario', u, 'fornecedor_nome', 'Fornecedor TESTE', 'pedido_id', ped,
    'itens', jsonb_build_array(jsonb_build_object('item_id', 'TESTE-MG-A', 'nome', 'Central TESTE', 'quantidade', 5, 'custo_unit', 480)), 'parcelas', jsonb_build_array(jsonb_build_object('vencimento', current_date, 'valor', 2400))));
  perform public.compra_receber(jsonb_build_object('compra_id', c ->> 'id', 'usuario', u, 'chave', 'TESTE-MG-R', 'itens', jsonb_build_array(jsonb_build_object('ordem', 1, 'quantidade', 5))));
  perform public.conta_pagar_criar(jsonb_build_object('chave', 'TESTE-MG-K', 'usuario', u, 'descricao', 'Frete TESTE', 'fornecedor', 'Transp TESTE', 'categoria', 'frete', 'vencimento', current_date, 'valor', 150, 'pedido_id', ped));
  perform public.pedido_lancar_horas(jsonb_build_object('chave', 'TESTE-MG-H', 'usuario', u, 'pedido_id', ped, 'data', current_date, 'pessoa', 'Técnico TESTE', 'horas', 4, 'custo_hora', 50));
  m := public.pedido_margem(ped);
  insert into resultado (passo, ok, detalhe) values ('2. custo real = compra 2.400 + estoque 200 + frete 150 + horas 200 = 2.950',
    (m -> 'custo_real' ->> 'materiais_comprados')::numeric = 2400 and (m -> 'custo_real' ->> 'materiais_estoque')::numeric = 200
    and (m -> 'custo_real' ->> 'outras_despesas')::numeric = 150 and (m -> 'custo_real' ->> 'mao_de_obra')::numeric = 200 and (m -> 'custo_real' ->> 'total')::numeric = 2950, (m -> 'custo_real')::text);
  insert into resultado (passo, ok, detalhe) values ('3. margem realizada 70,50% e desvio +30,50 p.p. sobre a orçada (40%), completa',
    (m ->> 'margem_realizada_pct')::numeric = 70.5 and (m ->> 'desvio_pp')::numeric = 30.5 and (m ->> 'completo')::boolean, m::text);

  perform public.pedido_lancar_horas(jsonb_build_object('chave', 'TESTE-MG-H2', 'usuario', u, 'pedido_id', ped, 'data', current_date, 'pessoa', 'Ajudante TESTE', 'horas', 3));
  m := public.pedido_margem(ped);
  insert into resultado (passo, ok, detalhe) values ('4. hora sem custo vira lacuna (não zero): total parcial sinalizado',
    not (m ->> 'completo')::boolean and (m -> 'lacunas')::text like '%sem custo/hora%', (m -> 'lacunas')::text);
  insert into resultado (passo, ok, detalhe) values ('5. só o servidor executa', not has_function_privilege('authenticated', 'public.pedido_margem(uuid)', 'execute'), null);
end $$;

select n, passo, ok, left(detalhe, 200) as detalhe from resultado order by n;
rollback;
