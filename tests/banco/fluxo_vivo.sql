-- Teste do fluxo vivo no banco (roda dentro de uma transacao e desfaz tudo no fim).
-- Uso: npx supabase db query --linked -f tests/banco/fluxo_vivo.sql
begin;
create temp table resultado (passo text, ok boolean, detalhe text) on commit drop;

do $$
declare
  u uuid := '00000000-0000-0000-0000-00000000aaaa';
  r jsonb; p uuid; s record; erro text; parc uuid;
begin
  -- estoque inicial: 3 unidades do item TESTE
  insert into public.estoque_movimentos (item_id, tipo, quantidade, custo_unit, usuario, observacao) values ('TESTE-ITEM-1', 'entrada', 3, 100, u, 'TESTE');
  -- pedido com 5 unidades (produto) + 1 servico, total 1000 + 500
  r := public.pedido_criar(jsonb_build_object('chave', 'TESTE-FLUXO-1', 'cliente_nome', 'Cliente TESTE', 'usuario', u,
    'itens', jsonb_build_array(
      jsonb_build_object('item_id', 'TESTE-ITEM-1', 'nome', 'Central TESTE', 'tipo', 'produto', 'quantidade', 5, 'preco_unit', 200, 'custo_unit', 100),
      jsonb_build_object('nome', 'Programação TESTE', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 500))));
  p := (r ->> 'id')::uuid;
  insert into resultado values ('criar pedido: total = soma dos itens', (select valor_total = 1500 and custo_total is null from public.pedidos where id = p), 'custo nulo porque o serviço não tem custo');
  insert into resultado values ('criar de novo com a mesma chave não duplica', (public.pedido_criar(jsonb_build_object('chave', 'TESTE-FLUXO-1', 'cliente_nome', 'x', 'usuario', u, 'itens', jsonb_build_array(jsonb_build_object('nome','x','tipo','servico','quantidade',1,'preco_unit',1)))) ->> 'repetido')::boolean, '');

  begin perform public.pedido_confirmar(p, u); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado values ('confirmar sem parcelas é recusado', erro like '%parcelas%', erro);
  begin perform public.pedido_parcelas(p, '[{"vencimento":"2026-10-10","valor":500},{"vencimento":"2026-11-10","valor":900}]', u); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado values ('parcelas que não somam o total são recusadas', erro like '%diferente do total%', erro);
  perform public.pedido_parcelas(p, '[{"vencimento":"2026-10-10","valor":450},{"vencimento":"2026-11-10","valor":1050}]', u);

  r := public.pedido_confirmar(p, u);
  insert into resultado values ('confirmar reserva o disponível e aponta a falta', (r -> 'faltas' -> 0 ->> 'falta')::numeric = 2, r::text);
  select * into s from public.saldo_item('TESTE-ITEM-1');
  insert into resultado values ('saldo: físico 3, reservado 3', s.fisico = 3 and s.reservado = 3, s::text);

  begin perform public.pedido_entregar(p, u); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado values ('entregar sem estoque suficiente é recusado', erro like '%estoque insuficiente%', erro);

  insert into public.estoque_movimentos (item_id, tipo, quantidade, custo_unit, usuario) values ('TESTE-ITEM-1', 'entrada', 2, 110, u);
  r := public.pedido_reservar(p, u);
  insert into resultado values ('entrada nova completa a reserva', jsonb_array_length(r -> 'faltas') = 0, r::text);

  begin perform public.pedido_faturar(jsonb_build_object('pedido_id', p, 'tipo', 'NF-e', 'numero', '999', 'emitida_em', '2026-10-01', 'valor', 1500, 'usuario', u)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado values ('NF antes da entrega é recusada (pedido com produto)', erro like '%depois da entrega%', erro);

  perform public.pedido_entregar(p, u);
  select * into s from public.saldo_item('TESTE-ITEM-1');
  insert into resultado values ('entregar baixa o estoque e libera a reserva', s.fisico = 0 and s.reservado = 0, s::text);

  begin perform public.pedido_faturar(jsonb_build_object('pedido_id', p, 'tipo', 'NF-e', 'numero', '998', 'emitida_em', '2026-10-01', 'valor', 2000, 'usuario', u)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado values ('NF acima do valor do pedido é recusada', erro like '%acima do valor%', erro);
  perform public.pedido_faturar(jsonb_build_object('pedido_id', p, 'tipo', 'NF-e', 'numero', '997', 'emitida_em', '2026-10-01', 'valor', 1500, 'usuario', u));
  insert into resultado values ('NF do valor total fatura o pedido', (select estado = 'faturado' from public.pedidos where id = p), '');

  for parc in select id from public.parcelas where pedido_id = p order by numero loop
    perform public.parcela_receber(parc, '2026-10-10', 450, u);
    exit;
  end loop;
  insert into resultado values ('com parcela em aberto o pedido segue faturado', (select estado = 'faturado' from public.pedidos where id = p), '');
  select id into parc from public.parcelas where pedido_id = p and estado = 'aberta';
  perform public.parcela_receber(parc, '2026-11-10', 1050, u);
  insert into resultado values ('última parcela recebida conclui o pedido', (select estado = 'concluido' from public.pedidos where id = p), '');
  insert into resultado values ('histórico registra cada passo', (select count(*) >= 7 from public.pedidos_historico where pedido_id = p), (select string_agg(acao, ',' order by id) from public.pedidos_historico where pedido_id = p));

  begin delete from public.estoque_movimentos where item_id = 'TESTE-ITEM-1'; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado values ('movimentos de estoque não podem ser apagados', erro is not null, erro);
  select custo_medio into s from public.estoque_saldos where item_id = 'TESTE-ITEM-1';
  insert into resultado values ('custo médio das entradas (3x100 + 2x110)/5 = 104', s.custo_medio = 104, s::text);
end $$;

select passo, ok, detalhe from resultado;
rollback;
