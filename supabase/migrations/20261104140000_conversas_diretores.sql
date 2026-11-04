-- CONVERSAS COM OS DIRETORES (04/11/2026): a pergunta pode continuar uma conversa. A primeira pergunta
-- abre a conversa (conversa_id nulo); as seguintes apontam para ela. O motor de IA le as trocas anteriores
-- da mesma conversa antes de responder. Historico continua imutavel (respostas append-only).
alter table public.perguntas_diretores add column conversa_id uuid references public.perguntas_diretores (id);
create index perguntas_diretores_conversa on public.perguntas_diretores (conversa_id, criada_em);
alter table public.perguntas_diretores add constraint perguntas_diretores_conversa_raiz check (conversa_id is null or conversa_id <> id);
