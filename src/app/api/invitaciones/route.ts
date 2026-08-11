import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { getAbuelo } from "@/lib/db";
import { AuthError, requireAbueloAccess, requireFamiliarConAbuelo } from "@/lib/auth/server";

/**
 * Invita por correo a un familiar para que acompañe a esta persona mayor.
 * Lo puede disparar tanto la persona mayor (desde /abuelo) como un familiar
 * que ya esté vinculado (desde /familia, si en algún momento se suma esa
 * entrada ahí también). Usa la Admin API de Supabase — el mismo mecanismo
 * de invitación por correo que trae Supabase Auth de fábrica — y le
 * adjunta el abuelo_id como metadata del usuario invitado, para que
 * /api/invitaciones/aceptar sepa a qué perfil vincularlo sin que el
 * cliente tenga que mandarlo (no confiar en abuelo_id del cliente).
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Invitar necesita Supabase conectado en este servidor." },
      { status: 503 }
    );
  }

  try {
    let abueloId: string;
    try {
      ({ abueloId } = await requireAbueloAccess(req));
    } catch {
      ({ abueloId } = await requireFamiliarConAbuelo(req));
    }

    const body = await req.json();
    const { email, relacion } = body as { email: string; relacion?: string };
    if (!email?.trim()) {
      return NextResponse.json({ error: "Falta el correo" }, { status: 400 });
    }

    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada" }, { status: 404 });
    }

    const origin = req.nextUrl.origin;
    const { error } = await getSupabaseClient().auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: `${origin}/invitacion`,
      data: {
        abuelo_id: abueloId,
        abuelo_nombre: abuelo.nombre,
        relacion: relacion?.trim() || null,
      },
    });

    if (error) {
      const yaExiste = error.message?.toLowerCase().includes("already registered");
      return NextResponse.json(
        {
          error: yaExiste
            ? "Ese correo ya tiene una cuenta en Griyo."
            : "No pudimos enviar la invitación. Intenta de nuevo.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/invitaciones POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
