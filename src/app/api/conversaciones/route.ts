import { NextRequest, NextResponse } from "next/server";
import { listConversaciones } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";

export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const conversaciones = await listConversaciones(abueloId);
    return NextResponse.json({ conversaciones });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/conversaciones GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
