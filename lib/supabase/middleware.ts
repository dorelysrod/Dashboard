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
  // /maqueta/[token]: vista pública para el CLIENTE (no es usuario del panel).
  // Se protege con el token de capacidad + expiración, no con login → se deja
  // pasar sin sesión.
  const enMaqueta = request.nextUrl.pathname.startsWith("/maqueta");
  // Flujo de restablecer contraseña (pre-sesión): solicitar el enlace y el
  // callback que canjea el código. Deben ser accesibles SIN sesión.
  const p = request.nextUrl.pathname;
  const enReset = p.startsWith("/recuperar") || p.startsWith("/auth");
  // Portal público de propuestas /p/[numero] (candado email+código, no login).
  const enPortal = p === "/p" || p.startsWith("/p/");
  const aLogin = () => NextResponse.redirect(new URL("/login", request.url));

  // Separación por DOMINIO (seguridad): si LANDINGS_HOST está configurado y la
  // petición llega por ese host, SOLO se sirve el portal /p/* (+ assets). Todo
  // el panel (login, /resumen, /pipeline, API…) queda invisible ahí.
  const host = request.headers.get("host") ?? "";
  const landingsHost = process.env.LANDINGS_HOST;
  if (landingsHost && host === landingsHost) {
    const permitido = enPortal || p.startsWith("/_next") || p.startsWith("/favicon") || p === "/robots.txt";
    return permitido ? NextResponse.next({ request }) : new NextResponse("No encontrado", { status: 404 });
  }

  if (enMaqueta || enReset || enPortal) return NextResponse.next({ request });

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
