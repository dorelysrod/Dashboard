import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Callback del flujo de auth por enlace (restablecer contraseña). Canjea el
 * `code` PKCE del correo por una SESIÓN (de recuperación) y redirige a `next`
 * (por defecto /restablecer, para fijar la nueva contraseña). Si el enlace es
 * inválido o expiró, vuelve a /login con una señal de error — sin filtrar detalles.
 *
 * `next` se restringe a rutas internas (empieza por "/") para evitar
 * open-redirect hacia dominios externos.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/restablecer";
  const next = nextParam.startsWith("/") ? nextParam : "/restablecer";

  if (code) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=enlace_invalido", url.origin));
}
