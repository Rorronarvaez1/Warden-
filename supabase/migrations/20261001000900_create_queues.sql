-- Colas (Supabase Queues / pgmq) y programación (pg_cron).
-- La web encola con request_scan(); pg_cron encola los escaneos programados;
-- el worker consume con queue_read() / queue_delete() usando la service role.

create extension if not exists pgmq;
create extension if not exists pg_cron;

select pgmq.create('scan_requests');
select pgmq.create('report_requests');

-- Escaneo manual solicitado desde el dashboard.
create function public.request_scan(p_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scan_id uuid;
begin
  if not public.is_member() then
    raise exception 'usuario sin acceso' using errcode = '42501';
  end if;

  insert into public.scans (company_id, weight_version_id, trigger_type, requested_by)
  values (
    p_company_id,
    (select id from public.scoring_weights where is_active),
    'manual',
    auth.uid()
  )
  returning id into v_scan_id;

  perform pgmq.send('scan_requests', jsonb_build_object('scan_id', v_scan_id));
  return v_scan_id;
end;
$$;

-- Encola los escaneos cuya programación ya venció y calcula la siguiente fecha.
create function public.enqueue_due_scans()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_schedule record;
  v_scan_id uuid;
  v_count integer := 0;
begin
  for v_schedule in
    select s.* from public.schedules s
    join public.companies c on c.id = s.company_id
    where s.is_active and s.next_run_at <= now() and c.status = 'active'
    for update of s skip locked
  loop
    insert into public.scans (company_id, weight_version_id, trigger_type)
    values (
      v_schedule.company_id,
      (select id from public.scoring_weights where is_active),
      'scheduled'
    )
    returning id into v_scan_id;

    perform pgmq.send('scan_requests', jsonb_build_object('scan_id', v_scan_id));

    update public.schedules
    set next_run_at = next_run_at
      + case frequency when 'weekly' then interval '7 days' else interval '1 month' end
    where id = v_schedule.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

select cron.schedule('enqueue-due-scans', '*/15 * * * *', 'select public.enqueue_due_scans()');

-- Wrappers para el worker (expuestos por PostgREST, solo service role).
create function public.queue_read(p_queue text, p_visibility_timeout integer, p_quantity integer)
returns table (msg_id bigint, read_ct integer, message jsonb)
language sql
security definer
set search_path = ''
as $$
  select m.msg_id, m.read_ct, m.message
  from pgmq.read(p_queue, p_visibility_timeout, p_quantity) m
$$;

create function public.queue_delete(p_queue text, p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$ select pgmq.delete(p_queue, p_msg_id) $$;

revoke execute on function public.request_scan(uuid) from public, anon;
revoke execute on function public.enqueue_due_scans() from public, anon, authenticated;
revoke execute on function public.queue_read(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.queue_delete(text, bigint) from public, anon, authenticated;
revoke execute on function public.activate_scoring_weights(uuid) from public, anon;

grant execute on function public.request_scan(uuid) to authenticated;
grant execute on function public.activate_scoring_weights(uuid) to authenticated;
grant execute on function public.enqueue_due_scans() to service_role;
grant execute on function public.queue_read(text, integer, integer) to service_role;
grant execute on function public.queue_delete(text, bigint) to service_role;
