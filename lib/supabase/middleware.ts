import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request y protege el panel:
 * - sin sesión → redirige a /login (no se sirve ninguna vista del panel);
 * - con sesión en /login → redirige a /resumen.
 * El refresco de tokens va server-side (cookies httpOnly), no se puede saltar
 * desde el cliente. Si faltan las envs de Supabase (setup aún sin hacer), se
 * deja pasar para no bloquear el dev local — en producción las envs existen.
 */
export async function actualizarSesion(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const enLogin = request.nextUrl.pathname.startsWith("/login");
  const aLogin = () => NextResponse.redirect(new URL("/login", request.url));

  if (!url || !anon) {
    // Sin Supabase configurado: en DESARROLLO se deja pasar para trabajar antes
    // del setup; en PRODUCCIÓN se falla CERRADO (nunca servir el panel sin auth).
    if (process.env.NODE_ENV === "production" && !enLogin) return aLogin();
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() valida el token contra Supabase (no confía en la cookie sin verificar).
  // Cualquier fallo (red/token) → se trata como SIN sesión (fail closed).
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (!user && !enLogin) return aLogin();

  if (user && enLogin) {
    return NextResponse.redirect(new URL("/resumen", request.url));
  }

  return response;
}
