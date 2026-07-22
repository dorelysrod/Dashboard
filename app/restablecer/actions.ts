"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoRestablecer {
  error: string | null;
}

const MIN_LONGITUD = 8;

/**
 * Fija una NUEVA contraseña usando la sesión de recuperación (creada por el
 * enlace del correo vía /auth/callback). No pide la contraseña ACTUAL — el
 * usuario la olvidó; la prueba de identidad es la sesión de recuperación.
 * Buenas prácticas: exige sesión válida, longitud mínima y confirmación.
 */
export async function fijarNuevaContrasena(
  _prev: EstadoRestablecer,
  formData: FormData,
): Promise<EstadoRestablecer> {
  const nueva = String(formData.get("nueva") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (nueva.length < MIN_LONGITUD) {
    return { error: `La contraseña debe tener al menos ${MIN_LONGITUD} caracteres.` };
  }
  if (nueva !== confirmar) {
    return { error: "La contraseña y su confirmación no coinciden." };
  }

  const supabase = await crearClienteServidor();
  const { data, error: sesionError } = await supabase.auth.getUser();
  if (sesionError || !data.user) {
    return { error: "El enlace expiró o no es válido. Solicita uno nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    return { error: "No se pudo actualizar la contraseña. Intenta de nuevo." };
  }

  redirect("/resumen");
}
