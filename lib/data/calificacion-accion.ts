"use server";

import { revalidatePath } from "next/cache";
import { calificarLeadPorId, type ResultadoCalificacion } from "./calificacion";

/**
 * Server action: califica el potencial de un lead. CACHE-FIRST — si ya tiene
 * dossier, re-puntúa desde la base sin llamar la suscripción; con `forzar=true`
 * refresca el dossier vía WebSearch. La UI la invoca; nunca conoce el proveedor.
 */
export async function calificarLeadAction(
  leadId: string,
  forzar = false,
): Promise<ResultadoCalificacion> {
  const r = await calificarLeadPorId(leadId, forzar);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}
