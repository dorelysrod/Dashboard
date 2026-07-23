import type { Prospecto } from "@/lib/types/dominio";

/**
 * Dedupe de Buscar (puro, testeable). Descarta los prospectos cuyo nombre de
 * negocio ya está en el pipeline, para no volver a sugerir clientes que ya
 * tienes. Comparación normalizada (trim + minúsculas).
 */
const norm = (s: string) => s.trim().toLowerCase();

export function filtrarNuevos(prospectos: Prospecto[], nombresLeads: string[]): Prospecto[] {
  const yaEnPipeline = new Set(nombresLeads.map(norm));
  return prospectos.filter((p) => !yaEnPipeline.has(norm(p.nombre)));
}
