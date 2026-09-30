-- Catálogos: dominios de riesgo, fuentes OSINT y referencias a sus credenciales.

create table public.risk_domains (
  id           smallint generated always as identity primary key,
  key          text not null unique,
  name         text not null,
  description  text
);

create table public.sources (
  source_key      text primary key check (source_key ~ '^[a-z0-9_]+$'),
  name            text not null,
  risk_domain_id  smallint not null references public.risk_domains (id),
  is_no_contact   boolean not null default false,
  license         text,
  is_enabled      boolean not null default false,
  -- Compuerta de pasividad: una fuente que contacta la infraestructura evaluada nunca se habilita.
  constraint sources_enabled_requires_no_contact check (not is_enabled or is_no_contact)
);

create table public.source_credentials (
  id               uuid primary key default gen_random_uuid(),
  source_key       text not null unique references public.sources (source_key) on delete cascade,
  secret_ref       text not null,
  is_valid         boolean,
  last_checked_at  timestamptz
);

comment on column public.source_credentials.secret_ref is
  'Nombre de la variable o referencia en el gestor de secretos. Nunca el secreto en sí.';
