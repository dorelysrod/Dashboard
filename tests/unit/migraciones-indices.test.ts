import { test } from "node:test";
import assert from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regresión T-009: contrato de índices entre las migraciones y las queries
 * calientes del panel. Sin BD en CI, se verifica estáticamente que las
 * migraciones declaren índices que cubran los patrones reales de consulta:
 *
 * - Pipeline 'Mejores calificados' (lib/data/leads.ts aplicarOrdenLeads):
 *   WHERE rating >= X ORDER BY rating DESC NULLS LAST, resenas DESC NULLS
 *   LAST, created_at ASC → necesita un índice con exactamente ese prefijo
 *   (dirección Y tratamiento de nulls incluidos: en PostgreSQL DESC implica
 *   NULLS FIRST por defecto, que NO casaría con la query).
 * - Orden default del pipeline: ORDER BY created_at ASC → índice en
 *   leads(created_at).
 * - Facturas (lib/data/facturas.ts): ORDER BY fecha DESC → índice con fecha
 *   como primera columna en facturas (un btree asc se recorre hacia atrás).
 *
 * Si una migración futura elimina o renombra estos índices sin sustituto,
 * este test vuelve a rojo.
 */

interface IndiceDeclarado {
  tabla: string;
  /** Columnas normalizadas, ej. "rating desc nulls last". */
  columnas: string[];
}

function leerIndices(): IndiceDeclarado[] {
  const dir = join(process.cwd(), "supabase", "migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

  const indices: IndiceDeclarado[] = [];
  const patron =
    /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?\S+\s+on\s+(\S+?)\s*\(([^)]*)\)/gi;
  for (const m of sql.matchAll(patron)) {
    indices.push({
      tabla: m[1].toLowerCase().replace(/^public\./, ""),
      columnas: m[2]
        .toLowerCase()
        .split(",")
        .map((c) => c.trim().replace(/\s+/g, " ")),
    });
  }
  return indices;
}

/** ¿Existe un índice en `tabla` cuyas primeras columnas sean `prefijo`? */
function cubre(indices: IndiceDeclarado[], tabla: string, prefijo: string[]) {
  return indices.some(
    (i) =>
      i.tabla === tabla &&
      prefijo.length <= i.columnas.length &&
      prefijo.every((col, n) => i.columnas[n] === col),
  );
}

const indices = leerIndices();

test("las migraciones declaran algún índice (el parser funciona)", () => {
  assert.ok(indices.length > 0, "no se parseó ningún create index");
  assert.ok(
    cubre(indices, "leads", ["etapa"]),
    "control: leads_etapa_idx existe desde el schema inicial",
  );
});

test("índice para 'Mejores calificados': leads(rating desc nulls last, resenas desc nulls last, created_at)", () => {
  assert.ok(
    cubre(indices, "leads", [
      "rating desc nulls last",
      "resenas desc nulls last",
      "created_at",
    ]),
    "falta índice que cubra ORDER BY rating desc nulls last, resenas desc nulls last, created_at asc (aplicarOrdenLeads)",
  );
});

test("índice para el orden default del pipeline: leads(created_at)", () => {
  assert.ok(
    cubre(indices, "leads", ["created_at"]),
    "falta índice con created_at como primera columna en leads",
  );
});

test("índice para el orden de facturas: facturas(fecha)", () => {
  assert.ok(
    cubre(indices, "facturas", ["fecha"]),
    "falta índice con fecha como primera columna en facturas",
  );
});
