import { NextResponse } from "next/server";

// Se lee en cada request al servidor desplegado — a diferencia de
// NEXT_PUBLIC_BUILD_ID (que queda fijo en el bundle del navegador desde
// que cargó la página), esto siempre refleja el deploy que está corriendo
// AHORA. Comparar los dos es como el cliente se entera de que hay una
// versión más nueva sin tener que recargar a ciegas.
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.VERCEL_GIT_COMMIT_SHA || "dev" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
