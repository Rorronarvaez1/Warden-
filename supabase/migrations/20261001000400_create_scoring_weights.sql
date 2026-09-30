-- Versiones de pesos del KRI. Cada escaneo y cada score guardan la versión usada
-- para que una calificación histórica sea reproducible.

create table public.scoring_weights (
  id              uuid primary key default gen_random_uuid(),
  version         integer not null unique,
  created_by      uuid references public.profiles (id) on delete set null,
  effective_from  timestamptz not null default now(),
  is_active       boolean not null default false
);

-- Solo una versión activa a la vez.
create unique index scoring_weights_single_active_idx
  on public.scoring_weights (is_active) where is_active;

create table public.scoring_weight_items (
  weight_version_id   uuid not null references public.scoring_weights (id) on delete cascade,
  risk_domain_id      smallint not null references public.risk_domains (id),
  weight              numeric(5, 2) not null check (weight >= 0 and weight <= 100),
  severity_points     jsonb not null default '{}'::jsonb,
  confidence_factors  jsonb not null default '{}'::jsonb,
  primary key (weight_version_id, risk_domain_id)
);

comment on column public.scoring_weight_items.weight is
  'La suma por versión debe ser 100; se valida al activar la versión (ver activate_scoring_weights).';

create function public.activate_scoring_weights(p_weight_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric;
begin
  if not public.is_admin() then
    raise exception 'solo un admin puede activar pesos' using errcode = '42501';
  end if;

  select coalesce(sum(weight), 0) into v_total
  from public.scoring_weight_items
  where weight_version_id = p_weight_version_id;

  if v_total <> 100 then
    raise exception 'los pesos suman %, deben sumar 100', v_total;
  end if;

  update public.scoring_weights set is_active = false where is_active;
  update public.scoring_weights set is_active = true where id = p_weight_version_id;
end;
$$;
