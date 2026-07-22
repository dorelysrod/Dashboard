import { test } from "node:test";
import assert from "node:assert/strict";

// Modo mock: el proveedor no carga el SDK ni gasta API. Debe fijarse ANTES de
// importar el módulo, porque `ejecutar` lo lee en tiempo de ejecución.
process.env.AI_MOCK = "1";

import { AnthropicProvider } from "../../lib/ai/anthropic-provider";
import { parseInspeccion, parseCorreo, parseCotizacion } from "../../lib/ai/parsers";
import type { SolicitudIA } from "../../lib/ai/tipos";

const prov = new AnthropicProvider();

test("AnthropicProvider en mock devuelve JSON estructurado por tarea", async () => {
  const sol: SolicitudIA = { tarea: "inspeccion", contexto: { negocio: "Clínica X" } };
  const raw = await prov.ejecutar(prov.construirPrompt(sol), sol);
  const obj = JSON.parse(raw);
  assert.equal(typeof obj.tecnologia, "string");
  assert.ok(Array.isArray(obj.mejoras));
});

test("la salida estructurada fluye por los mismos parsers (cero cambios en la app)", async () => {
  const insp: SolicitudIA = { tarea: "inspeccion", contexto: { negocio: "Clínica X" } };
  const i = parseInspeccion(await prov.ejecutar("", insp));
  assert.ok(i.tecnologia.length > 0);
  assert.ok(i.mejoras.length > 0);
  assert.ok(i.recomendacion.length > 0);

  const cot: SolicitudIA = { tarea: "cotizacion", contexto: { negocio: "Clínica X" } };
  const c = parseCotizacion(await prov.ejecutar("", cot));
  assert.ok(c.modulos.length > 0);
  assert.equal(typeof c.totalMxn, "number");

  const cor: SolicitudIA = { tarea: "correo", contexto: { negocio: "Clínica X" } };
  const m = parseCorreo(await prov.ejecutar("", cor));
  assert.ok(m.asunto.length > 0);
  assert.ok(m.cuerpo.length > 0);
});

test("requiereManual=false: la fábrica lo usaría en modo automático", () => {
  assert.equal(prov.requiereManual, false);
  assert.equal(prov.modo, "anthropic");
});
