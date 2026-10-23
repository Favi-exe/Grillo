import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { CONTACTO_PRIVACIDAD } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad — Griyo",
  description: "Qué datos usa Griyo, para qué, con quién los comparte y cómo ejercer tus derechos.",
};

export default function PrivacidadPage() {
  return (
    <LegalLayout titulo="Política de privacidad">
      <p>
        Griyo es una aplicación de compañía por voz para personas mayores, que además guarda sus historias en un
        libro para la familia. Griyo es un proyecto de la empresa Soy Plus (&quot;Griyo&quot;, &quot;nosotros&quot;). Esta política
        explica qué datos tratamos, para qué, con quién los compartimos y cómo puedes ejercer tus derechos.
      </p>

      <h2>1. Qué datos usamos</h2>
      <ul>
        <li><strong>De la cuenta:</strong> tu nombre, tu correo y, si eres familiar, tu relación con la persona mayor.</li>
        <li><strong>De la persona mayor:</strong> su nombre, su fecha de nacimiento y notas generales si la familia las agrega.</li>
        <li><strong>Lo que conversa con Griyo:</strong> los mensajes por voz o texto y las respuestas de Griyo, de los cuales se guardan resúmenes de historias (&quot;memorias&quot;), con su tema y la emoción que Griyo percibe.</li>
        <li><strong>Su ánimo:</strong> lo que la persona marca en &quot;¿cómo te sientes hoy?&quot; y lo que Griyo percibe en las charlas.</li>
        <li><strong>Su rutina:</strong> recordatorios, fotos que se suman al libro, preguntas que deja la familia y la hora de aviso diario elegida.</li>
        <li><strong>De uso:</strong> fechas de las charlas, dispositivos vinculados y suscripciones a notificaciones.</li>
        <li><strong>Señales:</strong> a partir de lo anterior, Griyo calcula indicadores de contacto y de cambios en la conversación. Son orientativos, no un diagnóstico.</li>
      </ul>
      <p>
        Parte de estos datos puede revelar información de salud (por ejemplo, un estado de ánimo o algo que la
        persona cuente sobre sus dolencias). Los tratamos solo con tu consentimiento expreso, que nos das al aceptar
        esta política, y solo para entregar el servicio.
      </p>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Conversar con la persona mayor, recordarle sus medicamentos y citas, y guardar sus historias.</li>
        <li>Avisarle a la familia cuando el ánimo viene bajo, cuando se pide ayuda o cuando lleva días sin conversar.</li>
        <li>Armar el libro Legado Vivo y los informes de seguimiento para la familia.</li>
        <li>Mantener la seguridad y el funcionamiento del servicio.</li>
      </ul>
      <p>No vendemos datos personales ni los usamos para publicidad.</p>

      <h2>3. Quién ve qué</h2>
      <p>
        La familia vinculada ve los resúmenes de las historias, el ánimo, las alertas y los informes de seguimiento. No ve
        el texto de las charlas. El equipo de Griyo accede a los datos solo en la medida necesaria para operar y dar
        soporte al servicio.
      </p>

      <h2>4. Con quién los compartimos</h2>
      <p>
        Para funcionar usamos proveedores que tratan datos por encargo nuestro: servicios de inteligencia artificial para
        las conversaciones (Anthropic), de voz (ElevenLabs), de base de datos y archivos (Supabase), de búsqueda de
        historias (Pinecone), de alojamiento (Vercel) y de correo (Resend). Algunos están fuera de Chile, por ejemplo en
        Estados Unidos, por lo que tus datos pueden tratarse en otros países. Les pedimos que usen los datos solo para
        prestarnos el servicio.
      </p>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras la cuenta esté activa. Si pides borrar los datos, los eliminamos de la aplicación y de nuestros
        proveedores en un plazo breve; los respaldos técnicos pueden demorar algo más en desaparecer.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Conforme a la ley chilena de protección de datos personales (Ley 19.628 y su modificación, la Ley 21.719), puedes
        pedir acceso, rectificación, supresión, oposición, bloqueo y portabilidad de tus datos. Desde la vista familiar
        puedes descargar los datos de la persona mayor y borrarlos tú mismo. También puedes escribirnos a{" "}
        <a href={`mailto:${CONTACTO_PRIVACIDAD}`}>{CONTACTO_PRIVACIDAD}</a>. Si no estás conforme con nuestra
        respuesta, puedes acudir a la autoridad de protección de datos.
      </p>

      <h2>7. Griyo no es un servicio médico</h2>
      <p>
        Griyo no entrega diagnósticos ni reemplaza a un profesional de salud ni a un servicio de urgencia. Las respuestas
        las genera una inteligencia artificial y pueden contener errores. En una emergencia llama al 131 (SAMU).
      </p>

      <h2>8. Personas mayores y menores de edad</h2>
      <p>
        Quien vincula a una persona mayor declara contar con su autorización o ser su representante. Griyo no está
        dirigido a menores de edad.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Si cambiamos esta política te avisaremos y te pediremos aceptarla de nuevo. La versión vigente siempre está en
        esta página.
      </p>
    </LegalLayout>
  );
}
