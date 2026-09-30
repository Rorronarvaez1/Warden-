-- Calificación, reportes generados con IA y alertas por cambio de nota.

create table public.scores (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  scan_id            uuid not null unique references public.scans (id) on delete cascade,
  weight_version_id  uuid not null references public.scoring_weights (id),
  global_score       numeric(5, 2) not null,
  grade              char(1) not null check (grade in ('A', 'B', 'C', 'D', 'E', 'F')),
  computed_at        timestamptz not null default now()
);

create index scores_company_computed_idx on public.scores (company_id, computed_at desc);

create table public.score_domains (
  score_id        uuid not null references public.scores (id) on delete cascade,
  risk_domain_id  smallint not null references public.risk_domains (id),
  domain_score    numeric(5, 2) not null,
  grade           char(1) not null check (grade in ('A', 'B', 'C', 'D', 'E', 'F')),
  findings_count  integer not null default 0,
  primary key (score_id, risk_domain_id)
);

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  score_id        uuid not null unique references public.scores (id) on delete cascade,
  summary_text    text,
  model_used      text,
  prompt_version  text,
  context_hash    text,
  status          text not null default 'draft'
                    check (status in ('draft', 'validated', 'published', 'failed')),
  pdf_path        text,
  generated_at    timestamptz not null default now()
);

create table public.alert_settings (
  id               uuid primary key default gen_random_uuid(),
  threshold_grade  char(1) not null check (threshold_grade in ('A', 'B', 'C', 'D', 'E', 'F')),
  recipients       jsonb not null default '[]'::jsonb,
  created_by       uuid references public.profiles (id) on delete set null
);

create table public.alerts (
  id              uuid primary key default gen_random_uuid(),
  score_id        uuid not null references public.scores (id) on delete cascade,
  alert_type      text not null,
  previous_grade  char(1),
  new_grade       char(1) not null,
  channel         text not null check (channel in ('email', 'webhook')),
  sent_at         timestamptz
);
