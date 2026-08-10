import { NextRequest, NextResponse } from "next/server";
import { crearRegistroAnimo, listRegistrosAnimo, getAbuelo } from "@/lib/db";
import { AuthError, requireAbueloAccess } from "@/lib/auth/server";
import { chequearYAvisarAnimo } from "@/lib/animo";

function esHoy(fechaIso: string): boolean {
  return fechaIso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

// Solo el propio dispositivo del abuelo puede registrar cómo se siente —
// es un auto-reporte, no algo que la familia cargue por él.
export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireAbueloAccess(req);
    const registros = await listRegistrosAnimo(abueloId);
    const deHoy = registros.find((r) => esHoy(r.fecha)) ?? null;
    return NextResponse.json({ registroDeHoy: deHoy });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/registros-animo GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { abueloId } = await requireAbueloAccess(req);
    const body = await req.json().catch(() => ({}));
    const valencia = Number((body as { valencia?: number }).valencia);
    if (!Number.isInteger(valencia) || valencia < 1 || valencia > 5) {
      return NextResponse.json({ error: "Valencia inválida" }, { status: 400 });
    }

    // Uno por día — si ya registró hoy, no se pisa (evita que un doble
    // toque desbalancee el gráfico).
    const registros = await listRegistrosAnimo(abueloId);
    const yaHoy = registros.find((r) => esHoy(r.fecha));
    if (yaHoy) {
      return NextResponse.json({ registro: yaHoy }, { status: 200 });
    }

    const registro = await crearRegistroAnimo(abueloId, valencia);

    const abuelo = await getAbuelo(abueloId);
    if (abuelo) {
      try {
        await chequearYAvisarAnimo(abueloId, abuelo.nombre);
      } catch (err) {
        console.error("[registros-animo] fallo chequeando el ánimo:", err);
      }
    }

    return NextResponse.json({ registro }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/registros-animo POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
