import type { Prospecto } from "@/lib/types/dominio";
import { PROSPECTOS } from "./seed";

/**
 * Servicio de Buscar. En fase 2 esto pega al stub de Places (§8); en fase 1
 * devuelve el seed, sin ninguna llamada a API externa. Los parámetros se
 * conservan para que la firma no cambie al cablear Places.
 */
export async function buscarProspectos(
  _ciudad: string,
  _rubro: string,
): Promise<Prospecto[]> {
  return PROSPECTOS;
}
