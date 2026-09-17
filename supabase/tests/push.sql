-- Rodar dentro de BEGIN/ROLLBACK. Nunca envia notificações reais.
do $$
declare
  room uuid := gen_random_uuid();
  v_sender uuid := gen_random_uuid();
  receiver uuid := gen_random_uuid();
  item uuid := gen_random_uuid();
  expense uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users(id) values(v_sender),(receiver);
  insert into public.rooms(id) values(room);
  insert into public.room_members(room_id,user_id) values(room,v_sender),(room,receiver);
  insert into public.push_subscriptions(endpoint,room_id,person,p256dh,auth,user_id) values
    ('https://web.push.apple.com/test-' || v_sender,room,'Lucas','test','test',v_sender),
    ('https://web.push.apple.com/test-' || receiver,room,'Bela','test','test',receiver);
  perform set_config('request.jwt.claim.sub', v_sender::text, true);
  insert into public.items(id,room_id,name,added_by) values(item,room,'café','Lucas');
  insert into public.items(id,room_id,name,added_by) values(item,room,'café','Lucas')
    on conflict(id) do update set name=excluded.name;
  insert into public.items(room_id,name,added_by) values(room,'leite','Lucas');
  select count(*) into n from public.push_deliveries where room_id=room;
  if n <> 1 then raise exception 'Esperava 1 lote, encontrou %',n; end if;
  select jsonb_array_length(subjects) into n from public.push_deliveries where room_id=room;
  if n <> 2 then raise exception 'Retry duplicou evento ou lote perdeu item: %',n; end if;
  if exists(select 1 from public.push_deliveries where room_id=room and endpoint like '%' || v_sender) then
    raise exception 'Remetente recebeu próprio aviso'; end if;
  insert into public.expenses(id,room_id,title,amount_cents,month,created_by)
    values(expense,room,'internet',10000,date_trunc('month',now())::date,'Lucas');
  if exists(select 1 from public.push_deliveries where room_id=room and kind='conta') then
    raise exception 'Conta ainda não paga gerou aviso'; end if;
  update public.expenses set status='pago',paid_by='Lucas' where id=expense;
  update public.expenses set status='pago',paid_by='Lucas' where id=expense;
  select jsonb_array_length(subjects) into n from public.push_deliveries where room_id=room and kind='conta';
  if n <> 1 then raise exception 'Retry do pagamento duplicou push'; end if;
  insert into public.wishes(room_id,title,created_by) values(room,'abajur','Lucas');
  select count(*) into n from public.push_deliveries where room_id=room;
  if n <> 3 then raise exception 'Módulos não estão isolados'; end if;
  update public.push_deliveries set available_at=now()-interval '1 second' where room_id=room;
  -- O teste deve usar uma base sem outras entregas disponíveis (antes de ativar o worker).
  perform public.claim_push_deliveries();
  if exists(select 1 from public.push_deliveries where room_id=room and attempts <> 1) then
    raise exception 'Claim não marcou tentativa'; end if;
  perform public.claim_push_deliveries();
  if exists(select 1 from public.push_deliveries where room_id=room and attempts <> 1) then
    raise exception 'Lease permitiu claim duplicado'; end if;
  if has_function_privilege('authenticated','public.claim_push_deliveries()','execute') then
    raise exception 'Cliente tem acesso ao worker'; end if;
end $$;
