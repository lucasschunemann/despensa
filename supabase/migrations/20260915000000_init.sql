-- Despensa: schema inicial
-- Acesso: cada dispositivo faz sign-in anônimo (invisível) e entra na sala via
-- join_room(code). RLS libera itens só para membros da sala; o Realtime respeita o RLS.

-- ─── Salas ───────────────────────────────────────────────────────────────────
create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id   uuid not null references public.rooms (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.rooms enable row level security;        -- sem policies: ninguém lê direto
alter table public.room_members enable row level security;

create policy "membro vê a própria associação" on public.room_members
  for select to authenticated using (user_id = (select auth.uid()));

create function public.is_room_member(p_room uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = (select auth.uid())
  );
$$;

create function public.join_room(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_room uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_room from public.rooms where code = p_code;
  if v_room is null then
    raise exception 'sala não encontrada' using errcode = 'P0002';
  end if;

  insert into public.room_members (room_id, user_id)
  values (v_room, auth.uid())
  on conflict do nothing;

  return v_room;
end;
$$;

-- ─── Itens ───────────────────────────────────────────────────────────────────
create type public.item_status as enum ('pendente', 'pegado');

create table public.items (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  quantity   text,
  added_by   text not null,
  status     public.item_status not null default 'pendente',
  created_at timestamptz not null default now(),
  picked_at  timestamptz
);

create index items_room_idx on public.items (room_id, created_at);

alter table public.items enable row level security;

create policy "membros leem itens" on public.items
  for select to authenticated using (public.is_room_member(room_id));
create policy "membros criam itens" on public.items
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "membros editam itens" on public.items
  for update to authenticated using (public.is_room_member(room_id))
  with check (public.is_room_member(room_id));
create policy "membros removem itens" on public.items
  for delete to authenticated using (public.is_room_member(room_id));

alter publication supabase_realtime add table public.items;

-- ─── Histórico (últimas 3 listas, raw, só para recuperação) ─────────────────
create table public.list_archives (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms (id) on delete cascade,
  items       jsonb not null,
  archived_at timestamptz not null default now()
);

alter table public.list_archives enable row level security;

create policy "membros leem histórico" on public.list_archives
  for select to authenticated using (public.is_room_member(room_id));

-- Finaliza a compra: guarda um snapshot raw de todos os itens, remove os pegados
-- (pendentes continuam na lista para a próxima ida) e mantém só os 3 últimos snapshots.
create function public.finish_shopping(p_room uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_room_member(p_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (select 1 from public.items where room_id = p_room and status = 'pegado') then
    return;
  end if;

  insert into public.list_archives (room_id, items)
  select p_room, jsonb_agg(to_jsonb(i) order by i.created_at)
  from public.items i
  where i.room_id = p_room;

  delete from public.items where room_id = p_room and status = 'pegado';

  delete from public.list_archives
  where room_id = p_room
    and id not in (
      select id from public.list_archives
      where room_id = p_room
      order by archived_at desc
      limit 3
    );
end;
$$;

revoke execute on function public.is_room_member(uuid) from public, anon;
revoke execute on function public.join_room(text) from public, anon;
revoke execute on function public.finish_shopping(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.finish_shopping(uuid) to authenticated;
