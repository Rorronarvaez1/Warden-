-- Row Level Security. El worker usa la service role (omite RLS); la web usa la sesión del usuario.
--   analyst: lee todo lo operativo, registra empresas/activos y clasifica hallazgos.
--   admin:   además configura fuentes, pesos, programación, alertas y usuarios.

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'audit_log', 'companies', 'assets', 'schedules', 'risk_domains', 'sources',
    'source_credentials', 'scoring_weights', 'scoring_weight_items', 'scans', 'scan_sources',
    'findings', 'finding_sources', 'scores', 'score_domains', 'reports', 'alert_settings',
    'alerts', 'integration_outbox', 'archives'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Lectura para cualquier miembro activo.
  foreach t in array array[
    'companies', 'assets', 'schedules', 'risk_domains', 'sources', 'scoring_weights',
    'scoring_weight_items', 'scans', 'scan_sources', 'findings', 'finding_sources', 'scores',
    'score_domains', 'reports', 'alerts'
  ] loop
    execute format(
      'create policy "members read" on public.%I for select to authenticated using (public.is_member())', t);
  end loop;

  -- Gestión completa solo para admin.
  foreach t in array array[
    'sources', 'source_credentials', 'schedules', 'scoring_weights', 'scoring_weight_items',
    'alert_settings'
  ] loop
    execute format(
      'create policy "admins manage" on public.%I for all to authenticated '
      'using (public.is_admin()) with check (public.is_admin())', t);
  end loop;

  -- Datos de auditoría y operación: solo lectura para admin.
  foreach t in array array['audit_log', 'integration_outbox', 'archives'] loop
    execute format(
      'create policy "admins read" on public.%I for select to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

-- Perfiles: cada quien ve el suyo; admin ve y edita todos (rol, activación).
create policy "own profile read" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admins update profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Empresas y activos: los miembros registran y editan; solo admin borra.
create policy "members insert" on public.companies
  for insert to authenticated with check (public.is_member() and created_by = auth.uid());
create policy "members update" on public.companies
  for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "admins delete" on public.companies
  for delete to authenticated using (public.is_admin());

create policy "members insert" on public.assets
  for insert to authenticated with check (public.is_member());
create policy "members update" on public.assets
  for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "admins delete" on public.assets
  for delete to authenticated using (public.is_admin());

-- Hallazgos: los miembros solo pueden cambiar el estado de triage, no el contenido.
revoke update on public.findings from anon, authenticated;
grant update (status, status_reason, status_by) on public.findings to authenticated;
create policy "members triage" on public.findings
  for update to authenticated using (public.is_member())
  with check (public.is_member() and status_by = auth.uid());
