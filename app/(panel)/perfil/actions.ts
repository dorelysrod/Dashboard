"use server";

import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoPerfil {
  error: string | null;
  ok: boolean;
}

const MIN_LONGITUD = 8;

/**
 * Cambia la contraseña del operador autenticado vía Supabase Auth.
 * Verifica la contraseña ACTUAL antes de actualizar (defensa contra cambios con
 * sesión secuestrada). El hashing y la emisión del nuevo JWT los hace Supabase.
 */
export async function cambiarContrasena(
  _prev: EstadoPerfil,
  formData: FormData,
): Promise<EstadoPerfil> {
  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (!actual || !nueva || !confirmar) {
    return { ok: false, error: "Completa los tres campos." };
  }
  if (nueva.length < MIN_LONGITUD) {
    return { ok: false, error: `La nueva contraseña debe tener al menos ${MIN_LONGITUD} caracteres.` };
  }
  if (nueva !== confirmar) {
    return { ok: false, error: "La nueva contraseña y su confirmación no coinciden." };
  }
  if (nueva === actual) {
    return { ok: false, error: "La nueva contraseña debe ser distinta de la actual." };
  }

  const supabase = await crearClienteServidor();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) {
    return { ok: false, error: "Sesión no válida. Vuelve a entrar." };
  }

  // Verifica la contraseña actual reautenticando (no revela si falló por email).
  const { error: verifError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: actual,
  });
  if (verifError) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: nueva,
  });
  if (updateError) {
    return { ok: false, error: "No se pudo actualizar la contraseña. Intenta de nuevo." };
  }

  return { ok: true, error: null };
}
