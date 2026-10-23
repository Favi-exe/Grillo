"use client";

import { useMemo } from "react";
import type { FamiliaAdmin, ResumenAdmin } from "@/lib/admin/resumen";
import { ESTADOS_SUSCRIPCION, PLANES } from "@/lib/admin/planes";
import { Avatar, ChipEstado, ChipPlan, Tarjeta, TituloSeccion, VacioInfo, clp, diaCalendario, diasHasta, textoCobro } from "./ui";

const ORDEN_ESTADO = ["activa", "prueba", "piloto", "pausada", "cancelada"];

function Cobro({ f }: { f: FamiliaAdmin }) {
  const s = f.suscripcion;
  if (!s?.proximo_cobro) return <span className="text-sand-700">—</span>;
  const vencido = s.estado === "activa" && diasHasta(s.proximo_cobro) < 0;
  return (
    <span className={vencido ? "text-clay-600 font-semibold" : "text-sand-900"}>
      {diaCalendario(s.proximo_cobro)}
      <span className={vencido ? "" : "text-sand-700"}> · {textoCobro(s.proximo_cobro)}</span>
    </span>
  );
}

export default function VistaSuscripciones({
  resumen,
  onEditar,
}: {
  resumen: ResumenAdmin;
  onEditar: (abueloId: string) => void;
}) {
  const t = resumen.totales;
  const conPlan = useMemo(
    () =>
      resumen.familias
        .filter((f) => f.suscripcion)
        .sort(
          (a, b) =>
            ORDEN_ESTADO.indexOf(a.suscripcion!.estado) - ORDEN_ESTADO.indexOf(b.suscripcion!.estado) ||
            b.suscripcion!.precio_clp - a.suscripcion!.precio_clp ||
            a.nombre.localeCompare(b.nombre)
        ),
    [resumen]
  );
  const sinPlan = resumen.familias.filter((f) => !f.suscripcion);

  const porPlan = PLANES.map((p) => {
    const lista = conPlan.filter((f) => f.suscripcion!.plan === p.id);
    const cobrando = lista.filter((f) => f.suscripcion!.estado === "activa");
    return {
      id: p.id,
      nombre: p.nombre,
      familias: lista.length,
      activas: cobrando.length,
      ingreso: cobrando.reduce((s, f) => s + f.suscripcion!.precio_clp, 0),
    };
  }).filter((p) => p.familias > 0);

  const cobrosProximos = conPlan.filter((f) => f.suscripcion!.estado === "activa" && f.suscripcion!.proximo_cobro && diasHasta(f.suscripcion!.proximo_cobro!) <= 14);

  if (!resumen.suscripcionesDisponibles) {
    return (
      <Tarjeta>
        <TituloSeccion titulo="Falta crear la tabla de suscripciones" />
        <p className="text-sand-800">
          Para llevar los planes de cada familia, corre el bloque «Suscripciones» al final de <code>supabase/schema.sql</code> en el SQL editor
          de Supabase y actualiza esta página.
        </p>
      </Tarjeta>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ["Ingreso mensual", clp.format(t.ingresoMensualClp), "de los planes activos"],
          ["Planes activos", String(t.suscripcionesPorEstado.activa), "cobrando hoy"],
          ["Piloto o prueba", String(t.suscripcionesPorEstado.piloto + t.suscripcionesPorEstado.prueba), "todavía sin cobro"],
          ["Sin plan asignado", String(t.sinSuscripcion), "familias por clasificar"],
        ].map(([titulo, valor, nota]) => (
          <Tarjeta key={titulo} className="!p-5">
            <p className="text-sand-700 font-semibold text-sm">{titulo}</p>
            <p className="font-heading text-3xl font-semibold text-sand-900 mt-1 tabular-nums">{valor}</p>
            <p className="text-sm text-sand-700">{nota}</p>
          </Tarjeta>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Tarjeta aria-labelledby="titulo-estados">
          <TituloSeccion id="titulo-estados" titulo="Por estado" nota="Cuántas familias hay en cada situación" />
          <ul className="grid gap-2">
            {ESTADOS_SUSCRIPCION.map((e) => (
              <li key={e.id} className="flex items-center justify-between bg-sand-100 rounded-2xl px-4 py-2.5">
                <ChipEstado estado={e.id} />
                <span className="font-heading text-xl font-semibold text-sand-900 tabular-nums">{t.suscripcionesPorEstado[e.id]}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta aria-labelledby="titulo-planes">
          <TituloSeccion id="titulo-planes" titulo="Por plan" nota="Familias e ingreso mensual de cada plan" />
          {porPlan.length === 0 ? (
            <VacioInfo>Todavía no asignaste ningún plan.</VacioInfo>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-left text-sm text-sand-700 border-b border-sand-300">
                  <th className="py-2 font-semibold">Plan</th>
                  <th className="py-2 font-semibold text-right">Familias</th>
                  <th className="py-2 font-semibold text-right">Activas</th>
                  <th className="py-2 font-semibold text-right">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {porPlan.map((p) => (
                  <tr key={p.id} className="border-b border-sand-200 last:border-b-0">
                    <td className="py-2.5 font-semibold text-sand-900">{p.nombre}</td>
                    <td className="py-2.5 text-right tabular-nums">{p.familias}</td>
                    <td className="py-2.5 text-right tabular-nums">{p.activas}</td>
                    <td className="py-2.5 text-right tabular-nums">{clp.format(p.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Tarjeta>
      </div>

      {cobrosProximos.length > 0 && (
        <Tarjeta aria-labelledby="titulo-cobros">
          <TituloSeccion id="titulo-cobros" titulo="Cobros de las próximas dos semanas" nota="Incluye los que ya están vencidos" />
          <ul className="grid gap-2">
            {cobrosProximos
              .sort((a, b) => a.suscripcion!.proximo_cobro!.localeCompare(b.suscripcion!.proximo_cobro!))
              .map((f) => (
                <li key={f.abueloId} className="flex items-center gap-3 bg-sand-100 rounded-2xl px-4 py-2.5">
                  <Avatar nombre={f.nombre} tamano="sm" />
                  <span className="font-semibold text-sand-900 truncate flex-1">{f.nombre}</span>
                  <span className="text-sand-900 tabular-nums">{clp.format(f.suscripcion!.precio_clp)}</span>
                  <Cobro f={f} />
                </li>
              ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta aria-labelledby="titulo-lista">
        <TituloSeccion id="titulo-lista" titulo="Plan de cada familia" nota={`${conPlan.length} con plan · ${sinPlan.length} sin plan`} />
        {conPlan.length === 0 ? (
          <VacioInfo>Todavía no hay planes asignados. Empieza por las familias de abajo.</VacioInfo>
        ) : (
          <ul className="divide-y divide-sand-200">
            {conPlan.map((f) => {
              const s = f.suscripcion!;
              return (
                <li key={f.abueloId} className="py-3.5 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 md:w-64 min-w-0">
                    <Avatar nombre={f.nombre} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sand-900 truncate">{f.nombre}</p>
                      <p className="text-sm text-sand-700 truncate">
                        {f.familiares.length > 0 ? f.familiares.map((m) => m.nombre.split(" ")[0]).join(", ") : "Sin familiares vinculados"}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-wrap items-center gap-x-5 gap-y-1">
                    <ChipPlan suscripcion={s} />
                    <span className="text-sand-900 tabular-nums">{s.precio_clp > 0 ? `${clp.format(s.precio_clp)} / mes` : "Sin costo"}</span>
                    <span className="text-sm">
                      <span className="text-sand-700">Próximo cobro: </span>
                      <Cobro f={f} />
                    </span>
                  </div>
                  {s.notas && <p className="text-sm text-sand-700 md:max-w-[16rem] truncate" title={s.notas}>{s.notas}</p>}
                  <button
                    onClick={() => onEditar(f.abueloId)}
                    className="min-h-[44px] px-4 rounded-full text-dusk-600 font-semibold hover:bg-dusk-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 self-start md:self-auto"
                  >
                    Editar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      {sinPlan.length > 0 && (
        <Tarjeta aria-labelledby="titulo-sinplan">
          <TituloSeccion id="titulo-sinplan" titulo="Familias sin plan" nota="Asígnales un plan para tener el cuadro completo" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {sinPlan.map((f) => (
              <li key={f.abueloId} className="flex items-center gap-3 border border-dashed border-sand-500 rounded-2xl px-3 py-2.5">
                <Avatar nombre={f.nombre} tamano="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sand-900 truncate">{f.nombre}</p>
                  <p className="text-sm text-sand-700 truncate">{f.mensajes30d > 0 ? `${f.mensajes30d} mensajes en 30 días` : "Aún no conversa"}</p>
                </div>
                <button
                  onClick={() => onEditar(f.abueloId)}
                  className="min-h-[40px] px-4 rounded-full bg-ember-500 text-white text-sm font-semibold hover:bg-ember-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300 shrink-0"
                >
                  Asignar plan
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <p className="text-sm text-sand-700 px-1">
        Estos planes los anotas tú a mano: Griyo todavía no cobra solo. El ingreso mensual suma únicamente los planes en estado «Activa». Los
        precios sugeridos de cada plan son los del stack de MIFA y se pueden editar por familia.
      </p>
    </div>
  );
}
