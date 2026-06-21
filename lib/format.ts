/**
 * Formateadores y reglas de presentación portadas del contrato visual.
 * El tipo de cambio y el precio base son placeholders de la tabla `config`
 * (§7 del spec); en M3/M5 se leerán de Supabase en vez de constantes.
 */

export const fE = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const fM = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** config.FX_MXN_EUR (placeholder fase 1). */
export const FX = 0.05;

/** config.PRECIOS.base_mxn (placeholder fase 1). */
export const PAQUETE_BASE_MXN = 14900;

export const aEur = (mxn: number): number => Math.round(mxn * FX);

export interface Score {
  css: "qw" | "big" | "low";
  label: string;
}

/** Score dinero × esfuerzo (idéntico a scoreLabel() del mockup). */
export function etiquetaScore(eur: number, dias: number): Score {
  if (dias <= 7 && eur < 900) return { css: "qw", label: "Quick win" };
  if (eur >= 1200) return { css: "big", label: "Proyecto grande" };
  if (eur < 700 && dias > 10) return { css: "low", label: "Baja prioridad" };
  return { css: "qw", label: "Buen ratio" };
}
