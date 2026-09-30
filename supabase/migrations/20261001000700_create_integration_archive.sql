-- Salida hacia SIEM/SOAR (patrón outbox) y archivado de datos históricos.

create table public.integration_outbox (
  id           bigint generated always as identity primary key,
  destination  text not null check (destination in ('siem', 'soar')),
  event_type   text not null,
  payload      jsonb not null,
  status       text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts     smallint not null default 0,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);

create index integration_outbox_pending_idx on public.integration_outbox (created_at)
  where status = 'pending';

create table public.archives (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  source_table  text not null,
  period_start  date not null,
  period_end    date not null,
  storage_path  text not null,
  record_count  integer not null,
  file_hash     text not null,
  archived_at   timestamptz not null default now(),
  check (period_end >= period_start)
);
