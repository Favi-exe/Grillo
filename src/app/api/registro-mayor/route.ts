import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { createUsuario, createAbuelo, updateUsuario } from "@/lib/db";

/**
 * Alta directa de la persona mayor, sin depender de que un familiar la
 * arme primero. Pensado para alguien que va a usar a Grillo como
 * herramienta de compañía/memoria por su cuenta (ej. dificultades de
 * memoria) — por eso la cuenta se crea ya confirmada (vía la Admin API de
 * Supabase, con email_confirm:true) en vez de esperar que confirme un mail,
 * que es fricción que este público no necesita. La contraseña la genera
 * Grillo, simple y ya resuelta — la persona no tiene que inventarla ni
 * recordarla, porque el dispositivo va a quedar con la sesión guardada.
 */

const PALABRAS_SIMPLES = [
  "sol",
  "luna",
  "flor",
  "rio",
  "cielo",
  "mate",
  "estrella",
  "jardin",
  "arbol",
  "viento",
];

function generarPasswordSimple(): string {
  const palabra = PALABRAS_SIMPLES[Math.floor(Math.random() * PALABRAS_SIMPLES.length)];
  const numero = Math.floor(1000 + Math.random() * 9000);
  return `${palabra}${numero}`;
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Crear una cuenta necesita Supabase conectado en este servidor." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { nombre, email } = body as { nombre: string; email: string };
    if (!nombre?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Falta el nombre o el correo" }, { status: 400 });
    }

    const password = generarPasswordSimple();

    const { data: creado, error: errorAuth } = await getSupabaseClient().auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (errorAuth || !creado.user) {
      const yaExiste = errorAuth?.message?.toLowerCase().includes("already registered");
      return NextResponse.json(
        {
          error: yaExiste
            ? "Ya existe una cuenta con ese correo."
            : "No pudimos crear la cuenta. Probemos de nuevo.",
        },
        { status: 400 }
      );
    }

    const usuario = await createUsuario({
      nombre: nombre.trim(),
      rol: "abuelo",
      relacion_con_abuelo: null,
      abuelo_id: null,
      auth_user_id: creado.user.id,
    });

    const abuelo = await createAbuelo({
      nombre: nombre.trim(),
      fecha_nacimiento: null,
      notas_generales: null,
    });

    await updateUsuario(usuario.id, { abuelo_id: abuelo.id });

    return NextResponse.json({ email: email.trim(), password, abuelo }, { status: 201 });
  } catch (err) {
    console.error("[api/registro-mayor]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
