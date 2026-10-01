-- Testes de COMPRAS E CONTAS A PAGAR. Dados TESTE isolados; tudo desfeito no fim.
-- Uso: npx supabase db query --linked -f tests/banco/compras.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare
  u uuid := '00000000-0000-0000-0000-0000000c0001'; ped uuid; c jsonb; c2 jsonb; r jsonb; k uuid; erro text; it text := 'TESTE-ITEM-COMPRA'; prev jsonb; m jsonb;
begin
  prev := public.caixa_previsao(current_date, current_date);
  -- pedido confirmado precisando de 5 unidades sem estoque
  insert into public.pedidos (chave, cliente_nome, estado, valor_total, custo_total, criado_por, confirmado_em) values ('TESTE-COMPRA-PED', 'Cliente TESTE', 'confirmado', 5000, 2500, u, now()) returning id into ped;
  insert into public.pedido_itens (pedido_id, ordem, item_id, nome, tipo, quantidade, preco_unit, custo_unit) values (ped, 1, it, 'Central TESTE', 'produto', 5, 1000, 500);

  begin perform public.compra_criar(jsonb_build_object('chave', 'TESTE-C0', 'usuario', u, 'fornecedor_nome', 'Fornecedor TESTE', 'itens', jsonb_build_array(jsonb_build_object('item_id', it, 'nome', 'Central TESTE', 'quantidade', 5, 'custo_unit', 480)), 'parcelas', '[]'::jsonb)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('1. compra sem parcelas é recusada', erro like '%parcelas%', erro);
  begin perform public.compra_criar(jsonb_build_object('chave', 'TESTE-C0', 'usuario', u, 'fornecedor_nome', 'Fornecedor TESTE', 'itens', jsonb_build_array(jsonb_build_object('item_id', it, 'nome', 'Central TESTE', 'quantidade', 5, 'custo_unit', 480)), 'parcelas', jsonb_build_array(jsonb_build_object('vencimento', current_date, 'valor', 1000)))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('2. parcelas que não somam o total são recusadas', erro like '%devem somar%', erro);

  c := public.compra_criar(jsonb_build_object('chave', 'TESTE-C1', 'usuario', u, 'fornecedor_nome', 'Fornecedor TESTE', 'pedido_id', ped, 'previsao_entrega', current_date + 5,
    'itens', jsonb_build_array(jsonb_build_object('item_id', it, 'nome', 'Central TESTE', 'quantidade', 5, 'custo_unit', 480)),
    'parcelas', jsonb_build_array(jsonb_build_object('vencimento', current_date, 'valor', 1200), jsonb_build_object('vencimento', current_date + 40, 'valor', 1200))));
  c2 := public.compra_criar(jsonb_build_object('chave', 'TESTE-C1', 'usuario', u, 'fornecedor_nome', 'outro', 'itens', '[]'::jsonb, 'parcelas', '[]'::jsonb));
  insert into resultado (passo, ok, detalhe) values ('3. compra criada com total 2.400 e 2 contas a pagar ligadas ao pedido; repetir a chave não duplica',
    (c ->> 'total')::numeric = 2400 and (c2 ->> 'repetido')::boolean and (c2 ->> 'id') = (c ->> 'id')
    and (select count(*) = 2 and bool_and(pedido_id = ped and categoria = 'compra' and estado = 'aberta') from public.contas_pagar where compra_id = (c ->> 'id')::uuid), c::text);
  insert into resultado (passo, ok, detalhe) values ('4. falta do pedido aparece como já em compra',
    exists (select 1 from public.fluxo_faltas_compra() where pedido_id = ped and falta = 5 and em_compra = 5 and compras like 'COM-%'), null);

  r := public.compra_receber(jsonb_build_object('compra_id', c ->> 'id', 'usuario', u, 'chave', 'TESTE-R1', 'itens', jsonb_build_array(jsonb_build_object('ordem', 1, 'quantidade', 3))));
  insert into resultado (passo, ok, detalhe) values ('5. recebimento parcial: entrada no estoque pelo custo da compra, compra parcial',
    r ->> 'estado' = 'parcial' and (select fisico = 3 and custo_medio = 480 from public.estoque_saldos where item_id = it), r::text);
  begin perform public.compra_receber(jsonb_build_object('compra_id', c ->> 'id', 'usuario', u, 'chave', 'TESTE-R2', 'itens', jsonb_build_array(jsonb_build_object('ordem', 1, 'quantidade', 3)))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('6. receber mais que o comprado é recusado', erro like '%faltam so%', erro);
  r := public.compra_receber(jsonb_build_object('compra_id', c ->> 'id', 'usuario', u, 'chave', 'TESTE-R1', 'itens', jsonb_build_array(jsonb_build_object('ordem', 1, 'quantidade', 3))));
  insert into resultado (passo, ok, detalhe) values ('7. repetir o mesmo recebimento não duplica a entrada', (r ->> 'repetido')::boolean and (select fisico = 3 from public.estoque_saldos where item_id = it), r::text);
  r := public.compra_receber(jsonb_build_object('compra_id', c ->> 'id', 'usuario', u, 'chave', 'TESTE-R3', 'itens', jsonb_build_array(jsonb_build_object('ordem', 1, 'quantidade', 2))));
  perform public.pedido_reservar(ped, u);
  insert into resultado (passo, ok, detalhe) values ('8. recebimento completo: compra recebida e a reserva do pedido se completa',
    r ->> 'estado' = 'recebida' and public.reservado_pedido(ped, it) = 5 and not exists (select 1 from public.fluxo_faltas() where pedido_id = ped), r::text);
  begin perform public.compra_cancelar((c ->> 'id')::uuid, u, 'TESTE'); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('9. compra recebida não pode ser cancelada', erro like '%so compra aberta%', erro);

  c2 := public.compra_criar(jsonb_build_object('chave', 'TESTE-C2', 'usuario', u, 'fornecedor_nome', 'Fornecedor TESTE', 'itens', jsonb_build_array(jsonb_build_object('item_id', it, 'nome', 'Central TESTE', 'quantidade', 1, 'custo_unit', 100)), 'parcelas', jsonb_build_array(jsonb_build_object('vencimento', current_date + 10, 'valor', 100))));
  begin perform public.compra_cancelar((c2 ->> 'id')::uuid, u, ' '); erro := null; exception when others then erro := sqlerrm; end;
  perform public.compra_cancelar((c2 ->> 'id')::uuid, u, 'TESTE desistência');
  insert into resultado (passo, ok, detalhe) values ('10. cancelar exige motivo e cancela as contas abertas da compra',
    erro like '%motivo%' and (select bool_and(estado = 'cancelada') from public.contas_pagar where compra_id = (c2 ->> 'id')::uuid), erro);

  begin perform public.conta_pagar_criar(jsonb_build_object('chave', 'TESTE-K0', 'usuario', u, 'descricao', 'x', 'fornecedor', 'y', 'categoria', 'compra', 'vencimento', current_date, 'valor', 10)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('11. conta avulsa não pode ser da categoria compra', erro like '%nasce da compra%', erro);
  k := (public.conta_pagar_criar(jsonb_build_object('chave', 'TESTE-K1', 'usuario', u, 'descricao', 'Frete TESTE', 'fornecedor', 'Transportadora TESTE', 'categoria', 'frete', 'vencimento', current_date, 'valor', 150, 'pedido_id', ped)) ->> 'id')::uuid;
  begin perform public.conta_pagar_pagar(k, current_date + 1, 150, u); erro := null; exception when others then erro := sqlerrm; end;
  r := public.conta_pagar_pagar(k, current_date, 150, u);
  insert into resultado (passo, ok, detalhe) values ('12. pagamento com data futura recusado; pagar registra e repetir não duplica',
    erro like '%futuro%' and r ->> 'estado' = 'paga' and (public.conta_pagar_pagar(k, current_date, 150, u) ->> 'repetido')::boolean, erro);
  begin perform public.conta_pagar_cancelar(k, u, 'x'); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('13. conta paga não pode ser cancelada', erro like '%so conta aberta%', erro);

  m := public.caixa_previsao(current_date, current_date) -> 'meses' -> 0;
  insert into resultado (passo, ok, detalhe) values ('14. previsão de caixa do mês: saída prevista (parcela 1.200 da compra) e realizada (frete 150)',
    (m ->> 'saidas_previstas')::numeric - (prev -> 'meses' -> 0 ->> 'saidas_previstas')::numeric = 1200
    and (m ->> 'saidas_realizadas')::numeric - (prev -> 'meses' -> 0 ->> 'saidas_realizadas')::numeric = 150, m::text);
  begin update public.compras_historico set acao = 'x' where compra_id = (c ->> 'id')::uuid; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('15. histórico de compras não pode ser alterado', erro is not null, erro);
  insert into resultado (passo, ok, detalhe) values ('16. só o servidor executa', not has_function_privilege('authenticated', 'public.compra_criar(jsonb)', 'execute') and not has_function_privilege('anon', 'public.caixa_previsao(date, date)', 'execute'), null);
end $$;

select n, passo, ok, left(detalhe, 160) as detalhe from resultado order by n;
rollback;
