"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { FamiliaAdmin, ResumenAdmin } from "@/lib/admin/resumen";
import { Avatar, Chip, Segmentado, Tarjeta, TituloSeccion, clp, diaDeSerie, diasHasta, numero } from "./ui";
import {
  AlertIcon,
  CheckIcon,
  HomeIcon,
  PeopleIcon,
  TrendDownIcon,
  TrendUpIcon,
  WalletIcon,
  ChartIcon,
} from "@/components/icons";

/* ------------------------------- tarjetas KPI ------------------------------ */

function Kpi({
  icono,
  titulo,
  valor,
  nota,
  tono = "ember",
}: {
  icono: ReactNode;
  titulo: string;
  valor: string;
  nota: ReactNode;
  tono?: "ember" | "dusk" | "gold";
}) {
  const color = { ember: "bg-ember-100 text-ember-700", dusk: "bg-dusk-100 text-dusk-700", gold: "bg-gold-400/30 text-sand-900" }[tono];
  return (
    <Tarjeta className="!p-5">
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-full grid place-items-center ${color}`}>{icono}</span>
        <p className="text-sand-700 font-semibold">{titulo}</p>
      </div>
      <p className="font-heading text-4xl font-semibold text-sand-900 mt-3 tabular-nums">{valor}</p>
      <div className="text-sm text-sand-700 mt-1">{nota}</div>
    </Tarjeta>
  );
}

function Variacion({ actual, previo }: { actual: number; previo: number }) {
  if (actual === 0 && previo === 0) return <span>igual que la semana anterior</span>;
  if (previo === 0)
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-sand-900">
        <TrendUpIcon className="w-4 h-4" /> nuevo esta semana
      </span>
    );
  const pct = Math.round(((actual - previo) / previo) * 100);
  if (pct === 0) return <span>igual que la semana anterior</span>;
  const sube = pct > 0;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-1 font-semibold ${sube ? "text-sand-900" : "text-clay-600"}`}>
        {sube ? <TrendUpIcon className="w-4 h-4" /> : <TrendDownIcon className="w-4 h-4" />}
        {sube ? "+" : ""}
        {pct}%
      </span>
      vs. semana anterior
    </span>
  );
}

/* ---------------------------------- atención --------------------------------- */

interface ItemAtencion {
  clave: string;
  tono: "alerta" | "aviso" | "info";
  titulo: string;
  detalle: string;
  familias: FamiliaAdmin[];
}

function calcularAtencion(r: ResumenAdmin): ItemAtencion[] {
  const items: ItemAtencion[] = [];
  const f = r.familias;
  const ahora = Date.now();

  const emergencia = f.filter((x) => x.emergenciasActivas > 0);
  if (emergencia.length)
    items.push({ clave: "emergencia", tono: "alerta", titulo: "Alerta de emergencia activa", detalle: "Alguien pidió ayuda y la alerta sigue sin resolverse.", familias: emergencia });

  const sinUso = f.filter((x) => x.actividad === "sin_uso" && ahora - new Date(x.creadaEn).getTime() > 3 * 86400000);
  if (sinUso.length)
    items.push({ clave: "sinuso", tono: "aviso", titulo: `${sinUso.length} ${sinUso.length === 1 ? "familia se registró y nunca conversó" : "familias se registraron y nunca conversaron"}`, detalle: "Llevan más de 3 días en Griyo sin una sola charla. Vale la pena escribirles.", familias: sinUso });

  const inactivas = f.filter((x) => x.actividad === "inactiva");
  if (inactivas.length)
    items.push({ clave: "inactivas", tono: "aviso", titulo: `${inactivas.length} ${inactivas.length === 1 ? "familia dejó" : "familias dejaron"} de usar Griyo`, detalle: "Conversaron antes, pero llevan más de una semana sin hacerlo.", familias: inactivas });

  const cobros = f.filter((x) => x.suscripcion?.estado === "activa" && x.suscripcion.proximo_cobro && diasHasta(x.suscripcion.proximo_cobro) <= 7);
  if (cobros.length)
    items.push({ clave: "cobros", tono: "info", titulo: `${cobros.length} ${cobros.length === 1 ? "cobro" : "cobros"} por hacer esta semana`, detalle: "Planes activos con el próximo cobro en los próximos 7 días, o ya vencido.", familias: cobros });

  if (r.suscripcionesDisponibles) {
    const sinPlan = f.filter((x) => !x.suscripcion);
    if (sinPlan.length)
      items.push({ clave: "sinplan", tono: "info", titulo: `${sinPlan.length} ${sinPlan.length === 1 ? "familia" : "familias"} sin plan asignado`, detalle: "Asígnales un plan (aunque sea Piloto) para tener el panorama completo.", familias: sinPlan });
  }
  return items;
}

const ESTILO_ATENCION = {
  alerta: "bg-clay-400/15 border-clay-400/40",
  aviso: "bg-ember-50 border-ember-200",
  info: "bg-dusk-50 border-dusk-200",
};

function Atencion({ resumen, onAbrir }: { resumen: ResumenAdmin; onAbrir: (id: string) => void }) {
  const items = useMemo(() => calcularAtencion(resumen), [resumen]);
  const serviciosCaidos = resumen.integraciones.filter((i) => !i.activa);

  if (items.length === 0 && serviciosCaidos.length === 0) {
    return (
      <Tarjeta className="flex items-center gap-3 !py-4">
        <span className="w-10 h-10 rounded-full bg-gold-400/30 grid place-items-center">
          <CheckIcon className="w-5 h-5 text-sand-900" />
        </span>
        <p className="text-sand-900 font-semibold">Todo en orden: no hay nada que requiera atención ahora.</p>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta aria-labelledby="titulo-atencion">
      <TituloSeccion id="titulo-atencion" titulo="Requiere atención" nota="Lo que conviene mirar primero" />
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.clave} className={`rounded-2xl border p-4 ${ESTILO_ATENCION[it.tono]}`}>
            <p className="font-semibold text-sand-900 flex items-start gap-2">
              {it.tono === "alerta" && <AlertIcon className="w-5 h-5 text-clay-600 shrink-0 mt-0.5" />}
              {it.titulo}
            </p>
            <p className="text-sm text-sand-800 mt-0.5">{it.detalle}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {it.familias.slice(0, 5).map((fam) => (
                <button
                  key={fam.abueloId}
                  onClick={() => onAbrir(fam.abueloId)}
                  className="inline-flex items-center gap-1.5 bg-white rounded-full pl-1 pr-3 py-1 text-sm font-semibold text-sand-900 hover:bg-sand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
                >
                  <Avatar nombre={fam.nombre} tamano="sm" />
                  <span className="truncate max-w-[9rem]">{fam.nombre}</span>
                </button>
              ))}
              {it.familias.length > 5 && <span className="text-sm text-sand-700 self-center">+{it.familias.length - 5} más</span>}
            </div>
          </div>
        ))}
        {serviciosCaidos.length > 0 && (
          <div className={`rounded-2xl border p-4 ${ESTILO_ATENCION.aviso}`}>
            <p className="font-semibold text-sand-900">
              {serviciosCaidos.length} {serviciosCaidos.length === 1 ? "servicio sin configurar" : "servicios sin configurar"}
            </p>
            <p className="text-sm text-sand-800 mt-0.5">Esta parte de Griyo funciona en modo simulado hasta que se conecte.</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {serviciosCaidos.map((s) => (
                <Chip key={s.nombre} tono="alerta">
                  {s.nombre}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>
    </Tarjeta>
  );
}

/* ------------------------------ gráfico principal ----------------------------- */

function GraficoMensajes({ resumen }: { resumen: ResumenAdmin }) {
  const [rango, setRango] = useState<7 | 14 | 30>(14);
  const [tabla, setTabla] = useState(false);
  const serie = resumen.serie.slice(-rango);
  const [selPorRango, setSelPorRango] = useState<number | null>(null);
  const sel = Math.min(selPorRango ?? serie.length - 1, serie.length - 1);
  const max = Math.max(1, ...serie.map((s) => s.mensajes));
  const total = serie.reduce((a, s) => a + s.mensajes, 0);
  const actual = serie[sel];

  return (
    <Tarjeta aria-labelledby="titulo-serie">
      <TituloSeccion
        id="titulo-serie"
        titulo="Uso de la app"
        nota={`${numero.format(total)} mensajes en los últimos ${rango} días · cada mensaje es un turno de charla con Griyo`}
        derecha={<Segmentado etiqueta="Rango de días" valor={rango} onCambio={(v) => { setRango(v); setSelPorRango(null); }} opciones={[{ id: 7, texto: "7 días" }, { id: 14, texto: "14 días" }, { id: 30, texto: "30 días" }]} />}
      />

      {tabla ? (
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sand-700 border-b border-sand-300">
                <th className="py-2 pr-4 font-semibold">Día</th>
                <th className="py-2 pr-4 font-semibold text-right">Mensajes</th>
                <th className="py-2 pr-4 font-semibold text-right">Personas activas</th>
                <th className="py-2 font-semibold text-right">Historias nuevas</th>
              </tr>
            </thead>
            <tbody>
              {[...serie].reverse().map((s) => (
                <tr key={s.fecha} className="border-b border-sand-200">
                  <td className="py-2 pr-4 text-sand-900">{diaDeSerie(s.fecha)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{numero.format(s.mensajes)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{s.personasActivas}</td>
                  <td className="py-2 text-right tabular-nums">{s.memorias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="relative pl-7">
            <span className="absolute left-0 top-0 text-xs text-sand-700 tabular-nums">{numero.format(max)}</span>
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-sand-700 tabular-nums">{numero.format(Math.round(max / 2))}</span>
            <span className="absolute left-0 bottom-6 text-xs text-sand-700 tabular-nums">0</span>
            <div className="relative h-48 border-b border-sand-400">
              <div className="absolute inset-x-0 top-0 border-t border-dashed border-sand-300" aria-hidden="true" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-sand-300" aria-hidden="true" />
              <div className="relative h-full flex items-end gap-[3px] sm:gap-1.5" role="group" aria-label="Mensajes por día">
                {serie.map((s, i) => {
                  const alto = s.mensajes === 0 ? 0 : Math.max(5, Math.round((s.mensajes / max) * 100));
                  const elegido = i === sel;
                  return (
                    <button
                      key={s.fecha}
                      type="button"
                      onClick={() => setSelPorRango(i)}
                      onMouseEnter={() => setSelPorRango(i)}
                      onFocus={() => setSelPorRango(i)}
                      aria-label={`${diaDeSerie(s.fecha)}: ${s.mensajes} mensajes, ${s.personasActivas} personas activas`}
                      aria-pressed={elegido}
                      className={`flex-1 h-full flex items-end rounded-t-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 ${elegido ? "bg-ember-50" : ""}`}
                    >
                      <span
                        className={`w-full rounded-t-[5px] transition-colors ${elegido ? "bg-ember-600" : "bg-ember-400"}`}
                        style={{ height: s.mensajes === 0 ? "3px" : `${alto}%`, backgroundColor: s.mensajes === 0 ? "#D9C4AC" : undefined }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between text-xs text-sand-700 mt-1.5">
              <span>{diaDeSerie(serie[0].fecha)}</span>
              <span>{diaDeSerie(serie[serie.length - 1].fecha)}</span>
            </div>
          </div>
          <p className="mt-4 bg-sand-100 rounded-2xl px-4 py-3 text-sand-900" aria-live="polite">
            <span className="font-semibold">{diaDeSerie(actual.fecha)}</span>
            <span className="text-sand-700"> · </span>
            {numero.format(actual.mensajes)} {actual.mensajes === 1 ? "mensaje" : "mensajes"}
            <span className="text-sand-700"> · </span>
            {actual.personasActivas} {actual.personasActivas === 1 ? "persona activa" : "personas activas"}
            <span className="text-sand-700"> · </span>
            {actual.memorias} {actual.memorias === 1 ? "historia nueva" : "historias nuevas"}
          </p>
        </>
      )}
      <button onClick={() => setTabla((v) => !v)} className="mt-3 text-sm font-semibold text-dusk-600 underline underline-offset-2 min-h-[36px]">
        {tabla ? "Ver gráfico" : "Ver como tabla"}
      </button>
    </Tarjeta>
  );
}

/* ----------------------------- barras horizontales ---------------------------- */

function BarrasH({
  filas,
  base,
  color,
  formato,
}: {
  filas: { etiqueta: string; valor: number; onClick?: () => void; extra?: ReactNode }[];
  base: number;
  color: string;
  formato: (valor: number) => string;
}) {
  return (
    <ul className="grid gap-3">
      {filas.map((f) => {
        const pct = base > 0 ? Math.round((f.valor / base) * 100) : 0;
        const contenido = (
          <>
            <span className="flex items-center justify-between gap-3 text-base">
              <span className="text-sand-900 font-semibold truncate flex items-center gap-2">{f.etiqueta}</span>
              <span className="text-sand-800 tabular-nums shrink-0">{formato(f.valor)}</span>
            </span>
            <span className="block h-3 rounded-full bg-sand-200 mt-1.5 overflow-hidden">
              <span className={`block h-full rounded-full ${color}`} style={{ width: f.valor > 0 ? `${Math.max(pct, 3)}%` : "0%" }} />
            </span>
          </>
        );
        return (
          <li key={f.etiqueta}>
            {f.onClick ? (
              <button onClick={f.onClick} className="w-full text-left rounded-xl hover:bg-sand-100 -mx-2 px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400" style={{ width: "calc(100% + 1rem)" }}>
                {contenido}
              </button>
            ) : (
              contenido
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Embudo({ resumen }: { resumen: ResumenAdmin }) {
  const base = resumen.embudo[0]?.valor ?? 0;
  return (
    <Tarjeta aria-labelledby="titulo-embudo">
      <TituloSeccion id="titulo-embudo" titulo="De registrarse a usar Griyo" nota="Cuántas familias llegan a cada paso" />
      <BarrasH
        filas={resumen.embudo.map((e) => ({ etiqueta: e.etiqueta, valor: e.valor }))}
        base={base}
        color="bg-ember-400"
        formato={(v) => `${v} de ${base}${base > 0 ? ` · ${Math.round((v / base) * 100)}%` : ""}`}
      />
    </Tarjeta>
  );
}

function Adopcion({ resumen }: { resumen: ResumenAdmin }) {
  const base = resumen.totales.familias;
  return (
    <Tarjeta aria-labelledby="titulo-adopcion">
      <TituloSeccion id="titulo-adopcion" titulo="Qué funciones usan" nota="Familias que usaron cada función al menos una vez" />
      <BarrasH
        filas={resumen.adopcion.map((a) => ({ etiqueta: a.etiqueta, valor: a.familias }))}
        base={base}
        color="bg-dusk-400"
        formato={(v) => `${v} de ${base}`}
      />
    </Tarjeta>
  );
}

function HorasDelDia({ porHora }: { porHora: number[] }) {
  const max = Math.max(1, ...porHora);
  const total = porHora.reduce((a, b) => a + b, 0);
  const pico = total > 0 ? porHora.indexOf(Math.max(...porHora)) : -1;
  const [sel, setSel] = useState<number | null>(null);
  const h = sel ?? (pico >= 0 ? pico : null);
  return (
    <Tarjeta aria-labelledby="titulo-horas">
      <TituloSeccion id="titulo-horas" titulo="A qué hora conversan" nota="Mensajes de los últimos 30 días por hora del día (hora de Chile)" />
      {total === 0 ? (
        <p className="text-sand-700 py-6 text-center">Todavía no hay conversaciones en los últimos 30 días.</p>
      ) : (
        <>
          <div className="flex items-end gap-[3px] h-32 border-b border-sand-400" role="group" aria-label="Mensajes por hora del día">
            {porHora.map((v, i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                onClick={() => setSel(i)}
                aria-label={`${i} horas: ${v} mensajes`}
                className="flex-1 h-full flex items-end focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 rounded-t"
              >
                <span
                  className={`w-full rounded-t-[4px] ${i === h ? "bg-dusk-600" : "bg-dusk-300"}`}
                  style={{ height: v === 0 ? "3px" : `${Math.max(6, (v / max) * 100)}%`, backgroundColor: v === 0 ? "#D9C4AC" : undefined }}
                />
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-sand-700 mt-1.5 px-0.5">
            {[0, 6, 12, 18, 23].map((x) => (
              <span key={x}>{x} h</span>
            ))}
          </div>
          {h !== null && (
            <p className="mt-3 text-sand-900" aria-live="polite">
              <span className="font-semibold">{h}:00 a {h}:59</span> · {numero.format(porHora[h])} mensajes
              {h === pico && <span className="text-sand-700"> · hora de más uso</span>}
            </p>
          )}
        </>
      )}
    </Tarjeta>
  );
}

function TopFamilias({ resumen, onAbrir }: { resumen: ResumenAdmin; onAbrir: (id: string) => void }) {
  const top = [...resumen.familias].filter((f) => f.mensajes30d > 0).sort((a, b) => b.mensajes30d - a.mensajes30d).slice(0, 6);
  const max = top[0]?.mensajes30d ?? 0;
  return (
    <Tarjeta aria-labelledby="titulo-top">
      <TituloSeccion id="titulo-top" titulo="Quiénes más usan Griyo" nota="Mensajes de los últimos 30 días" />
      {top.length === 0 ? (
        <p className="text-sand-700 py-6 text-center">Todavía no hay conversaciones en los últimos 30 días.</p>
      ) : (
        <BarrasH
          filas={top.map((f) => ({
            etiqueta: f.nombre,
            valor: f.mensajes30d,
            onClick: () => onAbrir(f.abueloId),
          }))}
          base={max}
          color="bg-ember-400"
          formato={(v) => `${numero.format(v)} mensajes`}
        />
      )}
    </Tarjeta>
  );
}

function Servicios({ resumen }: { resumen: ResumenAdmin }) {
  return (
    <Tarjeta aria-labelledby="titulo-servicios">
      <TituloSeccion id="titulo-servicios" titulo="Servicios conectados" nota={`Tope de ${resumen.limiteMensajesDiarios} mensajes por persona cada 24 horas`} />
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {resumen.integraciones.map((i) => (
          <li key={i.nombre} className="flex items-center justify-between gap-3 bg-sand-100 rounded-2xl px-4 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-sand-900 truncate">{i.nombre}</p>
              <p className="text-sm text-sand-700 truncate">{i.detalle}</p>
            </div>
            {i.activa ? (
              <Chip tono="ok" icono={<CheckIcon className="w-4 h-4" />}>Conectado</Chip>
            ) : (
              <Chip tono="alerta" icono={<AlertIcon className="w-4 h-4" />}>Sin configurar</Chip>
            )}
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

/* ----------------------------------- vista ----------------------------------- */

export default function VistaResumen({ resumen, onAbrirFamilia }: { resumen: ResumenAdmin; onAbrirFamilia: (id: string) => void }) {
  const t = resumen.totales;
  const pctActivas = t.familias > 0 ? Math.round((t.activas7d / t.familias) * 100) : 0;
  const enPrueba = t.suscripcionesPorEstado.piloto + t.suscripcionesPorEstado.prueba;

  return (
    <div className="flex flex-col gap-5">
      <Atencion resumen={resumen} onAbrir={onAbrirFamilia} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          icono={<HomeIcon className="w-5 h-5" />}
          titulo="Familias"
          valor={numero.format(t.familias)}
          nota={t.familiasNuevas7d > 0 ? `${t.familiasNuevas7d} ${t.familiasNuevas7d === 1 ? "nueva" : "nuevas"} esta semana` : "ninguna nueva esta semana"}
        />
        <Kpi
          icono={<PeopleIcon className="w-5 h-5" />}
          titulo="Activas esta semana"
          valor={`${t.activas7d} de ${t.familias}`}
          nota={`${pctActivas}% de las familias · ${t.sinUso} nunca conversaron`}
          tono="dusk"
        />
        <Kpi
          icono={<ChartIcon className="w-5 h-5" />}
          titulo="Mensajes (7 días)"
          valor={numero.format(t.mensajes7d)}
          nota={
            <>
              <Variacion actual={t.mensajes7d} previo={t.mensajesPrevios7d} />
              <br />
              {numero.format(t.mensajesHoy)} hoy · {numero.format(t.mensajes30d)} en 30 días
            </>
          }
        />
        <Kpi
          icono={<WalletIcon className="w-5 h-5" />}
          titulo="Ingreso mensual"
          valor={clp.format(t.ingresoMensualClp)}
          nota={`${t.suscripcionesPorEstado.activa} ${t.suscripcionesPorEstado.activa === 1 ? "plan activo" : "planes activos"} · ${enPrueba} en piloto o prueba`}
          tono="gold"
        />
      </div>

      <GraficoMensajes resumen={resumen} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Embudo resumen={resumen} />
        <Adopcion resumen={resumen} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <HorasDelDia porHora={resumen.porHora} />
        <TopFamilias resumen={resumen} onAbrir={onAbrirFamilia} />
      </div>

      <Tarjeta aria-labelledby="titulo-totales">
        <TituloSeccion id="titulo-totales" titulo="En total" nota="Todo lo acumulado desde que existe Griyo" />
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Cuentas registradas", t.cuentas],
            ["Mensajes", t.mensajesTotal],
            ["Historias guardadas", t.memorias],
            ["Fotos del libro", t.fotos],
            ["Dispositivos vinculados", t.dispositivos],
            ["Con notificaciones push", t.notificacionesPush],
            ["Recordatorios activos", t.recordatoriosActivos],
            ["Alertas de emergencia", t.emergenciasTotal],
          ].map(([nombre, valor]) => (
            <div key={nombre as string} className="bg-sand-100 rounded-2xl px-4 py-3">
              <dt className="text-sm text-sand-700">{nombre}</dt>
              <dd className="font-heading text-2xl font-semibold text-sand-900 tabular-nums">{numero.format(valor as number)}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <Servicios resumen={resumen} />
    </div>
  );
}
