'use server';

// Acciones del dashboard. Todas usan la sesión del usuario: RLS decide quién puede qué
// (miembros registran empresa/activos y piden escaneos; solo admin habilita fuentes).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { EXPOSURE_SOURCE_KEY } from '@/lib/dashboard-data';

export interface ActionResult {
  error?: string;
}

const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export async function registerCompany(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  const domain = String(formData.get('domain') ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (!name) return { error: 'El nombre es obligatorio' };
  if (!DOMAIN_RE.test(domain)) return { error: 'Dominio inválido (ejemplo: empresa.com.mx)' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: company, error } = await supabase
    .from('companies')
    .insert({ name, primary_domain: domain, created_by: user.id })
    .select('id')
    .single();
  if (error) {
    return { error: error.code === '23505' ? 'Ese dominio ya está registrado' : permissionMessage(error) };
  }

  // El dominio principal lo declara el usuario, así que entra confirmado.
  const { error: assetError } = await supabase.from('assets').insert({
    company_id: company.id,
    asset_type: 'domain',
    value: domain,
    discovery_source: 'manual',
    attribution_status: 'confirmed',
    confirmed_by: user.id,
  });
  if (assetError) return { error: permissionMessage(assetError) };

  revalidatePath('/');
  return {};
}

export async function setAssetStatus(
  assetId: string,
  status: 'confirmed' | 'discarded' | 'pending',
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data, error } = await supabase
    .from('assets')
    .update({ attribution_status: status, confirmed_by: status === 'confirmed' ? user.id : null })
    .eq('id', assetId)
    .select('id');
  if (error) return { error: permissionMessage(error) };
  // RLS no devuelve error al filtrar filas: sin filas actualizadas no hubo permiso.
  if (data.length === 0) return { error: 'No tienes permiso para modificar este activo' };

  revalidatePath('/');
  return {};
}

/** Solo admin (política "admins manage" de sources). */
export async function setExposureSourceEnabled(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sources')
    .update({ is_enabled: enabled })
    .eq('source_key', EXPOSURE_SOURCE_KEY)
    .select('source_key');
  if (error) return { error: permissionMessage(error) };
  if (data.length === 0) return { error: 'Solo un admin puede habilitar fuentes' };

  revalidatePath('/');
  return {};
}

export async function requestScan(companyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('request_scan', { p_company_id: companyId });
  if (error) return { error: permissionMessage(error) };

  revalidatePath('/');
  return {};
}

function permissionMessage(error: { code?: string; message: string }): string {
  return error.code === '42501' ? 'No tienes permiso para esta acción' : error.message;
}
