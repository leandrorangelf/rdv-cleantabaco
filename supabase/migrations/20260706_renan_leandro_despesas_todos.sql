-- Permite que os logins Renan e Leandro consultem despesas de todos os funcionarios.
-- A permissao e somente leitura; edicao/aprovacao continuam nas policies existentes.
drop policy if exists "despesas_select_renan_leandro_todos" on despesas;
drop policy if exists "profiles_select_renan_leandro_todos" on profiles;

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

create policy "despesas_select_renan_leandro_todos" on despesas
for select
using (public.can_view_all_expenses_by_name());

create policy "profiles_select_renan_leandro_todos" on profiles
for select
using (public.can_view_all_expenses_by_name());
