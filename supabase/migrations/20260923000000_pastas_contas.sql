begin;

-- Pastas das contas: uma coleção pequena por sala, com cor e ordem próprias.
create table public.expense_folders (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 36),
  color text not null check (color in ('blue', 'mint', 'orange', 'rose', 'violet', 'slate')),
  position integer not null default 0,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index expense_folders_room_position_idx on public.expense_folders(room_id, position, created_at);
alter table public.expense_folders enable row level security;
alter table public.expense_folders replica identity full;
alter publication supabase_realtime add table public.expense_folders;
create policy "membros leem pastas" on public.expense_folders
  for select to authenticated using (public.is_room_member(room_id));
create policy "membros criam pastas" on public.expense_folders
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "membros editam pastas" on public.expense_folders
  for update to authenticated using (public.is_room_member(room_id))
  with check (public.is_room_member(room_id));
create policy "membros removem pastas" on public.expense_folders
  for delete to authenticated using (public.is_room_member(room_id));

alter table public.expenses
  add column folder_id uuid references public.expense_folders(id) on delete set null;
alter table public.recurrences
  add column folder_id uuid references public.expense_folders(id) on delete set null;
create index expenses_folder_idx on public.expenses(folder_id) where folder_id is not null;

-- Uma ação move várias contas de forma atômica e também ensina a pasta à recorrência,
-- para que os próximos meses já nasçam organizados.
create function public.move_expenses_folder(p_expenses uuid[], p_folder uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_room uuid;
  v_moved integer;
begin
  select room_id into v_room from public.expenses where id = any(p_expenses) limit 1;
  if v_room is null then return 0; end if;
  if not public.is_room_member(v_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_folder is not null and not exists (
    select 1 from public.expense_folders where id = p_folder and room_id = v_room
  ) then
    raise exception 'pasta inválida' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.expenses where id = any(p_expenses) and room_id <> v_room
  ) then
    raise exception 'contas de salas diferentes' using errcode = '22023';
  end if;

  update public.expenses set folder_id = p_folder
  where id = any(p_expenses) and room_id = v_room;
  get diagnostics v_moved = row_count;

  update public.recurrences r set folder_id = p_folder
  where r.room_id = v_room and r.id in (
    select e.recurrence_id from public.expenses e
    where e.id = any(p_expenses) and e.recurrence_id is not null
  );
  return v_moved;
end;
$$;

-- A versão atualizada do gerador copia a pasta escolhida na recorrência.
create or replace function public.ensure_month(p_room uuid, p_month date)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
begin
  if not public.is_room_member(p_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with candidates as (
    select r.* from public.recurrences r
    where r.room_id = p_room and r.active
      and date_trunc('month', r.created_at)::date <= v_month
  ), marked as (
    insert into public.recurrence_runs(recurrence_id, month)
    select id, v_month from candidates
    on conflict do nothing
    returning recurrence_id
  )
  insert into public.expenses
    (room_id, title, amount_cents, month, due_day, split, recurrence_id, folder_id, created_by)
  select r.room_id, r.title, r.amount_cents, v_month, r.due_day, r.split, r.id, r.folder_id, r.created_by
  from candidates r join marked m on m.recurrence_id = r.id;

end;
$$;

revoke execute on function public.move_expenses_folder(uuid[], uuid) from public, anon;
grant execute on function public.move_expenses_folder(uuid[], uuid) to authenticated;

commit;
