import { NextRequest, NextResponse } from "next/server";
import { listConversaciones } from "@/lib/db";

export async function GET(req: NextRequest) {
  const abueloId = req.nextUrl.searchParams.get("abueloId");
  if (!abueloId) {
    return NextResponse.json({ error: "Falta abueloId" }, { status: 400 });
  }
  const conversaciones = await listConversaciones(abueloId);
  return NextResponse.json({ conversaciones });
}
