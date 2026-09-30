-- Empresas evaluadas, sus activos y la programación de escaneos.

create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  primary_domain  text not null unique,
  status          text not null default 'active' check (status in ('active', 'archived')),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create table public.assets (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  asset_type          text not null check (asset_type in ('domain', 'subdomain', 'ip', 'ip_range', 'asn')),
  value               text not null,
  discovery_source    text not null default 'manual' check (discovery_source in ('auto', 'manual')),
  attribution_status  text not null default 'pending'
                        check (attribution_status in ('pending', 'confirmed', 'discarded')),
  confirmed_by        uuid references public.profiles (id) on delete set null,
  first_seen          timestamptz not null default now(),
  last_seen           timestamptz not null default now(),
  unique (company_id, asset_type, value)
);

create index assets_company_status_idx on public.assets (company_id, attribution_status);

create table public.schedules (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null unique references public.companies (id) on delete cascade,
  frequency    text not null check (frequency in ('weekly', 'monthly')),
  next_run_at  timestamptz not null,
  is_active    boolean not null default true
);

create index schedules_due_idx on public.schedules (next_run_at) where is_active;
