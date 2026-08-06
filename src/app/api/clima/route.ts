import { NextRequest, NextResponse } from "next/server";
import { getClima } from "@/lib/ai/weather";

export async function GET(req: NextRequest) {
  const ciudad = req.nextUrl.searchParams.get("ciudad") ?? undefined;
  const clima = await getClima(ciudad);
  return NextResponse.json(clima);
}
