"use server";

import { generarIA, type ResultadoIA, type SolicitudIA } from "./index";

/**
 * Server action que entrega el prompt (o, en fase 2, la respuesta) del harness
 * IA. La UI la invoca y nunca conoce el proveedor: en fase 1 recibe el prompt
 * para copiar en Claude y pegar la respuesta. El flag vive en el servidor.
 */
export async function prepararGeneracion(
  solicitud: SolicitudIA,
): Promise<ResultadoIA> {
  return generarIA(solicitud);
}
