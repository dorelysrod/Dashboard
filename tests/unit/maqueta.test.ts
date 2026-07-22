import { test } from "node:test";
import assert from "node:assert/strict";

process.env.AI_MOCK = "1";

import { construirPrompt } from "../../lib/ai/prompts";
import { AnthropicProvider } from "../../lib/ai/anthropic-provider";
import { normalizarUrl, htmlATexto } from "../../lib/maquetas/texto";
import type { SolicitudIA } from "../../lib/ai/tipos";

test("prompt de maqueta: rediseña cuando hay texto del sitio", () => {
  const sol: SolicitudIA = {
    tarea: "maqueta",
    contexto: { negocio: "Clínica X", sitioTexto: "Bienvenidos a Clínica X, atención dental." },
  };
  const p = construirPrompt(sol);
  assert.match(p, /REDISEÑA/);
  assert.match(p, /Clínica X/);
});

test("prompt de maqueta: crea desde cero cuando no hay sitio", () => {
  const sol: SolicitudIA = { tarea: "maqueta", contexto: { negocio: "Clínica X", rubro: "Dental" } };
  const p = construirPrompt(sol);
  assert.match(p, /NO tiene web/);
  assert.match(p, /CREA una landing/);
});

test("AnthropicProvider (mock) devuelve un HTML self-contained para maqueta", async () => {
  const prov = new AnthropicProvider();
  const sol: SolicitudIA = { tarea: "maqueta", contexto: { negocio: "Clínica X" } };
  const raw = await prov.ejecutar("", sol);
  const obj = JSON.parse(raw);
  assert.equal(typeof obj.titulo, "string");
  assert.match(obj.html, /<!doctype html>/i);
  assert.match(obj.html, /<html/i);
  assert.doesNotMatch(obj.html, /<script src=/i); // sin recursos externos
});

test("normalizarUrl antepone https y valida", () => {
  assert.equal(normalizarUrl("clinicax.mx"), "https://clinicax.mx/");
  assert.equal(normalizarUrl("http://a.com/x"), "http://a.com/x");
  assert.equal(normalizarUrl("   "), null);
});

test("htmlATexto elimina script/style/tags y colapsa espacio", () => {
  const html = "<html><head><style>.a{color:red}</style></head><body><h1>Hola</h1>" +
    "<script>alert(1)</script>  <p>mundo</p></body></html>";
  assert.equal(htmlATexto(html), "Hola mundo");
});
