import { NextRequest, NextResponse } from "next/server";
import { listMemorias } from "@/lib/db";

export async function GET(req: NextRequest) {
  const abueloId = req.nextUrl.searchParams.get("abueloId");
  if (!abueloId) {
    return NextResponse.json({ error: "Falta abueloId" }, { status: 400 });
  }
  const memorias = await listMemorias(abueloId);
  return NextResponse.json({ memorias });
}
