import type { AIProvider, ModoIA, ResultadoIA, SolicitudIA } from "./tipos";
import { ManualProvider } from "./manual-provider";
import { AnthropicProvider } from "./anthropic-provider";

export * from "./tipos";
export { construirPrompt } from "./prompts";

/**
 * Lee el flag `AI_PROVIDER` (espejo de la decisión en `config`, §7). Default
 * `manual`: fase 1 nunca toca una API aunque el valor venga vacío o sea inválido.
 */
export function modoIAActivo(): ModoIA {
  return (process.env.AI_PROVIDER ?? "").toLowerCase() === "anthropic"
    ? "anthropic"
    : "manual";
}

/** Fábrica del proveedor activo según el flag. */
export function obtenerProveedorIA(): AIProvider {
  return modoIAActivo() === "anthropic"
    ? new AnthropicProvider()
    : new ManualProvider();
}

/**
 * Orquesta una generación tras el harness. La UI llama a esto y nunca conoce el
 * proveedor:
 * - modo manual → devuelve el `prompt` para copiar/pegar.
 * - modo automático (fase 2) → ejecuta y devuelve la `respuesta`.
 */
export async function generarIA(solicitud: SolicitudIA): Promise<ResultadoIA> {
  const proveedor = obtenerProveedorIA();
  const prompt = proveedor.construirPrompt(solicitud);

  if (proveedor.requiereManual) {
    return { manual: true, modo: "manual", prompt };
  }

  const texto = await proveedor.ejecutar(prompt);
  return {
    manual: false,
    modo: "anthropic",
    respuesta: { tarea: solicitud.tarea, modo: proveedor.modo, texto },
  };
}
