"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoLogin {
  error: string | null;
}

/**
 * Inicia sesión vía Supabase Auth (signInWithPassword): el hashing bcrypt de la
 * contraseña y la emisión del JWT de sesión los hace Supabase, no esta app.
 * La sesión se guarda en cookies httpOnly (las setea el cliente server).
 * Server Action = endpoint con protección CSRF de Next; no expone credenciales.
 */
export async function iniciarSesion(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Escribe tu email y contraseña." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensaje genérico: no revelar si el email existe (evita enumeración).
    return { error: "Email o contraseña incorrectos." };
  }

  redirect("/resumen");
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
