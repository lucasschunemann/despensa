-- Contas permanentes, perfil e recuperação automática da sala já associada ao usuário.
-- Converter um usuário anônimo no Auth mantém o mesmo auth.uid(), portanto todos os
-- vínculos e dados já existentes de Lucas e Bela continuam intactos.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(btrim(username)) between 2 and 32),
  avatar_type text not null default 'preset' check (avatar_type in ('preset', 'upload')),
  avatar_value text not null default 'cat' check (char_length(avatar_value) between 1 and 500),
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_unique on public.profiles (lower(username));
alter table public.profiles enable row level security;

create function public.shares_room_with(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members mine
    join public.room_members theirs on theirs.room_id = mine.room_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user
  );
$$;

create policy "perfil visível para o próprio usuário e sua sala" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_room_with(id));

create policy "usuário cria o próprio perfil" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'member');

create policy "usuário edita o próprio perfil" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create function public.protect_profile_fields()
returns trigger language plpgsql set search_path = ''
as $$
begin
  -- A função administrativa/service role pode promover usuários diretamente no banco.
  -- O cliente nunca pode elevar o próprio papel.
  if auth.uid() is not null then
    new.id := old.id;
    new.role := old.role;
    new.created_at := old.created_at;
  end if;
  new.username := btrim(new.username);
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_protect_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

create function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_avatar text;
begin
  v_name := btrim(coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1), ''));
  if char_length(v_name) < 2 then v_name := 'pessoa-' || left(new.id::text, 6); end if;
  v_name := left(v_name, 32);
  v_avatar := coalesce(nullif(new.raw_user_meta_data ->> 'avatar_value', ''), 'cat');

  begin
    insert into public.profiles (id, username, avatar_type, avatar_value)
    values (new.id, v_name, 'preset', v_avatar);
  exception when unique_violation then
    insert into public.profiles (id, username, avatar_type, avatar_value)
    values (new.id, left(v_name, 25) || '-' || left(new.id::text, 6), 'preset', v_avatar)
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

create trigger auth_user_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Perfis para as identidades anônimas que já existem antes desta migration.
insert into public.profiles (id, username, avatar_type, avatar_value)
select u.id,
       'pessoa-' || left(u.id::text, 6),
       'preset',
       'cat'
from auth.users u
on conflict (id) do nothing;

create function public.get_my_room()
returns table(id uuid, code text)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.code
  from public.room_members m
  join public.rooms r on r.id = m.room_id
  where m.user_id = auth.uid()
  order by m.joined_at desc
  limit 1;
$$;

create function public.create_room()
returns table(id uuid, code text)
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.rooms default values returning rooms.id, rooms.code into v_id, v_code;
  insert into public.room_members(room_id, user_id) values (v_id, auth.uid());
  return query select v_id, v_code;
end;
$$;

-- Avatar público para que integrantes da mesma casa vejam a foto sem gerar URLs temporárias.
-- Escrita e remoção continuam restritas ao diretório do próprio auth.uid().
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "usuário envia o próprio avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "usuário troca o próprio avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-avatars' and owner_id = auth.uid()::text)
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "usuário apaga o próprio avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-avatars' and owner_id = auth.uid()::text);

revoke execute on function public.shares_room_with(uuid) from public, anon;
revoke execute on function public.get_my_room() from public, anon;
revoke execute on function public.create_room() from public, anon;
grant execute on function public.shares_room_with(uuid) to authenticated;
grant execute on function public.get_my_room() to authenticated;
grant execute on function public.create_room() to authenticated;
