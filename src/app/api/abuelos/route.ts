import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAbueloAccess, requireFamiliar } from "@/lib/auth/server";
import { createAbuelo, updateUsuario, getAbuelo } from "@/lib/db";

// Usado por la pantalla del abuelo (token de dispositivo o su propia
// sesión) para saber su propio nombre/notas sin exponer nunca su abuelo_id
// al cliente.
export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireAbueloAccess(req);
    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ abuelo });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/abuelos GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Crea el perfil del abuelo/a y lo vincula al familiar que hace la llamada.
// Por ahora cada cuenta familiar administra un único abuelo (limitación
// conocida del MVP — ver PROGRESO.md).
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireFamiliar(req);
    if (ctx.abueloId) {
      return NextResponse.json(
        { error: "Esta cuenta ya tiene una persona mayor vinculada." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { nombre, fechaNacimiento, notasGenerales } = body as {
      nombre: string;
      fechaNacimiento?: string;
      notasGenerales?: string;
    };
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    }

    const abuelo = await createAbuelo({
      nombre: nombre.trim(),
      fecha_nacimiento: fechaNacimiento || null,
      notas_generales: notasGenerales?.trim() || null,
    });

    await updateUsuario(ctx.usuarioId, { abuelo_id: abuelo.id });

    return NextResponse.json({ abuelo }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/abuelos POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
