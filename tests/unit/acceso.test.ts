import { test } from "node:test";
import assert from "node:assert/strict";
import { decidirAccesoPortal } from "../../lib/maquetas/acceso";

test("operadora logueada: entra sin código y su apertura NO cuenta como vista", () => {
  const d = decidirAccesoPortal({ esOperadora: true, cookieValida: false });
  assert.equal(d.autorizado, true);
  assert.equal(d.contarVista, false);
  assert.equal(d.modoOperadora, true);
});

test("operadora que además pasó el candado: sigue sin contar vista (gana el modo operadora)", () => {
  const d = decidirAccesoPortal({ esOperadora: true, cookieValida: true });
  assert.equal(d.autorizado, true);
  assert.equal(d.contarVista, false);
  assert.equal(d.modoOperadora, true);
});

test("prospecto con cookie válida: entra y SÍ cuenta como vista", () => {
  const d = decidirAccesoPortal({ esOperadora: false, cookieValida: true });
  assert.equal(d.autorizado, true);
  assert.equal(d.contarVista, true);
  assert.equal(d.modoOperadora, false);
});

test("sin sesión ni cookie: candado (ni acceso ni vista)", () => {
  const d = decidirAccesoPortal({ esOperadora: false, cookieValida: false });
  assert.equal(d.autorizado, false);
  assert.equal(d.contarVista, false);
  assert.equal(d.modoOperadora, false);
});
