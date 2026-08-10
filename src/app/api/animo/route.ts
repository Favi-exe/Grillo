import { NextRequest, NextResponse } from "next/server";
import { listAlertasAnimo, listRegistrosAnimo } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { balanceDeValencia } from "@/lib/emociones";
import { obtenerPuntosAnimo } from "@/lib/animoDatos";

const DIAS_EVOLUCION = 14;

export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);

    const desde = new Date(Date.now() - DIAS_EVOLUCION * 24 * 60 * 60 * 1000);
    const puntos = await obtenerPuntosAnimo(abueloId, desde);

    // Promedio de valencia por día (solo días con al menos un dato) — es lo
    // que arma el gráfico de evolución del ánimo.
    const porDia = new Map<string, number[]>();
    for (const p of puntos) {
      const dia = p.fecha.slice(0, 10); // YYYY-MM-DD
      const lista = porDia.get(dia) ?? [];
      lista.push(p.valencia);
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
    for (const p of puntos) {
      distribucion[balanceDeValencia(p.valencia)]++;
    }
    const total = puntos.length;
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

    // Conteo por nivel (1 a 5) de los auto-registros directos — distinto
    // de la distribución de arriba, que mezcla memorias y registros. Este
    // es específicamente "cuántas veces marcó cada carita".
    const registros = (await listRegistrosAnimo(abueloId)).filter(
      (r) => new Date(r.fecha) >= desde
    );
    const conteoRegistros = [1, 2, 3, 4, 5].map((v) => ({
      valencia: v,
      cantidad: registros.filter((r) => r.valencia === v).length,
    }));

    return NextResponse.json({
      evolucion,
      distribucion: distribucionPct,
      totalRecuerdos: total,
      ultimaAlerta,
      conteoRegistros: registros.length > 0 ? conteoRegistros : null,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/animo GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
