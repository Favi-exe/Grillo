import { NextRequest, NextResponse } from "next/server";
import { createFoto, deleteFoto, getAbuelo, getUsuario, listFotos } from "@/lib/db";
import { AuthError, requireAbueloOFamiliar } from "@/lib/auth/server";
import {
  borrarArchivoFoto,
  detectarFormatoFoto,
  guardarArchivoFoto,
  urlDeFoto,
} from "@/lib/storage/fotos";

// Vercel corta el cuerpo de una función en ~4,5 MB; el cliente ya reduce la
// foto a ~0,5 MB antes de subirla, esto es solo el techo de seguridad.
const MAX_BYTES = 4_000_000;
const MAX_FOTOS_POR_PERSONA = 100;
const MAX_LARGO_DESCRIPCION = 200;

// Las puede ver y subir tanto la persona mayor (desde su pantalla) como la
// familia (desde su vista) — el abueloId siempre se resuelve del lado del
// servidor, nunca viene del cliente.
export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireAbueloOFamiliar(req);
    const fotos = await listFotos(abueloId);
    const conUrl = await Promise.all(
      fotos.map(async (f) => ({
        id: f.id,
        descripcion: f.descripcion ?? null,
        subida_por_rol: f.subida_por_rol,
        subida_por_nombre: f.subida_por_nombre ?? null,
        created_at: f.created_at,
        url: await urlDeFoto(f.storage_path),
      }))
    );
    // Más recientes primero en pantalla; el libro las ordena por su cuenta.
    conUrl.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return NextResponse.json({ fotos: conUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/fotos GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let storagePath: string | null = null;
  try {
    const { abueloId, rol, usuarioId } = await requireAbueloOFamiliar(req);

    const form = await req.formData();
    const archivo = form.get("foto");
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: "Falta la foto" }, { status: 400 });
    }
    if (archivo.size === 0 || archivo.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "La foto es demasiado pesada. Prueba con otra o más chica." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const formato = detectarFormatoFoto(buffer);
    if (!formato) {
      return NextResponse.json({ error: "Solo se pueden subir fotos JPG o PNG." }, { status: 415 });
    }

    const existentes = await listFotos(abueloId);
    if (existentes.length >= MAX_FOTOS_POR_PERSONA) {
      return NextResponse.json(
        { error: `Ya hay ${MAX_FOTOS_POR_PERSONA} fotos guardadas, que es el máximo por ahora.` },
        { status: 409 }
      );
    }

    const descripcionCruda = form.get("descripcion");
    const descripcion =
      typeof descripcionCruda === "string" && descripcionCruda.trim()
        ? descripcionCruda.trim().slice(0, MAX_LARGO_DESCRIPCION)
        : null;

    const subidaPorNombre =
      rol === "familiar" && usuarioId
        ? ((await getUsuario(usuarioId))?.nombre ?? null)
        : ((await getAbuelo(abueloId))?.nombre ?? null);

    storagePath = await guardarArchivoFoto(abueloId, buffer, formato);
    const foto = await createFoto({
      abuelo_id: abueloId,
      storage_path: storagePath,
      descripcion,
      subida_por_rol: rol,
      subida_por_nombre: subidaPorNombre,
    });

    return NextResponse.json(
      {
        foto: {
          id: foto.id,
          descripcion: foto.descripcion ?? null,
          subida_por_rol: foto.subida_por_rol,
          subida_por_nombre: foto.subida_por_nombre ?? null,
          created_at: foto.created_at,
          url: await urlDeFoto(foto.storage_path),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    // Si el archivo ya se guardó pero falló el registro en la base, no deja
    // un archivo huérfano ocupando espacio.
    if (storagePath) await borrarArchivoFoto(storagePath);
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/fotos POST]", err);
    return NextResponse.json({ error: "No pudimos guardar la foto. Prueba de nuevo." }, { status: 500 });
  }
}
