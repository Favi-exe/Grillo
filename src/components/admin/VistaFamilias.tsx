"use client";

import { useMemo, useState } from "react";
import type { FamiliaAdmin, ResumenAdmin } from "@/lib/admin/resumen";
import { Avatar, Chip, ChipActividad, ChipPlan, MiniBarras, VacioInfo, haceCuanto, numero } from "./ui";
import { AlertIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";

type Filtro = "todas" | "activa" | "inactiva" | "sin_uso" | "sin_plan";
type Orden = "uso" | "recientes" | "actividad";

function TarjetaFamilia({ f, onAbrir }: { f: FamiliaAdmin; onAbrir: () => void }) {
  const mostrados = f.familiares.slice(0, 3);
  const resto = f.familiares.length - mostrados.length;
  return (
    <button
      onClick={onAbrir}
      className="group text-left bg-white rounded-3xl shadow-warm-sm hover:shadow-warm p-5 transition-shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300 flex flex-col gap-4"
    >
      <div className="flex items-start gap-3">
        <Avatar nombre={f.nombre} />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-semibold text-sand-900 truncate">{f.nombre}</p>
          <p className="text-sm text-sand-700">{f.edad !== null ? `${f.edad} años` : "Edad sin registrar"}</p>
        </div>
        <ChipActividad actividad={f.actividad} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sand-700 mb-1.5">Familia vinculada</p>
        {f.familiares.length === 0 ? (
          f.tieneCuentaPropia ? (
            <Chip tono="ember">Usa su propia cuenta</Chip>
          ) : (
            <Chip tono="alerta" icono={<AlertIcon className="w-4 h-4" />}>
              Nadie vinculado
            </Chip>
          )
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {mostrados.map((m) => (
              <Chip key={m.usuarioId} tono="info">
                {m.nombre.split(" ")[0]}
                {m.relacion ? ` · ${m.relacion}` : ""}
              </Chip>
            ))}
            {resto > 0 && <Chip tono="neutro">+{resto}</Chip>}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-heading text-2xl font-semibold text-sand-900 tabular-nums">{numero.format(f.mensajes7d)}</p>
          <p className="text-sm text-sand-700">mensajes esta semana</p>
        </div>
        <MiniBarras valores={f.serie} etiqueta={`Mensajes por día, últimos 14 días: ${f.serie.join(", ")}`} />
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-sand-200">
        <div className="min-w-0">
          <ChipPlan suscripcion={f.suscripcion} />
          <p className="text-xs text-sand-700 mt-1.5">Última charla: {haceCuanto(f.ultimaConversacion)}</p>
        </div>
        <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-dusk-600 shrink-0">
          Ver detalle
          <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

export default function VistaFamilias({
  resumen,
  onAbrirFamilia,
  filtroInicial = "todas",
}: {
  resumen: ResumenAdmin;
  onAbrirFamilia: (id: string) => void;
  filtroInicial?: Filtro;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [orden, setOrden] = useState<Orden>("uso");

  const conteos = useMemo(
    () => ({
      todas: resumen.familias.length,
      activa: resumen.familias.filter((f) => f.actividad === "activa").length,
      inactiva: resumen.familias.filter((f) => f.actividad === "inactiva").length,
      sin_uso: resumen.familias.filter((f) => f.actividad === "sin_uso").length,
      sin_plan: resumen.familias.filter((f) => !f.suscripcion).length,
    }),
    [resumen]
  );

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = resumen.familias.filter((f) => {
      if (filtro === "sin_plan" ? Boolean(f.suscripcion) : filtro !== "todas" && f.actividad !== filtro) return false;
      if (!q) return true;
      return (
        f.nombre.toLowerCase().includes(q) ||
        f.familiares.some(
          (m) =>
            m.nombre.toLowerCase().includes(q) ||
            (m.email ?? "").toLowerCase().includes(q) ||
            (m.telefono ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))
        )
      );
    });
    const t = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
    return [...filtradas].sort((a, b) => {
      if (orden === "recientes") return t(b.creadaEn) - t(a.creadaEn);
      if (orden === "actividad") return t(b.ultimaActividad) - t(a.ultimaActividad);
      return b.mensajes7d - a.mensajes7d || b.mensajes30d - a.mensajes30d || t(b.creadaEn) - t(a.creadaEn);
    });
  }, [resumen, busqueda, filtro, orden]);

  const filtros: { id: Filtro; texto: string }[] = [
    { id: "todas", texto: "Todas" },
    { id: "activa", texto: "Activas" },
    { id: "inactiva", texto: "Inactivas" },
    { id: "sin_uso", texto: "Sin uso" },
    ...(resumen.suscripcionesDisponibles ? [{ id: "sin_plan" as Filtro, texto: "Sin plan" }] : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-3xl shadow-warm-sm p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="relative flex-1">
            <span className="sr-only">Buscar familia</span>
            <SearchIcon className="w-5 h-5 text-sand-700 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, familiar o correo"
              className="w-full min-h-[48px] rounded-full border border-sand-500 bg-white pl-12 pr-4 text-base focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-sand-800">
            Ordenar
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              className="min-h-[48px] rounded-full border border-sand-500 bg-white px-4 text-base font-normal focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
            >
              <option value="uso">Más uso esta semana</option>
              <option value="actividad">Actividad reciente</option>
              <option value="recientes">Recién registradas</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar familias">
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              aria-pressed={filtro === f.id}
              className={`min-h-[40px] px-4 rounded-full text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 ${
                filtro === f.id ? "bg-dusk-700 text-white" : "bg-sand-200 text-sand-800 hover:bg-sand-300"
              }`}
            >
              {f.texto} <span className={filtro === f.id ? "text-white/70" : "text-sand-700"}>{conteos[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-warm-sm">
          <VacioInfo>No hay familias que coincidan con la búsqueda.</VacioInfo>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((f) => (
            <TarjetaFamilia key={f.abueloId} f={f} onAbrir={() => onAbrirFamilia(f.abueloId)} />
          ))}
        </div>
      )}
    </div>
  );
}
