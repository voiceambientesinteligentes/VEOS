-- Liga autoridades e historico ao cadastro de membros (para a tela mostrar nomes).
alter table public.governanca_autoridades add constraint governanca_autoridades_membro_fk foreign key (user_id) references public.membros (user_id);
alter table public.biblioteca_historico add constraint biblioteca_historico_membro_fk foreign key (usuario) references public.membros (user_id);
