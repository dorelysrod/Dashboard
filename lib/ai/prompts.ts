import type { SolicitudIA } from "./tipos";

/**
 * Construcción de prompts por tarea (puro, compartido por todos los proveedores).
 * Los prompts piden una salida con formato etiquetado para que el parseo de la
 * respuesta (al pegarla en modo manual) sea predecible. En español, como el
 * resto del dominio (CLAUDE.md §1).
 */

const PREÁMBULO =
  "Eres el asistente de Ai Landing Pro, un negocio que rehace webs para clínicas y profesionales en México. Responde en español, conciso y accionable.";

function lista(items?: string[]): string {
  return items && items.length ? items.map((i) => `- ${i}`).join("\n") : "(sin datos)";
}

export function construirPrompt(solicitud: SolicitudIA): string {
  switch (solicitud.tarea) {
    case "inspeccion": {
      const c = solicitud.contexto;
      return `${PREÁMBULO}

Inspecciona el negocio y su presencia web.
Negocio: ${c.negocio}
Ciudad: ${c.ciudad ?? "—"}
Rubro: ${c.rubro ?? "—"}
Sitio web: ${c.sitioWeb ?? "—"}

Devuelve EXACTAMENTE estos campos etiquetados:
TECNOLOGIA: <stack detectado o probable>
HOSTING: <hosting detectado o probable>
SEGMENTO: <1-4>
MEJORAS:
- <mejora 1>
- <mejora 2>
RECOMENDACION: <una recomendación de venta, 1-2 frases>`;
    }

    case "segmento": {
      const c = solicitud.contexto;
      return `${PREÁMBULO}

Clasifica al prospecto en un segmento 1-4 (1 = mejor oportunidad).
Negocio: ${c.negocio}
Rating: ${c.rating ?? "—"} (${c.resenas ?? 0} reseñas)
Sitio web: ${c.sitioWeb ?? "—"}

Devuelve:
SEGMENTO: <1-4>
MOTIVO: <una frase>`;
    }

    case "correo": {
      const c = solicitud.contexto;
      return `${PREÁMBULO}

Escribe un correo de acercamiento (outreach) breve y humano para este negocio.
Negocio: ${c.negocio}
Rubro: ${c.rubro ?? "—"}
Qué mejorar:
${lista(c.mejoras)}
Recomendación: ${c.recomendacion ?? "—"}

Devuelve:
ASUNTO: <asunto, máx 8 palabras>
CUERPO:
<2-3 párrafos cortos, sin promesas exageradas, con una llamada a la acción suave>`;
    }

    case "cotizacion": {
      const c = solicitud.contexto;
      return `${PREÁMBULO}

Propón una cotización para rehacer la web del negocio.
Negocio: ${c.negocio}
Qué mejorar:
${lista(c.mejoras)}
Módulos sugeridos: ${c.modulosSugeridos?.join(", ") || "—"}

Devuelve:
MODULOS:
- <módulo 1>
- <módulo 2>
TOTAL_MXN: <entero en pesos>
JUSTIFICACION: <una frase>`;
    }

    case "reporte": {
      const c = solicitud.contexto;
      return `${PREÁMBULO}

Redacta un reporte breve de estado para el cliente.
Negocio: ${c.negocio}
Periodo: ${c.periodo ?? "este mes"}

Devuelve:
RESUMEN: <2-3 frases de avances y próximos pasos>`;
    }
  }
}
