/**
 * Importa a Supabase (tabla `leads`, etapa `nuevo`) el CSV del scraper local de
 * Google Maps (gosom/google-maps-scraper), sin duplicar. Datos EXACTOS de Maps:
 * teléfono real (→ botón Seguimiento WhatsApp), web real o SIN WEB (señal tier A),
 * rating y nº de reseñas reales. Helper local (no app).
 *
 * Uso (2 pasos):
 *   1) printf 'clinica de estetica en Cuernavaca\n' > consultas.txt
 *      ~/go/bin/google-maps-scraper -input consultas.txt -results salida/maps.csv -depth 3 -c 2
 *   2) node --import tsx importar-leads-maps.mts salida/maps.csv --ciudad Cuernavaca
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const norm = (s: string) => s.trim().toLowerCase();

const argv = process.argv.slice(2);
const csvPath = argv.find((a) => !a.startsWith("--")) ?? "salida/maps.csv";
const ciudadArg = argv.includes("--ciudad") ? argv[argv.indexOf("--ciudad") + 1] : null;
const RUBRO = process.env.RUBRO || "Medicina estética";

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

/** Ciudad desde la dirección de Maps ("..., 62448 Cuernavaca, Mor., Mexico"). */
function ciudadDeDireccion(direccion: string): string | null {
  const partes = direccion.split(",").map((p) => p.trim());
  if (partes.length < 3) return null;
  const cand = partes[partes.length - 3] ?? "";
  return cand.replace(/^\d{4,6}\s*/, "").trim() || null;
}

const filas = parseCsv(readFileSync(csvPath, "utf8"));
const cab = filas[0];
const col = (n: string) => cab.indexOf(n);
const iTitulo = col("title"), iCat = col("category"), iDir = col("address"),
  iWeb = col("website"), iTel = col("phone"), iResenas = col("review_count"),
  iRating = col("review_rating");
if (iTitulo < 0) { console.error("CSV sin columna 'title' — ¿es la salida del scraper?"); process.exit(1); }

const { data: existentes, error: errExist } = await sb.from("leads").select("negocio");
if (errExist) { console.error("No se pudo leer leads existentes:", errExist.message); process.exit(1); }
const yaTengo = new Set((existentes ?? []).map((l) => norm(l.negocio)));

let insertados = 0, duplicados = 0, errores = 0;
for (const f of filas.slice(1)) {
  const negocio = (f[iTitulo] ?? "").trim();
  if (!negocio) continue;
  if (yaTengo.has(norm(negocio))) { duplicados++; continue; }

  const rating = Number(f[iRating]) || null;
  const resenas = Number(f[iResenas]) || null;
  const web = (f[iWeb] ?? "").trim() || null;
  const tel = (f[iTel] ?? "").trim() || null;
  const ciudad = ciudadArg ?? ciudadDeDireccion(f[iDir] ?? "") ?? null;

  const { error } = await sb.from("leads").insert({
    negocio,
    ciudad,
    rubro: (f[iCat] ?? "").trim() || RUBRO,
    rating,
    resenas,
    telefono: tel,
    sitio_web: web,
    etapa: "nuevo",
  });
  if (error) {
    if (error.code === "23505") duplicados++;
    else { errores++; log(`✗ ${negocio}: ${error.message}`); }
  } else {
    insertados++;
    yaTengo.add(norm(negocio));
    log(`+ ${negocio}${web ? "" : "  ← SIN WEB (candidato tier A)"}`);
  }
}

log(`Listo: ${insertados} insertados · ${duplicados} duplicados omitidos · ${errores} errores`);
