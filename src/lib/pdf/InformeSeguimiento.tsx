import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Seguimiento } from "@/lib/seguimiento";

/**
 * Informe de seguimiento para la familia (y, si quieren, para llevar a una
 * consulta). Es orientativo: resume cuánto conversó la persona, cómo estuvo su
 * ánimo y qué señales notó Griyo, y lo dice con todas sus letras en el pie.
 * Nunca incluye el texto de las charlas.
 */

const TINTA = "#3A2A2E";
const EMBER = "#C96B22";
const EMBER_SUAVE = "#F5B76C";
const DUSK = "#4A3B5C";
const SAND_BG = "#FBF1E6";
const SAND_LINE = "#D9C4AC";
const GRIS = "#8C7867";

const COLOR_VALENCIA: Record<number, string> = {
  1: "#C1483F",
  2: "#DA6A61",
  3: "#D9C4AC",
  4: "#E8B23D",
  5: "#E2883A",
};

const s = StyleSheet.create({
  pagina: { backgroundColor: "#FFFDFB", padding: "38 44 52 44", fontFamily: "Helvetica", color: TINTA, fontSize: 10 },
  cabecera: { borderBottom: `1 solid ${SAND_LINE}`, paddingBottom: 14, marginBottom: 16 },
  marca: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: EMBER, letterSpacing: 1.5, marginBottom: 6 },
  titulo: { fontFamily: "Times-Bold", fontSize: 24, marginBottom: 4 },
  subtitulo: { fontSize: 11, color: DUSK },
  generado: { fontSize: 8.5, color: GRIS, marginTop: 6 },

  fila: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tarjeta: { flex: 1, backgroundColor: SAND_BG, borderRadius: 8, padding: 10 },
  tarjetaValor: { fontFamily: "Times-Bold", fontSize: 20, marginBottom: 2 },
  tarjetaEtiqueta: { fontSize: 8.5, color: GRIS },

  seccion: { marginBottom: 12 },
  h2: { fontFamily: "Times-Bold", fontSize: 14, marginBottom: 6 },
  nota: { fontSize: 8.5, color: GRIS, marginBottom: 6 },

  grafico: { flexDirection: "row", alignItems: "flex-end", height: 56, borderBottom: `1 solid ${SAND_LINE}`, gap: 1.5 },
  barra: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  puntos: { flexDirection: "row", gap: 1.5, marginTop: 3 },
  punto: { flex: 1, height: 6, borderRadius: 1 },
  ejeFechas: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  ejeTexto: { fontSize: 7.5, color: GRIS },

  item: { flexDirection: "row", gap: 6, marginBottom: 3 },
  vineta: { color: EMBER },
  itemTexto: { flex: 1, lineHeight: "13pt" },

  senalCaja: { border: `1 solid ${SAND_LINE}`, borderRadius: 8, padding: 10, marginBottom: 8 },
  senalTitulo: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 3 },
  senalMensaje: { lineHeight: "13pt", marginBottom: 5 },
  indicador: { flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: GRIS, marginBottom: 1.5 },

  aviso: { backgroundColor: SAND_BG, borderRadius: 8, padding: 10, marginTop: 6 },
  avisoTexto: { fontSize: 8.5, lineHeight: "11.5pt", color: DUSK },
  pie: { position: "absolute", bottom: 22, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: GRIS },
});

function etiquetaAnimo(v: number | null): string {
  if (v === null) return "Sin datos";
  if (v < 1.5) return "Muy bajo";
  if (v < 2.5) return "Bajo";
  if (v < 3.5) return "Neutral";
  if (v < 4.5) return "Bueno";
  return "Muy bueno";
}

function textoTendencia(t: Seguimiento["resumen"]["tendenciaAnimo"]): string {
  if (t === "sube") return "Va mejorando";
  if (t === "baja") return "Va bajando";
  if (t === "estable") return "Estable";
  return "Pocos datos para ver tendencia";
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaCorta(ymd: string): string {
  return `${Number(ymd.slice(8))} ${MESES[Number(ymd.slice(5, 7)) - 1]}`;
}
function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" });
}

function Tarjeta({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={s.tarjeta}>
      <Text style={s.tarjetaValor}>{valor}</Text>
      <Text style={s.tarjetaEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

export function InformeSeguimientoDocument({ seg }: { seg: Seguimiento }) {
  const r = seg.resumen;
  const maxMsg = Math.max(1, ...seg.serie.map((p) => p.mensajes));
  const { aislamiento, memoria, voz } = seg.senales;

  return (
    <Document title={`Informe de seguimiento de ${seg.nombre}`} author="Griyo" language="es">
      <Page size="A4" style={s.pagina}>
        <View style={s.cabecera}>
          <Text style={s.marca}>GRIYO · INFORME DE SEGUIMIENTO</Text>
          <Text style={s.titulo}>{seg.nombre}</Text>
          <Text style={s.subtitulo}>
            Del {fechaCorta(seg.desde)} al {fechaCorta(seg.hasta)} · últimos {seg.dias} días
          </Text>
          <Text style={s.generado}>Generado el {fechaLarga(seg.generadoEn)}</Text>
        </View>

        <View style={s.fila}>
          <Tarjeta valor={`${r.diasConConversacion} de ${seg.dias}`} etiqueta="días con conversación" />
          <Tarjeta valor={String(r.mensajes)} etiqueta="mensajes con Griyo" />
          <Tarjeta valor={String(r.historiasNuevas)} etiqueta="historias nuevas" />
          <Tarjeta valor={etiquetaAnimo(r.animoPromedio)} etiqueta={`ánimo · ${textoTendencia(r.tendenciaAnimo).toLowerCase()}`} />
        </View>

        <View style={s.seccion}>
          <Text style={s.h2}>Actividad y ánimo día a día</Text>
          <Text style={s.nota}>Las barras son los mensajes de cada día; los cuadritos de abajo, el ánimo (rojo = más bajo, naranja = más alto, gris = sin dato).</Text>
          <View style={s.grafico}>
            {seg.serie.map((p) => (
              <View
                key={p.fecha}
                style={[s.barra, { height: p.mensajes === 0 ? 1.5 : Math.max(4, (p.mensajes / maxMsg) * 54), backgroundColor: p.mensajes === 0 ? SAND_LINE : EMBER_SUAVE }]}
              />
            ))}
          </View>
          <View style={s.puntos}>
            {seg.serie.map((p) => (
              <View key={p.fecha} style={[s.punto, { backgroundColor: p.animo === null ? "#EFE5D8" : COLOR_VALENCIA[Math.max(1, Math.min(5, Math.round(p.animo)))] }]} />
            ))}
          </View>
          <View style={s.ejeFechas}>
            <Text style={s.ejeTexto}>{fechaCorta(seg.desde)}</Text>
            <Text style={s.ejeTexto}>{fechaCorta(seg.hasta)}</Text>
          </View>
        </View>

        <View style={s.seccion}>
          <Text style={s.h2}>Señales que notó Griyo</Text>
          {[aislamiento, memoria, voz].map((sen) => (
            <View key={sen.titulo} style={s.senalCaja} wrap={false}>
              <Text style={s.senalTitulo}>{sen.titulo}</Text>
              <Text style={s.senalMensaje}>{sen.mensaje}</Text>
              {sen.indicadores.map((i) => (
                <View key={i.etiqueta} style={s.indicador}>
                  <Text>{i.etiqueta}</Text>
                  <Text>{i.valor}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={s.seccion} wrap={false}>
          <Text style={s.h2}>Avisos del período</Text>
          {seg.alertas.length === 0 ? (
            <Text>No hubo avisos de ánimo bajo ni alertas de emergencia en estos {seg.dias} días.</Text>
          ) : (
            seg.alertas.slice(0, 6).map((a, i) => (
              <View key={i} style={s.item}>
                <Text style={s.vineta}>•</Text>
                <Text style={s.itemTexto}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>
                    {fechaCorta(new Date(a.fecha).toLocaleDateString("en-CA", { timeZone: "America/Santiago" }))} ·{" "}
                    {a.tipo === "emergencia" ? "Emergencia" : "Ánimo bajo"}:{" "}
                  </Text>
                  {a.texto}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={s.seccion} wrap={false}>
          <Text style={s.h2}>De qué conversó</Text>
          {seg.temas.length === 0 ? (
            <Text>Todavía no hay historias guardadas en este período.</Text>
          ) : (
            seg.temas.map((t) => (
              <View key={t.tema} style={s.item}>
                <Text style={s.vineta}>•</Text>
                <Text style={s.itemTexto}>
                  {t.tema.charAt(0).toUpperCase() + t.tema.slice(1)} ({t.veces} {t.veces === 1 ? "vez" : "veces"})
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={s.aviso} wrap={false}>
          <Text style={s.avisoTexto}>
            Este informe es orientativo. Griyo no es un dispositivo médico y este documento no es un diagnóstico ni reemplaza la evaluación de un profesional de salud. Las señales comparan a la persona con su propio patrón y pueden tener explicaciones simples (un resfrío, un cambio de rutina, una mala noche). Si algo le preocupa, puede llevar este informe a una consulta y conversarlo con un profesional. No incluye lo que la persona conversó con Griyo, solo cuánto y cómo usó la aplicación.
          </Text>
        </View>

        <View style={s.pie} fixed>
          <Text>Griyo · Informe de seguimiento de {seg.nombre}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
