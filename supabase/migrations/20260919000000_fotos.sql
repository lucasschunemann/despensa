-- Conserta o envio de foto dos desejos ("new row violates row-level security policy").
--
-- A versão anterior convertia o nome da pasta para uuid dentro da regra, e dependia de a
-- regra certa (insert, update ou select) estar no ar. Aqui as quatro operações do balde
-- ficam liberadas para quem é da sala, comparando o caminho como texto, sem conversão.
-- Pode rodar quantas vezes quiser: começa apagando as regras antigas.

insert into storage.buckets (id, name, public)
values ('desejos', 'desejos', true)
on conflict (id) do update set public = true;

drop policy if exists "membros enviam foto de desejo" on storage.objects;
drop policy if exists "membros trocam foto de desejo" on storage.objects;
drop policy if exists "membros apagam foto de desejo" on storage.objects;
drop policy if exists "membros veem foto de desejo" on storage.objects;

-- A foto mora em <id-da-sala>/<id-do-desejo>.webp, então a primeira pasta do caminho
-- diz de qual sala ela é.
create policy "membros veem foto de desejo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'desejos'
    and exists (
      select 1 from public.room_members m
      where m.user_id = auth.uid()
        and m.room_id::text = (storage.foldername(name))[1]
    )
  );

create policy "membros enviam foto de desejo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'desejos'
    and exists (
      select 1 from public.room_members m
      where m.user_id = auth.uid()
        and m.room_id::text = (storage.foldername(name))[1]
    )
  );

create policy "membros trocam foto de desejo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'desejos'
    and exists (
      select 1 from public.room_members m
      where m.user_id = auth.uid()
        and m.room_id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'desejos'
    and exists (
      select 1 from public.room_members m
      where m.user_id = auth.uid()
        and m.room_id::text = (storage.foldername(name))[1]
    )
  );

create policy "membros apagam foto de desejo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'desejos'
    and exists (
      select 1 from public.room_members m
      where m.user_id = auth.uid()
        and m.room_id::text = (storage.foldername(name))[1]
    )
  );
