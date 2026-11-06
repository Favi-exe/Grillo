"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { AlertIcon, CheckIcon, ChartIcon, ClockIcon } from "@/components/icons";
import type { Seguimiento } from "@/lib/seguimiento";

const RANGOS = [7, 30, 60] as const;
type Rango = (typeof RANGOS)[number];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaDia(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const dia = d.toLocaleDateString("es-CL", { weekday: "short", timeZone: "UTC" });
  return `${dia} ${Number(ymd.slice(8))} ${MESES[Number(ymd.slice(5, 7)) - 1]}`;
}

function etiquetaAnimo(v: number | null): string {
  if (v === null) return "Sin datos";
  if (v < 1.5) return "Muy bajo";
  if (v < 2.5) return "Bajo";
  if (v < 3.5) return "Neutral";
  if (v < 4.5) return "Bueno";
  return "Muy bueno";
}

const COLOR_ANIMO: Record<number, string> = {
  1: "bg-clay-500",
  2: "bg-clay-400",
  3: "bg-sand-500",
  4: "bg-gold-500",
  5: "bg-ember-500",
};

function haceCuanto(iso: string | null): string {
  if (!iso) return "todavía no conversaron";
  const dias = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="bg-sand-100 rounded-2xl px-3.5 py-3">
      <p className="font-heading text-xl font-semibold text-sand-900 leading-tight">{valor}</p>
      <p className="text-sm text-sand-700">{etiqueta}</p>
    </div>
  );
}

function TarjetaSenal({
  titulo,
  mensaje,
  indicadores,
  estado,
}: {
  titulo: string;
  mensaje: string;
  indicadores: { etiqueta: string; valor: string }[];
  estado: "ok" | "atencion" | "sin_datos";
}) {
  const chip = {
    ok: { clase: "bg-gold-400/25 text-sand-900", texto: "Sin novedades", Icono: CheckIcon },
    atencion: { clase: "bg-ember-100 text-ember-800", texto: "Para acompañar", Icono: AlertIcon },
    sin_datos: { clase: "bg-sand-300 text-sand-800", texto: "Faltan datos", Icono: ClockIcon },
  }[estado];
  return (
    <div className="border border-sand-300 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-semibold text-sand-900">{titulo}</h3>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${chip.clase}`}>
          <chip.Icono className="w-4 h-4" />
          {chip.texto}
        </span>
      </div>
      <p className="text-sand-800">{mensaje}</p>
      {indicadores.length > 0 && (
        <dl className="mt-3 grid gap-1 text-sm">
          {indicadores.map((i) => (
            <div key={i.etiqueta} className="flex justify-between gap-3">
              <dt className="text-sand-700">{i.etiqueta}</dt>
              <dd className="text-sand-900 font-semibold text-right">{i.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function SeguimientoFamilia({ nombrePersona }: { nombrePersona: string }) {
  const [rango, setRango] = useState<Rango>(30);
  const [datos, setDatos] = useState<Seguimiento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [errorInforme, setErrorInforme] = useState<string | null>(null);

  const cargar = useCallback(async (dias: Rango) => {
    setError(null);
    try {
      const res = await fetchFamiliar(`/api/seguimiento?dias=${dias}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos cargar el seguimiento");
      setDatos(data as Seguimiento);
      setSel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar el seguimiento");
    }
  }, []);

  useEffect(() => {
    cargar(rango);
  }, [rango, cargar]);

  async function descargarInforme() {
    setDescargando(true);
    setErrorInforme(null);
    try {
      const res = await fetchFamiliar(`/api/informe?dias=${rango === 7 ? 30 : rango}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos armar el informe");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informe de seguimiento de ${nombrePersona}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorInforme(err instanceof Error ? err.message : "No pudimos armar el informe");
    } finally {
      setDescargando(false);
    }
  }

  const encabezado = (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-dusk-100 text-dusk-700 flex items-center justify-center">
          <ChartIcon className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold text-sand-900">Cómo viene {nombrePersona}</h2>
          <p className="text-sm text-sand-700">Actividad, ánimo y señales con Griyo</p>
        </div>
      </div>
      <div role="group" aria-label="Período" className="inline-flex bg-sand-200 rounded-full p-1 gap-1">
        {RANGOS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={r === rango}
            onClick={() => setRango(r)}
            className={`min-h-[36px] px-3 rounded-full text-sm font-semibold transition-colors ${
              r === rango ? "bg-white text-sand-900 shadow-warm-sm" : "text-sand-700 hover:text-sand-900"
            }`}
          >
            {r} días
          </button>
        ))}
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-warm-sm p-5">
        {encabezado}
        <p className="text-clay-600">{error}</p>
      </div>
    );
  }
  if (!datos) {
    return (
      <div className="bg-white rounded-3xl shadow-warm-sm p-5">
        {encabezado}
        <div className="h-40 rounded-2xl bg-sand-100 animate-pulse" aria-label="Cargando" />
      </div>
    );
  }

  const r = datos.resumen;
  const max = Math.max(1, ...datos.serie.map((p) => p.mensajes));
  const idx = sel ?? datos.serie.length - 1;
  const punto = datos.serie[idx];
  const { aislamiento, memoria, voz } = datos.senales;

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      {encabezado}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Dato valor={`${r.diasConConversacion} de ${datos.dias}`} etiqueta="días con conversación" />
        <Dato valor={String(r.mensajes)} etiqueta="mensajes con Griyo" />
        <Dato valor={String(r.historiasNuevas)} etiqueta="historias nuevas" />
        <Dato valor={etiquetaAnimo(r.animoPromedio)} etiqueta="ánimo promedio" />
      </div>
      <p className="text-sm text-sand-700 mt-2">Última charla: {haceCuanto(r.ultimaConversacion)}.</p>

      <div className="mt-5">
        <div className="flex items-end gap-[2px] h-28 border-b border-sand-400" role="group" aria-label="Mensajes por día">
          {datos.serie.map((p, i) => (
            <button
              key={p.fecha}
              type="button"
              onClick={() => setSel(i)}
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              aria-label={`${fechaDia(p.fecha)}: ${p.mensajes} mensajes`}
              aria-pressed={i === idx}
              className={`flex-1 h-full flex items-end rounded-t focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 ${i === idx ? "bg-ember-50" : ""}`}
            >
              <span
                className={`w-full rounded-t-[3px] ${p.mensajes === 0 ? "bg-sand-400" : i === idx ? "bg-ember-600" : "bg-ember-300"}`}
                style={{ height: p.mensajes === 0 ? "3px" : `${Math.max(6, (p.mensajes / max) * 100)}%` }}
              />
            </button>
          ))}
        </div>
        <div className="flex gap-[2px] mt-1" aria-hidden="true">
          {datos.serie.map((p) => (
            <span
              key={p.fecha}
              className={`flex-1 h-2 rounded-sm ${p.animo === null ? "bg-sand-200" : COLOR_ANIMO[Math.max(1, Math.min(5, Math.round(p.animo)))]}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-sand-700 mt-1">
          <span>{fechaDia(datos.serie[0].fecha)}</span>
          <span>{fechaDia(datos.serie[datos.serie.length - 1].fecha)}</span>
        </div>
        <p className="mt-3 bg-sand-100 rounded-2xl px-4 py-2.5 text-sand-900" aria-live="polite">
          <span className="font-semibold">{fechaDia(punto.fecha)}</span>
          <span className="text-sand-700"> · </span>
          {punto.mensajes} {punto.mensajes === 1 ? "mensaje" : "mensajes"}
          <span className="text-sand-700"> · </span>
          ánimo {punto.animo === null ? "sin dato" : etiquetaAnimo(punto.animo).toLowerCase()}
          {punto.historias > 0 && (
            <>
              <span className="text-sand-700"> · </span>
              {punto.historias} {punto.historias === 1 ? "historia" : "historias"}
            </>
          )}
        </p>
        <p className="text-xs text-sand-700 mt-1.5">Barras: mensajes de cada día. Cuadritos: ánimo (rojo más bajo, naranja más alto, gris sin dato).</p>
      </div>

      <div className="grid gap-3 mt-5 md:grid-cols-2">
        <TarjetaSenal
          titulo={aislamiento.titulo}
          mensaje={aislamiento.mensaje}
          indicadores={aislamiento.indicadores}
          estado={aislamiento.nivel === "tranquilo" ? "ok" : aislamiento.nivel === "atencion" ? "atencion" : "sin_datos"}
        />
        <TarjetaSenal
          titulo={memoria.titulo}
          mensaje={memoria.mensaje}
          indicadores={memoria.indicadores}
          estado={memoria.nivel === "sin_cambios" ? "ok" : memoria.nivel === "cambio" ? "atencion" : "sin_datos"}
        />
        <TarjetaSenal
          titulo={voz.titulo}
          mensaje={voz.mensaje}
          indicadores={voz.indicadores}
          estado={voz.nivel === "sin_cambios" ? "ok" : voz.nivel === "cambio" ? "atencion" : "sin_datos"}
        />
      </div>
      <p className="text-sm text-sand-700 mt-2">{datos.senales.aviso}</p>

      {datos.alertas.length > 0 && (
        <div className="mt-5">
          <h3 className="font-semibold text-sand-900 mb-2">Avisos del período</h3>
          <ul className="grid gap-2">
            {datos.alertas.slice(0, 4).map((a, i) => (
              <li key={i} className="bg-sand-100 rounded-2xl px-4 py-2.5 text-sand-800">
                <span className="font-semibold text-sand-900">
                  {fechaDia(new Date(a.fecha).toLocaleDateString("en-CA", { timeZone: "America/Santiago" }))} ·{" "}
                  {a.tipo === "emergencia" ? "Emergencia" : "Ánimo bajo"}:{" "}
                </span>
                {a.texto}
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorInforme && <p className="text-clay-600 mt-4">{errorInforme}</p>}
      <button
        onClick={descargarInforme}
        disabled={descargando}
        className="mt-5 min-h-[52px] w-full bg-dusk-700 hover:bg-dusk-800 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
      >
        {descargando ? "Armando el informe..." : "Descargar informe de seguimiento (PDF)"}
      </button>
      <p className="text-sm text-sand-700 mt-2 text-center">
        Para guardarlo o llevarlo a una consulta. No incluye lo que {nombrePersona} conversa, solo cuánto y cómo usa Griyo.
      </p>
    </div>
  );
}
