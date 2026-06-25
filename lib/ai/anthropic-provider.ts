import type { AIProvider, SolicitudIA } from "./tipos";
import { construirPrompt } from "./prompts";

/**
 * Proveedor de fase 2: ejecuta el prompt contra la API de Claude. La interfaz
 * ya está lista; el cableado real (cliente Anthropic, modelo, manejo de errores)
 * se implementa al activar el flag `AI_PROVIDER=anthropic`. En fase 1 NUNCA se
 * instancia (la fábrica devuelve ManualProvider), por eso `ejecutar` lanza.
 */
export class AnthropicProvider implements AIProvider {
  readonly modo = "anthropic" as const;
  readonly requiereManual = false;

  construirPrompt(solicitud: SolicitudIA): string {
    return construirPrompt(solicitud);
  }

  async ejecutar(_prompt: string): Promise<string> {
    throw new Error(
      "AnthropicProvider.ejecutar se implementa en fase 2 (cablear la API de Claude).",
    );
  }
}
