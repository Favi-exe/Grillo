import { NextRequest, NextResponse } from "next/server";
import {
  eliminarAbuelo,
  getAbuelo,
  listAlertasAnimo,
  listDispositivos,
  listFotos,
  listMemorias,
  listPreguntasFamilia,
  listRecordatorios,
  listRegistrosAnimo,
  listUsuarios,
  usandoSupabase,
} from "@/lib/db";
import { getSupabaseClient } from "@/lib/db/supabaseClient";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { borrarArchivoFoto } from "@/lib/storage/fotos";
import { eliminarMemoriasDeAbuelo } from "@/lib/ai/pinecone";
import { VERSION_LEGAL } from "@/lib/legal";

export const dynamic = "force-dynamic";

// Derecho de acceso y portabilidad: todos los datos de la persona mayor en un
// archivo. A propósito NO incluye el texto de las charlas ni de las historias
// originales (solo sus resúmenes), igual que lo que ve la familia en la app.
export async function GET(req: NextRequest) {
  try {
    const { abueloId, usuarioId } = await requireFamiliarConAbuelo(req);
    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada" }, { status: 404 });
    }
    const [memorias, recordatorios, registros, alertas, preguntas, fotos, dispositivos, usuarios] = await Promise.all([
      listMemorias(abueloId),
      listRecordatorios(abueloId),
      listRegistrosAnimo(abueloId),
      listAlertasAnimo(abueloId),
      listPreguntasFamilia(abueloId),
      listFotos(abueloId),
      listDispositivos(abueloId),
      listUsuarios(),
    ]);
    const solicitante = usuarios.find((u) => u.id === usuarioId);

    const datos = {
      generadoEn: new Date().toISOString(),
      versionPolitica: VERSION_LEGAL,
      nota: "Este archivo no incluye el texto de las charlas. Si lo necesitas, escríbenos y lo gestionamos.",
      solicitadoPor: solicitante ? { nombre: solicitante.nombre, relacion: solicitante.relacion_con_abuelo ?? null } : null,
      personaMayor: {
        nombre: abuelo.nombre,
        fechaNacimiento: abuelo.fecha_nacimiento ?? null,
        notas: abuelo.notas_generales ?? null,
        creadaEn: abuelo.created_at,
      },
      familiaresVinculados: usuarios
        .filter((u) => u.abuelo_id === abueloId && u.rol === "familiar")
        .map((u) => ({ nombre: u.nombre, relacion: u.relacion_con_abuelo ?? null })),
      historias: memorias.map((m) => ({
        fecha: m.fecha,
        tema: m.tema,
        emocion: m.emocion_detectada,
        personasMencionadas: m.personas_mencionadas,
        resumen: m.resumen,
      })),
      recordatorios: recordatorios.map((r) => ({
        tipo: r.tipo,
        descripcion: r.descripcion,
        hora: r.hora,
        fecha: r.fecha ?? null,
        frecuencia: r.frecuencia,
        activo: r.activo,
      })),
      registrosDeAnimo: registros.map((r) => ({ fecha: r.fecha, valencia: r.valencia })),
      avisosDeAnimo: alertas.map((a) => ({ fecha: a.fecha, resumen: a.resumen })),
      preguntasDeLaFamilia: preguntas.map((p) => ({
        pregunta: p.texto,
        autor: p.autor_nombre,
        estado: p.estado,
        fecha: p.created_at,
      })),
      fotos: fotos.map((f) => ({ descripcion: f.descripcion ?? null, subidaPor: f.subida_por_rol, fecha: f.created_at })),
      dispositivos: dispositivos.map((d) => ({
        nombre: d.nombre_dispositivo ?? null,
        vinculadoEl: d.created_at,
        ultimoAcceso: d.ultimo_acceso ?? null,
      })),
    };

    return new NextResponse(JSON.stringify(datos, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="datos-griyo.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/mis-datos GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Derecho de supresión: borra a la persona mayor y todo lo suyo (historias,
// charlas, fotos, ánimo, recordatorios, dispositivos y vectores de búsqueda),
// más la cuenta de quien lo pide y la cuenta propia de la persona mayor si la
// tiene. Pide escribir el nombre para confirmar. Es irreversible.
export async function DELETE(req: NextRequest) {
  try {
    const { abueloId, authUserId } = await requireFamiliarConAbuelo(req);
    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada" }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const confirmar = typeof body.confirmar === "string" ? body.confirmar.trim().toLowerCase() : "";
    if (confirmar !== abuelo.nombre.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Para borrar, escribe exactamente el nombre de la persona mayor." },
        { status: 400 }
      );
    }

    // Cuentas de acceso que se van con esta persona: la de quien lo pide y la
    // propia de la persona mayor, si se registró sola.
    const usuarios = await listUsuarios();
    const authIds = new Set<string>([authUserId]);
    for (const u of usuarios) {
      if (u.abuelo_id === abueloId && u.rol === "abuelo" && u.auth_user_id) authIds.add(u.auth_user_id);
    }

    const fotos = await listFotos(abueloId);
    for (const f of fotos) await borrarArchivoFoto(f.storage_path);
    await eliminarMemoriasDeAbuelo(abueloId);
    await eliminarAbuelo(abueloId);

    let cuentasBorradas = 0;
    if (usandoSupabase()) {
      for (const id of authIds) {
        const { error } = await getSupabaseClient().auth.admin.deleteUser(id);
        if (error) console.error("[mis-datos] no se pudo borrar la cuenta", id, error.message);
        else cuentasBorradas++;
      }
    }

    return NextResponse.json({ borrado: true, fotosBorradas: fotos.length, cuentasBorradas });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/mis-datos DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
