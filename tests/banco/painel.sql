-- Testes do PAINEL EXECUTIVO (agregados). Dados TESTE isolados; tudo desfeito no fim.
-- Uso: npx supabase db query --linked -f tests/banco/painel.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare u uuid := '00000000-0000-0000-0000-0000000d0001'; p1 uuid; p2 uuid; antes jsonb; r jsonb; mes text := to_char(now(), 'YYYY-MM'); m jsonb;
begin
  antes := public.painel_executivo(12);
  insert into resultado (passo, ok, detalhe) values ('1. 12 meses em ordem, terminando no mês atual',
    jsonb_array_length(antes -> 'meses') = 12 and antes -> 'meses' -> 11 ->> 'mes' = mes and antes -> 'meses' -> 0 ->> 'mes' < mes, null);

  insert into public.pedidos (chave, cliente_nome, estado, valor_total, custo_total, criado_por) values ('TESTE-PAINEL-1', 'Cliente TESTE', 'entregue', 10000, 6000, u) returning id into p1;
  insert into public.pedidos (chave, cliente_nome, estado, valor_total, custo_total, criado_por) values ('TESTE-PAINEL-2', 'Cliente TESTE', 'cancelado', 50000, 1000, u) returning id into p2;
  insert into public.parcelas (pedido_id, numero, vencimento, valor, estado, recebido_em, valor_recebido) values
    (p1, 1, current_date, 4000, 'recebida', current_date, 4000), (p1, 2, current_date + 1, 6000, 'aberta', null, null), (p2, 1, current_date, 50000, 'aberta', null, null);
  insert into public.notas_fiscais (pedido_id, tipo, numero, emitida_em, valor, registrada_por) values (p1, 'NF-e', 'TESTE9001', current_date, 10000, u), (p2, 'NF-e', 'TESTE9002', current_date, 50000, u);
  r := public.painel_executivo(12);
  m := r -> 'meses' -> 11;
  insert into resultado (passo, ok, detalhe) values ('2. NF do mês soma só pedidos não cancelados',
    coalesce((m ->> 'nf_total')::numeric, 0) - coalesce((antes -> 'meses' -> 11 ->> 'nf_total')::numeric, 0) = 10000, m::text);
  insert into resultado (passo, ok, detalhe) values ('3. caixa previsto x recebido no mês (cancelado fora)',
    coalesce((m ->> 'caixa_recebido')::numeric, 0) - coalesce((antes -> 'meses' -> 11 ->> 'caixa_recebido')::numeric, 0) = 4000
    and coalesce((m ->> 'caixa_previsto')::numeric, 0) - coalesce((antes -> 'meses' -> 11 ->> 'caixa_previsto')::numeric, 0) = 10000, m::text);
  insert into resultado (passo, ok, detalhe) values ('4. margem bruta orçada = (valor - custo) / valor dos pedidos não cancelados',
    (r -> 'pedidos' ->> 'margem_bruta_orcada_pct')::numeric = round(100 * ((r -> 'pedidos' ->> 'valor')::numeric - (r -> 'pedidos' ->> 'custo')::numeric) / (r -> 'pedidos' ->> 'valor')::numeric, 2)
    and (r -> 'pedidos' ->> 'qtd')::int = coalesce((antes -> 'pedidos' ->> 'qtd')::int, 0) + 1, (r -> 'pedidos')::text);
  insert into resultado (passo, ok, detalhe) values ('5. a receber em aberto inclui a parcela aberta do pedido ativo',
    coalesce((r -> 'a_receber' ->> 'aberto')::numeric, 0) - coalesce((antes -> 'a_receber' ->> 'aberto')::numeric, 0) = 6000, (r -> 'a_receber')::text);
  insert into resultado (passo, ok, detalhe) values ('6. sem faturas no Zoho Books: sinalizado (lacuna, não zero)',
    (r ->> 'tem_faturas_zoho')::boolean = exists (select 1 from public.zoho_registros where produto = 'books' and modulo = 'invoices' and not excluido) and (r ->> 'tem_nf')::boolean, null);
  insert into resultado (passo, ok, detalhe) values ('7. funil do CRM e orçamentos por situação vêm do espelho',
    jsonb_typeof(r -> 'funil_crm') = 'array' and jsonb_typeof(r -> 'orcamentos') = 'array', left((r -> 'funil_crm')::text, 150));
  insert into resultado (passo, ok, detalhe) values ('8. só o servidor executa', not has_function_privilege('authenticated', 'public.painel_executivo(int, timestamptz)', 'execute'), null);
end $$;

select n, passo, ok, left(detalhe, 200) as detalhe from resultado order by n;
rollback;
