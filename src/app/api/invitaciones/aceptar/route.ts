import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { getUsuarioByAuthId, createUsuario } from "@/lib/db";
import { AuthError, requireSesionSupabase } from "@/lib/auth/server";

/**
 * Completa el alta de alguien que llegó por un link de invitación (ver
 * /api/invitaciones). El abuelo_id NUNCA lo manda el cliente: se lee de la
 * metadata que Supabase guardó en el usuario invitado al momento de
 * mandar la invitación, así que no hay forma de que alguien se auto-
 * vincule a un abuelo que no le corresponde.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Esto necesita Supabase conectado en este servidor." },
      { status: 503 }
    );
  }

  try {
    const { authUserId } = await requireSesionSupabase(req);

    const yaExiste = await getUsuarioByAuthId(authUserId);
    if (yaExiste) {
      return NextResponse.json({ usuario: yaExiste });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.slice(7);
    const { data: userData, error: userError } = await getSupabaseClient().auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Sesión inválida o vencida." }, { status: 401 });
    }

    const abueloId = userData.user.user_metadata?.abuelo_id as string | undefined;
    if (!abueloId) {
      return NextResponse.json(
        { error: "Esta invitación no tiene una persona mayor asociada." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { nombre, relacionConAbuelo } = body as { nombre: string; relacionConAbuelo?: string };
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    }

    const metadataRelacion = userData.user.user_metadata?.relacion as string | undefined;

    const usuario = await createUsuario({
      nombre: nombre.trim(),
      rol: "familiar",
      relacion_con_abuelo: relacionConAbuelo?.trim() || metadataRelacion || null,
      abuelo_id: abueloId,
      auth_user_id: authUserId,
    });

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/invitaciones/aceptar]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
