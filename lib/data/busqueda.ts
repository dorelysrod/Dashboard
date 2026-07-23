import type { Nicho, Prospecto } from "@/lib/types/dominio";
import { PROSPECTOS } from "./seed";
import { obtenerNombresLeads } from "./leads";
import { filtrarNuevos } from "./dedupe";
import { nichoDesdeRubro } from "./mapeo";
import { modoIAActivo } from "@/lib/ai";

/**
 * Servicio de Buscar.
 *  - Modo real (AI_PROVIDER=anthropic): descubre prospectos REALES con el harness
 *    (Claude + WebSearch) por ciudad/rubro.
 *  - Modo demo/mock (sin proveedor automático): devuelve el seed ficticio.
 * En ambos casos aplica DEDUPE: descarta los que ya están en el pipeline, para
 * no volver a sugerir clientes que ya tienes.
 */
const esMock = () => process.env.AI_MOCK === "1";

/** Mapea un prospecto descubierto en web a la forma que pinta la UI. */
function mapearWeb(
  p: {
    nombre: string;
    ciudad: string | null;
    rating: number | null;
    resenas: number | null;
    nota: string;
  },
  nicho: Nicho,
): Prospecto {
  return {
    nombre: p.nombre,
    meta: p.ciudad ?? "—",
    nicho,
    rating: p.rating ?? 0,
    resenas: p.resenas ?? 0,
    senal: p.nota,
  };
}

export async function buscarProspectos(
  ciudad: string,
  rubro: string,
): Promise<Prospecto[]> {
  // Solo nombres (columna `negocio` por lotes): el dedupe no necesita leads
  // completos ni relaciones, y el select sin rango se truncaba a 1000 (T-007).
  const nombres = await obtenerNombresLeads();

  // Modo real: descubrimiento por web vía el harness. Import perezoso (server-only).
  // Pasa los nombres existentes como EXCLUSIÓN → el modelo no los busca ni reporta
  // (no gastamos tokens en los que ya tenemos); filtrarNuevos queda de red de seguridad.
  if (modoIAActivo() === "anthropic" && !esMock()) {
    const { buscarProspectosWeb } = await import("@/lib/ai/cliente-sdk");
    const web = await buscarProspectosWeb(ciudad, rubro, 8, nombres);
    const nicho = nichoDesdeRubro(rubro);
    return filtrarNuevos(web.map((p) => mapearWeb(p, nicho)), nombres);
  }

  // Demo/mock: seed ficticio.
  return filtrarNuevos(PROSPECTOS, nombres);
}
