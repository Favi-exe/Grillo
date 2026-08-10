import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAbuelo } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { armarLibroLegado } from "@/lib/legado";
import { LibroLegadoDocument } from "@/lib/pdf/LibroLegado";

// Solo la familia puede pedir el libro — es un documento que se guardan
// ellos, no algo que el propio abuelo necesita ver dentro de la app.
export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada" }, { status: 404 });
    }

    const libro = await armarLibroLegado(abueloId, abuelo.nombre);
    if (libro.totalHistorias === 0) {
      return NextResponse.json(
        { error: "Todavía no hay historias guardadas para armar el libro." },
        { status: 400 }
      );
    }

    const buffer = await renderToBuffer(LibroLegadoDocument({ libro }));
    const nombreArchivo = `Legado Vivo de ${abuelo.nombre}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/legado GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
