import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para el navegador (componentes cliente).
 * Usa la anon key pública + RLS. NUNCA exponer la service role key aquí.
 */
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
