-- Identidad y control: perfiles (1:1 con auth.users) y bitácora de auditoría.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        text not null default 'analyst' check (role in ('admin', 'analyst')),
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on column public.profiles.is_active is
  'Los usuarios nuevos quedan inactivos hasta que un admin los habilita.';

create table public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  detail       jsonb not null default '{}'::jsonb,
  ip_address   inet,
  created_at   timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- Rol del usuario actual; null si no tiene perfil activo.
create function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create function public.is_member()
returns boolean
language sql
stable
set search_path = ''
as $$ select public.app_role() is not null $$;

create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(public.app_role() = 'admin', false) $$;

-- Crea el perfil automáticamente al registrarse un usuario en Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
