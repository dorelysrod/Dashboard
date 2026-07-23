/**
 * Config REQUERIDA en producción (T-014). Sin esto, la ausencia (o typo) de
 * una env de Supabase degradaba en silencio y en cadena: el middleware servía
 * TODO el panel sin login, las lecturas caían al seed ficticio presentado como
 * real, y las maquetas se escribían a memoria efímera. En producción eso debe
 * ser un fallo de ARRANQUE ruidoso, no un runtime degradado.
 *
 * En desarrollo no exige nada: trabajar antes del setup de Supabase sigue
 * siendo válido (CLAUDE.md §0, fase 1). Módulo puro para testearlo.
 */

export const ENVS_REQUERIDAS_PRODUCCION = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/** Nombres de envs requeridas que faltan (vacías cuentan como faltantes). */
export function envsFaltantes(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined,
): string[] {
  if (nodeEnv !== "production") return [];
  return ENVS_REQUERIDAS_PRODUCCION.filter((n) => !env[n]?.trim());
}
