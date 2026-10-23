"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import type { ResumenAdmin } from "@/lib/admin/resumen";
import FamiliaDetalle from "./FamiliaDetalle";
import VistaFamilias from "./VistaFamilias";
import VistaResumen from "./VistaResumen";
import VistaSuscripciones from "./VistaSuscripciones";
import VistaUsuarios from "./VistaUsuarios";
import { haceCuanto, numero } from "./ui";
import { ChartIcon, CricketMark, HomeIcon, LogOutIcon, PeopleIcon, RefreshIcon, UserIcon, WalletIcon } from "@/components/icons";

type Pestana = "resumen" | "familias" | "usuarios" | "suscripciones";

const PESTANAS: { id: Pestana; texto: string; Icono: (p: { className?: string }) => ReactNode }[] = [
  { id: "resumen", texto: "Resumen", Icono: ChartIcon },
  { id: "familias", texto: "Familias", Icono: HomeIcon },
  { id: "usuarios", texto: "Usuarios", Icono: UserIcon },
  { id: "suscripciones", texto: "Suscripciones", Icono: WalletIcon },
];

function pestanaDesdeHash(): Pestana {
  if (typeof window === "undefined") return "resumen";
  const h = window.location.hash.replace("#", "");
  return PESTANAS.some((p) => p.id === h) ? (h as Pestana) : "resumen";
}

export default function AdminPanel({ onSalir }: { onSalir: () => void }) {
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null);
  const [error, setError] = useState<{ texto: string; sinAcceso: boolean } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [seleccion, setSeleccion] = useState<{ abueloId: string; editar: boolean } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetchFamiliar("/api/admin/resumen");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ texto: data.error ?? "No se pudo cargar el panel.", sinAcceso: res.status === 401 || res.status === 403 });
        setResumen(null);
      } else {
        setError(null);
        setResumen(data as ResumenAdmin);
      }
    } catch {
      setError({ texto: "No se pudo conectar con el servidor.", sinAcceso: false });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    setPestana(pestanaDesdeHash());
    cargar();
  }, [cargar]);

  const cambiarPestana = (p: Pestana) => {
    setPestana(p);
    window.history.replaceState(null, "", `#${p}`);
  };

  const cerrarDetalle = useCallback(() => setSeleccion(null), []);
  const familiaSeleccionada = useMemo(
    () => (seleccion && resumen ? resumen.familias.find((f) => f.abueloId === seleccion.abueloId) ?? null : null),
    [seleccion, resumen]
  );

  const conteos: Partial<Record<Pestana, number>> = resumen
    ? { familias: resumen.totales.familias, usuarios: resumen.totales.cuentas }
    : {};

  return (
    <div className="flex flex-col gap-5">
      {/* Cabecera */}
      <header className="rounded-4xl bg-gradient-to-br from-dusk-800 via-dusk-700 to-dusk-500 text-white p-5 sm:p-7 shadow-warm-lg opacity-0 animate-fade-rise">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-white/15 grid place-items-center">
              <CricketMark className="w-9 h-9 text-ember-200" />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold leading-tight">Panel de Griyo</h1>
              <p className="text-dusk-100">
                {resumen
                  ? `${numero.format(resumen.totales.familias)} familias · ${numero.format(resumen.totales.cuentas)} cuentas · actualizado ${haceCuanto(resumen.generadoEn)}`
                  : "Uso, familias y suscripciones"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cargar}
              disabled={cargando}
              className="min-h-[46px] flex items-center gap-2 px-4 rounded-full bg-white/15 hover:bg-white/25 font-semibold disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
            >
              <RefreshIcon className={`w-5 h-5 ${cargando ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              onClick={onSalir}
              className="min-h-[46px] flex items-center gap-2 px-4 rounded-full hover:bg-white/15 focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
            >
              <LogOutIcon className="w-5 h-5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="bg-white rounded-3xl shadow-warm-sm p-6 max-w-xl">
          <h2 className="font-heading text-xl font-semibold text-sand-900 mb-2">
            {error.sinAcceso ? "No tienes acceso a este panel" : "No se pudo cargar"}
          </h2>
          <p className="text-sand-800 mb-4">{error.texto}</p>
          {!error.sinAcceso && (
            <button onClick={cargar} className="min-h-[46px] px-6 rounded-full bg-ember-500 text-white font-semibold hover:bg-ember-600">
              Reintentar
            </button>
          )}
        </div>
      ) : !resumen ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Cargando panel">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl shadow-warm-sm h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Pestañas */}
          <nav className="sticky top-3 z-20" aria-label="Secciones del panel">
            <div role="tablist" className="flex gap-1 bg-white/95 backdrop-blur rounded-full p-1.5 shadow-warm-sm overflow-x-auto">
              {PESTANAS.map(({ id, texto, Icono }) => {
                const activa = pestana === id;
                return (
                  <button
                    key={id}
                    role="tab"
                    id={`tab-${id}`}
                    aria-selected={activa}
                    aria-controls={`panel-${id}`}
                    onClick={() => cambiarPestana(id)}
                    className={`min-h-[46px] flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 rounded-full font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300 ${
                      activa ? "bg-dusk-700 text-white" : "text-sand-800 hover:bg-sand-200"
                    }`}
                  >
                    <Icono className="w-5 h-5" />
                    <span className={activa ? "" : "hidden sm:inline"}>{texto}</span>
                    {conteos[id] !== undefined && (
                      <span className={`text-sm rounded-full px-2 ${activa ? "bg-white/20" : "bg-sand-300 hidden sm:inline"}`}>{conteos[id]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`} className={cargando ? "opacity-70 transition-opacity" : "transition-opacity"}>
            {pestana === "resumen" && (
              <VistaResumen resumen={resumen} onAbrirFamilia={(id) => setSeleccion({ abueloId: id, editar: false })} />
            )}
            {pestana === "familias" && (
              <VistaFamilias resumen={resumen} onAbrirFamilia={(id) => setSeleccion({ abueloId: id, editar: false })} />
            )}
            {pestana === "usuarios" && (
              <VistaUsuarios resumen={resumen} onAbrirFamilia={(id) => setSeleccion({ abueloId: id, editar: false })} />
            )}
            {pestana === "suscripciones" && (
              <VistaSuscripciones resumen={resumen} onEditar={(id) => setSeleccion({ abueloId: id, editar: true })} />
            )}
          </div>

          <p className="text-sm text-sand-700 text-center pb-4">
            Este panel muestra cuánto se usa Griyo, no lo que las personas cuentan: nunca incluye el texto de las charlas ni de las historias.
          </p>
        </>
      )}

      {resumen && familiaSeleccionada && seleccion && (
        <FamiliaDetalle
          key={`${familiaSeleccionada.abueloId}-${seleccion.editar}`}
          familia={familiaSeleccionada}
          suscripcionesDisponibles={resumen.suscripcionesDisponibles}
          editarInicial={seleccion.editar}
          onCerrar={cerrarDetalle}
          onGuardado={cargar}
        />
      )}
    </div>
  );
}
