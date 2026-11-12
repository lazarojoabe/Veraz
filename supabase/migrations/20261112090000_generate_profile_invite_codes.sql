-- PERFIS — todo novo usuário recebe um código de convite automaticamente.
--
-- O perfil é criado pelo gatilho `private.handle_new_user`, que não informa
-- `invite_code` explicitamente. Como a coluna é obrigatória, o default evita
-- que o cadastro no Supabase seja cancelado por violação de NOT NULL.
alter table public.profiles
  alter column invite_code
  set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
