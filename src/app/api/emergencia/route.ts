import { NextRequest, NextResponse } from "next/server";
import { crearAlertaEmergencia, listAlertasEmergencia } from "@/lib/db";
import { AuthError, requireAbueloAccess, requireFamiliarConAbuelo } from "@/lib/auth/server";

// La familia consulta el estado (¿hay alguna alerta activa?) y también el
// propio dispositivo del abuelo, al cargar, para saber si ya la disparó.
export async function GET(req: NextRequest) {
  try {
    let abueloId: string;
    try {
      ({ abueloId } = await requireAbueloAccess(req));
    } catch {
      ({ abueloId } = await requireFamiliarConAbuelo(req));
    }

    const alertas = await listAlertasEmergencia(abueloId);
    return NextResponse.json({ alertas });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/emergencia GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Solo el dispositivo del abuelo puede disparar una alerta — la familia la
// recibe, nunca la genera ella misma (ver AlertasFamiliar.tsx).
export async function POST(req: NextRequest) {
  try {
    const { abueloId } = await requireAbueloAccess(req);
    const alerta = await crearAlertaEmergencia(abueloId);
    return NextResponse.json({ alerta }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/emergencia POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
