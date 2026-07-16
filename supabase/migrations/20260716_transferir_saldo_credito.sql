-- Transfere automaticamente o saldo de credito PIX nao usado de um mes para o
-- mes seguinte, evitando que casos como o do Bernardo (credito de junho
-- sumindo em julho) se repitam. Idempotente: marca saldo_transferido para
-- nao somar de novo se a tela do financeiro for recarregada.

alter table verbas add column if not exists saldo_transferido boolean not null default false;

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
    select usuario_id, valor as verba_anterior
    from verbas
    where mes = v_mes_anterior and valor > 0
  loop
    if exists (
      select 1 from verbas
      where usuario_id = r.usuario_id and mes = p_mes and saldo_transferido
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

    insert into verbas (usuario_id, mes, valor, saldo_transferido, atualizado_por)
    values (r.usuario_id, p_mes, v_saldo, true, auth.uid())
    on conflict (usuario_id, mes) do update
      set valor = verbas.valor + v_saldo,
          saldo_transferido = true,
          atualizado_por = auth.uid()
      where not verbas.saldo_transferido;
  end loop;
end;
$$;

grant execute on function public.transferir_saldos_credito(char) to authenticated;
