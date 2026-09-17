-- Sincronia sem sinal e edição.
--
-- Sem sinal, o app guarda as alterações e reenvia quando a conexão volta. Pode acontecer de
-- algo ter chegado ao servidor mas a resposta não ter voltado; aí o app manda de novo. Por
-- isso tudo aqui pode ser repetido sem efeito colateral: repetir dá o mesmo resultado.

-- Coração com o valor final ("quero" / "não quero") em vez de "alternar":
-- reenviar não desfaz o toque.
create function public.set_want(p_wish uuid, p_person text, p_want boolean)
returns text[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_room uuid;
  v_wanted text[];
begin
  select room_id into v_room from public.wishes where id = p_wish;
  if v_room is null then
    return null; -- desejo apagado enquanto a alteração esperava sinal: nada a fazer
  end if;
  if not public.is_room_member(v_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.wishes
  set wanted_by = case
        when p_want and not (p_person = any (wanted_by)) then array_append(wanted_by, p_person)
        when not p_want then array_remove(wanted_by, p_person)
        else wanted_by
      end
  where id = p_wish
  returning wanted_by into v_wanted;

  return v_wanted;
end;
$$;

-- Conta que se repete com ids escolhidos pelo app: reenviar não cria outra recorrência.
create function public.create_recurring_with_ids(
  p_room uuid,
  p_recurrence uuid,
  p_expense uuid,
  p_title text,
  p_amount integer,
  p_due_day smallint,
  p_split text,
  p_person text,
  p_month date
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
begin
  if not public.is_room_member(p_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.recurrences (id, room_id, title, amount_cents, due_day, split, created_by)
  values (p_recurrence, p_room, p_title, coalesce(p_amount, 0), p_due_day, coalesce(p_split, 'meio'), p_person)
  on conflict (id) do nothing;

  insert into public.recurrence_runs (recurrence_id, month)
  values (p_recurrence, v_month)
  on conflict do nothing;

  insert into public.expenses
    (id, room_id, title, amount_cents, month, due_day, split, recurrence_id, created_by)
  values (p_expense, p_room, p_title, coalesce(p_amount, 0), v_month, p_due_day,
          coalesce(p_split, 'meio'), p_recurrence, p_person)
  on conflict (id) do nothing;

  return p_expense;
end;
$$;

-- Editar conta que se repete "deste mês em diante": muda o modelo e as contas pendentes
-- dela a partir desse mês (inclusive as já lançadas em meses futuros). Pagas não mudam.
create function public.update_recurring(
  p_expense uuid,
  p_title text,
  p_amount integer,
  p_due_day smallint
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room uuid;
  v_recurrence uuid;
  v_month date;
begin
  select room_id, recurrence_id, month into v_room, v_recurrence, v_month
  from public.expenses where id = p_expense;

  if v_room is null then
    return; -- conta apagada enquanto esperava sinal
  end if;
  if not public.is_room_member(v_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_recurrence is null then
    raise exception 'essa conta não se repete' using errcode = '22023';
  end if;

  update public.recurrences
  set title = p_title, amount_cents = p_amount, due_day = p_due_day
  where id = v_recurrence;

  update public.expenses
  set title = p_title, amount_cents = p_amount, due_day = p_due_day
  where recurrence_id = v_recurrence
    and month >= v_month
    and (status = 'pendente' or id = p_expense);
end;
$$;

-- Parar recorrência também pode ser repetido: se a conta já sumiu, não há o que fazer.
create or replace function public.stop_recurring(p_expense uuid)
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
    return 0;
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

revoke execute on function public.set_want(uuid, text, boolean) from public, anon;
revoke execute on function public.create_recurring_with_ids(uuid, uuid, uuid, text, integer, smallint, text, text, date) from public, anon;
revoke execute on function public.update_recurring(uuid, text, integer, smallint) from public, anon;
grant execute on function public.set_want(uuid, text, boolean) to authenticated;
grant execute on function public.create_recurring_with_ids(uuid, uuid, uuid, text, integer, smallint, text, text, date) to authenticated;
grant execute on function public.update_recurring(uuid, text, integer, smallint) to authenticated;
