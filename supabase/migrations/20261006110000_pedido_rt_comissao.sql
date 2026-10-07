-- RT E COMISSAO/INDICACAO DO PEDIDO viram contas a pagar automaticas (decisao do fundador, 06/10/2026):
-- RT de 10% em todos os pedidos; comissao/indicacao de 5% quando houver; pagas NA ASSINATURA (logo depois
-- da entrada do cliente). O pedido guarda os percentuais, os favorecidos e quando pagar (assinatura,
-- a cada parcela ou no fim) para poder mudar no futuro sem refazer nada. A conta nasce quando a parcela
-- e recebida (inclusive pela conciliacao do extrato) e entra no caixa do pedido (Politica V1.1).
alter table public.pedidos
  add column rt_pct numeric(5, 2) check (rt_pct is null or rt_pct between 0 and 50),
  add column comissao_pct numeric(5, 2) check (comissao_pct is null or comissao_pct between 0 and 50),
  add column rt_favorecido text check (rt_favorecido is null or length(rt_favorecido) between 1 and 200),
  add column comissao_favorecido text check (comissao_favorecido is null or length(comissao_favorecido) between 1 and 200),
  add column rt_quando text check (rt_quando is null or rt_quando in ('assinatura', 'parcelas', 'fim'));

/** Define RT/comissao do pedido. Recusa se o pedido foi cancelado/concluido ou se alguma conta de RT/comissao ja nasceu. */
create function public.pedido_definir_rt(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare x public.pedidos; v_id uuid := (p ->> 'pedido_id')::uuid;
begin
  select * into x from public.pedidos where id = v_id for update;
  if x.id is null then raise exception 'pedido inexistente'; end if;
  if x.estado in ('cancelado', 'concluido') then raise exception 'pedido %: RT/comissao nao muda', x.estado; end if;
  if exists (select 1 from public.contas_pagar where pedido_id = x.id and (chave like 'rt:%' or chave like 'comissao:%') and estado <> 'cancelada') then
    raise exception 'a conta de RT/comissao ja foi gerada: cancele-a em Contas a pagar antes de mudar';
  end if;
  update public.pedidos set
    rt_pct = coalesce(nullif(p ->> 'rt_pct', '')::numeric, 0), comissao_pct = coalesce(nullif(p ->> 'comissao_pct', '')::numeric, 0),
    rt_favorecido = nullif(trim(p ->> 'rt_favorecido'), ''), comissao_favorecido = nullif(trim(p ->> 'comissao_favorecido'), ''),
    rt_quando = coalesce(nullif(p ->> 'rt_quando', ''), 'assinatura'), atualizado_em = now()
  where id = x.id;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario)
  values (x.id, 'rt_definida', jsonb_build_object('rt_pct', p ->> 'rt_pct', 'comissao_pct', p ->> 'comissao_pct', 'rt_quando', coalesce(nullif(p ->> 'rt_quando', ''), 'assinatura')), (p ->> 'usuario')::uuid);
  return jsonb_build_object('ok', true);
end $$;

/** Gatilho: parcela recebida -> contas a pagar de RT e comissao conforme o momento definido no pedido. */
create function public.pedido_gerar_rt() returns trigger language plpgsql set search_path = '' as $$
declare x public.pedidos; t record; v_chave text; v_valor numeric(14, 2); v_conta uuid; v_falta integer;
begin
  if not (old.estado = 'aberta' and new.estado = 'recebida') then return new; end if;
  select * into x from public.pedidos where id = new.pedido_id;
  if x.id is null or x.rt_quando is null or x.estado = 'cancelado' then return new; end if;
  select count(*) into v_falta from public.parcelas where pedido_id = x.id and estado = 'aberta' and id <> new.id;
  for t in select * from (values ('rt', x.rt_pct, coalesce(x.rt_favorecido, 'Arquiteto (RT)'), '3.5', 'RT'),
                                 ('comissao', x.comissao_pct, coalesce(x.comissao_favorecido, 'Indicação/comissão'), '3.4', 'Comissão/indicação')) v(tipo, pct, favorecido, plano, rotulo)
  loop
    if coalesce(t.pct, 0) <= 0 then continue; end if;
    if x.rt_quando = 'parcelas' then
      v_chave := t.tipo || ':' || x.id || ':' || new.numero;
      v_valor := round(coalesce(new.valor_recebido, new.valor) * t.pct / 100, 2);
    elsif x.rt_quando = 'fim' and v_falta > 0 then
      continue;
    else
      v_chave := t.tipo || ':' || x.id;
      v_valor := round(x.valor_total * t.pct / 100, 2);
    end if;
    if v_valor <= 0 or exists (select 1 from public.contas_pagar where chave = v_chave) then continue; end if;
    insert into public.contas_pagar (chave, pedido_id, descricao, fornecedor, categoria, vencimento, valor, criado_por, plano_conta, competencia)
    values (v_chave, x.id, t.rotulo || ' ' || trim(to_char(t.pct, 'FM990D00')) || '% · ' || x.numero, t.favorecido, 'outro', coalesce(new.recebido_em, current_date), v_valor, x.criado_por, t.plano, to_char(coalesce(new.recebido_em, current_date), 'YYYY-MM'))
    returning id into v_conta;
    insert into public.compras_historico (conta_id, acao, detalhe, usuario) values (v_conta, 'conta_criada', jsonb_build_object('origem', 'pedido_rt', 'pedido', x.numero, 'pct', t.pct), x.criado_por);
    insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario) values (x.id, 'conta_rt_gerada', jsonb_build_object('tipo', t.tipo, 'valor', v_valor), x.criado_por);
  end loop;
  return new;
end $$;
create trigger parcelas_rt_comissao after update of estado on public.parcelas for each row execute function public.pedido_gerar_rt();

revoke execute on function public.pedido_definir_rt(jsonb) from public, anon, authenticated;
revoke execute on function public.pedido_gerar_rt() from public, anon, authenticated;
