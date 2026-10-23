import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { CONTACTO_PRIVACIDAD } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos de uso — Griyo",
  description: "Las reglas para usar Griyo.",
};

export default function TerminosPage() {
  return (
    <LegalLayout titulo="Términos de uso">
      <p>
        Estos términos regulan el uso de Griyo, un proyecto de la empresa Soy Plus. Al crear una cuenta o usar la
        aplicación aceptas estas reglas y nuestra <a href="/privacidad">política de privacidad</a>.
      </p>

      <h2>1. Qué es Griyo</h2>
      <p>
        Griyo conversa por voz con personas mayores, les recuerda medicamentos y citas, guarda sus historias en un libro y
        mantiene informada a su familia. Está en etapa de desarrollo, por lo que puede cambiar o tener fallas.
      </p>

      <h2>2. Griyo no es un servicio médico ni de urgencia</h2>
      <p>
        Griyo no entrega diagnósticos ni tratamientos, y sus señales e informes son orientativos. No reemplaza a un
        profesional de salud ni a un servicio de urgencia. En una emergencia llama al 131 (SAMU). El botón de ayuda de la
        aplicación avisa a la familia, pero no garantiza que alguien responda.
      </p>

      <h2>3. Respuestas de inteligencia artificial</h2>
      <p>
        Las respuestas de Griyo las genera una inteligencia artificial y pueden contener errores. No las uses como única
        fuente para decisiones de salud, legales o financieras.
      </p>

      <h2>4. Quién puede usarlo</h2>
      <p>
        Puedes crear una cuenta si eres mayor de edad. Si vinculas a una persona mayor, declaras que cuentas con su
        autorización o que eres su representante, y que le explicaste cómo funciona Griyo. Eres responsable de mantener la
        seguridad de tu cuenta y de los dispositivos vinculados.
      </p>

      <h2>5. Uso adecuado</h2>
      <p>
        No uses Griyo para engañar a otras personas, para fines ilegales ni para intentar acceder a datos que no son tuyos.
        Podemos suspender cuentas que incumplan estas reglas.
      </p>

      <h2>6. Planes y pagos</h2>
      <p>
        Durante el piloto algunas cuentas pueden usar Griyo sin costo. Si un plan tiene precio, te lo informaremos antes de
        cobrar y podrás dejarlo cuando quieras.
      </p>

      <h2>7. Disponibilidad y responsabilidad</h2>
      <p>
        Hacemos lo posible para que Griyo funcione de forma continua, pero no garantizamos que no habrá interrupciones.
        En lo que permita la ley, no respondemos por daños indirectos derivados del uso de la aplicación, ni por decisiones
        tomadas a partir de sus respuestas o de sus informes.
      </p>

      <h2>8. Tus datos</h2>
      <p>
        Puedes descargar y borrar los datos de la persona mayor desde la vista familiar, y escribirnos a{" "}
        <a href={`mailto:${CONTACTO_PRIVACIDAD}`}>{CONTACTO_PRIVACIDAD}</a> para cualquier consulta.
      </p>

      <h2>9. Cambios y ley aplicable</h2>
      <p>
        Podemos actualizar estos términos y te avisaremos para que los aceptes de nuevo. Se rigen por las leyes de Chile y
        cualquier disputa se resolverá en los tribunales de Santiago.
      </p>
    </LegalLayout>
  );
}
