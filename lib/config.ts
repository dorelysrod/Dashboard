import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Acceso a la configuración de negocio (tabla `config` de Supabase): valores
 * editables como el tipo de cambio MXN→€, el flag AI_PROVIDER, etc.
 * Servicio de dominio: la UI nunca toca Supabase directo (CLAUDE.md §1).
 */
export async function leerConfig(clave: string): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("config")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle();

  if (error) throw error;
  return data?.valor ?? null;
}
