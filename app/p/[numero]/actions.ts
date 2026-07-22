"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verificarAcceso } from "@/lib/maquetas/store";
import { cookieAcceso, firmarAcceso, ACCESO_MINUTOS } from "@/lib/maquetas/portal";

export interface EstadoPortal {
  error: string | null;
}

/**
 * Verifica el candado del portal (email + código) para la maqueta #numero. Si
 * pasa, pone una cookie firmada de vida corta y la página muestra la propuesta.
 * Mensaje genérico ante fallo (no revela si el email o el código fue lo que falló).
 */
export async function verificarAccesoAction(
  numero: number,
  _prev: EstadoPortal,
  formData: FormData,
): Promise<EstadoPortal> {
  const email = String(formData.get("email") ?? "");
  // Los códigos se generan SIEMPRE en mayúsculas y el input solo las muestra
  // por CSS: sin normalizar, "abc123" tecleado en desktop fallaría siempre.
  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  // Solo el código es obligatorio aquí: si la maqueta no fijó email, el form
  // no muestra ese campo y verificarAcceso (store) ya acepta email vacío.
  if (!codigo) {
    return { error: "Escribe el código de acceso." };
  }

  const m = await verificarAcceso(numero, email, codigo);
  if (!m || m.codigo == null) {
    return { error: "Email o código incorrectos." };
  }

  const store = await cookies();
  store.set(cookieAcceso(numero), firmarAcceso(numero, m.codigo), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/p/${numero}`,
    maxAge: ACCESO_MINUTOS * 60,
  });
  // Recarga la misma URL: ya con la cookie, la página muestra la propuesta.
  redirect(`/p/${numero}`);
}
