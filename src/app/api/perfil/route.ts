import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSesionSupabase } from "@/lib/auth/server";
import { getUsuarioByAuthId, createUsuario, getAbuelo } from "@/lib/db";
import type { Rol } from "@/lib/types";

// Devuelve el perfil (usuario + abuelo, si ya lo creó) del familiar logueado.
// null en vez de 404 cuando todavía no completó el onboarding — así el
// frontend puede distinguir "sin sesión" de "sesión válida, falta perfil".
export async function GET(req: NextRequest) {
  try {
    const { authUserId } = await requireSesionSupabase(req);
    const usuario = await getUsuarioByAuthId(authUserId);
    if (!usuario) {
      return NextResponse.json({ usuario: null, abuelo: null });
    }
    const abuelo = usuario.abuelo_id ? await getAbuelo(usuario.abuelo_id) : null;
    return NextResponse.json({ usuario, abuelo: abuelo ?? null });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/perfil GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authUserId } = await requireSesionSupabase(req);

    const existente = await getUsuarioByAuthId(authUserId);
    if (existente) {
      return NextResponse.json({ usuario: existente });
    }

    const body = await req.json();
    const { nombre, relacionConAbuelo } = body as {
      nombre: string;
      relacionConAbuelo?: string;
    };
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    }

    const rol: Rol = "familiar";
    const usuario = await createUsuario({
      nombre: nombre.trim(),
      rol,
      relacion_con_abuelo: relacionConAbuelo?.trim() || null,
      abuelo_id: null,
      auth_user_id: authUserId,
    });

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/perfil POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
