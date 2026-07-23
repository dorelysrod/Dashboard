/**
 * PROSPECCIÓN POR NICHO: importa a Supabase el CSV del scraper de Maps
 * (gosom/google-maps-scraper) para un nicho nuevo, sin duplicar (índice único
 * leads_negocio_key + chequeo previo), clasifica la web de cada ficha con
 * clasificarWebMaps (lib/data/nichos.ts), califica tier A/B/C con calificarLead
 * (lib/data/scoring.ts) y guarda dossier inicial + gancho de dolor.
 * Une importar-leads-maps.mts + calificar-offline-maps.mts en un paso, marcando
 * el nicho en `rubro` y en `dossier.nicho`. Helper local (no app).
 *
 * Uso: node --import tsx prospectar-nicho.mts <maps.csv> --ciudad <Ciudad> --nicho "<Nicho>"
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { calificarLead, segmentoDeTier } from "./lib/data/scoring";
import { clasificarWebMaps } from "./lib/data/nichos";
import { nichoDesdeRubro } from "./lib/data/mapeo";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const norm = (s: string) => s.trim().toLowerCase();

const argv = process.argv.slice(2);
const csvPath = argv.find((a) => !a.startsWith("--"));
const arg = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
const ciudad = arg("--ciudad");
const nicho = arg("--nicho");
if (!csvPath || !ciudad || !nicho) {
  console.error('Uso: node --import tsx prospectar-nicho.mts <maps.csv> --ciudad <Ciudad> --nicho "<Nicho>"');
  process.exit(1);
}

/** Parser CSV con comillas (los títulos de Maps traen comas). */
function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [], campo = "", enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') enComillas = false;
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

/** Gancho inicial desde señales de Maps; la investigación tier A lo refina. */
function ganchoInicial(brecha: string, rating: number | null, resenas: number | null): string {
  const rep = rating && resenas ? `${rating}★ con ${resenas} reseñas` : "reputación en Maps";
  if (brecha === "sin_web") return `${rep} y sin web propia: quien lo busca en Google decide con la competencia que sí tiene.`;
  if (brecha === "debil") return `${rep} pero una web de plantilla que desperdicia esa demanda.`;
  return `${rep}; su web actual no está a la altura de su reputación.`;
}

const filas = parseCsv(readFileSync(csvPath, "utf8"));
const cab = filas[0];
const col = (n: string) => cab.indexOf(n);
const iTitulo = col("title"), iCat = col("category"), iWeb = col("website"),
  iTel = col("phone"), iResenas = col("review_count"), iRating = col("review_rating");
if (iTitulo < 0) { console.error("CSV sin columna 'title' — ¿es la salida del scraper?"); process.exit(1); }

const { data: existentes, error: errExist } = await sb.from("leads").select("negocio");
if (errExist) { console.error("No se pudo leer leads existentes:", errExist.message); process.exit(1); }
const yaTengo = new Set((existentes ?? []).map((l) => norm(l.negocio)));

let insertados = 0, duplicados = 0, errores = 0;
const porTier: Record<string, number> = { A: 0, B: 0, C: 0 };
for (const f of filas.slice(1)) {
  const negocio = (f[iTitulo] ?? "").trim();
  if (!negocio) continue;
  if (yaTengo.has(norm(negocio))) { duplicados++; continue; }

  const rating = Number(f[iRating]) || null;
  const resenas = Number(f[iResenas]) || null;
  const web = (f[iWeb] ?? "").trim() || null;
  const brechaWeb = clasificarWebMaps(web);
  const cal = calificarLead({ brechaWeb, rating, resenas, ownerOperated: null, cadena: null, premium: null });

  const { error } = await sb.from("leads").insert({
    negocio,
    ciudad,
    rubro: nicho,
    // Columna enum del pipeline (chips por nicho): sin esto, todo lead nuevo
    // caía en el default 'estetica' aunque fuera dental/bodas/tours.
    nicho: nichoDesdeRubro(nicho),
    rating,
    resenas,
    telefono: (f[iTel] ?? "").trim() || null,
    sitio_web: web,
    etapa: "nuevo",
    tier: cal.tier,
    segmento: segmentoDeTier(cal.tier),
    dossier: {
      origen: "prospeccion-maps",
      fecha: new Date().toISOString().slice(0, 10),
      nicho,
      categoriaMaps: (f[iCat] ?? "").trim() || null,
      brechaWeb,
      score: cal.score,
      motivos: cal.motivos,
      ganchoDolor: ganchoInicial(brechaWeb, rating, resenas),
    },
  });
  if (error) {
    if (error.code === "23505") duplicados++;
    else { errores++; log(`✗ ${negocio}: ${error.message}`); }
  } else {
    insertados++;
    porTier[cal.tier]++;
    yaTengo.add(norm(negocio));
    log(`${cal.tier} ${String(cal.score).padStart(2)} ${negocio}${brechaWeb === "sin_web" ? "  ← SIN WEB" : brechaWeb === "debil" ? "  ← web débil" : ""}`);
  }
}

log(`Listo [${nicho}]: ${insertados} insertados (A:${porTier.A} B:${porTier.B} C:${porTier.C}) · ${duplicados} duplicados omitidos · ${errores} errores`);
