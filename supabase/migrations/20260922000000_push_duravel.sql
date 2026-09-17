-- Push nasce na mesma transação dos dados, nunca num timer do telefone.
-- Cada destinatário tem sua própria entrega, lease e tentativas.
create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null references public.push_subscriptions(endpoint) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender text not null,
  kind text not null check (kind in ('item', 'conta', 'desejo')),
  subjects jsonb not null default '[]'::jsonb,
  batch bigint not null,
  available_at timestamptz not null default now() + interval '12 seconds',
  created_at timestamptz not null default now(),
  attempts integer not null default 0,
  delivered_at timestamptz,
  last_error text,
  unique(endpoint, room_id, sender, kind, batch)
);
alter table public.push_deliveries enable row level security;
-- Sem policies: somente o serviço acessa conteúdo e endpoints.
revoke all on public.push_deliveries from anon, authenticated;
create index push_deliveries_pending on public.push_deliveries(available_at) where delivered_at is null;

create function public.enqueue_house_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_sender text;
  v_subject text;
  v_kind text;
begin
  if tg_table_name = 'items' then
    if tg_op <> 'INSERT' then return new; end if;
    v_sender := new.added_by; v_subject := new.name; v_kind := 'item';
  elsif tg_table_name = 'wishes' then
    if tg_op <> 'INSERT' then return new; end if;
    v_sender := new.created_by; v_subject := new.title; v_kind := 'desejo';
  elsif tg_table_name = 'expenses' then
    if new.status <> 'pago' then return new; end if;
    if tg_op = 'UPDATE' then
      if old.status = 'pago' then return new; end if;
    end if;
    v_sender := coalesce(new.paid_by, new.created_by); v_subject := new.title; v_kind := 'conta';
  end if;
  insert into public.push_deliveries(endpoint, room_id, sender, kind, subjects, batch)
  select s.endpoint, new.room_id, v_sender, v_kind, jsonb_build_array(left(v_subject, 120)),
    floor(extract(epoch from now()) / 12)::bigint
  from public.push_subscriptions s
  where s.room_id = new.room_id and s.person <> v_sender
    and s.user_id is distinct from auth.uid()
  on conflict(endpoint, room_id, sender, kind, batch) do update
    set subjects = public.push_deliveries.subjects || excluded.subjects;
  return new;
end;
$$;
revoke all on function public.enqueue_house_push() from public;
create trigger house_push_items after insert on public.items for each row execute function public.enqueue_house_push();
create trigger house_push_wishes after insert on public.wishes for each row execute function public.enqueue_house_push();
create trigger house_push_expenses after insert or update of status on public.expenses for each row execute function public.enqueue_house_push();

create function public.claim_push_deliveries() returns setof public.push_deliveries
language sql security definer set search_path = '' as $$
  update public.push_deliveries d
  set attempts = d.attempts + 1, available_at = now() + interval '2 minutes'
  where d.id in (
    select q.id from public.push_deliveries q
    where q.delivered_at is null and q.available_at <= now()
      and q.attempts < 6 and q.created_at > now() - interval '24 hours'
    order by q.available_at limit 40 for update skip locked
  ) returning d.*;
$$;
revoke all on function public.claim_push_deliveries() from public, anon, authenticated;
grant execute on function public.claim_push_deliveries() to service_role;

-- Evita reutilizar assinaturas de uma sala na qual o aparelho já não é membro.
drop policy "aparelho atualiza a própria assinatura" on public.push_subscriptions;
create policy "aparelho atualiza a própria assinatura" on public.push_subscriptions
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_room_member(room_id));

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Configure despensa_push_url e despensa_push_secret no Vault (docs/AVISOS.md).
-- Nenhum segredo fica na definição do job ou no git.
create function public.dispatch_house_push() returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  -- TTL também limita o armazenamento de entregas que esgotaram as tentativas.
  delete from public.push_deliveries where created_at < now() - interval '7 days';
  if not exists(select 1 from public.push_deliveries where delivered_at is null
    and available_at <= now() and attempts < 6 and created_at > now() - interval '24 hours') then return; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'despensa_push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'despensa_push_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := '{"action":"dispatch"}'::jsonb, timeout_milliseconds := 10000);
end;
$$;
revoke all on function public.dispatch_house_push() from public, anon, authenticated;
select cron.schedule('despensa-push', '* * * * *', 'select public.dispatch_house_push()');
