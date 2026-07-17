-- Corrige a RPC criada pela migration 20260716_transferir_saldo_credito:
-- ela gravava em verbas depois que a tela passou a ler lancamentos_credito.

-- Recupera saldos que a RPC antiga ja transferiu para verbas, calculando o
-- valor real a partir do historico anterior para nao duplicar o PIX original.
insert into lancamentos_credito (usuario_id, mes, data_pix, valor, tipo, observacao, criado_por)
select
  v.usuario_id,
  v.mes,
  (v.mes || '-01')::date,
  greatest(0, coalesce(prev.total_credito, 0) - coalesce(prev.aprovado, 0)),
  'saldo_transferido',
  'Saldo transferido de ' || to_char((v.mes || '-01')::date - interval '1 month', 'YYYY-MM'),
  v.atualizado_por
from verbas v
left join lateral (
  select
    (select sum(l.valor) from lancamentos_credito l where l.usuario_id = v.usuario_id and l.mes = to_char((v.mes || '-01')::date - interval '1 month', 'YYYY-MM')) as total_credito,
    (select sum(d.valor) from despesas d where d.usuario_id = v.usuario_id and d.status = 'aprovado' and (d.ativo is null or d.ativo) and d.data_despesa >= ((v.mes || '-01')::date - interval '1 month')::date and d.data_despesa < (v.mes || '-01')::date) as aprovado
) prev on true
where v.saldo_transferido
  and greatest(0, coalesce(prev.total_credito, 0) - coalesce(prev.aprovado, 0)) > 0
  and not exists (
    select 1 from lancamentos_credito l
    where l.usuario_id = v.usuario_id and l.mes = v.mes and l.tipo = 'saldo_transferido'
  );

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

create or replace function public.transferir_saldo_credito_proprio(p_mes char(7))
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes_anterior char(7) := to_char((p_mes || '-01')::date - interval '1 month', 'YYYY-MM');
  v_ini_anterior date := (v_mes_anterior || '-01')::date;
  v_fim_anterior date := (date_trunc('month', v_ini_anterior) + interval '1 month - 1 day')::date;
  v_credito_anterior numeric;
  v_aprovado_anterior numeric;
  v_saldo numeric;
begin
  if auth.uid() is null then
    raise exception 'usuario nao autenticado';
  end if;

  if exists (
    select 1 from lancamentos_credito
    where usuario_id = auth.uid() and mes = p_mes and tipo = 'saldo_transferido'
  ) then
    return;
  end if;

  select coalesce(sum(valor), 0) into v_credito_anterior
  from lancamentos_credito
  where usuario_id = auth.uid() and mes = v_mes_anterior;

  select coalesce(sum(valor), 0) into v_aprovado_anterior
  from despesas
  where usuario_id = auth.uid()
    and status = 'aprovado'
    and (ativo is null or ativo)
    and data_despesa >= v_ini_anterior
    and data_despesa <= v_fim_anterior;

  v_saldo := greatest(0, v_credito_anterior - v_aprovado_anterior);
  if v_saldo > 0 then
    insert into lancamentos_credito (usuario_id, mes, data_pix, valor, tipo, observacao, criado_por)
    values (auth.uid(), p_mes, (p_mes || '-01')::date, v_saldo, 'saldo_transferido', 'Saldo transferido de ' || v_mes_anterior, auth.uid());
  end if;
end;
$$;

grant execute on function public.transferir_saldos_credito(char) to authenticated;
grant execute on function public.transferir_saldo_credito_proprio(char) to authenticated;
