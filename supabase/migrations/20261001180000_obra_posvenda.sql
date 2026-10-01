-- OBRA E POS-VENDA NO PEDIDO (P1): projeto do Zoho Projects ligado ao pedido (tarefas = checklist
-- de obra), horas lancadas (custo de mao de obra para a margem realizada), aceite da obra e prazo de
-- garantia. Prazo de garantia e custo/hora sao informados por quem lanca: o VEOS nao presume valores.
alter table public.pedidos add column projeto_zoho_id text, add column aceite_em date, add column garantia_ate date;

alter table public.pedido_anexos drop constraint if exists pedido_anexos_tipo_check;
alter table public.pedido_anexos add constraint pedido_anexos_tipo_check check (tipo in ('orcamento', 'proposta', 'contrato', 'aceite', 'outro'));

-- Horas de equipe no pedido (append-only; correcao = lancamento negativo com descricao).
create table public.pedido_horas (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos (id),
  data date not null,
  pessoa text not null check (length(pessoa) between 1 and 120),
  horas numeric(6, 2) not null check (horas <> 0 and horas between -24 and 24),
  custo_hora numeric(10, 2) check (custo_hora is null or custo_hora >= 0),
  descricao text,
  chave text unique,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  check (horas > 0 or coalesce(trim(descricao), '') <> '')
);
create trigger pedido_horas_imutavel before update or delete on public.pedido_horas for each row execute function public.recusar_alteracao();
alter table public.pedido_horas enable row level security;

create function public.pedido_vincular_projeto(p_pedido uuid, p_projeto text, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
declare v public.pedidos;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null then raise exception 'pedido inexistente'; end if;
  if v.estado = 'cancelado' then raise exception 'pedido cancelado'; end if;
  if p_projeto is not null and not exists (select 1 from public.zoho_registros where produto = 'projects' and modulo = 'projects' and zoho_id = p_projeto) then raise exception 'projeto nao encontrado no espelho do Zoho Projects'; end if;
  update public.pedidos set projeto_zoho_id = p_projeto, atualizado_em = now() where id = p_pedido;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario) values (p_pedido, 'projeto_vinculado', jsonb_build_object('de', v.projeto_zoho_id, 'para', p_projeto), p_usuario);
  return jsonb_build_object('ok', true);
end $$;

create function public.pedido_lancar_horas(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare v public.pedidos; v_id bigint;
begin
  select id into v_id from public.pedido_horas where chave = p ->> 'chave';
  if v_id is not null then return jsonb_build_object('id', v_id, 'repetido', true); end if;
  select * into v from public.pedidos where id = (p ->> 'pedido_id')::uuid;
  if v.id is null then raise exception 'pedido inexistente'; end if;
  if v.estado in ('rascunho', 'cancelado') then raise exception 'lance horas em pedido confirmado (estado atual: %)', v.estado; end if;
  if (p ->> 'data')::date > current_date then raise exception 'data das horas no futuro'; end if;
  insert into public.pedido_horas (pedido_id, data, pessoa, horas, custo_hora, descricao, chave, criado_por)
  values (v.id, (p ->> 'data')::date, trim(p ->> 'pessoa'), (p ->> 'horas')::numeric, nullif(p ->> 'custo_hora', '')::numeric, nullif(trim(coalesce(p ->> 'descricao', '')), ''), p ->> 'chave', (p ->> 'usuario')::uuid)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'repetido', false);
end $$;

-- Aceite da obra: so depois da entrega; garantia (opcional) nao pode terminar antes do aceite.
create function public.pedido_aceite(p_pedido uuid, p_data date, p_garantia_ate date, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
declare v public.pedidos;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null then raise exception 'pedido inexistente'; end if;
  if v.estado not in ('entregue', 'faturado', 'concluido') then raise exception 'o aceite vem depois da entrega (estado atual: %)', v.estado; end if;
  if p_data is null or p_data > current_date then raise exception 'data do aceite invalida'; end if;
  if v.entregue_em is not null and p_data < v.entregue_em::date then raise exception 'aceite antes da entrega'; end if;
  if p_garantia_ate is not null and p_garantia_ate <= p_data then raise exception 'a garantia precisa terminar depois do aceite'; end if;
  update public.pedidos set aceite_em = p_data, garantia_ate = p_garantia_ate, atualizado_em = now() where id = p_pedido;
  insert into public.pedidos_historico (pedido_id, acao, detalhe, usuario) values (p_pedido, 'aceite', jsonb_build_object('data', p_data, 'garantia_ate', p_garantia_ate, 'anterior', v.aceite_em), p_usuario);
  return jsonb_build_object('ok', true);
end $$;

do $$
declare f text;
begin
  foreach f in array array['pedido_vincular_projeto(uuid, text, uuid)', 'pedido_lancar_horas(jsonb)', 'pedido_aceite(uuid, date, date, uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
