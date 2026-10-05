import { NextRequest, NextResponse } from "next/server";
import { deleteFoto, getFoto } from "@/lib/db";
import { AuthError, requireAbueloOFamiliar } from "@/lib/auth/server";
import { borrarArchivoFoto } from "@/lib/storage/fotos";

// La familia puede quitar cualquier foto; la persona mayor, solo las que
// subió ella misma (para que no pueda borrar sin querer las que sumó la familia).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { abueloId, rol } = await requireAbueloOFamiliar(req);

    const foto = await getFoto(params.id);
    if (!foto || foto.abuelo_id !== abueloId) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    if (rol === "abuelo" && foto.subida_por_rol !== "abuelo") {
      return NextResponse.json(
        { error: "Esta foto la subió tu familia. Pídeles a ellos que la quiten." },
        { status: 403 }
      );
    }

    await deleteFoto(foto.id);
    await borrarArchivoFoto(foto.storage_path);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/fotos/[id] DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
