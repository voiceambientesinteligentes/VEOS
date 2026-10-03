-- Formulario do CFO: secao "metas" (metas numericas aprovadas pelo fundador para o painel).
alter table public.formulario_respostas drop constraint formulario_respostas_secao_check;
alter table public.formulario_respostas add constraint formulario_respostas_secao_check
  check (secao in ('impostos', 'compras', 'equipe', 'tempos', 'voce', 'fixos', 'vendas', 'dividas', 'pedidos', 'metas'));
