import { getSupabaseClient } from "@/lib/db/supabaseClient";
import type { EstadoSuscripcion, Suscripcion } from "@/lib/types";

/**
 * Agregación para el panel /admin. Corre con la service_role key, así que
 * ve a todas las familias — por eso SOLO se llama detrás de requireAdmin.
 * A propósito nunca trae el texto de las conversaciones ni de las memorias:
 * el panel muestra cuánto se usa Griyo, no lo que la gente cuenta.
 */

export const DIAS_SERIE = 30;
const DIAS_SERIE_FAMILIA = 14;
const DIA_MS = 24 * 60 * 60 * 1000;
const TOPE_FILAS = 50000;
const TZ = "America/Santiago";

export type ActividadFamilia = "activa" | "inactiva" | "sin_uso";

export interface FamiliarAdmin {
  usuarioId: string;
  nombre: string;
  email: string | null;
  relacion: string | null;
  ultimoLogin: string | null;
  creadoEn: string | null;
}

export interface DispositivoAdmin {
  nombre: string | null;
  creadoEn: string;
  ultimoAcceso: string | null;
}

export interface FamiliaAdmin {
  abueloId: string;
  nombre: string;
  edad: number | null;
  creadaEn: string;
  familiares: FamiliarAdmin[];
  tieneCuentaPropia: boolean;
  dispositivosDetalle: DispositivoAdmin[];
  actividad: ActividadFamilia;
  ultimaActividad: string | null;
  ultimaConversacion: string | null;
  mensajes7d: number;
  mensajes30d: number;
  mensajesTotal: number;
  /** Mensajes por día de los últimos 14 días, del más viejo al más nuevo. */
  serie: number[];
  memorias: number;
  fotos: number;
  recordatoriosActivos: number;
  notificacionesPush: number;
  preguntasTotal: number;
  preguntasPendientes: number;
  registrosAnimo: number;
  alertasAnimo: number;
  emergenciasActivas: number;
  suscripcion: Suscripcion | null;
}

export type EstadoCuenta = "completa" | "sin_perfil" | "sin_abuelo";

export interface UsuarioAdmin {
  authId: string;
  email: string | null;
  confirmado: boolean;
  creadoEn: string | null;
  ultimoLogin: string | null;
  nombre: string | null;
  rol: "familiar" | "abuelo" | null;
  relacion: string | null;
  estado: EstadoCuenta;
  abueloId: string | null;
  abueloNombre: string | null;
  /** Otros familiares vinculados a la misma persona mayor. */
  otrosFamiliares: number;
  mensajes7d: number;
  suscripcion: Suscripcion | null;
}

export interface PuntoSerie {
  fecha: string;
  mensajes: number;
  personasActivas: number;
  memorias: number;
}

export interface ResumenAdmin {
  generadoEn: string;
  truncado: boolean;
  totales: {
    familias: number;
    familiasNuevas7d: number;
    cuentas: number;
    cuentasSinCompletar: number;
    activas7d: number;
    sinUso: number;
    mensajesHoy: number;
    mensajes7d: number;
    mensajesPrevios7d: number;
    mensajes30d: number;
    mensajesTotal: number;
    memorias: number;
    fotos: number;
    dispositivos: number;
    notificacionesPush: number;
    recordatoriosActivos: number;
    preguntasPendientes: number;
    alertasAnimo: number;
    emergenciasActivas: number;
    emergenciasTotal: number;
    sinSuscripcion: number;
    suscripcionesPorEstado: Record<EstadoSuscripcion, number>;
    ingresoMensualClp: number;
  };
  /** Últimos 30 días, del más viejo al más nuevo. */
  serie: PuntoSerie[];
  /** Mensajes de los últimos 30 días por hora del día (0–23, hora de Chile). */
  porHora: number[];
  embudo: { etiqueta: string; valor: number }[];
  adopcion: { etiqueta: string; familias: number }[];
  familias: FamiliaAdmin[];
  usuarios: UsuarioAdmin[];
  suscripcionesDisponibles: boolean;
  integraciones: { nombre: string; activa: boolean; detalle: string }[];
  limiteMensajesDiarios: number;
}

type Fila = Record<string, unknown>;

/** PostgREST corta en 1000 filas por consulta: se pide por páginas. */
async function traerTodo(
  tabla: string,
  columnas: string
): Promise<{ filas: Fila[]; truncado: boolean }> {
  const db = getSupabaseClient();
  const PAGINA = 1000;
  const filas: Fila[] = [];
  for (let desde = 0; desde < TOPE_FILAS; desde += PAGINA) {
    const { data, error } = await db
      .from(tabla)
      .select(columnas)
      .order("id", { ascending: true })
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    const lote = (data ?? []) as unknown as Fila[];
    filas.push(...lote);
    if (lote.length < PAGINA) return { filas, truncado: false };
  }
  return { filas, truncado: true };
}

interface CuentaAuth {
  email: string | null;
  ultimoLogin: string | null;
  creadoEn: string | null;
  confirmado: boolean;
}

async function listarCuentasAuth(): Promise<Map<string, CuentaAuth>> {
  const db = getSupabaseClient();
  const mapa = new Map<string, CuentaAuth>();
  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      mapa.set(u.id, {
        email: u.email ?? null,
        ultimoLogin: u.last_sign_in_at ?? null,
        creadoEn: u.created_at ?? null,
        confirmado: Boolean(u.email_confirmed_at),
      });
    }
    if (data.users.length < 1000) break;
  }
  return mapa;
}

/** La tabla suscripciones es opcional: si todavía no se corrió el SQL, el panel avisa en vez de romperse. */
async function traerSuscripciones(): Promise<{ filas: Suscripcion[]; disponible: boolean }> {
  const { data, error } = await getSupabaseClient().from("suscripciones").select("*");
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return { filas: [], disponible: false };
    throw error;
  }
  return { filas: (data ?? []) as Suscripcion[], disponible: true };
}

const fechaChile = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const horaChile = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" });

function diaChile(d: Date | string | number): string {
  return fechaChile.format(new Date(d));
}

function contarPor(filas: Fila[], filtro?: (f: Fila) => boolean): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of filas) {
    if (filtro && !filtro(f)) continue;
    const id = f.abuelo_id as string;
    m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

function maxFecha(a: string | null, b: string | null | undefined): string | null {
  if (!b) return a;
  if (!a) return b;
  return new Date(b) > new Date(a) ? b : a;
}

function calcularEdad(fechaNacimiento: unknown, ahora: number): number | null {
  if (typeof fechaNacimiento !== "string") return null;
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return null;
  const edad = Math.floor((ahora - nac.getTime()) / (365.25 * DIA_MS));
  return edad >= 0 && edad < 130 ? edad : null;
}

export async function construirResumenAdmin(): Promise<ResumenAdmin> {
  const ahora = Date.now();
  const hace7d = ahora - 7 * DIA_MS;
  const hace14d = ahora - 14 * DIA_MS;
  const hace30d = ahora - 30 * DIA_MS;

  const [
    abuelos,
    usuarios,
    conversaciones,
    memorias,
    recordatorios,
    dispositivos,
    push,
    emergencias,
    fotos,
    preguntas,
    registrosAnimo,
    alertasAnimo,
    suscripciones,
    cuentas,
  ] = await Promise.all([
    traerTodo("abuelos", "id,nombre,fecha_nacimiento,created_at"),
    traerTodo("usuarios", "id,nombre,rol,relacion_con_abuelo,abuelo_id,auth_user_id,created_at"),
    traerTodo("conversaciones", "id,abuelo_id,fecha"),
    traerTodo("memorias", "id,abuelo_id,fecha"),
    traerTodo("recordatorios", "id,abuelo_id,activo"),
    traerTodo("abuelo_dispositivos", "id,abuelo_id,nombre_dispositivo,created_at,ultimo_acceso"),
    traerTodo("push_subscriptions", "id,abuelo_id"),
    traerTodo("alertas_emergencia", "id,abuelo_id,estado"),
    traerTodo("fotos", "id,abuelo_id"),
    traerTodo("preguntas_familia", "id,abuelo_id,estado"),
    traerTodo("registros_animo", "id,abuelo_id"),
    traerTodo("alertas_animo", "id,abuelo_id"),
    traerSuscripciones(),
    listarCuentasAuth(),
  ]);

  const truncado = [conversaciones, memorias, fotos].some((t) => t.truncado);

  // --- Conversaciones: por persona, por día y por hora (hora de Chile) ------
  const mensajesTotal = contarPor(conversaciones.filas);
  const mensajes7d = new Map<string, number>();
  const mensajes30d = new Map<string, number>();
  let mensajesPrevios7d = 0;
  const ultimaConversacion = new Map<string, string>();
  const porDia = new Map<string, { mensajes: number; personas: Set<string> }>();
  const porDiaFamilia = new Map<string, Map<string, number>>();
  const porHora = new Array<number>(24).fill(0);
  for (const c of conversaciones.filas) {
    const abueloId = c.abuelo_id as string;
    const fecha = c.fecha as string;
    const t = new Date(fecha).getTime();
    if (t >= hace7d) mensajes7d.set(abueloId, (mensajes7d.get(abueloId) ?? 0) + 1);
    else if (t >= hace14d) mensajesPrevios7d += 1;
    if (t >= hace30d) {
      mensajes30d.set(abueloId, (mensajes30d.get(abueloId) ?? 0) + 1);
      porHora[Number(horaChile.format(t)) % 24] += 1;
    }
    const previa = ultimaConversacion.get(abueloId);
    if (!previa || t > new Date(previa).getTime()) ultimaConversacion.set(abueloId, fecha);
    const dia = diaChile(t);
    const acum = porDia.get(dia) ?? { mensajes: 0, personas: new Set<string>() };
    acum.mensajes += 1;
    acum.personas.add(abueloId);
    porDia.set(dia, acum);
    const delAbuelo = porDiaFamilia.get(abueloId) ?? new Map<string, number>();
    delAbuelo.set(dia, (delAbuelo.get(dia) ?? 0) + 1);
    porDiaFamilia.set(abueloId, delAbuelo);
  }

  const memoriasPorDia = new Map<string, number>();
  for (const m of memorias.filas) {
    if (!m.fecha) continue;
    const dia = diaChile(m.fecha as string);
    memoriasPorDia.set(dia, (memoriasPorDia.get(dia) ?? 0) + 1);
  }

  const dias30: string[] = [];
  for (let i = DIAS_SERIE - 1; i >= 0; i--) dias30.push(diaChile(ahora - i * DIA_MS));
  const serie: PuntoSerie[] = dias30.map((fecha) => ({
    fecha,
    mensajes: porDia.get(fecha)?.mensajes ?? 0,
    personasActivas: porDia.get(fecha)?.personas.size ?? 0,
    memorias: memoriasPorDia.get(fecha) ?? 0,
  }));
  const dias14 = dias30.slice(-DIAS_SERIE_FAMILIA);

  // --- Conteos por persona mayor ---------------------------------------------
  const memoriasPor = contarPor(memorias.filas);
  const fotosPor = contarPor(fotos.filas);
  const recordatoriosPor = contarPor(recordatorios.filas, (f) => f.activo === true);
  const pushPor = contarPor(push.filas);
  const preguntasTotalPor = contarPor(preguntas.filas);
  const preguntasPor = contarPor(preguntas.filas, (f) => f.estado === "pendiente");
  const registrosAnimoPor = contarPor(registrosAnimo.filas);
  const alertasAnimoPor = contarPor(alertasAnimo.filas);
  const emergenciasPor = contarPor(emergencias.filas, (f) => f.estado === "activa");

  const dispositivosPor = new Map<string, DispositivoAdmin[]>();
  for (const d of dispositivos.filas) {
    const abueloId = d.abuelo_id as string;
    const lista = dispositivosPor.get(abueloId) ?? [];
    lista.push({
      nombre: (d.nombre_dispositivo as string | null) ?? null,
      creadoEn: d.created_at as string,
      ultimoAcceso: (d.ultimo_acceso as string | null) ?? null,
    });
    dispositivosPor.set(abueloId, lista);
  }

  const suscripcionPor = new Map(suscripciones.filas.map((s) => [s.abuelo_id, s]));

  // --- Familias (una por persona mayor) --------------------------------------
  const familias: FamiliaAdmin[] = abuelos.filas.map((a) => {
    const abueloId = a.id as string;
    const integrantes = usuarios.filas.filter((u) => u.abuelo_id === abueloId);
    const familiares: FamiliarAdmin[] = integrantes
      .filter((u) => u.rol === "familiar")
      .map((u) => {
        const cuenta = u.auth_user_id ? cuentas.get(u.auth_user_id as string) : undefined;
        return {
          usuarioId: u.id as string,
          nombre: u.nombre as string,
          email: cuenta?.email ?? null,
          relacion: (u.relacion_con_abuelo as string | null) ?? null,
          ultimoLogin: cuenta?.ultimoLogin ?? null,
          creadoEn: (u.created_at as string | null) ?? null,
        };
      });
    const cuentaPropia = integrantes.some((u) => u.rol === "abuelo" && u.auth_user_id);

    const detalleDispositivos = (dispositivosPor.get(abueloId) ?? []).sort(
      (x, y) =>
        new Date(y.ultimoAcceso ?? y.creadoEn).getTime() - new Date(x.ultimoAcceso ?? x.creadoEn).getTime()
    );
    let ultimoAcceso: string | null = null;
    for (const d of detalleDispositivos) ultimoAcceso = maxFecha(ultimoAcceso, d.ultimoAcceso);

    const ultimaConv = ultimaConversacion.get(abueloId) ?? null;
    const actividad: ActividadFamilia = !ultimaConv
      ? "sin_uso"
      : new Date(ultimaConv).getTime() >= hace7d
        ? "activa"
        : "inactiva";
    const delAbuelo = porDiaFamilia.get(abueloId);

    return {
      abueloId,
      nombre: a.nombre as string,
      edad: calcularEdad(a.fecha_nacimiento, ahora),
      creadaEn: a.created_at as string,
      familiares,
      tieneCuentaPropia: cuentaPropia,
      dispositivosDetalle: detalleDispositivos,
      actividad,
      ultimaActividad: maxFecha(ultimaConv, ultimoAcceso),
      ultimaConversacion: ultimaConv,
      mensajes7d: mensajes7d.get(abueloId) ?? 0,
      mensajes30d: mensajes30d.get(abueloId) ?? 0,
      mensajesTotal: mensajesTotal.get(abueloId) ?? 0,
      serie: dias14.map((d) => delAbuelo?.get(d) ?? 0),
      memorias: memoriasPor.get(abueloId) ?? 0,
      fotos: fotosPor.get(abueloId) ?? 0,
      recordatoriosActivos: recordatoriosPor.get(abueloId) ?? 0,
      notificacionesPush: pushPor.get(abueloId) ?? 0,
      preguntasTotal: preguntasTotalPor.get(abueloId) ?? 0,
      preguntasPendientes: preguntasPor.get(abueloId) ?? 0,
      registrosAnimo: registrosAnimoPor.get(abueloId) ?? 0,
      alertasAnimo: alertasAnimoPor.get(abueloId) ?? 0,
      emergenciasActivas: emergenciasPor.get(abueloId) ?? 0,
      suscripcion: suscripcionPor.get(abueloId) ?? null,
    };
  });

  // Las que más usan primero; a igual uso, las más nuevas.
  familias.sort(
    (x, y) =>
      y.mensajes7d - x.mensajes7d ||
      y.mensajes30d - x.mensajes30d ||
      new Date(y.creadaEn).getTime() - new Date(x.creadaEn).getTime()
  );
  const familiaPorId = new Map(familias.map((f) => [f.abueloId, f]));

  // --- Cuentas: una fila por cuenta de acceso, con su familia y plan ---------
  const perfilPorAuth = new Map<string, Fila>();
  for (const u of usuarios.filas) {
    if (u.auth_user_id) perfilPorAuth.set(u.auth_user_id as string, u);
  }
  const listaUsuarios: UsuarioAdmin[] = [...cuentas.entries()].map(([authId, cuenta]) => {
    const perfil = perfilPorAuth.get(authId);
    const abueloId = (perfil?.abuelo_id as string | null) ?? null;
    const familia = abueloId ? familiaPorId.get(abueloId) : undefined;
    const estado: EstadoCuenta = !perfil ? "sin_perfil" : !familia ? "sin_abuelo" : "completa";
    return {
      authId,
      email: cuenta.email,
      confirmado: cuenta.confirmado,
      creadoEn: cuenta.creadoEn,
      ultimoLogin: cuenta.ultimoLogin,
      nombre: (perfil?.nombre as string | undefined) ?? null,
      rol: (perfil?.rol as "familiar" | "abuelo" | undefined) ?? null,
      relacion: (perfil?.relacion_con_abuelo as string | null | undefined) ?? null,
      estado,
      abueloId: familia ? abueloId : null,
      abueloNombre: familia?.nombre ?? null,
      otrosFamiliares: familia ? Math.max(0, familia.familiares.length - (perfil?.rol === "familiar" ? 1 : 0)) : 0,
      mensajes7d: familia?.mensajes7d ?? 0,
      suscripcion: familia?.suscripcion ?? null,
    };
  });
  listaUsuarios.sort(
    (x, y) => new Date(y.creadoEn ?? 0).getTime() - new Date(x.creadoEn ?? 0).getTime()
  );

  // --- Suscripciones ----------------------------------------------------------
  const porEstado: Record<EstadoSuscripcion, number> = {
    piloto: 0,
    prueba: 0,
    activa: 0,
    pausada: 0,
    cancelada: 0,
  };
  let ingresoMensualClp = 0;
  for (const f of familias) {
    if (!f.suscripcion) continue;
    porEstado[f.suscripcion.estado] += 1;
    if (f.suscripcion.estado === "activa") ingresoMensualClp += f.suscripcion.precio_clp;
  }

  // --- Embudo de activación y adopción de funciones --------------------------
  const n = familias.length;
  const embudo = [
    { etiqueta: "Familias registradas", valor: n },
    { etiqueta: "Con un familiar con cuenta", valor: familias.filter((f) => f.familiares.some((m) => m.email)).length },
    { etiqueta: "Con dispositivo o cuenta propia", valor: familias.filter((f) => f.dispositivosDetalle.length > 0 || f.tieneCuentaPropia).length },
    { etiqueta: "Ya conversaron con Griyo", valor: familias.filter((f) => f.mensajesTotal > 0).length },
    { etiqueta: "Activas esta semana", valor: familias.filter((f) => f.mensajes7d > 0).length },
    { etiqueta: "Con plan activo", valor: familias.filter((f) => f.suscripcion?.estado === "activa").length },
  ];
  const adopcion = [
    { etiqueta: "Historias guardadas", familias: familias.filter((f) => f.memorias > 0).length },
    { etiqueta: "Recordatorios", familias: familias.filter((f) => f.recordatoriosActivos > 0).length },
    { etiqueta: "Notificaciones push", familias: familias.filter((f) => f.notificacionesPush > 0).length },
    { etiqueta: "Registro de ánimo", familias: familias.filter((f) => f.registrosAnimo > 0).length },
    { etiqueta: "Fotos del libro", familias: familias.filter((f) => f.fotos > 0).length },
    { etiqueta: "Preguntas de la familia", familias: familias.filter((f) => f.preguntasTotal > 0).length },
  ];

  const hoy = diaChile(ahora);
  const env = process.env;
  return {
    generadoEn: new Date(ahora).toISOString(),
    truncado,
    totales: {
      familias: n,
      familiasNuevas7d: familias.filter((f) => new Date(f.creadaEn).getTime() >= hace7d).length,
      cuentas: cuentas.size,
      cuentasSinCompletar: listaUsuarios.filter((u) => u.estado !== "completa").length,
      activas7d: familias.filter((f) => f.mensajes7d > 0).length,
      sinUso: familias.filter((f) => f.actividad === "sin_uso").length,
      mensajesHoy: porDia.get(hoy)?.mensajes ?? 0,
      mensajes7d: familias.reduce((s, f) => s + f.mensajes7d, 0),
      mensajesPrevios7d,
      mensajes30d: familias.reduce((s, f) => s + f.mensajes30d, 0),
      mensajesTotal: conversaciones.filas.length,
      memorias: memorias.filas.length,
      fotos: fotos.filas.length,
      dispositivos: dispositivos.filas.length,
      notificacionesPush: push.filas.length,
      recordatoriosActivos: familias.reduce((s, f) => s + f.recordatoriosActivos, 0),
      preguntasPendientes: familias.reduce((s, f) => s + f.preguntasPendientes, 0),
      alertasAnimo: alertasAnimo.filas.length,
      emergenciasActivas: familias.reduce((s, f) => s + f.emergenciasActivas, 0),
      emergenciasTotal: emergencias.filas.length,
      sinSuscripcion: familias.filter((f) => !f.suscripcion).length,
      suscripcionesPorEstado: porEstado,
      ingresoMensualClp,
    },
    serie,
    porHora,
    embudo,
    adopcion,
    familias,
    usuarios: listaUsuarios,
    suscripcionesDisponibles: suscripciones.disponible,
    // Solo si está configurado o no — nunca el valor de las claves.
    integraciones: [
      { nombre: "Claude", activa: Boolean(env.ANTHROPIC_API_KEY), detalle: env.ANTHROPIC_MODEL ?? "Conversación" },
      { nombre: "ElevenLabs", activa: Boolean(env.ELEVENLABS_API_KEY), detalle: "Voz de Griyo" },
      { nombre: "Pinecone", activa: Boolean(env.PINECONE_API_KEY), detalle: "Búsqueda de historias" },
      { nombre: "Resend", activa: Boolean(env.RESEND_API_KEY), detalle: "Correos y alertas" },
      {
        nombre: "Notificaciones push",
        activa: Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
        detalle: "Recordatorios en el celular",
      },
      { nombre: "Cron", activa: Boolean(env.CRON_SECRET), detalle: "Disparo de recordatorios" },
      { nombre: "Clima", activa: Boolean(env.OPENWEATHER_API_KEY), detalle: "OpenWeatherMap" },
    ],
    limiteMensajesDiarios: Number(env.LIMITE_MENSAJES_DIARIOS ?? 60),
  };
}
