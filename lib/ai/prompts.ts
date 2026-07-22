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
      const dolor = c.dolor && c.dolor.length ? c.dolor : c.mejoras;
      return `${PREÁMBULO}

Escribe un correo de acercamiento (outreach) que VENDA SOBRE EL DOLOR del prospecto
(método Problema → Agitar → Solución). No vendemos "una web bonita"; le mostramos qué
está PERDIENDO hoy y que la solución es el remedio a ESE dolor.

Negocio: ${c.negocio}
Ciudad: ${c.ciudad ?? "—"}
Rubro: ${c.rubro ?? "—"}
DOLOR del prospecto (úsalo como eje del correo):
${lista(dolor)}
${c.ganchoDolor ? `Gancho de dolor #1: ${c.ganchoDolor}` : ""}
Recomendación/solución: ${c.recomendacion ?? "—"}

Estructura (4 momentos, breve y humano):
1) PROBLEMA — abre nombrando su dolor #1 de forma concreta y específica de ESTE negocio
   (no genérico). Que se note que investigaste, no plantilla.
2) AGITAR — hazlo SENTIR: la consecuencia real de ese dolor (pacientes que agendan con la
   competencia, reservas perdidas de noche, pacientes de EE.UU. que no confían…). Sin drama
   falso ni cifras inventadas; concreto y creíble.
3) SOLUCIÓN — cómo lo resolvemos, atado EXACTAMENTE a ese dolor (no una lista genérica de
   features). "Sin costo te muestro una propuesta visual" encaja bien.
4) CTA suave — una pregunta fácil de responder (una llamada corta / ver la propuesta).

Tono: cercano, respetuoso, de colega que detectó algo, NO de vendedor agresivo. Español de
México. Sin promesas exageradas ni "garantizado". Máx ~140 palabras.

Devuelve:
ASUNTO: <asunto que toque el dolor, máx 8 palabras, sin clickbait>
CUERPO:
<el correo con los 4 momentos, en 3-4 párrafos cortos>`;
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

    case "maqueta": {
      const c = solicitud.contexto;
      const tieneSitio = Boolean(c.sitioTexto && c.sitioTexto.trim());
      const encabezado = tieneSitio
        ? `REDISEÑA la web de este negocio: toma lo bueno de su sitio actual y modernízalo (mejor jerarquía, conversión y claridad). Texto actual extraído del sitio:\n"""\n${c.sitioTexto!.slice(0, 6000)}\n"""`
        : `El negocio NO tiene web (o no se encontró). CREA una landing desde cero, apropiada a su rubro.`;

      const tieneMarca = Boolean(
        c.marca?.colores?.length ||
          c.marca?.fuentes?.length ||
          c.marca?.tipografiaFamilia ||
          c.marca?.eslogan,
      );
      const bloqueDiseno = tieneMarca
        ? `MARCA EXISTENTE — respétala y construye DESDE su identidad (NO inventes otra paleta):
- Paleta de marca (úsala como base; ajusta solo tonos de apoyo/neutros): ${(c.marca!.colores ?? []).join(", ") || "(no detectada)"}.
- Tipografía: ${c.marca!.tipografiaFamilia
        ? `USA font-family: "${c.marca!.tipografiaFamilia}" (la fuente REAL del cliente YA está embebida vía @font-face; aplícala a titulares y/o cuerpo). Puedes emparejarla con una sans de sistema para el cuerpo si encaja.`
        : `de marca (respétala si encaja; si no está disponible como fuente de sistema, elige la más cercana): ${(c.marca!.fuentes ?? []).join(", ") || "(no detectada)"}.`}
${c.marca!.eslogan ? `- Eslogan de la marca (ÚSALO textual en el hero): "${c.marca!.eslogan}".` : ""}
${c.marca!.tieneLogo ? "- LOGO: coloca el marcador de texto LITERAL ⟦LOGO⟧ en el header, exactamente donde va el logotipo. NO dibujes un logo ni lo estilices: solo el marcador (se sustituye por el logo real después)." : "- Sin logo disponible: usa el nombre del negocio como wordmark tipográfico en el header."}
Moderniza layout, jerarquía y conversión, pero que se sienta la MISMA marca.`
        : `Actúa como DIRECTOR DE ARTE: dale a ESTE negocio una identidad visual propia y
distintiva, no una plantilla. Decide un plan (paleta 4-6 hex derivada del negocio con
fondo neutro ELEGIDO + UN acento con carácter; par tipográfico display+body con escala;
layout con jerarquía real, no todo centrado) y constrúyelo.
${c.direccion ? `\n${c.direccion}\n` : ""}- Sin logo: usa el nombre del negocio como wordmark tipográfico en el header.`;

      const bloqueFundamento = c.fundamento
        ? `\nFUNDAMENTO DE DISEÑO del ux-dev — IMPLÉMENTALO tal cual (tokens en :root, jerarquía, secciones):\n"""\n${c.fundamento}\n"""\n`
        : "";

      const bloqueFotos = c.permitirFotos
        ? `\nFOTOS (royalty-free, solo para el mock): donde una FOTO real venda mejor que una forma CSS
(hero ambiental, ambiente de la clínica, imagen de un tratamiento), coloca el marcador LITERAL
⟦FOTO:slug⟧ DENTRO de un contenedor que ya tenga tamaño y un gradiente de marca de respaldo, p.ej.:
  <div class="media" style="aspect-ratio:4/3;background:linear-gradient(...marca...);overflow:hidden">⟦FOTO:tratamiento-facial⟧</div>
- slug = 2-4 palabras en inglés que describan la foto deseada (ej. facial-treatment-clinic, spa-skincare,
  aesthetic-clinic-interior). Máximo 4 marcadores en toda la página.
- El marcador se sustituye por una foto real embebida; si no hubiera, queda el gradiente. NO uses fotos
  como "antes/después" de pacientes reales ni como rostros de testimonios (sería engañoso): solo ambiente.
`
        : "";

      return `${PREÁMBULO}

${encabezado}

Negocio: ${c.negocio}
Ciudad: ${c.ciudad ?? "—"}
Rubro: ${c.rubro ?? "—"}
Mejoras a resaltar:
${lista(c.mejoras)}
${bloqueFundamento}
${bloqueDiseno}
${bloqueFotos}

PROHIBIDO (señales de diseño "hecho por IA", recházalas salvo que sean la marca real):
- Hero con degradado violeta/azul; paleta violeta+rosa; menta+ámbar decorativos.
- Todo centrado; border-radius grande en todo; emojis como marcadores de sección.
- Marcadores 01/02/03 salvo que el contenido SEA una secuencia real.
- "Space Grotesk"/"Inter" como fuente segura; crema+serif+terracota; lorem ipsum.

Requisitos DUROS del HTML (el "equipo de diseño" los exige: se rechaza si faltan):
- Documento COMPLETO y self-contained: <!doctype html> … </html> con TODO el CSS inline
  en un <style>. Responsive (mobile-first).
- SISTEMA DE TOKENS: define en :root las variables de color, espaciado, tipografía y radio
  (--brand, --ink, --bg, --surface, --space-*, --text-*, --radius-*) y ESTILIZA con ellas
  (nada de valores mágicos sueltos repartidos por el CSS). Escala tipográfica y de espaciado
  consistentes; reutiliza componentes (botón, tarjeta) en vez de recrearlos.
- ACCESIBILIDAD (WCAG 2.2 AA, piso NO negociable): contraste texto/fondo ≥4.5:1 (≥3:1 en
  texto grande y controles), :focus-visible visible en todo lo interactivo, objetivos táctiles
  ≥44px, jerarquía correcta de encabezados (un solo h1), alt/labels en imágenes y campos, y
  @media (prefers-reduced-motion: reduce) si hay animación.
- SIN recursos externos: nada de CDNs, <script src>, @import, fuentes remotas ni <img src>
  a URLs externas. Imágenes = bloques de color/gradientes CSS o SVG inline elegante.
  (Únicas imágenes permitidas: el marcador ⟦LOGO⟧${c.permitirFotos ? " y los marcadores ⟦FOTO:slug⟧" : ""} si se indicaron
  — se sustituyen después por assets embebidos; NO pongas tú ninguna URL de imagen.)
- SEO/conversión (growth): <title> descriptivo, meta description, Open Graph, y un bloque
  JSON-LD schema.org (MedicalBusiness/LocalBusiness) con nombre, ciudad y teléfono.
- Secciones con jerarquía real: hero-tesis, servicios concretos del negocio, prueba social
  creíble, y contacto/CTA (agenda + WhatsApp fijo). Copy en español, específico para ESTE
  negocio y sus servicios; sin promesas exageradas ni relleno.

Entrega SOLO invocando la tool con { titulo, html }.`;
    }
  }
}
