import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth/server";
import { construirResumenAdmin } from "@/lib/admin/resumen";

export const dynamic = "force-dynamic";

// Foto del uso de Griyo para el panel /admin. Solo cuentas de ADMIN_EMAILS.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const resumen = await construirResumenAdmin();
    return NextResponse.json(resumen, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/admin/resumen GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
