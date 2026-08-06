import { NextRequest, NextResponse } from "next/server";
import { crearAlertaEmergencia, listAlertasEmergencia } from "@/lib/db";

export async function GET(req: NextRequest) {
  const abueloId = req.nextUrl.searchParams.get("abueloId");
  if (!abueloId) {
    return NextResponse.json({ error: "Falta abueloId" }, { status: 400 });
  }
  const alertas = await listAlertasEmergencia(abueloId);
  return NextResponse.json({ alertas });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { abueloId } = body as { abueloId: string };
  if (!abueloId) {
    return NextResponse.json({ error: "Falta abueloId" }, { status: 400 });
  }
  const alerta = await crearAlertaEmergencia(abueloId);
  return NextResponse.json({ alerta }, { status: 201 });
}
