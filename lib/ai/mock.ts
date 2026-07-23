import type { TareaIA } from "./tipos";

/**
 * Respuestas simuladas para `AI_MOCK=1`: permiten ejercitar el camino automático
 * (fase 2) en tests y en dev SIN tocar la API ni la suscripción. La forma es
 * idéntica a la que devuelve la salida estructurada real (lib/ai/esquemas.ts),
 * así el parser (lib/ai/parsers.ts) la consume igual que a la del modelo.
 */
export function respuestaMock(tarea: TareaIA): Record<string, unknown> {
  switch (tarea) {
    case "inspeccion":
      return {
        tecnologia: "WordPress (mock)",
        hosting: "GoDaddy (mock)",
        segmento: 2,
        mejoras: ["SEO local", "Agenda online", "Velocidad de carga"],
        recomendacion: "Migrar a un stack moderno y activar reservas online.",
      };
    case "segmento":
      return { segmento: 2, motivo: "Buen rating pero sitio anticuado (mock)." };
    case "correo":
      return {
        asunto: "Tu web puede rendir más",
        cuerpo:
          "Hola, vi la web de tu negocio y detecté un par de mejoras rápidas.\n\n" +
          "Podemos rehacerla con reservas online y mejor posicionamiento local.\n\n" +
          "¿Te va bien una llamada corta esta semana? (mock)",
      };
    case "cotizacion":
      return {
        modulos: ["Rediseño responsivo", "Reservas online", "SEO local"],
        totalMxn: 18000,
        justificacion: "Paquete base + módulo de reservas (mock).",
      };
    case "reporte":
      return {
        resumen: "Sitio en producción; próximos pasos: alta en Google Business y campaña local (mock).",
      };
    case "maqueta":
      return {
        titulo: "Maqueta (mock)",
        html:
          "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
          "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
          "<title>Maqueta mock</title><style>" +
          "body{margin:0;font-family:system-ui,sans-serif;background:#F6F5FB;color:#23223A}" +
          ".hero{padding:80px 24px;text-align:center;background:linear-gradient(135deg,#6C5CE7,#FF5C8A);color:#fff}" +
          ".hero h1{font-size:40px;margin:0 0 12px}.cta{display:inline-block;margin-top:20px;padding:12px 28px;" +
          "background:#fff;color:#6C5CE7;border-radius:10px;text-decoration:none;font-weight:600}" +
          ".sec{max-width:900px;margin:48px auto;padding:0 24px}</style></head><body>" +
          "<div class=\"hero\"><h1>Maqueta de demostración</h1><p>Landing generada (mock, sin gastar API).</p>" +
          "<a class=\"cta\" href=\"#\">Agenda una llamada</a></div>" +
          "<div class=\"sec\"><h2>Servicios</h2><p>Contenido de ejemplo para la vista previa.</p></div>" +
          "</body></html>",
      };
  }
}
