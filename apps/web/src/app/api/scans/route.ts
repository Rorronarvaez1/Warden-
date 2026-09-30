import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Solicita un escaneo manual. request_scan() valida el rol, crea el registro en
// `scans` y lo encola; el worker hace el trabajo pesado fuera de Vercel.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { companyId?: unknown } | null;
  if (typeof body?.companyId !== 'string') {
    return NextResponse.json({ error: 'companyId requerido' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: scanId, error } = await supabase.rpc('request_scan', {
    p_company_id: body.companyId,
  });

  if (error) {
    const status = error.code === '42501' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ scanId }, { status: 202 });
}
