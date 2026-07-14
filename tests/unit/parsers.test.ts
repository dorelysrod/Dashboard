import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCorreo,
  parseCotizacion,
  parseInspeccion,
} from "../../lib/ai/parsers";

test("parseInspeccion extrae etiquetas, lista y bloque", () => {
  const raw = [
    "TECNOLOGIA: WordPress",
    "HOSTING: GoDaddy",
    "MEJORAS:",
    "- SEO local",
    "- Agenda online",
    "RECOMENDACION:",
    "Migrar a un stack moderno",
    "y activar reservas.",
  ].join("\n");
  const r = parseInspeccion(raw);
  assert.equal(r.tecnologia, "WordPress");
  assert.equal(r.hosting, "GoDaddy");
  assert.deepEqual(r.mejoras, ["SEO local", "Agenda online"]);
  assert.equal(r.recomendacion, "Migrar a un stack moderno\ny activar reservas.");
});

test("parseInspeccion es tolerante: campos ausentes → vacío, no lanza", () => {
  const r = parseInspeccion("texto sin etiquetas");
  assert.equal(r.tecnologia, "");
  assert.equal(r.hosting, "");
  assert.deepEqual(r.mejoras, []);
  assert.equal(r.recomendacion, "");
});

test("parseCotizacion limpia el símbolo y separadores del total", () => {
  const raw = "MODULOS:\n- Agenda\n- WhatsApp\nTOTAL_MXN: $22,000 MXN";
  const r = parseCotizacion(raw);
  assert.deepEqual(r.modulos, ["Agenda", "WhatsApp"]);
  assert.equal(r.totalMxn, 22000);
});

test("parseCotizacion devuelve null cuando no hay total", () => {
  assert.equal(parseCotizacion("MODULOS:\n- Solo un módulo").totalMxn, null);
});

test("parseCorreo separa asunto y cuerpo multilínea", () => {
  const raw = "ASUNTO: Tu nueva web\nCUERPO:\nHola,\ntenemos una propuesta.";
  const r = parseCorreo(raw);
  assert.equal(r.asunto, "Tu nueva web");
  assert.equal(r.cuerpo, "Hola,\ntenemos una propuesta.");
});
