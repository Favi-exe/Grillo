import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAbuelo } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { construirSeguimiento } from "@/lib/seguimiento";
import { InformeSeguimientoDocument } from "@/lib/pdf/InformeSeguimiento";

export const dynamic = "force-dynamic";

// Informe de seguimiento en PDF, solo para la familia.
export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada" }, { status: 404 });
    }
    const dias = Number(req.nextUrl.searchParams.get("dias") ?? 30);
    const seg = await construirSeguimiento(abueloId, abuelo.nombre, Number.isFinite(dias) ? dias : 30);

    const buffer = await renderToBuffer(InformeSeguimientoDocument({ seg }));
    const nombre = `Informe de seguimiento de ${abuelo.nombre}.pdf`;
    const ascii = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w .-]/g, "");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/informe GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
