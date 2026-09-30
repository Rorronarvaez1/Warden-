-- Evaluaciones (escaneos), resultado por fuente y hallazgos deduplicados.

create table public.scans (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  weight_version_id  uuid references public.scoring_weights (id),
  status             text not null default 'queued'
                       check (status in ('queued', 'running', 'completed', 'failed')),
  trigger_type       text not null check (trigger_type in ('manual', 'scheduled')),
  requested_by       uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  finished_at        timestamptz,
  raw_payload_path   text,
  raw_payload_hash   text,
  error_message      text
);

create index scans_company_created_idx on public.scans (company_id, created_at desc);

create table public.scan_sources (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references public.scans (id) on delete cascade,
  source_key      text not null references public.sources (source_key),
  status          text not null check (status in ('ok', 'failed', 'skipped', 'blocked')),
  items_returned  integer not null default 0,
  latency_ms      integer,
  message         text,
  unique (scan_id, source_key)
);

create table public.findings (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  scan_id         uuid not null references public.scans (id) on delete cascade,
  asset_id        uuid references public.assets (id) on delete set null,
  risk_domain_id  smallint not null references public.risk_domains (id),
  fingerprint     text not null,
  title           text not null,
  severity        text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  confidence      text not null check (confidence in ('high', 'medium', 'low')),
  observed_at     timestamptz not null,
  status          text not null default 'open'
                    check (status in ('open', 'false_positive', 'accepted', 'resolved')),
  status_reason   text,
  status_by       uuid references public.profiles (id) on delete set null,
  evidence        jsonb not null default '{}'::jsonb,
  evidence_path   text,
  -- La deduplicación es por empresa: el mismo hallazgo en escaneos sucesivos se actualiza.
  unique (company_id, fingerprint)
);

comment on column public.findings.scan_id is 'Último escaneo que observó el hallazgo.';

create index findings_company_status_idx on public.findings (company_id, status);
create index findings_scan_idx on public.findings (scan_id);

create table public.finding_sources (
  finding_id     uuid not null references public.findings (id) on delete cascade,
  source_key     text not null references public.sources (source_key),
  raw_reference  jsonb,
  primary key (finding_id, source_key)
);
