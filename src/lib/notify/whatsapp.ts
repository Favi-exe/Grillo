/**
 * Envío de mensajes por WhatsApp vía Twilio, con el mismo patrón real/mock
 * que el resto de los servicios externos de Griyo: sin credenciales de
 * Twilio no se manda nada, solo se loguea, y la app sigue funcionando.
 *
 * WhatsApp solo deja escribirle a alguien que no te escribió antes (o hace
 * más de 24 h) con una plantilla aprobada. Por eso cada mensaje acepta una
 * `plantilla` opcional (Content SID de Twilio): si viene, se usa; si no, se
 * manda como texto libre, que alcanza para el sandbox de Twilio y para
 * conversaciones ya abiertas.
 */

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  );
}

export interface ResultadoEnvioWhatsApp {
  enviado: boolean;
  fuente: "mock" | "real";
}

export async function enviarWhatsApp(params: {
  /** Teléfono en formato internacional, ej. +56912345678 */
  to: string;
  texto: string;
  plantilla?: { contentSid?: string; variables: Record<string, string> };
}): Promise<ResultadoEnvioWhatsApp> {
  if (!isWhatsAppConfigured()) {
    // El texto puede traer un link de recuperación: en producción no se
    // deja en los logs.
    const detalle = process.env.NODE_ENV === "production" ? "" : ` | Texto: ${params.texto}`;
    console.log(`[whatsapp:mock] Para: ${params.to}${detalle}`);
    return { enviado: true, fuente: "mock" };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const token = process.env.TWILIO_AUTH_TOKEN as string;
  const from = process.env.TWILIO_WHATSAPP_FROM as string;

  const cuerpo = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: `whatsapp:${params.to}`,
  });
  if (params.plantilla?.contentSid) {
    cuerpo.set("ContentSid", params.plantilla.contentSid);
    cuerpo.set("ContentVariables", JSON.stringify(params.plantilla.variables));
  } else {
    cuerpo.set("Body", params.texto);
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: cuerpo,
    });
    if (!res.ok) {
      console.error("[whatsapp] Twilio respondió con error:", res.status, await res.text());
      return { enviado: false, fuente: "real" };
    }
    return { enviado: true, fuente: "real" };
  } catch (err) {
    console.error("[whatsapp] fallo enviando:", err);
    return { enviado: false, fuente: "real" };
  }
}
