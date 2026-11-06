import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { createUsuario, createAbuelo, updateUsuario } from "@/lib/db";
import { esEmailValido, normalizarTelefono } from "@/lib/auth/telefono";
import { crearCuentaAuthConTelefono, CuentaYaExisteError } from "@/lib/auth/crearCuenta";

/**
 * Alta directa de la persona mayor, sin depender de que un familiar la
 * arme primero. Pensado para alguien que va a usar a Griyo como
 * herramienta de compañía/memoria por su cuenta (ej. dificultades de
 * memoria) — por eso se identifica con su número de celular (el correo es
 * opcional) y la cuenta se crea ya confirmada, sin esperar ningún mail,
 * que es fricción que este público no necesita. La contraseña la genera
 * Griyo, simple y ya resuelta — la persona no tiene que inventarla ni
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
    const { nombre, telefono, email } = body as { nombre?: string; telefono?: string; email?: string };
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    }
    const telefonoNormalizado = normalizarTelefono(telefono ?? "");
    if (!telefonoNormalizado) {
      return NextResponse.json(
        { error: "Escribe un número de celular válido, por ejemplo +56 9 1234 5678." },
        { status: 400 }
      );
    }
    const emailContacto = email?.trim() || null;
    if (emailContacto && !esEmailValido(emailContacto)) {
      return NextResponse.json({ error: "Ese correo no parece válido." }, { status: 400 });
    }

    const password = generarPasswordSimple();

    let userId: string;
    try {
      ({ userId } = await crearCuentaAuthConTelefono({
        telefono: telefonoNormalizado,
        password,
        emailContacto,
      }));
    } catch (errorAuth) {
      if (errorAuth instanceof CuentaYaExisteError) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con ese número." },
          { status: 400 }
        );
      }
      console.error("[api/registro-mayor] fallo creando el usuario de auth:", errorAuth);
      return NextResponse.json(
        { error: "No pudimos crear la cuenta. Probemos de nuevo." },
        { status: 400 }
      );
    }

    try {
      const usuario = await createUsuario({
        nombre: nombre.trim(),
        rol: "abuelo",
        relacion_con_abuelo: null,
        abuelo_id: null,
        auth_user_id: userId,
      });

      const abuelo = await createAbuelo({
        nombre: nombre.trim(),
        fecha_nacimiento: null,
        notas_generales: null,
      });

      await updateUsuario(usuario.id, { abuelo_id: abuelo.id });

      return NextResponse.json({ telefono: telefonoNormalizado, password, abuelo }, { status: 201 });
    } catch (errorPerfil) {
      // Si el perfil (usuarios/abuelos) no se termina de crear, no dejamos
      // un usuario de Auth huérfano: sin esto, el número queda con login
      // válido pero sin perfil (justo el fallo que reportó Cecilia), y
      // Supabase ya no deja recrearlo porque "ya existe" — quedaría
      // atrapado sin poder reintentar. Revertimos el usuario de Auth para
      // que la persona pueda volver a intentarlo con el mismo número.
      console.error(
        "[api/registro-mayor] fallo creando el perfil, revirtiendo el usuario de auth:",
        errorPerfil
      );
      await getSupabaseClient()
        .auth.admin.deleteUser(userId)
        .catch((e) =>
          console.error("[api/registro-mayor] no se pudo revertir el usuario de auth:", e)
        );
      return NextResponse.json(
        { error: "No pudimos terminar de crear la cuenta. Probemos de nuevo." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[api/registro-mayor]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
