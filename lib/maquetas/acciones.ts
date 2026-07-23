"use server";

import {
  generarMaquetaParaLead,
  detectarMarcaParaLead,
  type ResultadoMaqueta,
  type ResultadoDeteccion,
  type MarcaOverride,
} from "./generar";
import { maquetaDeLead, type Vistas } from "./store";

/**
 * Server action del panel: genera la maqueta de un lead y devuelve su ruta
 * pública (o un error accionable). La UI nunca conoce el proveedor ni toca
 * Supabase directo (CLAUDE.md §1). El flag y las credenciales viven en servidor.
 * `override` = la marca corregida por el operador (colores/fuente/eslogan).
 */
export async function generarMaqueta(
  leadId: string,
  override?: MarcaOverride,
): Promise<ResultadoMaqueta> {
  return generarMaquetaParaLead(leadId, override);
}

/**
 * Detecta la marca del lead (cache-first, sin gastar API) para que el operador
 * la vea y edite antes de generar. Coste CERO: no dispara WebSearch.
 */
export async function detectarMarca(leadId: string): Promise<ResultadoDeteccion> {
  return detectarMarcaParaLead(leadId);
}

/**
 * ¿Este lead ya tiene una maqueta? Devuelve su número (para el botón "Ver") y las
 * VISTAS del prospecto (intención de compra): cuántas veces la abrió y cuándo.
 */
export async function maquetaExistente(
  leadId: string,
): Promise<{ numero: number | null; codigo: string | null; vistas: Vistas } | null> {
  return maquetaDeLead(leadId);
}
