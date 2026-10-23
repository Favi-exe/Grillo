"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FamiliaAdmin } from "@/lib/admin/resumen";
import { nombrePlan } from "@/lib/admin/planes";
import EditorSuscripcion from "./EditorSuscripcion";
import {
  Avatar,
  Chip,
  ChipActividad,
  ChipPlan,
  MiniBarras,
  clp,
  diaCalendario,
  fechaLarga,
  haceCuanto,
  nombreDispositivo,
  numero,
  textoCobro,
} from "./ui";
import { AlertIcon, ClockIcon, MailIcon, PhoneIcon, UserIcon, XIcon } from "@/components/icons";

function Dato({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-warm-sm">
      <p className="font-heading text-2xl font-semibold text-sand-900 tabular-nums">{numero.format(valor)}</p>
      <p className="text-sm text-sand-700">{etiqueta}</p>
    </div>
  );
}

function Bloque({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="font-heading text-lg font-semibold text-sand-900">{titulo}</h3>
      {nota && <p className="text-sm text-sand-700">{nota}</p>}
      <div className="mt-2 grid gap-2">{children}</div>
    </section>
  );
}

export default function FamiliaDetalle({
  familia,
  suscripcionesDisponibles,
  editarInicial,
  onCerrar,
  onGuardado,
}: {
  familia: FamiliaAdmin;
  suscripcionesDisponibles: boolean;
  editarInicial: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [editando, setEditando] = useState(editarInicial && suscripcionesDisponibles);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const s = familia.suscripcion;

  useEffect(() => {
    botonCerrar.current?.focus();
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-sand-900/40" onClick={onCerrar} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${familia.nombre}`}
        className="relative w-full max-w-xl h-full overflow-y-auto bg-sand-100 shadow-warm-lg animate-fade-rise"
      >
        <div className="sticky top-0 z-10 bg-sand-100/95 backdrop-blur px-5 sm:px-7 pt-5 pb-4 border-b border-sand-300">
          <div className="flex items-start gap-4">
            <Avatar nombre={familia.nombre} tamano="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-2xl font-semibold text-sand-900 truncate">{familia.nombre}</h2>
              <p className="text-sand-700">
                {familia.edad !== null ? `${familia.edad} años · ` : ""}En Griyo desde {fechaLarga(familia.creadaEn)}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <ChipActividad actividad={familia.actividad} />
                <ChipPlan suscripcion={s} />
              </div>
            </div>
            <button
              ref={botonCerrar}
              onClick={onCerrar}
              aria-label="Cerrar detalle"
              className="min-h-[44px] min-w-[44px] grid place-items-center rounded-full text-sand-800 hover:bg-sand-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-7 pb-10">
          {familia.emergenciasActivas > 0 && (
            <div role="alert" className="mt-5 bg-clay-400/20 text-clay-600 rounded-2xl p-3.5 flex items-center gap-2 font-semibold">
              <AlertIcon className="w-5 h-5 shrink-0" />
              Tiene una alerta de emergencia activa.
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-5">
            <Dato valor={familia.mensajes7d} etiqueta="Mensajes 7 días" />
            <Dato valor={familia.mensajes30d} etiqueta="Mensajes 30 días" />
            <Dato valor={familia.mensajesTotal} etiqueta="Mensajes en total" />
          </div>

          <div className="bg-white rounded-2xl shadow-warm-sm p-4 mt-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sand-900">Últimos 14 días</p>
              <p className="text-sm text-sand-700">
                <ClockIcon className="w-4 h-4 inline -mt-0.5 mr-1" />
                Última charla: {haceCuanto(familia.ultimaConversacion)}
              </p>
            </div>
            <MiniBarras valores={familia.serie} etiqueta={`Mensajes por día, últimos 14 días: ${familia.serie.join(", ")}`} />
          </div>

          <Bloque
            titulo="Familia vinculada"
            nota={
              familia.familiares.length > 0
                ? `${familia.familiares.length} ${familia.familiares.length === 1 ? "persona acompaña" : "personas acompañan"} a ${familia.nombre}`
                : undefined
            }
          >
            {familia.familiares.length === 0 && (
              <p className="bg-white rounded-2xl p-4 text-sand-700 shadow-warm-sm">Nadie con cuenta está vinculado todavía.</p>
            )}
            {familia.familiares.map((m) => (
              <div key={m.usuarioId} className="bg-white rounded-2xl p-3.5 shadow-warm-sm flex items-center gap-3">
                <Avatar nombre={m.nombre} tamano="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sand-900 truncate">
                    {m.nombre}
                    {m.relacion && <span className="font-normal text-sand-700"> · {m.relacion}</span>}
                  </p>
                  <p className="text-sm text-sand-700 truncate">
                    <MailIcon className="w-4 h-4 inline -mt-0.5 mr-1" />
                    {m.email ?? "sin correo"}
                  </p>
                </div>
                <p className="text-sm text-sand-700 text-right shrink-0">
                  Ingresó
                  <br />
                  {haceCuanto(m.ultimoLogin)}
                </p>
              </div>
            ))}
            {familia.tieneCuentaPropia && (
              <p className="bg-white rounded-2xl p-3.5 shadow-warm-sm text-sand-800">
                <UserIcon className="w-5 h-5 inline -mt-0.5 mr-1.5" />
                {familia.nombre} se registró con su propia cuenta.
              </p>
            )}
          </Bloque>

          <Bloque titulo="Dispositivos" nota="Tablets o celulares donde usa Griyo">
            {familia.dispositivosDetalle.length === 0 && (
              <p className="bg-white rounded-2xl p-4 text-sand-700 shadow-warm-sm">
                {familia.tieneCuentaPropia ? "Entra con su cuenta, sin dispositivo vinculado." : "Sin dispositivo vinculado."}
              </p>
            )}
            {familia.dispositivosDetalle.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl p-3.5 shadow-warm-sm flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-dusk-100 text-dusk-700 grid place-items-center shrink-0">
                  <PhoneIcon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sand-900 truncate">{nombreDispositivo(d.nombre)}</p>
                  <p className="text-sm text-sand-700">Vinculado el {fechaLarga(d.creadoEn)}</p>
                </div>
                <p className="text-sm text-sand-700 text-right shrink-0">
                  Último uso
                  <br />
                  {haceCuanto(d.ultimoAcceso)}
                </p>
              </div>
            ))}
            <p className="text-sm text-sand-700">
              Notificaciones push: {familia.notificacionesPush > 0 ? `activas en ${familia.notificacionesPush}` : "sin activar"}
            </p>
          </Bloque>

          <Bloque titulo="Qué usan">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Dato valor={familia.memorias} etiqueta="Historias" />
              <Dato valor={familia.fotos} etiqueta="Fotos" />
              <Dato valor={familia.recordatoriosActivos} etiqueta="Recordatorios activos" />
              <Dato valor={familia.registrosAnimo} etiqueta="Registros de ánimo" />
              <Dato valor={familia.preguntasPendientes} etiqueta="Preguntas por responder" />
              <Dato valor={familia.alertasAnimo} etiqueta="Alertas de ánimo" />
            </div>
          </Bloque>

          <Bloque titulo="Suscripción">
            {!editando && (
              <div className="bg-white rounded-2xl p-4 shadow-warm-sm">
                {s ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-xl font-semibold text-sand-900">{nombrePlan(s.plan)}</p>
                        <p className="text-sand-700">{s.precio_clp > 0 ? `${clp.format(s.precio_clp)} al mes` : "Sin costo"}</p>
                      </div>
                      <ChipPlan suscripcion={s} />
                    </div>
                    <dl className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      <div>
                        <dt className="text-sand-700">Inicio</dt>
                        <dd className="text-sand-900 font-semibold">{s.inicio ? diaCalendario(s.inicio) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-sand-700">Próximo cobro</dt>
                        <dd className="text-sand-900 font-semibold">
                          {s.proximo_cobro ? `${diaCalendario(s.proximo_cobro)} · ${textoCobro(s.proximo_cobro)}` : "—"}
                        </dd>
                      </div>
                    </dl>
                    {s.notas && <p className="text-sand-800 mt-3 text-sm bg-sand-100 rounded-xl p-3">{s.notas}</p>}
                  </>
                ) : (
                  <p className="text-sand-700">Todavía no tiene un plan asignado.</p>
                )}
                <button
                  onClick={() => setEditando(true)}
                  disabled={!suscripcionesDisponibles}
                  className="mt-4 min-h-[46px] px-5 rounded-full bg-ember-500 text-white font-semibold hover:bg-ember-600 disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
                >
                  {s ? "Editar plan" : "Asignar plan"}
                </button>
                {!suscripcionesDisponibles && (
                  <p className="text-sm text-ember-800 mt-2">
                    Falta crear la tabla de suscripciones en Supabase (bloque «Suscripciones» de supabase/schema.sql).
                  </p>
                )}
              </div>
            )}
            {editando && (
              <div className="bg-white rounded-2xl p-4 shadow-warm-sm">
                <EditorSuscripcion
                  familia={familia}
                  onCancelar={() => setEditando(false)}
                  onGuardado={() => {
                    setEditando(false);
                    onGuardado();
                  }}
                />
              </div>
            )}
          </Bloque>

          <p className="mt-6 text-sm text-sand-700">
            <Chip tono="neutro">Privacidad</Chip>{" "}
            <span className="ml-1">Acá no se ve lo que {familia.nombre} conversa, solo cuánto usa Griyo.</span>
          </p>
        </div>
      </aside>
    </div>
  );
}
