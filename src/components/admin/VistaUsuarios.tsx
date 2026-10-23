"use client";

import { useMemo, useState } from "react";
import type { ResumenAdmin, UsuarioAdmin } from "@/lib/admin/resumen";
import { Avatar, Chip, ChipPlan, Tarjeta, VacioInfo, fechaCorta, haceCuanto, numero } from "./ui";
import { AlertIcon, ChevronRightIcon, MailIcon, SearchIcon } from "@/components/icons";

type Filtro = "todos" | "familiar" | "abuelo" | "pendiente";

const COLUMNAS = "md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:gap-4 md:items-center";

function etiquetaRol(u: UsuarioAdmin): string {
  if (u.rol === "familiar") return "Familiar";
  if (u.rol === "abuelo") return "Persona mayor";
  return "Sin perfil";
}

function Fila({ u, onAbrir }: { u: UsuarioAdmin; onAbrir: (id: string) => void }) {
  return (
    <li className={`${COLUMNAS} flex flex-col gap-3 px-4 sm:px-5 py-4 border-b border-sand-200 last:border-b-0`}>
      <div className="flex items-center gap-3 min-w-0">
        <Avatar nombre={u.nombre ?? u.email} />
        <div className="min-w-0">
          <p className="font-semibold text-sand-900 truncate">{u.nombre ?? "Sin nombre todavía"}</p>
          <p className="text-sm text-sand-700 truncate flex items-center gap-1">
            <MailIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{u.email ?? "sin correo"}</span>
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip tono={u.rol === "familiar" ? "info" : u.rol === "abuelo" ? "ember" : "neutro"}>{etiquetaRol(u)}</Chip>
            {!u.confirmado && <Chip tono="neutro">Correo sin confirmar</Chip>}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <p className="md:hidden text-xs font-semibold uppercase tracking-wide text-sand-700 mb-1">Vinculado a</p>
        {u.estado === "completa" && u.abueloId ? (
          <button
            onClick={() => onAbrir(u.abueloId as string)}
            className="group inline-flex items-center gap-2 text-left rounded-2xl bg-sand-100 hover:bg-sand-200 pl-1.5 pr-3 py-1.5 max-w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
          >
            <Avatar nombre={u.abueloNombre} tamano="sm" />
            <span className="min-w-0">
              <span className="block font-semibold text-sand-900 truncate">{u.abueloNombre}</span>
              <span className="block text-sm text-sand-700 truncate">
                {u.rol === "familiar" ? (u.relacion ? `Es su ${u.relacion.toLowerCase()}` : "Familiar") : "Su propia cuenta"}
                {u.otrosFamiliares > 0 ? ` · +${u.otrosFamiliares} ${u.otrosFamiliares === 1 ? "familiar" : "familiares"}` : ""}
              </span>
            </span>
            <ChevronRightIcon className="w-4 h-4 text-dusk-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : u.estado === "sin_perfil" ? (
          <Chip tono="alerta" icono={<AlertIcon className="w-4 h-4" />}>
            Creó la cuenta, falta su perfil
          </Chip>
        ) : (
          <Chip tono="alerta" icono={<AlertIcon className="w-4 h-4" />}>
            Falta crear a la persona mayor
          </Chip>
        )}
      </div>

      <div>
        <p className="md:hidden text-xs font-semibold uppercase tracking-wide text-sand-700 mb-1">Plan</p>
        {u.estado === "completa" ? <ChipPlan suscripcion={u.suscripcion} /> : <span className="text-sand-700">—</span>}
      </div>

      <div className="text-sm text-sand-700">
        <p>
          <span className="font-semibold text-sand-900">Ingresó</span> {haceCuanto(u.ultimoLogin)}
        </p>
        <p>{u.creadoEn ? `Registro: ${fechaCorta(u.creadoEn)}` : ""}</p>
      </div>
    </li>
  );
}

export default function VistaUsuarios({ resumen, onAbrirFamilia }: { resumen: ResumenAdmin; onAbrirFamilia: (id: string) => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const conteos = useMemo(
    () => ({
      todos: resumen.usuarios.length,
      familiar: resumen.usuarios.filter((u) => u.rol === "familiar").length,
      abuelo: resumen.usuarios.filter((u) => u.rol === "abuelo").length,
      pendiente: resumen.usuarios.filter((u) => u.estado !== "completa").length,
    }),
    [resumen]
  );

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return resumen.usuarios.filter((u) => {
      if (filtro === "pendiente" ? u.estado === "completa" : filtro !== "todos" && u.rol !== filtro) return false;
      if (!q) return true;
      return (
        (u.nombre ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.abueloNombre ?? "").toLowerCase().includes(q)
      );
    });
  }, [resumen, busqueda, filtro]);

  const sinCuenta = resumen.familias.filter((f) => !f.tieneCuentaPropia && f.familiares.length === 0);
  const filtros: { id: Filtro; texto: string }[] = [
    { id: "todos", texto: "Todos" },
    { id: "familiar", texto: "Familiares" },
    { id: "abuelo", texto: "Personas mayores" },
    { id: "pendiente", texto: "Sin completar" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Cuentas registradas", resumen.totales.cuentas],
          ["Familiares", conteos.familiar],
          ["Personas mayores con cuenta", conteos.abuelo],
          ["Registros sin completar", resumen.totales.cuentasSinCompletar],
        ].map(([titulo, valor]) => (
          <Tarjeta key={titulo as string} className="!p-5">
            <p className="text-sand-700 font-semibold text-sm">{titulo}</p>
            <p className="font-heading text-3xl font-semibold text-sand-900 mt-1 tabular-nums">{numero.format(valor as number)}</p>
          </Tarjeta>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-warm-sm p-4 sm:p-5 flex flex-col gap-4">
        <label className="relative">
          <span className="sr-only">Buscar usuario</span>
          <SearchIcon className="w-5 h-5 text-sand-700 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o persona mayor"
            className="w-full min-h-[48px] rounded-full border border-sand-500 bg-white pl-12 pr-4 text-base focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar usuarios">
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

      <section className="bg-white rounded-3xl shadow-warm-sm overflow-hidden" aria-label="Cuentas de usuario">
        <div className={`hidden ${COLUMNAS} px-5 py-3 bg-sand-100 text-xs font-semibold uppercase tracking-wide text-sand-700`}>
          <span>Usuario</span>
          <span>Vinculado a</span>
          <span>Plan</span>
          <span>Actividad</span>
        </div>
        {lista.length === 0 ? (
          <VacioInfo>No hay usuarios que coincidan con la búsqueda.</VacioInfo>
        ) : (
          <ul>
            {lista.map((u) => (
              <Fila key={u.authId} u={u} onAbrir={onAbrirFamilia} />
            ))}
          </ul>
        )}
      </section>

      {sinCuenta.length > 0 && (
        <p className="text-sm text-sand-700 px-1">
          {sinCuenta.length} {sinCuenta.length === 1 ? "persona mayor no tiene" : "personas mayores no tienen"} ningún familiar ni cuenta propia
          vinculados, por eso no aparecen en esta lista. Las ves en la pestaña Familias.
        </p>
      )}
    </div>
  );
}
