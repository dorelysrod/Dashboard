import type { AIProvider, SolicitudIA } from "./tipos";
import { ErrorIAManual } from "./tipos";
import { construirPrompt } from "./prompts";

/**
 * Proveedor de fase 1: NO llama a ninguna API. Construye el prompt para que el
 * operador lo copie en Claude (chat) y pegue la respuesta. `ejecutar` lanza,
 * porque en modo manual la generación la completa un humano, no el código.
 */
export class ManualProvider implements AIProvider {
  readonly modo = "manual" as const;
  readonly requiereManual = true;

  construirPrompt(solicitud: SolicitudIA): string {
    return construirPrompt(solicitud);
  }

  async ejecutar(): Promise<string> {
    throw new ErrorIAManual();
  }
}
