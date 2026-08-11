/**
 * Envío de emails transaccionales (alertas de emergencia, etc.), con el
 * mismo patrón real/mock que el resto de los servicios externos de Griyo:
 * si no hay RESEND_API_KEY, cae a un mock que solo loguea — la app sigue
 * funcionando sin la key, simplemente no manda el correo de verdad.
 */

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface ResultadoEnvioEmail {
  enviado: boolean;
  fuente: "mock" | "real";
}

export async function enviarEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<ResultadoEnvioEmail> {
  if (!isEmailConfigured()) {
    console.log(`[email:mock] Para: ${params.to} | Asunto: ${params.subject}`);
    return { enviado: true, fuente: "mock" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Griyo <onboarding@resend.dev>",
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend respondió con error:", res.status, await res.text());
      return { enviado: false, fuente: "real" };
    }
    return { enviado: true, fuente: "real" };
  } catch (err) {
    console.error("[email] fallo enviando:", err);
    return { enviado: false, fuente: "real" };
  }
}
