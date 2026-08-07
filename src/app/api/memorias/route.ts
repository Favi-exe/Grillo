import { NextRequest, NextResponse } from "next/server";
import { listMemorias } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";

export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const memorias = await listMemorias(abueloId);
    return NextResponse.json({ memorias });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/memorias GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
