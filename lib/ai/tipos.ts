/**
 * Harness IA (spec §5). TODA la generación con IA (inspección, segmento, correo,
 * cotización, reporte) vive detrás de esta interfaz. En fase 1 NO hay ninguna
 * llamada a API externa: el `ManualProvider` entrega el prompt para copiar en
 * Claude y recibe la respuesta pegada. En fase 2 el `AnthropicProvider` la
 * ejecuta solo; activar = cambiar el flag `AI_PROVIDER`. Cero cambios en la app.
 */

export type ModoIA = "manual" | "anthropic";

export type TareaIA =
  | "inspeccion"
  | "segmento"
  | "correo"
  | "cotizacion"
  | "reporte"
  | "maqueta";

// ── Contextos de dominio por tarea (entrada para construir el prompt) ────────
export interface CtxInspeccion {
  negocio: string;
  sitioWeb?: string | null;
  ciudad?: string | null;
  rubro?: string | null;
}
export interface CtxSegmento {
  negocio: string;
  rating?: number | null;
  resenas?: number | null;
  sitioWeb?: string | null;
}
export interface CtxCorreo {
  negocio: string;
  rubro?: string | null;
  mejoras?: string[];
  recomendacion?: string | null;
  /** El DOLOR del prospecto (del dossier): qué pierde hoy. La venta se basa en esto. */
  dolor?: string[];
  ganchoDolor?: string | null;
  /** Contexto para personalizar (servicios, ciudad, seguidores…). */
  ciudad?: string | null;
}
export interface CtxCotizacion {
  negocio: string;
  mejoras?: string[];
  modulosSugeridos?: string[];
}
export interface CtxReporte {
  negocio: string;
  periodo?: string;
}
export interface CtxMaqueta {
  negocio: string;
  rubro?: string | null;
  ciudad?: string | null;
  /** URL del sitio actual, si se conoce/descubre (null = crear desde cero). */
  sitioWeb?: string | null;
  /** Texto extraído del sitio actual (para rediseñar mejorándolo). */
  sitioTexto?: string | null;
  /** Mejoras detectadas en la inspección, si las hay. */
  mejoras?: string[];
  /**
   * Identidad de MARCA existente (extraída del sitio). Si viene, el rediseño
   * parte de ella en vez de inventar. El logo real se incrusta después (no pasa
   * por el modelo); aquí solo se indica si existe, para dejar el marcador ⟦LOGO⟧.
   */
  marca?: {
    colores?: string[];
    fuentes?: string[];
    tieneLogo?: boolean;
    /** Eslogan/tagline real de la marca (de su web o bio de redes). */
    eslogan?: string | null;
    /** Familia tipográfica REAL del cliente ya EMBEBIDA (@font-face) → úsala tal cual. */
    tipografiaFamilia?: string | null;
  };
  /** Dirección de arte explícita (solo cuando NO hay marca; para dar variedad). */
  direccion?: string;
  /**
   * Fundamento de diseño del ux-dev (tokens + jerarquía + mapa de secciones) que
   * el frontend-dev debe implementar. Lo inyecta el pipeline del equipo de diseño.
   */
  fundamento?: string;
  /** Permite fotos royalty-free vía marcadores ⟦FOTO:slug⟧ (se embeben luego). */
  permitirFotos?: boolean;
}

/** Solicitud de generación: tarea + su contexto (unión discriminada). */
export type SolicitudIA =
  | { tarea: "inspeccion"; contexto: CtxInspeccion }
  | { tarea: "segmento"; contexto: CtxSegmento }
  | { tarea: "correo"; contexto: CtxCorreo }
  | { tarea: "cotizacion"; contexto: CtxCotizacion }
  | { tarea: "reporte"; contexto: CtxReporte }
  | { tarea: "maqueta"; contexto: CtxMaqueta };

/** Salida cruda del modelo (se persiste en `*.raw` y luego se parsea). */
export interface RespuestaIA {
  tarea: TareaIA;
  modo: ModoIA;
  texto: string;
}

/**
 * Resultado de orquestar una generación:
 * - manual: la UI muestra `prompt` para copiar en Claude y pegar la respuesta.
 * - automático: `respuesta` ya viene resuelta por el proveedor (fase 2).
 */
export type ResultadoIA =
  | { manual: true; modo: "manual"; prompt: string }
  | { manual: false; modo: "anthropic"; respuesta: RespuestaIA };

/** Se lanza si se intenta ejecutar automáticamente en modo manual (fase 1). */
export class ErrorIAManual extends Error {
  constructor(mensaje = "El modo manual no ejecuta solo: copia el prompt en Claude y pega la respuesta.") {
    super(mensaje);
    this.name = "ErrorIAManual";
  }
}

/**
 * Contrato del harness. Un proveedor sabe construir el prompt de una tarea
 * (idéntico entre proveedores) y, si es automático, ejecutarlo.
 */
export interface AIProvider {
  readonly modo: ModoIA;
  /** ¿La generación la completa un humano (copiar prompt → pegar respuesta)? */
  readonly requiereManual: boolean;
  /** Construye el prompt para la tarea. */
  construirPrompt(solicitud: SolicitudIA): string;
  /**
   * Ejecuta el prompt y devuelve texto crudo. Manual: lanza ErrorIAManual.
   * `solicitud` es opcional por compatibilidad; el proveedor automático la usa
   * para elegir el esquema de salida estructurada (lib/ai/esquemas.ts).
   */
  ejecutar(prompt: string, solicitud?: SolicitudIA): Promise<string>;
}
