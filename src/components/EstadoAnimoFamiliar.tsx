"use client";

import { useEffect, useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import {
  HeartIcon,
  CaraMuyBajaIcon,
  CaraBajaIcon,
  CaraNeutralIcon,
  CaraBuenaIcon,
  CaraAltaIcon,
} from "@/components/icons";
import { NIVELES_ANIMO } from "@/lib/emociones";

interface PuntoEvolucion {
  fecha: string;
  valencia: number;
}

interface DatosAnimo {
  evolucion: PuntoEvolucion[];
  distribucion: { bajo: number; neutral: number; alto: number } | null;
  totalRecuerdos: number;
  ultimaAlerta: { fecha: string; resumen: string } | null;
  conteoRegistros: { valencia: number; cantidad: number }[] | null;
}

const ICONOS_NIVEL = [CaraMuyBajaIcon, CaraBajaIcon, CaraNeutralIcon, CaraBuenaIcon, CaraAltaIcon];

const ANCHO = 300;
const ALTO = 120;
const PAD_IZQ = 46;
const PAD_DER = 12;
const PAD_TOP = 10;
const PAD_BOT = 22;

function y(valencia: number): number {
  // Valencia 1 (abajo) a 5 (arriba), mapeado al alto útil del gráfico.
  const util = ALTO - PAD_TOP - PAD_BOT;
  return PAD_TOP + util * (1 - (valencia - 1) / 4);
}

function x(i: number, total: number): number {
  const util = ANCHO - PAD_IZQ - PAD_DER;
  if (total <= 1) return PAD_IZQ + util / 2;
  return PAD_IZQ + (util * i) / (total - 1);
}

function fechaCorta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function etiquetaValencia(v: number): string {
  if (v <= 2) return "Bajo";
  if (v >= 4) return "Alto";
  return "Neutral";
}

function GraficoEvolucion({ puntos }: { puntos: PuntoEvolucion[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (puntos.length === 0) {
    return (
      <p className="text-sand-600 text-base py-6 text-center">
        Todavía no hay suficientes historias guardadas para armar el gráfico.
      </p>
    );
  }

  const linea = puntos.map((p, i) => `${x(i, puntos.length)},${y(p.valencia)}`).join(" ");
  const ultimo = puntos[puntos.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto" role="img" aria-label="Evolución del estado de ánimo">
        {/* Gridlines horizontales — hairline, recesivas */}
        {[1, 3, 5].map((v) => (
          <g key={v}>
            <line
              x1={PAD_IZQ}
              x2={ANCHO - PAD_DER}
              y1={y(v)}
              y2={y(v)}
              stroke="#EBD9C6"
              strokeWidth={1}
            />
            <text x={PAD_IZQ - 8} y={y(v) + 4} textAnchor="end" className="fill-sand-600" fontSize="9">
              {etiquetaValencia(v)}
            </text>
          </g>
        ))}

        {/* Línea de evolución */}
        <polyline points={linea} fill="none" stroke="#5E4E7B" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Puntos + hit targets */}
        {puntos.map((p, i) => (
          <g key={p.fecha}>
            <circle
              cx={x(i, puntos.length)}
              cy={y(p.valencia)}
              r={12}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              tabIndex={0}
              role="button"
              aria-label={`${fechaCorta(p.fecha)}: ánimo ${etiquetaValencia(p.valencia)}`}
            />
            <circle
              cx={x(i, puntos.length)}
              cy={y(p.valencia)}
              r={i === puntos.length - 1 ? 5 : 4}
              fill="#5E4E7B"
              stroke="#FFFDFB"
              strokeWidth={2}
              pointerEvents="none"
            />
          </g>
        ))}

        {/* Etiqueta directa solo en el último punto, como pide el checklist */}
        <text
          x={x(puntos.length - 1, puntos.length)}
          y={y(ultimo.valencia) - 10}
          textAnchor="end"
          className="fill-sand-800 font-semibold"
          fontSize="10"
        >
          Hoy: {etiquetaValencia(ultimo.valencia)}
        </text>
      </svg>

      {hover !== null && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full bg-sand-900 text-white text-sm rounded-xl px-3 py-1.5 pointer-events-none shadow-warm-sm"
          style={{
            left: `${(x(hover, puntos.length) / ANCHO) * 100}%`,
            top: `${(y(puntos[hover].valencia) / ALTO) * 100}%`,
          }}
        >
          <span className="font-semibold">{etiquetaValencia(puntos[hover].valencia)}</span>{" "}
          <span className="text-sand-300">— {fechaCorta(puntos[hover].fecha)}</span>
        </div>
      )}
    </div>
  );
}

function BarraDistribucion({
  distribucion,
}: {
  distribucion: { bajo: number; neutral: number; alto: number };
}) {
  const segmentos = [
    { clave: "bajo", pct: distribucion.bajo, color: "#C1483F", etiqueta: "Bajo" },
    { clave: "neutral", pct: distribucion.neutral, color: "#B5A08A", etiqueta: "Neutral" },
    { clave: "alto", pct: distribucion.alto, color: "#E8B23D", etiqueta: "Alto" },
  ].filter((s) => s.pct > 0);

  return (
    <div>
      <div className="flex w-full h-6 rounded-full overflow-hidden gap-0.5">
        {segmentos.map((s) => (
          <div
            key={s.clave}
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            title={`${s.etiqueta}: ${s.pct}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segmentos.map((s) => (
          <span key={s.clave} className="text-sm text-sand-700 flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            {s.etiqueta} {s.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function ContadorRegistros({
  conteo,
}: {
  conteo: { valencia: number; cantidad: number }[];
}) {
  return (
    <div className="flex justify-between gap-1">
      {conteo.map(({ valencia, cantidad }) => {
        const nivel = NIVELES_ANIMO[valencia - 1];
        const Icono = ICONOS_NIVEL[valencia - 1];
        return (
          <div key={valencia} className="flex flex-col items-center gap-1">
            <div className="relative">
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${nivel.fondo}`}>
                <Icono className="w-5 h-5" />
              </span>
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white border border-sand-300 text-sand-800 text-xs font-semibold flex items-center justify-center">
                {cantidad}
              </span>
            </div>
            <span className="text-xs text-sand-600">{nivel.etiqueta}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function EstadoAnimoFamiliar() {
  const [datos, setDatos] = useState<DatosAnimo | null>(null);

  useEffect(() => {
    fetchFamiliar("/api/animo")
      .then((res) => res.json())
      .then(setDatos)
      .catch((err) => console.error("[EstadoAnimoFamiliar]", err));
  }, []);

  if (!datos || datos.totalRecuerdos === 0) return null;

  const alertaReciente =
    datos.ultimaAlerta &&
    Date.now() - new Date(datos.ultimaAlerta.fecha).getTime() < 5 * 24 * 60 * 60 * 1000;

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <h2 className="font-heading text-lg font-semibold text-sand-900 mb-1">Estado de ánimo</h2>
      <p className="text-base text-sand-700 mb-4">
        Según lo que Griyo fue notando en las últimas dos semanas — una observación, no un
        diagnóstico.
      </p>

      {alertaReciente && datos.ultimaAlerta && (
        <div className="flex items-start gap-3 bg-dusk-50 rounded-2xl p-4 mb-4">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-dusk-100 text-dusk-700 flex items-center justify-center">
            <HeartIcon className="w-5 h-5" />
          </span>
          <p className="text-sand-800">{datos.ultimaAlerta.resumen}</p>
        </div>
      )}

      <GraficoEvolucion puntos={datos.evolucion} />

      {datos.distribucion && (
        <div className="mt-4 pt-4 border-t border-sand-200">
          <p className="text-sm text-sand-600 mb-2">Estado de ánimo más frecuente</p>
          <BarraDistribucion distribucion={datos.distribucion} />
        </div>
      )}

      {datos.conteoRegistros && (
        <div className="mt-4 pt-4 border-t border-sand-200">
          <p className="text-sm text-sand-600 mb-3">
            Cuántas veces marcó cada carita en &quot;¿Cómo te sientes hoy?&quot;
          </p>
          <ContadorRegistros conteo={datos.conteoRegistros} />
        </div>
      )}
    </div>
  );
}
