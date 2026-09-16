-- Apagar conta que se repete: "só deste mês" ou "deste mês em diante".
--
-- Só deste mês: apaga a conta do mês (o app faz direto; recurrence_runs impede que volte).
-- Deste mês em diante: desliga a recorrência e apaga as contas ainda não pagas dela a partir
-- desse mês, inclusive as que já tinham sido lançadas em meses futuros. As já pagas ficam,
-- porque são dinheiro que saiu de verdade.

create function public.stop_recurring(p_expense uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_room uuid;
  v_recurrence uuid;
  v_month date;
  v_removed integer;
begin
  select room_id, recurrence_id, month
  into v_room, v_recurrence, v_month
  from public.expenses
  where id = p_expense;

  if v_room is null then
    raise exception 'conta não encontrada' using errcode = 'P0002';
  end if;
  if not public.is_room_member(v_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_recurrence is null then
    raise exception 'essa conta não se repete' using errcode = '22023';
  end if;

  update public.recurrences set active = false where id = v_recurrence;

  delete from public.expenses
  where recurrence_id = v_recurrence
    and month >= v_month
    and (status = 'pendente' or id = p_expense);

  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

revoke execute on function public.stop_recurring(uuid) from public, anon;
grant execute on function public.stop_recurring(uuid) to authenticated;
