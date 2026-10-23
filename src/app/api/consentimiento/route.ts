import { NextRequest, NextResponse } from "next/server";
import { getConsentimiento, registrarConsentimiento } from "@/lib/db";
import { AuthError, requireSesionSupabase } from "@/lib/auth/server";
import { VERSION_LEGAL } from "@/lib/legal";

export const dynamic = "force-dynamic";

function esTablaFaltante(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "42P01" || code === "PGRST205";
}

// ¿Esta cuenta ya aceptó la versión vigente de los términos y la privacidad?
// Si la tabla todavía no existe en la base, `requerido` es false para no
// dejar a nadie afuera de la aplicación por un detalle de instalación.
export async function GET(req: NextRequest) {
  try {
    const { authUserId } = await requireSesionSupabase(req);
    try {
      const c = await getConsentimiento(authUserId, VERSION_LEGAL);
      return NextResponse.json({ requerido: true, aceptado: Boolean(c), version: VERSION_LEGAL });
    } catch (err) {
      if (esTablaFaltante(err)) {
        return NextResponse.json({ requerido: false, aceptado: true, version: VERSION_LEGAL });
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/consentimiento GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authUserId } = await requireSesionSupabase(req);
    const body = await req.json().catch(() => ({}));
    if (body.acepto !== true) {
      return NextResponse.json({ error: "Hace falta aceptar para continuar." }, { status: 400 });
    }
    const c = await registrarConsentimiento(authUserId, VERSION_LEGAL);
    return NextResponse.json({ aceptado: true, version: c.version, aceptadoEn: c.aceptado_en });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (esTablaFaltante(err)) {
      return NextResponse.json({ error: "Falta crear la tabla de consentimientos en Supabase." }, { status: 409 });
    }
    console.error("[api/consentimiento POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
