import { Document, Page, View, Text, Svg, Path, Circle, Ellipse, StyleSheet } from "@react-pdf/renderer";
import type { LibroLegado } from "@/lib/legado";

/**
 * El PDF del libro de Legado Vivo. Fuentes propias del PDF (Times-Roman /
 * Helvetica, integradas de fábrica en react-pdf) — no las de la app
 * (Fredoka/Nunito): para algo que la familia va a imprimir y guardar, un
 * registro serif de "libro" queda mejor que la tipografía redondeada y
 * lúdica que usa la interfaz.
 */

const TINTA = "#3A2A2E";
const EMBER = "#C96B22";
const DUSK = "#4A3B5C";
const SAND_BG = "#FBF1E6";
const SAND_LINE = "#D9C4AC";

const styles = StyleSheet.create({
  portada: {
    backgroundColor: SAND_BG,
    padding: 64,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  cricketWrap: { marginBottom: 28 },
  tituloLibro: {
    fontFamily: "Times-Bold",
    fontSize: 34,
    color: TINTA,
    textAlign: "center",
    marginBottom: 10,
  },
  subtituloLibro: {
    fontFamily: "Helvetica",
    fontSize: 13,
    color: DUSK,
    textAlign: "center",
    marginBottom: 60,
  },
  dedicatoria: {
    fontFamily: "Times-Italic",
    fontSize: 12.5,
    color: TINTA,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 340,
  },
  firma: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DUSK,
    textAlign: "center",
    marginTop: 40,
    letterSpacing: 1,
  },

  paginaCapitulo: {
    backgroundColor: "#FFFDFB",
    padding: "56 56 64 56",
  },
  eyebrow: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: EMBER,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  tituloCapitulo: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    color: TINTA,
    marginBottom: 12,
  },
  introduccion: {
    fontFamily: "Times-Italic",
    fontSize: 11.5,
    color: DUSK,
    lineHeight: 1.55,
    marginBottom: 22,
    borderBottom: `1 solid ${SAND_LINE}`,
    paddingBottom: 18,
  },
  historia: { marginBottom: 16 },
  historiaMeta: {
    flexDirection: "row",
    marginBottom: 3,
  },
  historiaFecha: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: EMBER,
  },
  historiaPersonas: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: DUSK,
    marginLeft: 8,
  },
  historiaTexto: {
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: TINTA,
    lineHeight: 1.5,
  },
  numeroPagina: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Helvetica",
    fontSize: 8,
    color: SAND_LINE,
  },

  paginaCierre: {
    backgroundColor: SAND_BG,
    padding: 64,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  cierreTexto: {
    fontFamily: "Times-Italic",
    fontSize: 13,
    color: TINTA,
    textAlign: "center",
    lineHeight: 1.7,
    maxWidth: 360,
  },
});

function fechaLegible(iso: string): string {
  const d = new Date(iso);
  const texto = d.toLocaleDateString("es-419", { day: "numeric", month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function CricketMarkPdf({ size = 56, color = EMBER }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={9} cy={13} r={3.4} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M6.5 10.5 3.5 6.5" stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M9.5 9.5 8 5" stroke={color} strokeWidth={1.6} fill="none" />
      <Ellipse
        cx={16.5}
        cy={16}
        rx={7.6}
        ry={5.2}
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        transform="rotate(-8 16.5 16)"
      />
      <Path d="M13 19c.5 2 .3 4.3-1.2 6" stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M19 20c1.4 1 1.8 3.3 1 5.3" stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M22.5 17.5c2.6.4 4.6 2.5 4.8 5.2" stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M27.3 22.7c-.2 1.8-1.6 3.3-3.4 3.7" stroke={color} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

export function LibroLegadoDocument({ libro }: { libro: LibroLegado }) {
  const hoy = fechaLegible(new Date().toISOString());

  return (
    <Document title={`El Legado Vivo de ${libro.nombreAbuelo}`} author="Grillo">
      <Page size="A5" style={styles.portada}>
        <View style={styles.cricketWrap}>
          <CricketMarkPdf />
        </View>
        <Text style={styles.tituloLibro}>El Legado Vivo{"\n"}de {libro.nombreAbuelo}</Text>
        <Text style={styles.subtituloLibro}>
          {libro.totalHistorias} historia{libro.totalHistorias === 1 ? "" : "s"} recopiladas hasta {hoy}
        </Text>
        <Text style={styles.dedicatoria}>
          Este es un pequeño libro con algunas de las historias que {libro.nombreAbuelo} fue
          compartiendo, charla a charla, con Grillo. Para que su familia siempre pueda volver a
          encontrarlo en ellas.
        </Text>
        <Text style={styles.firma}>GRILLO — TU COMPAÑÍA DE CADA DÍA</Text>
      </Page>

      {libro.capitulos.map((capitulo, i) => (
        <Page key={capitulo.tema} size="A5" style={styles.paginaCapitulo} wrap>
          <Text style={styles.eyebrow}>CAPÍTULO {i + 1}</Text>
          <Text style={styles.tituloCapitulo}>{capitulo.tema}</Text>
          {capitulo.introduccion ? (
            <Text style={styles.introduccion}>{capitulo.introduccion}</Text>
          ) : null}

          {capitulo.historias.map((h, j) => (
            <View key={j} style={styles.historia} wrap={false}>
              <View style={styles.historiaMeta}>
                <Text style={styles.historiaFecha}>{fechaLegible(h.fecha).toUpperCase()}</Text>
                {h.personas.length > 0 && (
                  <Text style={styles.historiaPersonas}>· {h.personas.join(", ")}</Text>
                )}
              </View>
              <Text style={styles.historiaTexto}>{h.texto}</Text>
            </View>
          ))}

          <Text
            style={styles.numeroPagina}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        </Page>
      ))}

      <Page size="A5" style={styles.paginaCierre}>
        <View style={{ marginBottom: 24 }}>
          <CricketMarkPdf size={40} color={DUSK} />
        </View>
        <Text style={styles.cierreTexto}>
          Gracias por dejar que Grillo escuchara estas historias.{"\n\n"}
          Que sigan siendo, para siempre, un lugar al que volver.
        </Text>
      </Page>
    </Document>
  );
}
