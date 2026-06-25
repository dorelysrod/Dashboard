/**
 * ¿Hay credenciales de Supabase en el entorno? En fase 1 el panel debe correr
 * en Vercel y ser operable aunque la base no esté cableada (criterio de
 * aceptación, CLAUDE.md §3): si no está configurada, la capa de datos cae al
 * seed en vez de lanzar. No expone valores, solo un booleano.
 */
export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
