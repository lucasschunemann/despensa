-- Lista de desejos com cofre: o que vocês querem comprar, quanto custa,
-- quem quer, e em quanto tempo dá para bancar guardando um tanto por mês.

create table public.room_settings (
  room_id               uuid primary key references public.rooms (id) on delete cascade,
  monthly_savings_cents integer not null default 0 check (monthly_savings_cents >= 0),
  updated_at            timestamptz not null default now()
);

create type public.wish_status as enum ('querendo', 'comprado');

create table public.wishes (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms (id) on delete cascade,
  title       text not null check (length(btrim(title)) > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  link        text,
  image_url   text,
  -- 1 um dia · 2 quero · 3 quero muito
  want_level  smallint not null default 2 check (want_level between 1 and 3),
  -- quem já bateu o coração; quando os dois querem, o desejo sobe na lista
  wanted_by   text[] not null default '{}',
  status      public.wish_status not null default 'querendo',
  bought_at   timestamptz,
  bought_by   text,
  created_by  text not null,
  created_at  timestamptz not null default now()
);

create index wishes_room_idx on public.wishes (room_id, created_at);

alter table public.room_settings enable row level security;
alter table public.wishes enable row level security;

create policy "membros leem ajustes" on public.room_settings
  for select to authenticated using (public.is_room_member(room_id));
create policy "membros criam ajustes" on public.room_settings
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "membros editam ajustes" on public.room_settings
  for update to authenticated using (public.is_room_member(room_id))
  with check (public.is_room_member(room_id));

create policy "membros leem desejos" on public.wishes
  for select to authenticated using (public.is_room_member(room_id));
create policy "membros criam desejos" on public.wishes
  for insert to authenticated with check (public.is_room_member(room_id));
create policy "membros editam desejos" on public.wishes
  for update to authenticated using (public.is_room_member(room_id))
  with check (public.is_room_member(room_id));
create policy "membros removem desejos" on public.wishes
  for delete to authenticated using (public.is_room_member(room_id));

alter publication supabase_realtime add table public.wishes;
alter publication supabase_realtime add table public.room_settings;

-- Bater (ou desbater) o coração num desejo, sem correr risco de um sobrescrever o outro.
create function public.toggle_want(p_wish uuid, p_person text)
returns text[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_room uuid;
  v_wanted text[];
begin
  select room_id into v_room from public.wishes where id = p_wish;
  if v_room is null then
    raise exception 'desejo não encontrado' using errcode = 'P0002';
  end if;
  if not public.is_room_member(v_room) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.wishes
  set wanted_by = case
        when p_person = any (wanted_by) then array_remove(wanted_by, p_person)
        else array_append(wanted_by, p_person)
      end
  where id = p_wish
  returning wanted_by into v_wanted;

  return v_wanted;
end;
$$;

revoke execute on function public.toggle_want(uuid, text) from public, anon;
grant execute on function public.toggle_want(uuid, text) to authenticated;

-- ─── Fotos dos desejos ──────────────────────────────────────────────────────
-- Balde público de propósito: o caminho tem o id da sala e o id do desejo, que são
-- aleatórios, e a foto precisa carregar direto (inclusive offline, pelo cache do app).
insert into storage.buckets (id, name, public)
values ('desejos', 'desejos', true)
on conflict (id) do nothing;

create policy "membros enviam foto de desejo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'desejos'
    and public.is_room_member(((storage.foldername(name))[1])::uuid)
  );

create policy "membros trocam foto de desejo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'desejos'
    and public.is_room_member(((storage.foldername(name))[1])::uuid)
  );

create policy "membros apagam foto de desejo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'desejos'
    and public.is_room_member(((storage.foldername(name))[1])::uuid)
  );
