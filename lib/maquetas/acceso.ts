/**
 * Decisión de acceso al portal de propuestas (/p/[numero]), separada como
 * función pura para poder testearla sin Supabase ni cookies.
 *
 * Reglas:
 *  - La operadora logueada en el panel entra SIN código, y su apertura NO se
 *    registra como vista (las vistas son señal de intención del PROSPECTO).
 *  - Un visitante con cookie de candado válida entra y SÍ cuenta como vista.
 *  - Sin lo uno ni lo otro → candado (PortalGate).
 * Si ambas señales están presentes (operadora que además pasó el candado),
 * gana el modo operadora: nunca contaminar la señal de compra.
 */
export interface DecisionAcceso {
  autorizado: boolean;
  /** true solo cuando la apertura debe contar como vista del prospecto. */
  contarVista: boolean;
  /** true cuando el acceso vino por sesión del panel (para el aviso en UI). */
  modoOperadora: boolean;
}

export function decidirAccesoPortal(opts: {
  esOperadora: boolean;
  cookieValida: boolean;
}): DecisionAcceso {
  if (opts.esOperadora) {
    return { autorizado: true, contarVista: false, modoOperadora: true };
  }
  return {
    autorizado: opts.cookieValida,
    contarVista: opts.cookieValida,
    modoOperadora: false,
  };
}
