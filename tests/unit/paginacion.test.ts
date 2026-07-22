import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acotarPagina,
  normalizarPagina,
  paginar,
  POR_PAGINA,
  totalPaginas,
} from "../../lib/data/paginacion";

const lista = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

test("POR_PAGINA es el tamaño acordado de las listas (25)", () => {
  assert.equal(POR_PAGINA, 25);
});

test("totalPaginas redondea hacia arriba y nunca baja de 1", () => {
  assert.equal(totalPaginas(0), 1);
  assert.equal(totalPaginas(1), 1);
  assert.equal(totalPaginas(25), 1);
  assert.equal(totalPaginas(26), 2);
  assert.equal(totalPaginas(50), 2);
  assert.equal(totalPaginas(51), 3);
});

test("acotarPagina limita al rango [1, totalPaginas]", () => {
  assert.equal(acotarPagina(0, 30), 1);
  assert.equal(acotarPagina(1, 30), 1);
  assert.equal(acotarPagina(2, 30), 2);
  assert.equal(acotarPagina(99, 30), 2);
  assert.equal(acotarPagina(5, 0), 1);
});

test("normalizarPagina convierte el searchParam a entero ≥ 1", () => {
  assert.equal(normalizarPagina("3"), 3);
  assert.equal(normalizarPagina(undefined), 1);
  assert.equal(normalizarPagina(null), 1);
  assert.equal(normalizarPagina("abc"), 1);
  assert.equal(normalizarPagina("-3"), 1);
  assert.equal(normalizarPagina("0"), 1);
  assert.equal(normalizarPagina(2.7), 1);
});

test("paginar corta 25 por página y reporta el total sin paginar", () => {
  const r = paginar(lista(60), 1);
  assert.equal(r.items.length, 25);
  assert.deepEqual(r.items.slice(0, 3), [1, 2, 3]);
  assert.equal(r.total, 60);
  assert.equal(r.pagina, 1);
  assert.equal(r.totalPaginas, 3);
});

test("paginar entrega la última página incompleta", () => {
  const r = paginar(lista(60), 3);
  assert.equal(r.items.length, 10);
  assert.equal(r.items[0], 51);
  assert.equal(r.items[9], 60);
});

test("paginar acota páginas fuera de rango (URL editada a mano)", () => {
  const r = paginar(lista(60), 99);
  assert.equal(r.pagina, 3);
  assert.equal(r.items[0], 51);
  const r0 = paginar(lista(60), 0);
  assert.equal(r0.pagina, 1);
});

test("paginar con lista vacía devuelve página 1 vacía", () => {
  const r = paginar([], 5);
  assert.deepEqual(r.items, []);
  assert.equal(r.total, 0);
  assert.equal(r.pagina, 1);
  assert.equal(r.totalPaginas, 1);
});

test("paginar respeta un tamaño de página distinto", () => {
  const r = paginar(lista(7), 2, 3);
  assert.deepEqual(r.items, [4, 5, 6]);
  assert.equal(r.totalPaginas, 3);
});
