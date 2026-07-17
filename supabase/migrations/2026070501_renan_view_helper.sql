-- A policy de creditos de 20260706 depende desta funcao; cria-la antes
-- evita que a ordem lexicografica das migrations deixe o push inconsistente.
create or replace function public.can_view_all_expenses_by_name()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and (
        lower(nome) like '%renan%'
        or lower(nome) like '%leandro%'
      )
  );
$$;
