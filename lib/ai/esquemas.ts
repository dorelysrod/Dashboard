import { z } from "zod";
import type { TareaIA } from "./tipos";

/**
 * Esquemas de SALIDA ESTRUCTURADA por tarea (fase 2). El AnthropicProvider
 * fuerza al modelo a invocar UNA tool con este `shape` (mecanismo del harness):
 * el resultado llega ya validado, sin parsear texto libre. Cada shape refleja
 * exactamente lo que consume el parser correspondiente (lib/ai/parsers.ts), así
 * el modo automático y el manual desembocan en la misma estructura.
 *
 * `shape` es un ZodRawShape (objeto plano de tipos zod), como pide `tool()` del
 * Agent SDK — no un `z.object(...)`.
 */

const shapeInspeccion = {
  tecnologia: z.string().describe("Stack técnico detectado o probable"),
  hosting: z.string().describe("Hosting detectado o probable"),
  segmento: z.number().int().min(1).max(4).describe("Segmento 1-4 (1 = mejor oportunidad)"),
  mejoras: z.array(z.string()).describe("Mejoras concretas y accionables"),
  recomendacion: z.string().describe("Recomendación de venta, 1-2 frases"),
};

const shapeSegmento = {
  segmento: z.number().int().min(1).max(4).describe("Segmento 1-4 (1 = mejor oportunidad)"),
  motivo: z.string().describe("Una frase que justifica el segmento"),
};

const shapeCorreo = {
  asunto: z.string().describe("Asunto del correo, máx 8 palabras"),
  cuerpo: z.string().describe("2-3 párrafos cortos, humanos, con una llamada a la acción suave"),
};

const shapeCotizacion = {
  modulos: z.array(z.string()).describe("Módulos incluidos en la propuesta"),
  totalMxn: z.number().int().describe("Total en pesos MXN, entero"),
  justificacion: z.string().describe("Una frase que justifica el precio"),
};

const shapeReporte = {
  resumen: z.string().describe("2-3 frases de avances y próximos pasos"),
};

const shapeMaqueta = {
  titulo: z.string().describe("Título corto de la maqueta (nombre del negocio)"),
  html: z
    .string()
    .describe(
      "Documento HTML COMPLETO y self-contained (<!doctype html>…</html>), con TODO el CSS " +
        "inline en <style>, sin recursos externos (ni CDNs, ni fuentes remotas, ni <img> a URLs). " +
        "Landing moderna de una sola página, tema claro.",
    ),
};

export interface EsquemaTarea {
  toolName: string;
  toolDescription: string;
  shape: z.ZodRawShape;
}

const ESQUEMAS: Record<TareaIA, EsquemaTarea> = {
  inspeccion: {
    toolName: "entregar_inspeccion",
    toolDescription: "Entrega la inspección del negocio con los campos estructurados.",
    shape: shapeInspeccion,
  },
  segmento: {
    toolName: "entregar_segmento",
    toolDescription: "Entrega la clasificación de segmento del prospecto.",
    shape: shapeSegmento,
  },
  correo: {
    toolName: "entregar_correo",
    toolDescription: "Entrega el correo de acercamiento (asunto + cuerpo).",
    shape: shapeCorreo,
  },
  cotizacion: {
    toolName: "entregar_cotizacion",
    toolDescription: "Entrega la cotización propuesta (módulos + total).",
    shape: shapeCotizacion,
  },
  reporte: {
    toolName: "entregar_reporte",
    toolDescription: "Entrega el reporte de estado para el cliente.",
    shape: shapeReporte,
  },
  maqueta: {
    toolName: "entregar_maqueta",
    toolDescription: "Entrega la maqueta como un documento HTML self-contained.",
    shape: shapeMaqueta,
  },
};

export function esquemaDeTarea(tarea: TareaIA): EsquemaTarea {
  return ESQUEMAS[tarea];
}
