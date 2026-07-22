import type { AIProvider, SolicitudIA } from "./tipos";
import { construirPrompt } from "./prompts";
import { esquemaDeTarea } from "./esquemas";
import { respuestaMock } from "./mock";

/**
 * Proveedor de fase 2: ejecuta el prompt contra Claude y devuelve una respuesta
 * ESTRUCTURADA (JSON) que el parser (lib/ai/parsers.ts) consume igual que a la
 * pegada en modo manual. Activar = `AI_PROVIDER=anthropic`. Cero cambios en la
 * app (CLAUDE.md §0): la UI sigue recibiendo `respuesta.texto` y parseándola.
 *
 * Backend: Agent SDK (suscripción). El cliente SDK se importa PEREZOSAMENTE para
 * no cargar el SDK cuando no se usa (modo manual, mock, edge). Con `AI_MOCK=1`
 * ni siquiera se importa: devuelve una respuesta simulada.
 */
export class AnthropicProvider implements AIProvider {
  readonly modo = "anthropic" as const;
  readonly requiereManual = false;

  private readonly system =
    "Eres el asistente de Ai Landing Pro, un negocio que rehace webs para clínicas " +
    "y profesionales en México. Responde en español, conciso y accionable. Entrega el " +
    "resultado ÚNICAMENTE invocando la tool provista, con todos sus campos.";

  construirPrompt(solicitud: SolicitudIA): string {
    return construirPrompt(solicitud);
  }

  async ejecutar(prompt: string, solicitud?: SolicitudIA): Promise<string> {
    if (!solicitud) {
      throw new Error("AnthropicProvider.ejecutar necesita la solicitud para elegir el esquema de salida.");
    }

    // Mock: ni carga el SDK ni gasta. Para tests y dev.
    if (process.env.AI_MOCK === "1") {
      return JSON.stringify(respuestaMock(solicitud.tarea));
    }

    const { generarEstructurado } = await import("./cliente-sdk");
    const esq = esquemaDeTarea(solicitud.tarea);
    const obj = await generarEstructurado({
      system: this.system,
      userMessage: prompt,
      toolName: esq.toolName,
      toolDescription: esq.toolDescription,
      shape: esq.shape,
      costLabel: solicitud.tarea,
    });
    return JSON.stringify(obj);
  }
}
