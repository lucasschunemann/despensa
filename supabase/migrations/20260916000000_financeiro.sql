-- Módulo financeiro: contas do mês, recorrentes e acerto entre os dois.
-- Valores sempre em centavos (inteiro), para não existir erro de arredondamento.

create type public.expense_status as enum ('pendente', 'pago');

-- Quem é responsável pela conta: dividida ao meio ou de uma pessoa só.
-- Os nomes seguem public.items.added_by (texto livre, sem tabela de usuários).
create table public.recurrences (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  title        text not null check (length(btrim(title)) > 0),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  due_day      smallint check (due_day between 1 and 31),
  split        text not null default 'meio',
  active       boolean not null default true,
  created_by   text not null,
  created_at   timestamptz not null default now()
);

create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms (id) on delete cascade,
  title         text not null check (length(btrim(title)) > 0),
  amount_cents  integer not null default 0 check (amount_cents >= 0),
  month         date not null,
  due_day       smallint check (due_day between 1 and 31),
  split         text not null default 'meio',
  status        public.expense_status not null default 'pendente',
  paid_by       text,
  paid_at       timestamptz,
  settled       boolean not null default false,
  recurrence_id uuid references public.recurrences (id) on delete set null,
  created_by    text not null,
  created_at    timestamptz not null default now()
);

-- Marca que um mês já foi gerado para uma recorrência: se a pessoa apagar a conta
-- do mês, ela não volta sozinha na próxima vez que abrir o mês.
create table public.recurrence_runs (
  recurrence_id uuid not null references public.recurrences (id) on delete cascade,
  month         date not null,
  primary key (recurrence_id, month)
);

create index expenses_room_month_idx on public.expenses (room_id, month);

alter table public.recurrences enable row level security;
alter table public.expenses enable row level security;
alter table public.recurrence_runs enable row level security;

create policy "membros leem recorrências" on public.recurrences
  for select to authenticated using (public.is_room_member(room_id));
create policy "membros criam recorrências" on public.recurrences
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "membros editam recorrências" on public.recurrences
  for update to authenticated using (public.is_room_member(room_id))
  with check (public.is_room_member(room_id));
create policy "membros removem recorrências" on public.recurrences
  for delete to authenticated using (public.is_room_member(room_id));

create policy "membros leem contas" on public.expenses
  for select to authenticated using (public.is_room_member(room_id));
create policy "membros criam contas" on public.expenses
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "membros editam contas" on public.expenses
  for update to authenticated using (public.is_room_member(room_id))
  with check (public.is_room_member(room_id));
create policy "membros removem contas" on public.expenses
  for delete to authenticated using (public.is_room_member(room_id));

-- recurrence_runs é só controle interno: escrito pelas funções, nunca direto pelo app
create policy "membros leem geração" on public.recurrence_runs
  for select to authenticated using (
    exists (
      select 1 from public.recurrences r
      where r.id = recurrence_id and public.is_room_member(r.room_id)
    )
  );

alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.recurrences;

-- Cria as contas do mês a partir das recorrências ativas, uma única vez por mês.
create function public.ensure_month(p_room uuid, p_month date)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
begin
  if not public.is_room_member(p_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with novas as (
    insert into public.recurrence_runs (recurrence_id, month)
    select r.id, v_month
    from public.recurrences r
    where r.room_id = p_room
      and r.active
      and date_trunc('month', r.created_at)::date <= v_month
    on conflict do nothing
    returning recurrence_id
  )
  insert into public.expenses
    (room_id, title, amount_cents, month, due_day, split, recurrence_id, created_by)
  select r.room_id, r.title, r.amount_cents, v_month, r.due_day, r.split, r.id, r.created_by
  from novas n
  join public.recurrences r on r.id = n.recurrence_id;
end;
$$;

-- Cria uma conta que se repete todo mês e já lança a do mês atual.
create function public.create_recurring(
  p_room uuid,
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
  v_recurrence uuid;
  v_expense uuid;
begin
  if not public.is_room_member(p_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.recurrences (room_id, title, amount_cents, due_day, split, created_by)
  values (p_room, p_title, coalesce(p_amount, 0), p_due_day, coalesce(p_split, 'meio'), p_person)
  returning id into v_recurrence;

  insert into public.recurrence_runs (recurrence_id, month) values (v_recurrence, v_month);

  insert into public.expenses
    (room_id, title, amount_cents, month, due_day, split, recurrence_id, created_by)
  values (p_room, p_title, coalesce(p_amount, 0), v_month, p_due_day,
          coalesce(p_split, 'meio'), v_recurrence, p_person)
  returning id into v_expense;

  return v_expense;
end;
$$;

-- "A gente acertou": zera as pendências das contas já pagas do mês.
create function public.settle_month(p_room uuid, p_month date)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_room_member(p_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.expenses
  set settled = true
  where room_id = p_room
    and month = date_trunc('month', p_month)::date
    and status = 'pago'
    and not settled;
end;
$$;

revoke execute on function public.ensure_month(uuid, date) from public, anon;
revoke execute on function public.create_recurring(uuid, text, integer, smallint, text, text, date) from public, anon;
revoke execute on function public.settle_month(uuid, date) from public, anon;
grant execute on function public.ensure_month(uuid, date) to authenticated;
grant execute on function public.create_recurring(uuid, text, integer, smallint, text, text, date) to authenticated;
grant execute on function public.settle_month(uuid, date) to authenticated;
