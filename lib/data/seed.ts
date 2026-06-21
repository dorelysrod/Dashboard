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
    etapa: { css: "st-env", label: "Cotización enviada" },
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
    etapa: { css: "st-ab", label: "Abierta" },
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
    etapa: { css: "st-env", label: "Cotización enviada" },
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
    etapa: { css: "st-ab", label: "Abierta" },
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
    etapa: { css: "st-new", label: "Inspeccionado" },
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
];

/** Resultados de Buscar (stub Places en fase 1; nombres ficticios). */
export const PROSPECTOS: Prospecto[] = [
  { nombre: "Estética Vértiz", meta: "CDMX", rating: 4.9, resenas: 85, senal: "Tier B · activa, web débil probable" },
  { nombre: "Dra. Paola Quintero", meta: "Guadalajara", rating: 5.0, resenas: 49, senal: "Tier B · 5.0, pacientes de EE.UU." },
  { nombre: "Dr. Hugo Bravo", meta: "Querétaro", rating: 5.0, resenas: 46, senal: "Tier B · le falta web fuerte" },
  { nombre: "Dra. Lía Mendoza", meta: "Querétaro", rating: 5.0, resenas: 28, senal: "Tier B · owner-operated" },
  { nombre: "Dra. Bruna Salas", meta: "Tijuana", rating: 5.0, resenas: 25, senal: "Tier B · frontera, bilingüe vende" },
  { nombre: "Dra. Ana Gómez", meta: "Monterrey", rating: 5.0, resenas: 26, senal: "Tier B · 5.0" },
];
