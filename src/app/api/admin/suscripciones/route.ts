import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth/server";
import { getSupabaseClient } from "@/lib/db/supabaseClient";
import { ESTADOS_SUSCRIPCION, PLANES } from "@/lib/admin/planes";
import type { EstadoSuscripcion } from "@/lib/types";

const MAX_PRECIO_CLP = 10_000_000;
const MAX_NOTAS = 500;

function fechaValida(v: unknown): string | null | undefined {
  if (v === null || v === "" || v === undefined) return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? undefined : v;
}

// Crea o actualiza el plan de una familia (una fila por persona mayor).
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));

    const abueloId = typeof body.abueloId === "string" ? body.abueloId : "";
    const plan = typeof body.plan === "string" ? body.plan : "";
    const estado = body.estado as EstadoSuscripcion;
    const precio = body.precio_clp;
    const inicio = fechaValida(body.inicio);
    const proximoCobro = fechaValida(body.proximo_cobro);
    const notas = typeof body.notas === "string" ? body.notas.trim() : "";

    if (!/^[0-9a-f-]{36}$/i.test(abueloId)) {
      return NextResponse.json({ error: "Falta la persona mayor." }, { status: 400 });
    }
    if (!PLANES.some((p) => p.id === plan)) {
      return NextResponse.json({ error: "Plan no válido." }, { status: 400 });
    }
    if (!ESTADOS_SUSCRIPCION.some((e) => e.id === estado)) {
      return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    }
    if (!Number.isInteger(precio) || precio < 0 || precio > MAX_PRECIO_CLP) {
      return NextResponse.json({ error: "El precio debe ser un número entero de pesos." }, { status: 400 });
    }
    if (inicio === undefined || proximoCobro === undefined) {
      return NextResponse.json({ error: "Fecha no válida (usa AAAA-MM-DD)." }, { status: 400 });
    }
    if (notas.length > MAX_NOTAS) {
      return NextResponse.json({ error: `Las notas no pueden pasar de ${MAX_NOTAS} caracteres.` }, { status: 400 });
    }

    const db = getSupabaseClient();
    const { data: abuelo } = await db.from("abuelos").select("id").eq("id", abueloId).maybeSingle();
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada." }, { status: 404 });
    }

    const { data, error } = await db
      .from("suscripciones")
      .upsert(
        {
          abuelo_id: abueloId,
          plan,
          estado,
          precio_clp: precio,
          inicio,
          proximo_cobro: proximoCobro,
          notas: notas || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "abuelo_id" }
      )
      .select("*")
      .single();
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return NextResponse.json(
          { error: "Falta crear la tabla de suscripciones: corre el bloque de suscripciones de supabase/schema.sql en Supabase." },
          { status: 409 }
        );
      }
      throw error;
    }
    return NextResponse.json({ suscripcion: data });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/admin/suscripciones PUT]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
