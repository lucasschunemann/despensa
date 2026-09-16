-- Avisos no celular: cada aparelho guarda aqui a "assinatura" que o navegador cria.
-- A Edge Function `notificar` lê esta tabela com a chave de serviço e dispara o aviso.

create table public.push_subscriptions (
  endpoint   text primary key,
  room_id    uuid not null references public.rooms (id) on delete cascade,
  person     text not null,
  p256dh     text not null,
  auth       text not null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index push_subscriptions_room_idx on public.push_subscriptions (room_id);

alter table public.push_subscriptions enable row level security;

-- cada aparelho só enxerga e mexe na própria assinatura
create policy "aparelho lê a própria assinatura" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "aparelho cria a própria assinatura" on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_room_member(room_id));
create policy "aparelho atualiza a própria assinatura" on public.push_subscriptions
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "aparelho apaga a própria assinatura" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));
