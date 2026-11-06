/**
 * Identificación por número de teléfono. Supabase Auth exige un correo como
 * identificador, así que cada cuenta creada con teléfono usa por dentro un
 * correo sintético derivado del número (nunca se le manda nada: el dominio
 * `.invalid` está reservado por estándar y no puede recibir correo). El
 * correo real, si la persona lo da, queda aparte como dato de contacto.
 * Módulo puro: sirve igual en el navegador y en el servidor.
 */

const DOMINIO_SINTETICO = "telefono.griyo.invalid";

/**
 * Normaliza a formato internacional (+56912345678). Asume Chile si no trae
 * código de país; acepta otros países solo si empiezan con "+".
 */
export function normalizarTelefono(entrada: string): string | null {
  const limpio = entrada.trim();
  if (!limpio) return null;
  const empiezaConMas = limpio.startsWith("+") || limpio.startsWith("00");
  const digitos = limpio.replace(/\D/g, "").replace(/^00/, "");

  if (empiezaConMas && !digitos.startsWith("56")) {
    return digitos.length >= 8 && digitos.length <= 15 ? `+${digitos}` : null;
  }
  if (digitos.length === 9 && digitos.startsWith("9")) return `+56${digitos}`;
  if (digitos.length === 11 && digitos.startsWith("569")) return `+${digitos}`;
  return null;
}

export function emailSinteticoDeTelefono(telefonoE164: string): string {
  return `${telefonoE164.replace(/\D/g, "")}@${DOMINIO_SINTETICO}`;
}

export function esEmailSintetico(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(`@${DOMINIO_SINTETICO}`));
}

export function telefonoDeEmailSintetico(email: string | null | undefined): string | null {
  if (!email || !esEmailSintetico(email)) return null;
  return `+${email.split("@")[0]}`;
}

/** "+56912345678" -> "+56 9 1234 5678" (solo para mostrar). */
export function formatearTelefono(telefonoE164: string): string {
  const m = telefonoE164.match(/^\+56(9)(\d{4})(\d{4})$/);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : telefonoE164;
}

/** Cómo mostrar el contacto de una cuenta (teléfono y/o correo) en una sola línea. */
export function textoDeContacto(telefono: string | null, email: string | null): string {
  return [telefono, email].filter(Boolean).join(" · ") || "sin contacto";
}

export type IdentificadorResuelto =
  | { tipo: "telefono"; telefono: string; email: string }
  | { tipo: "email"; email: string };

/** Lo que escribió la persona en "WhatsApp o correo": decide cuál es y devuelve el correo de Auth que le corresponde. */
export function resolverIdentificador(entrada: string): IdentificadorResuelto | null {
  const texto = entrada.trim();
  if (!texto) return null;
  if (texto.includes("@")) {
    return { tipo: "email", email: texto.toLowerCase() };
  }
  const telefono = normalizarTelefono(texto);
  if (!telefono) return null;
  return { tipo: "telefono", telefono, email: emailSinteticoDeTelefono(telefono) };
}

export function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
