import { NextRequest, NextResponse } from "next/server";
import { getAbuelo } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { construirSeguimiento } from "@/lib/seguimiento";

export const dynamic = "force-dynamic";

// Actividad, ánimo, temas y señales de una persona mayor, solo para su
// familia. Devuelve conteos y resúmenes: nunca el texto de las charlas.
export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada" }, { status: 404 });
    }
    const dias = Number(req.nextUrl.searchParams.get("dias") ?? 30);
    const seguimiento = await construirSeguimiento(abueloId, abuelo.nombre, Number.isFinite(dias) ? dias : 30);
    return NextResponse.json(seguimiento, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/seguimiento GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
