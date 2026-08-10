import { NextRequest, NextResponse } from "next/server";
import { listMemorias, listAlertasAnimo } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { valenciaDe, balanceDe } from "@/lib/emociones";

const DIAS_EVOLUCION = 14;

export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);

    const desde = new Date(Date.now() - DIAS_EVOLUCION * 24 * 60 * 60 * 1000);
    const memorias = (await listMemorias(abueloId)).filter((m) => new Date(m.fecha) >= desde);

    // Promedio de valencia por día (solo días con al menos un recuerdo) —
    // es lo que arma el gráfico de evolución del ánimo.
    const porDia = new Map<string, number[]>();
    for (const m of memorias) {
      const dia = m.fecha.slice(0, 10); // YYYY-MM-DD
      const lista = porDia.get(dia) ?? [];
      lista.push(valenciaDe(m.emocion_detectada));
      porDia.set(dia, lista);
    }
    const evolucion = [...porDia.entries()]
      .map(([fecha, valores]) => ({
        fecha,
        valencia: valores.reduce((a, b) => a + b, 0) / valores.length,
      }))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

    // Distribución bajo/neutral/alto sobre el mismo período.
    const distribucion = { bajo: 0, neutral: 0, alto: 0 };
    for (const m of memorias) {
      distribucion[balanceDe(m.emocion_detectada)]++;
    }
    const total = memorias.length;
    const distribucionPct =
      total > 0
        ? {
            bajo: Math.round((distribucion.bajo / total) * 100),
            neutral: Math.round((distribucion.neutral / total) * 100),
            alto: Math.round((distribucion.alto / total) * 100),
          }
        : null;

    const alertas = await listAlertasAnimo(abueloId);
    const ultimaAlerta = alertas[0] ?? null;

    return NextResponse.json({
      evolucion,
      distribucion: distribucionPct,
      totalRecuerdos: total,
      ultimaAlerta,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/animo GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
