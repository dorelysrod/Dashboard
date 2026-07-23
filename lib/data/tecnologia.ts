/**
 * Detección de TECNOLOGÍA de la web actual de un lead (pura, testeable).
 * Dado el HTML de su sitio, identifica el constructor/stack por huellas
 * (meta generator, rutas de assets, globals de framework). Alimenta
 * `leads.tecnologia`: el pitch cambia según si es Wix, WordPress viejo o
 * una web a medida — y "Web caída" es gancho de dolor directo.
 */

interface Huella {
  nombre: string;
  patron: RegExp;
}

// Orden importa: lo específico antes que lo genérico (Elementor antes que
// WordPress a secas; Next.js antes que React).
const HUELLAS: Huella[] = [
  { nombre: "WordPress + Elementor", patron: /elementor/i },
  { nombre: "WordPress + Divi", patron: /et_pb_|\/themes\/divi/i },
  { nombre: "WordPress + WooCommerce", patron: /woocommerce/i },
  { nombre: "WordPress", patron: /wp-content|wp-includes|generator"?\s*content="?WordPress/i },
  { nombre: "Wix", patron: /wixstatic\.com|wix\.com|X-Wix|wixsite/i },
  { nombre: "Squarespace", patron: /squarespace/i },
  { nombre: "Shopify", patron: /cdn\.shopify|myshopify/i },
  { nombre: "Webflow", patron: /webflow/i },
  { nombre: "GoDaddy Builder", patron: /wsimg\.com|godaddy/i },
  { nombre: "Jimdo", patron: /jimdo/i },
  { nombre: "Weebly", patron: /weebly/i },
  { nombre: "UENI", patron: /ueni\b|ueniweb/i },
  { nombre: "Blogger", patron: /blogger|blogspot/i },
  { nombre: "Google Sites", patron: /sites\.google\.com/i },
  { nombre: "Framer", patron: /framerusercontent|framer\.com/i },
  { nombre: "Duda", patron: /dudamobile|duda\.co/i },
  { nombre: "Next.js", patron: /__NEXT_DATA__|\/_next\//i },
  { nombre: "Nuxt (Vue)", patron: /__NUXT__|\/_nuxt\//i },
  { nombre: "Angular", patron: /ng-version=/i },
  { nombre: "React (SPA)", patron: /id="root"[^>]*><\/div>|data-reactroot/i },
];

/**
 * Clasifica el HTML de un sitio. Devuelve el nombre del constructor/stack o
 * "A medida / otro" si no hay huella conocida (dominio propio sin generador).
 */
export function detectarTecnologia(html: string): string {
  const cabeza = html.slice(0, 200_000); // las huellas viven en <head>/primeros assets
  for (const h of HUELLAS) if (h.patron.test(cabeza)) return h.nombre;
  return "A medida / otro";
}
