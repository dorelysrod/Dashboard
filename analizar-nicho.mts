/**
 * Valida EMPÍRICAMENTE la brecha web de uno o varios nichos a partir de un CSV
 * de scrape de Google Maps (p. ej. google-maps-scraper: columnas input_id,
 * title, category, website, ...). Agrupa por consulta, clasifica cada ficha
 * con lib/data/nichos.ts y muestra la tabla de brecha ordenada.
 * Helper local (no app). Paso 3 del skill `nicho-research`.
 *
 * Uso: node --import tsx analizar-nicho.mts <gap.csv>
 *   Cada grupo (input_id) se etiqueta con su categoría dominante + id corto.
 *   OJO: no se etiqueta por el orden de las consultas — el scraper escribe los
 *   grupos en orden de terminación, no en el orden en que se pidieron.
 */
import { readFileSync } from "node:fs";
import { analizarBrechaNicho, type FilaMaps } from "./lib/data/nichos";

const ruta = process.argv[2];
if (!ruta) { console.error("Uso: node --import tsx analizar-nicho.mts <gap.csv>"); process.exit(1); }

/** Parser CSV mínimo (comillas, comas y saltos de línea embebidos). */
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
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); campo = "";
      if (fila.some((f) => f !== "")) filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

const [cabecera, ...datos] = parseCsv(readFileSync(ruta, "utf8"));
const col = (nombre: string) => cabecera.indexOf(nombre);
const iId = col("input_id"), iWeb = col("website"), iCat = col("category");
if (iId < 0 || iWeb < 0) { console.error("El CSV necesita columnas input_id y website."); process.exit(1); }

const etiqueta = (id: string): string => {
  const cats = new Map<string, number>();
  for (const d of datos) if (d[iId] === id && iCat >= 0) cats.set(d[iCat], (cats.get(d[iCat]) ?? 0) + 1);
  const top = [...cats.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]} (${id.slice(0, 8)})` : id.slice(0, 8);
};

const filas: FilaMaps[] = datos.map((d) => ({ consulta: etiqueta(d[iId]), website: d[iWeb] ?? null }));
const tabla = analizarBrechaNicho(filas);

console.log(`${"consulta".padEnd(38)} ${"n".padStart(4)} ${"sin web".padStart(8)} ${"débil".padStart(6)} ${"BRECHA".padStart(7)}`);
for (const t of tabla) {
  console.log(
    `${t.consulta.slice(0, 38).padEnd(38)} ${String(t.total).padStart(4)} ${String(t.sinWeb).padStart(8)} ${String(t.webDebil).padStart(6)} ${(t.brechaPct + "%").padStart(7)}`,
  );
}
console.log("\nBRECHA = % sin web propia o con web de plantilla. <10% descalifica el nicho (calificarNicho).");
