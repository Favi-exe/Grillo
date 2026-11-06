import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { esEmailValido, normalizarTelefono } from "@/lib/auth/telefono";
import { crearCuentaAuthConTelefono, CuentaYaExisteError } from "@/lib/auth/crearCuenta";

/**
 * Alta de un familiar con número de WhatsApp/teléfono (el correo es
 * opcional). La cuenta se crea ya confirmada vía la Admin API: no hay un
 * correo de confirmación que esperar, porque el correo ya no es obligatorio.
 * El perfil (nombre, relación, persona mayor) se completa después, en el
 * onboarding de /familia, igual que antes.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Crear una cuenta necesita Supabase conectado en este servidor." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { telefono, password, email } = body as {
      telefono?: string;
      password?: string;
      email?: string;
    };

    const telefonoNormalizado = normalizarTelefono(telefono ?? "");
    if (!telefonoNormalizado) {
      return NextResponse.json(
        { error: "Escribe un número de WhatsApp válido, por ejemplo +56 9 1234 5678." },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña tiene que tener al menos 6 caracteres." },
        { status: 400 }
      );
    }
    const emailContacto = email?.trim() || null;
    if (emailContacto && !esEmailValido(emailContacto)) {
      return NextResponse.json({ error: "Ese correo no parece válido." }, { status: 400 });
    }

    await crearCuentaAuthConTelefono({
      telefono: telefonoNormalizado,
      password,
      emailContacto,
    });
    return NextResponse.json({ telefono: telefonoNormalizado }, { status: 201 });
  } catch (err) {
    if (err instanceof CuentaYaExisteError) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese número. Ingresa, o recupera tu contraseña." },
        { status: 409 }
      );
    }
    console.error("[api/registro]", err);
    return NextResponse.json({ error: "No pudimos crear la cuenta. Intenta de nuevo." }, { status: 500 });
  }
}
