-- Cria a sala de vocês e devolve o código para montar o link.
insert into public.rooms default values returning code;
