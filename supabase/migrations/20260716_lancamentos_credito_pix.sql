-- Substitui o campo unico "verbas.valor" por um historico de lancamentos de
-- credito PIX (um por adiantamento), permitindo mais de um PIX por mes com
-- rastro pra prestar contas depois. Ver docs/superpowers/specs/2026-07-16-lancamentos-credito-pix-design.md

create table if not exists lancamentos_credito (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  mes           char(7) not null,
  data_pix      date not null,
  valor         numeric(10,2) not null check (valor > 0),
  tipo          text not null check (tipo in ('pix','saldo_transferido')),
  observacao    text,
  criado_por    uuid references auth.users(id),
  criado_em     timestamptz not null default now()
);

alter table lancamentos_credito enable row level security;

create policy "lancamentos_credito_select" on lancamentos_credito for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
    )
  );

create policy "lancamentos_credito_insert" on lancamentos_credito for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
    )
  );

create policy "lancamentos_credito_delete" on lancamentos_credito for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
    )
  );

-- Migra os dados existentes de verbas (um lancamento por linha).
insert into lancamentos_credito (usuario_id, mes, data_pix, valor, tipo, criado_por, criado_em)
select
  usuario_id,
  mes,
  coalesce(atualizado_em::date, (mes || '-01')::date),
  valor,
  case when saldo_transferido then 'saldo_transferido' else 'pix' end,
  atualizado_por,
  coalesce(atualizado_em, now())
from verbas
where valor > 0;

create or replace function public.transferir_saldos_credito(p_mes char(7))
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes_anterior char(7) := to_char((p_mes || '-01')::date - interval '1 month', 'YYYY-MM');
  v_ini_anterior date := (v_mes_anterior || '-01')::date;
  v_fim_anterior date := (date_trunc('month', v_ini_anterior) + interval '1 month - 1 day')::date;
  r record;
  v_aprovado_anterior numeric;
  v_saldo numeric;
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
  ) then
    raise exception 'sem permissao para transferir saldos de credito';
  end if;

  for r in
    select usuario_id, sum(valor) as verba_anterior
    from lancamentos_credito
    where mes = v_mes_anterior
    group by usuario_id
    having sum(valor) > 0
  loop
    if exists (
      select 1 from lancamentos_credito
      where usuario_id = r.usuario_id and mes = p_mes and tipo = 'saldo_transferido'
    ) then
      continue;
    end if;

    select coalesce(sum(valor), 0) into v_aprovado_anterior
    from despesas
    where usuario_id = r.usuario_id
      and status = 'aprovado'
      and (ativo is null or ativo)
      and data_despesa >= v_ini_anterior
      and data_despesa <= v_fim_anterior;

    v_saldo := greatest(0, r.verba_anterior - v_aprovado_anterior);
    if v_saldo <= 0 then
      continue;
    end if;

    insert into lancamentos_credito (usuario_id, mes, data_pix, valor, tipo, observacao, criado_por)
    values (r.usuario_id, p_mes, (p_mes || '-01')::date, v_saldo, 'saldo_transferido', 'Saldo transferido de ' || v_mes_anterior, auth.uid());
  end loop;
end;
$$;

grant execute on function public.transferir_saldos_credito(char) to authenticated;
