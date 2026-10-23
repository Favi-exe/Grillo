"use client";

import type { ReactNode } from "react";
import type { ActividadFamilia } from "@/lib/admin/resumen";
import type { Suscripcion } from "@/lib/types";
import { ESTADOS_SUSCRIPCION, nombrePlan } from "@/lib/admin/planes";
import { AlertIcon, CheckIcon, PauseIcon } from "@/components/icons";

/* ------------------------------ formatos ------------------------------ */

export const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
export const numero = new Intl.NumberFormat("es-CL");
const TZ = "America/Santiago";

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: TZ });
}

export function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}

/** "2026-11-01" (día calendario sin zona) → "1 nov". */
export function diaCalendario(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function diaDeSerie(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function haceCuanto(iso: string | null | undefined): string {
  if (!iso) return "nunca";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 2) return "recién";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 60) return `hace ${dias} días`;
  return `hace ${Math.round(dias / 30)} meses`;
}

/** Días desde hoy hasta un día calendario "YYYY-MM-DD" (negativo = ya pasó). */
export function diasHasta(ymd: string): number {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  return Math.round((new Date(`${ymd}T00:00:00Z`).getTime() - new Date(`${hoy}T00:00:00Z`).getTime()) / 86400000);
}

export function textoCobro(ymd: string): string {
  const d = diasHasta(ymd);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d > 1) return `en ${d} días`;
  if (d === -1) return "ayer";
  return `hace ${-d} días`;
}

export function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

/** Algunos dispositivos se guardaron con el user-agent completo; se muestra algo legible. */
export function nombreDispositivo(nombre: string | null | undefined): string {
  if (!nombre) return "Dispositivo sin nombre";
  if (!nombre.includes("Mozilla/")) return nombre;
  const so = /Windows/.test(nombre)
    ? "Windows"
    : /Android/.test(nombre)
      ? "Android"
      : /iPhone|iPad|iOS/.test(nombre)
        ? "iPhone/iPad"
        : /Mac OS X|Macintosh/.test(nombre)
          ? "Mac"
          : /Linux/.test(nombre)
            ? "Linux"
            : "Dispositivo";
  const navegador = /Edg\//.test(nombre)
    ? "Edge"
    : /Firefox\//.test(nombre)
      ? "Firefox"
      : /Chrome\//.test(nombre)
        ? "Chrome"
        : /Safari\//.test(nombre)
          ? "Safari"
          : "";
  return navegador ? `${so} · ${navegador}` : so;
}

/* ------------------------------ piezas base ------------------------------ */

const TONOS_AVATAR = [
  "bg-ember-100 text-ember-800",
  "bg-dusk-100 text-dusk-700",
  "bg-gold-400/30 text-sand-900",
  "bg-sand-300 text-sand-800",
];

export function Avatar({ nombre, tamano = "md" }: { nombre: string | null | undefined; tamano?: "sm" | "md" | "lg" }) {
  let h = 0;
  for (const c of nombre ?? "") h = (h * 31 + c.charCodeAt(0)) % 997;
  const medidas = { sm: "w-9 h-9 text-sm", md: "w-11 h-11 text-base", lg: "w-16 h-16 text-2xl" }[tamano];
  return (
    <span
      aria-hidden="true"
      className={`${medidas} ${TONOS_AVATAR[h % TONOS_AVATAR.length]} shrink-0 rounded-full grid place-items-center font-heading font-semibold`}
    >
      {iniciales(nombre)}
    </span>
  );
}

export type Tono = "ok" | "info" | "ember" | "neutro" | "alerta" | "vacio";

const CLASES_TONO: Record<Tono, string> = {
  ok: "bg-gold-400/25 text-sand-900",
  info: "bg-dusk-100 text-dusk-700",
  ember: "bg-ember-100 text-ember-800",
  neutro: "bg-sand-300 text-sand-800",
  alerta: "bg-clay-400/20 text-clay-600",
  vacio: "border border-dashed border-sand-500 text-sand-700",
};

export function Chip({ tono = "neutro", icono, children }: { tono?: Tono; icono?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${CLASES_TONO[tono]}`}>
      {icono}
      {children}
    </span>
  );
}

export function ChipActividad({ actividad }: { actividad: ActividadFamilia }) {
  if (actividad === "activa")
    return (
      <Chip tono="ok" icono={<CheckIcon className="w-4 h-4" />}>
        Activa
      </Chip>
    );
  if (actividad === "inactiva")
    return (
      <Chip tono="neutro" icono={<PauseIcon className="w-4 h-4" />}>
        Inactiva
      </Chip>
    );
  return (
    <Chip tono="alerta" icono={<AlertIcon className="w-4 h-4" />}>
      Sin uso
    </Chip>
  );
}

const TONO_ESTADO: Record<Suscripcion["estado"], Tono> = {
  activa: "ok",
  prueba: "info",
  piloto: "ember",
  pausada: "neutro",
  cancelada: "alerta",
};

export function ChipEstado({ estado }: { estado: Suscripcion["estado"] }) {
  const nombre = ESTADOS_SUSCRIPCION.find((e) => e.id === estado)?.nombre ?? estado;
  return <Chip tono={TONO_ESTADO[estado]}>{nombre.replace(" (cobrando)", "")}</Chip>;
}

export function ChipPlan({ suscripcion }: { suscripcion: Suscripcion | null }) {
  if (!suscripcion) return <Chip tono="vacio">Sin plan</Chip>;
  const estado = ESTADOS_SUSCRIPCION.find((e) => e.id === suscripcion.estado)?.nombre ?? suscripcion.estado;
  return (
    <Chip tono={TONO_ESTADO[suscripcion.estado]}>
      {nombrePlan(suscripcion.plan)} · {estado.replace(" (cobrando)", "")}
    </Chip>
  );
}

export function Tarjeta({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`bg-white rounded-3xl shadow-warm-sm p-5 sm:p-6 min-w-0 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function TituloSeccion({ id, titulo, nota, derecha }: { id?: string; titulo: string; nota?: string; derecha?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 id={id} className="font-heading text-xl font-semibold text-sand-900">
          {titulo}
        </h2>
        {nota && <p className="text-sm text-sand-700 mt-0.5">{nota}</p>}
      </div>
      {derecha}
    </div>
  );
}

/** Control segmentado (p. ej. 7 / 14 / 30 días). */
export function Segmentado<T extends string | number>({
  valor,
  opciones,
  onCambio,
  etiqueta,
}: {
  valor: T;
  opciones: { id: T; texto: string }[];
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex bg-sand-200 rounded-full p-1 gap-1">
      {opciones.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={o.id === valor}
          onClick={() => onCambio(o.id)}
          className={`min-h-[36px] px-3.5 rounded-full text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 ${
            o.id === valor ? "bg-white text-sand-900 shadow-warm-sm" : "text-sand-700 hover:text-sand-900"
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/** Barritas de actividad (una por día), sin ejes: es una "mirada rápida". */
export function MiniBarras({ valores, etiqueta }: { valores: number[]; etiqueta: string }) {
  const max = Math.max(1, ...valores);
  return (
    <span role="img" aria-label={etiqueta} className="flex items-end gap-[3px] h-9">
      {valores.map((v, i) => (
        <span
          key={i}
          className={`w-[5px] rounded-t-[3px] ${v > 0 ? "bg-ember-400" : "bg-sand-400"}`}
          style={{ height: v > 0 ? `${Math.max(14, (v / max) * 100)}%` : "3px" }}
        />
      ))}
    </span>
  );
}

export function VacioInfo({ children }: { children: ReactNode }) {
  return <p className="text-sand-700 text-center py-8">{children}</p>;
}
