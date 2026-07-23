import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrarNuevos } from "../../lib/data/dedupe";
import type { Prospecto } from "../../lib/types/dominio";

const p = (nombre: string): Prospecto => ({
  nombre,
  meta: "CDMX",
  nicho: "estetica",
  rating: 5,
  resenas: 10,
  senal: "Tier B",
});

test("Buscar no sugiere clientes que ya están en el pipeline", () => {
  const prospectos = [p("Estética Vértiz"), p("Dr. Hugo Bravo"), p("Dra. Ana Gómez")];
  const r = filtrarNuevos(prospectos, ["Dr. Hugo Bravo"]);
  assert.deepEqual(r.map((x) => x.nombre), ["Estética Vértiz", "Dra. Ana Gómez"]);
});

test("dedupe es tolerante a mayúsculas/espacios", () => {
  const r = filtrarNuevos([p("Estética Vértiz")], ["  estética vértiz  "]);
  assert.equal(r.length, 0);
});

test("sin leads, devuelve todos los prospectos", () => {
  const prospectos = [p("A"), p("B")];
  assert.equal(filtrarNuevos(prospectos, []).length, 2);
});
