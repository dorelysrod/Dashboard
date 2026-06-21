import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para el servidor (Server Components, Route Handlers, Server
 * Actions). Lee/escribe cookies de sesión. En Next 15 `cookies()` es async.
 * Usa la anon key + RLS; la service role key solo se usa en contextos server
 * explícitos y nunca llega al cliente.
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll desde un Server Component: ignorable si hay middleware
            // que refresca la sesión.
          }
        },
      },
    },
  );
}
