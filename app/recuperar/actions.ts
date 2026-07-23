"use server";

import { headers } from "next/headers";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoRecuperar {
  mensaje: string | null;
  error: string | null;
}

/**
 * Solicita el enlace de restablecimiento (Supabase `resetPasswordForEmail`).
 * Buenas prácticas:
 * - ANTI-ENUMERACIÓN: responde igual exista o no el email (no revela cuentas).
 * - El enlace del correo apunta a /auth/callback (canjea el código PKCE y crea
 *   una sesión de recuperación) y de ahí a /restablecer (fijar nueva contraseña).
 * - `redirectTo` se arma con el host de la request (debe estar permitido en la
 *   allowlist de Supabase Auth).
 */
export async function solicitarReset(
  _prev: EstadoRecuperar,
  formData: FormData,
): Promise<EstadoRecuperar> {
  const email = String(formData.get("email") ?? "").trim();
  const mensajeNeutro =
    "Si ese email tiene una cuenta, te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja (y spam).";

  if (!email) return { error: "Escribe tu email.", mensaje: null };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const supabase = await crearClienteServidor();
  // No inspeccionamos el error: siempre devolvemos el mismo mensaje neutro.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/restablecer`,
  });

  return { mensaje: mensajeNeutro, error: null };
}
