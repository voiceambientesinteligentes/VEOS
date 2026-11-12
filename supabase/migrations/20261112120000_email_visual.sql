-- E-MAIL COM O VISUAL DA VOICE (12/11/2026): o 1o e-mail de teste chegou so em texto e no lixo eletronico; o
-- Fernando pediu um e-mail que converta. O envio pela Brevo passa a montar o HTML com logotipo, cartoes de produto
-- com foto, botao do WhatsApp e assinatura (apps/web/js/domain/email_visual.js).
--   1. mensagens_saida.produtos: ate 3 produtos do catalogo em destaque no e-mail [{codigo, titulo?, destaque?}].
--   2. bucket PUBLICO "vitrine": o leitor de e-mail do cliente abre a foto sem login. So entra a foto do produto
--      que vai num e-mail (copiada do bucket privado "produtos" no envio); o catalogo continua privado. Sem politica
--      de leitura em storage.objects: ninguem lista o bucket, so abre o endereco exato. Gravacao so pelo servidor.

alter table public.mensagens_saida add column if not exists produtos jsonb
  check (produtos is null or (jsonb_typeof(produtos) = 'array' and jsonb_array_length(produtos) between 1 and 3));
comment on column public.mensagens_saida.produtos is 'Produtos do catalogo em destaque no e-mail: [{codigo, titulo?, destaque?}] (ate 3). O envio pela Brevo poe cartao com foto, nome e frase.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vitrine', 'vitrine', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
