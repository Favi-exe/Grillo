import type { Metadata } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import AvisoActualizacion from "@/components/AvisoActualizacion";
import "./globals.css";

// Autoalojadas vía next/font: se subsetean y sirven localmente en el build,
// sin request a Google Fonts en runtime (mejor performance y privacidad).
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grillo — tu compañía de cada día",
  description: "Asistente de IA de compañía y Legado Vivo para adultos mayores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fredoka.variable} ${nunitoSans.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <AvisoActualizacion />
      </body>
    </html>
  );
}
