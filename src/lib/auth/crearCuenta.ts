import { getSupabaseClient } from "@/lib/db/supabaseClient";
import { emailSinteticoDeTelefono } from "@/lib/auth/telefono";

export class CuentaYaExisteError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese número.");
  }
}

/**
 * Crea la cuenta de Auth identificada por teléfono, ya confirmada (no hay
 * mail de confirmación que esperar). El teléfono y el correo de contacto
 * opcional se guardan en app_metadata: a diferencia de user_metadata, el
 * cliente no puede modificarlo, y es de donde salen los avisos a la familia.
 */
export async function crearCuentaAuthConTelefono(params: {
  telefono: string;
  password: string;
  emailContacto?: string | null;
}): Promise<{ userId: string }> {
  const { data, error } = await getSupabaseClient().auth.admin.createUser({
    email: emailSinteticoDeTelefono(params.telefono),
    password: params.password,
    email_confirm: true,
    app_metadata: {
      telefono: params.telefono,
      ...(params.emailContacto ? { email_contacto: params.emailContacto } : {}),
    },
  });

  if (error || !data.user) {
    const yaExiste =
      (error as { code?: string } | null)?.code === "email_exists" ||
      error?.message?.toLowerCase().includes("already");
    if (yaExiste) throw new CuentaYaExisteError();
    throw error ?? new Error("No se pudo crear la cuenta de Auth.");
  }
  return { userId: data.user.id };
}
