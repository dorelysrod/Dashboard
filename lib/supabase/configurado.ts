/**
 * ¿Hay credenciales de Supabase en el entorno? En fase 1 el panel debe correr
 * en Vercel y ser operable aunque la base no esté cableada (criterio de
 * aceptación, CLAUDE.md §3): si no está configurada, la capa de datos cae al
 * seed en vez de lanzar. No expone valores, solo un booleano.
 */

/**
 * Modo DEMO/preview: fuerza el seed ficticio aunque Supabase esté configurado.
 * Permite un deploy "demo" (siempre mock, para enseñar cómo se ve) y otro de
 * "producción" (Supabase real) desde el MISMO código. Demo = solo lectura del
 * seed, sin persistencia — cualquier escritura devuelve el error de "no
 * configurado", que es lo correcto en un preview.
 */
export function modoDemo(): boolean {
  return process.env.DEMO_MODE === "1";
}

export function supabaseConfigurado(): boolean {
  if (modoDemo()) return false; // demo fuerza el seed
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
