import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { FX, PAQUETE_BASE_MXN } from "@/lib/format";

/**
 * Acceso a la configuración de negocio (tabla `config` de Supabase): valores
 * editables como el tipo de cambio MXN→€, el precio base, el flag AI_PROVIDER…
 * `valor` es jsonb, así que puede ser un número, string u objeto.
 * Servicio de dominio: la UI nunca toca Supabase directo (CLAUDE.md §1).
 */
export async function leerConfig<T = unknown>(clave: string): Promise<T | null> {
  // Guard: sin credenciales, crearClienteServidor recibiría env undefined y
  // lanzaría. En modo seed no hay `config` que leer → null y el caller cae a su
  // constante de fallback.
  if (!supabaseConfigurado()) return null;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("config")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle();

  if (error) throw error;
  return (data?.valor as T) ?? null;
}

interface Precios {
  base_mxn: number;
}

/**
 * Tipo de cambio MXN→€ editable (config.FX_MXN_EUR). Cae a la constante FX
 * (lib/format) en modo seed o si la clave falta/está mal tipada — así editar el
 * tipo de cambio en `config` cambia de verdad lo que se persiste.
 */
export async function leerFx(): Promise<number> {
  const v = await leerConfig<number>("FX_MXN_EUR");
  return typeof v === "number" && v > 0 ? v : FX;
}

/**
 * Precio base del paquete en MXN (config.PRECIOS.base_mxn). Cae a la constante
 * PAQUETE_BASE_MXN en modo seed o si falta.
 */
export async function leerPaqueteBaseMxn(): Promise<number> {
  const p = await leerConfig<Partial<Precios>>("PRECIOS");
  return typeof p?.base_mxn === "number" && p.base_mxn > 0
    ? p.base_mxn
    : PAQUETE_BASE_MXN;
}
