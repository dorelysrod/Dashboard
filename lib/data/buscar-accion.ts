"use server";

import type { Prospecto } from "@/lib/types/dominio";
import { buscarProspectos } from "./busqueda";

/**
 * Server action de Buscar: descubre prospectos (reales vía harness en modo
 * anthropic; seed en demo) para la ciudad/rubro que escribe el operador. La UI
 * la invoca al pulsar Buscar; nunca conoce el proveedor ni toca la web directo.
 */
export async function buscarProspectosAction(
  ciudad: string,
  rubro: string,
): Promise<Prospecto[]> {
  return buscarProspectos(ciudad, rubro);
}
