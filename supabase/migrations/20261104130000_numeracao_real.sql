-- NUMERACAO REAL COMECA DO 1 (04/11/2026): clientes (CLI-), orcamentos (ORV-), pedidos (PED-) e
-- compras (COM-) criados por usuarios de teste (e-mail no dominio reservado .invalid: robos dos testes
-- online e usuarios simulados dos testes de banco) recebem uma serie propria com "T" (CLI-T00001), e
-- nao consomem mais a numeracao da empresa. Os registros de teste ja existentes sao renomeados e as
-- sequencias reais voltam ao proximo numero livre (1 enquanto nao houver dado real).

create function public.eh_usuario_teste(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  -- usuario inexistente (id simulado nos testes de banco) tambem e teste: quem cria de verdade sempre existe no Auth
  select coalesce((select email like '%.invalid' from auth.users where id = u), true)
$$;
revoke execute on function public.eh_usuario_teste(uuid) from public, anon, authenticated;

create sequence public.cliente_codigo_teste_seq;
create sequence public.comercial_orcamento_numero_teste_seq;
create sequence public.pedido_numero_teste_seq;
create sequence public.compra_numero_teste_seq;

-- argumentos: coluna, prefixo, sequencia real (a de teste e <sequencia>_teste_seq)
create function public.numerar() returns trigger
language plpgsql set search_path = '' as $$
declare
  col text := tg_argv[0]; pre text := tg_argv[1]; seq text := tg_argv[2];
  teste boolean := public.eh_usuario_teste(new.criado_por);
begin
  if (to_jsonb(new) ->> col) is not null then return new; end if;
  new := jsonb_populate_record(new, jsonb_build_object(col,
    pre || case when teste then 'T' else '' end || lpad(nextval(('public.' || seq || case when teste then '_teste_seq' else '_seq' end)::regclass)::text, 5, '0')));
  return new;
end $$;

alter table public.clientes alter column codigo drop default;
alter table public.comercial_orcamentos alter column numero drop default;
alter table public.pedidos alter column numero drop default;
alter table public.compras alter column numero drop default;
create trigger clientes_numerar before insert on public.clientes for each row execute function public.numerar('codigo', 'CLI-', 'cliente_codigo');
create trigger comercial_orcamentos_numerar before insert on public.comercial_orcamentos for each row execute function public.numerar('numero', 'ORV-', 'comercial_orcamento_numero');
create trigger pedidos_numerar before insert on public.pedidos for each row execute function public.numerar('numero', 'PED-', 'pedido_numero');
create trigger compras_numerar before insert on public.compras for each row execute function public.numerar('numero', 'COM-', 'compra_numero');

-- dados de teste ja gravados: passam para a serie T (mesmo numero) e liberam a serie real
update public.pedidos p set orcamento_numero = 'ORV-T' || substr(p.orcamento_numero, 5)
  where p.orcamento_numero like 'ORV-%' and p.orcamento_numero not like 'ORV-T%' and public.eh_usuario_teste(p.criado_por);
update public.clientes set codigo = 'CLI-T' || substr(codigo, 5) where codigo not like 'CLI-T%' and public.eh_usuario_teste(criado_por);
update public.comercial_orcamentos set numero = 'ORV-T' || substr(numero, 5) where numero not like 'ORV-T%' and public.eh_usuario_teste(criado_por);
update public.pedidos set numero = 'PED-T' || substr(numero, 5) where numero not like 'PED-T%' and public.eh_usuario_teste(criado_por);
update public.compras set numero = 'COM-T' || substr(numero, 5) where numero not like 'COM-T%' and public.eh_usuario_teste(criado_por);

do $$
declare r record; m integer;
begin
  for r in select * from (values ('clientes', 'codigo', 'cliente_codigo'), ('comercial_orcamentos', 'numero', 'comercial_orcamento_numero'), ('pedidos', 'numero', 'pedido_numero'), ('compras', 'numero', 'compra_numero')) v(t, c, s) loop
    execute format('select coalesce(max(substr(%I, 5)::integer), 0) from public.%I where %I ~ ''^[A-Z]{3}-[0-9]+$''', r.c, r.t, r.c) into m;
    perform setval(('public.' || r.s || '_seq')::regclass, greatest(m, 1), m > 0);
    execute format('select coalesce(max(substr(%I, 6)::integer), 0) from public.%I where %I ~ ''^[A-Z]{3}-T[0-9]+$''', r.c, r.t, r.c) into m;
    perform setval(('public.' || r.s || '_teste_seq')::regclass, greatest(m, 1), m > 0);
  end loop;
end $$;
