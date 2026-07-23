import type { Lead, Prospecto } from "@/lib/types/dominio";

/**
 * SEED de DEMO (nombres ficticios) — público. Conserva la forma de los arrays
 * del mockup (LEADS, FOUND) para que la UI se comporte idéntico, pero SIN datos
 * reales de prospectos (GDPR; el repo es público). Los datos reales viven en el
 * mockup local (gitignored) y, desde M3, en Supabase. Fase 1: sin API externa.
 */
export const LEADS: Lead[] = [
  {
    id: "lead-1",
    nombre: "Dra. Valeria Núñez",
    meta: "CDMX · Medicina estética",
    nicho: "estetica",
    etapa: { css: "st-env", label: "Cotización enviada" },
    etapaDb: "enviado",
    rating: 5.0,
    resenas: 62,
    tecnologia: "Wix",
    hosting: "Wix",
    mejoras:
      "WhatsApp-only sin agenda · home = feed de IG · sin inglés (atiende pacientes de EE.UU.) · tienda externa.",
    recomendacion:
      "Plantilla Wix lenta. <b>Rehacer en React/Next</b>: la controlas tú, mejor SEO y conversión.",
    mxn: 14900,
    modulos: ["Agenda", "Recordatorios", "Bilingüe"],
    esfuerzoDias: 9,
    aperturas: 3,
    clics: 1,
    vioCotizacion: 1,
    correo:
      "Asunto: 3 cosas que su web está dejando ir\n\nHola Dra., vi su consultorio (5.0★, pacientes internacionales) y su web no le está sacando provecho…",
  },
  {
    id: "lead-2",
    nombre: "Dr. Mateo Ríos",
    meta: "Tijuana · Medicina estética",
    nicho: "estetica",
    etapa: { css: "st-ab", label: "Abierta" },
    etapaDb: "abierto",
    rating: 4.6,
    resenas: 34,
    tecnologia: "WordPress",
    hosting: "cPanel",
    mejoras:
      "Atiende en inglés a pacientes fronterizos, pero el sitio no lo refleja. Reservas por teléfono.",
    recomendacion:
      "WP lento; quiere autogestión. <b>Headless con CMS</b> o React + módulo editable. Bilingüe obligatorio.",
    mxn: 18000,
    modulos: ["Agenda", "Bilingüe", "SEO"],
    esfuerzoDias: 10,
    aperturas: 5,
    clics: 2,
    vioCotizacion: 1,
    correo: "Asunto: Una web que convierta sus pacientes de EE.UU.\n\nHola Dr. …",
  },
  {
    id: "lead-3",
    nombre: "Clínica Lumina",
    meta: "CDMX · Medicina estética",
    nicho: "estetica",
    etapa: { css: "st-env", label: "Cotización enviada" },
    etapaDb: "enviado",
    // 5.0 pero pocas reseñas: pasa el filtro 'Mejores calificados' (rating ≥
    // 4.5) sin ganar el distintivo (exige ≥ 10 reseñas).
    rating: 5.0,
    resenas: 8,
    tecnologia: "Instagram / Linktree",
    hosting: "—",
    mejoras: "Sin sitio propio, solo IG. 5.0★, owner-operated.",
    recomendacion:
      "<b>Sin sitio = mejor oportunidad.</b> React/Next desde cero, entrega rápida. Quick win.",
    mxn: 14900,
    modulos: [],
    esfuerzoDias: 6,
    aperturas: 0,
    clics: 0,
    vioCotizacion: 0,
    correo: "Asunto: Una web propia (más allá de Instagram)\n\nHola…",
  },
  {
    id: "lead-4",
    nombre: "Clínica Aurora Facial",
    meta: "Cancún · Medicina estética",
    nicho: "estetica",
    etapa: { css: "st-ab", label: "Abierta" },
    etapaDb: "abierto",
    // Muchas reseñas pero rating bajo el umbral: 'Con reseñas' sí, 'Mejores
    // calificados' no.
    rating: 4.4,
    resenas: 712,
    tecnologia: "WordPress + Elementor",
    hosting: "Hosting compartido",
    mejoras:
      "700+ reseñas, pacientes internacionales, la encuentran por buscadores. Ya tiene web.",
    recomendacion:
      "Ya posiciona. <b>Rediseño de conversión + bilingüe + dashboard</b>. Pitch de upgrade, presupuesto alto.",
    mxn: 28000,
    modulos: ["Bilingüe", "SEO", "Galería", "Dashboard"],
    esfuerzoDias: 16,
    aperturas: 2,
    clics: 1,
    vioCotizacion: 1,
    correo: "Asunto: Más pacientes internacionales para su clínica\n\nHola…",
  },
  {
    id: "lead-5",
    nombre: "Dra. Renata Vidal",
    meta: "Monterrey · Medicina estética",
    nicho: "estetica",
    etapa: { css: "st-new", label: "Inspeccionado" },
    etapaDb: "inspeccionado",
    // Empata rating 5.0 con lead-1 y lead-3: el desempate por reseñas ordena
    // lead-5 (75) > lead-1 (62) > lead-3 (8).
    rating: 5.0,
    resenas: 75,
    tecnologia: "Por inspeccionar",
    hosting: "—",
    mejoras: "5.0★ / 75 reseñas. Owner-operated, buen margen.",
    recomendacion: "<b>React/Next</b> por defecto — receptiva, entrega rápida.",
    mxn: 16000,
    modulos: ["Agenda", "Recordatorios"],
    esfuerzoDias: 8,
    aperturas: 0,
    clics: 0,
    vioCotizacion: 0,
    correo: "(pendiente de generar)",
  },
  {
    // Lead recién capturado: sin rating ni reseñas y etapa 'nuevo' — queda
    // FUERA de los 3 filtros de calidad y sin distintivo (demo del fallback).
    id: "lead-6",
    nombre: "Spa Marina Denté",
    meta: "Mérida · Medicina estética",
    nicho: "estetica",
    etapa: { css: "st-new", label: "Nuevo" },
    etapaDb: "nuevo",
    rating: null,
    resenas: 0,
    tecnologia: "Por inspeccionar",
    hosting: "—",
    mejoras: "Capturado de Maps; aún sin inspección.",
    recomendacion: "",
    mxn: 0,
    modulos: [],
    esfuerzoDias: 0,
    aperturas: 0,
    clics: 0,
    vioCotizacion: 0,
    correo: "",
  },
];

/**
 * Resultados de Buscar (stub Places en fase 1; nombres ficticios). Mezcla el
 * nicho base con el ranking A del estudio de nichos (jul 2026) para poder
 * demostrar los chips de filtro sin API externa.
 */
export const PROSPECTOS: Prospecto[] = [
  { nombre: "Estética Vértiz", meta: "CDMX", nicho: "estetica", rating: 4.9, resenas: 85, senal: "Tier B · activa, web débil probable" },
  { nombre: "Dra. Paola Quintero", meta: "Guadalajara", nicho: "estetica", rating: 5.0, resenas: 49, senal: "Tier B · 5.0, pacientes de EE.UU." },
  { nombre: "Dr. Hugo Bravo", meta: "Querétaro", nicho: "estetica", rating: 5.0, resenas: 46, senal: "Tier B · le falta web fuerte" },
  { nombre: "Dra. Lía Mendoza", meta: "Querétaro", nicho: "estetica", rating: 5.0, resenas: 28, senal: "Tier B · owner-operated" },
  { nombre: "Dra. Bruna Salas", meta: "Tijuana", nicho: "estetica", rating: 5.0, resenas: 25, senal: "Tier B · frontera, bilingüe vende" },
  { nombre: "Dra. Ana Gómez", meta: "Monterrey", nicho: "estetica", rating: 5.0, resenas: 26, senal: "Tier B · 5.0" },
  { nombre: "Dental Bahía", meta: "Tijuana", nicho: "turismo_dental", rating: 4.9, resenas: 132, senal: "Tier A · pacientes de EE.UU., sin web propia" },
  { nombre: "Jardín Los Nogales", meta: "Querétaro", nicho: "bodas_venues", rating: 4.8, resenas: 210, senal: "Tier A · venue de bodas, solo Instagram" },
  { nombre: "Caribe Azul Tours", meta: "Cancún", nicho: "tour_operadores", rating: 4.9, resenas: 340, senal: "Tier A · depende de OTAs, comisiones 20-30%" },
];
