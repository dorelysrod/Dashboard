import "server-only";
import { crearClienteServidor } from "./server";

/**
 * ¿Hay una sesión válida del panel en esta request? El panel es de una sola
 * operadora (signups deshabilitados + RLS operador_full), así que cualquier
 * usuario autenticado ES la dueña — no hace falta tabla de roles.
 *
 * Fail-closed: cualquier error (envs de Supabase ausentes en dev, token
 * corrupto, red) devuelve false y el visitante cae al candado normal. getUser()
 * valida el JWT contra el servidor de Auth, no se fía de la cookie.
 */
export async function esOperadoraLogueada(): Promise<boolean> {
  try {
    const supabase = await crearClienteServidor();
    const { data, error } = await supabase.auth.getUser();
    return !error && Boolean(data.user);
  } catch {
    return false;
  }
}
