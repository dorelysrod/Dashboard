import { test } from "node:test";
import assert from "node:assert/strict";
import { extraerColores, extraerFuentes, extraerLogoUrl, inyectarLogo } from "../../lib/maquetas/marca";

test("extraerColores toma los hex cromáticos frecuentes y descarta grises/extremos", () => {
  const html = `<style>.a{color:#1F4D3E}.b{background:#1F4D3E}.c{color:#B3873E}
    .d{color:#000000}.e{color:#ffffff}.f{color:#777777}</style>`;
  const cols = extraerColores(html);
  assert.ok(cols.includes("#1f4d3e"), "incluye el verde de marca");
  assert.ok(cols.includes("#b3873e"), "incluye el oro");
  assert.ok(!cols.includes("#000000") && !cols.includes("#ffffff") && !cols.includes("#777777"));
});

test("extraerColores expande hex de 3 y pondera theme-color", () => {
  const html = `<meta name="theme-color" content="#0a7"><style>.x{color:#0aa77b}</style>`;
  const cols = extraerColores(html);
  assert.equal(cols[0], "#00aa77"); // theme-color ponderado va primero
});

test("extraerFuentes descarta genéricas y toma la marca", () => {
  const html = `<style>h1{font-family:"Playfair Display",serif}body{font-family:system-ui,sans-serif}</style>`;
  assert.deepEqual(extraerFuentes(html), ["Playfair Display"]);
});

test("extraerFuentes limpia el eje :wght@ de los <link> de Google Fonts", () => {
  // css2: un family por &  ·  v1: families separadas por |
  const css2 = `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Montserrat:wght@300;400;700&display=swap">`;
  assert.deepEqual(extraerFuentes(css2), ["Playfair Display", "Montserrat"]);
  const v1 = `<link href="https://fonts.googleapis.com/css?family=Playfair+Display:400,700|Montserrat">`;
  assert.deepEqual(extraerFuentes(v1), ["Playfair Display", "Montserrat"]);
});

test("extraerLogoUrl prioriza <img> con 'logo' y resuelve relativa", () => {
  const html = `<header><img src="/assets/logo.png" alt="Logo Clínica"></header>`;
  assert.equal(extraerLogoUrl(html, "https://clinica.mx/"), "https://clinica.mx/assets/logo.png");
});

test("extraerLogoUrl cae a og:image si no hay <img> de logo", () => {
  const html = `<meta property="og:image" content="https://cdn.x/brand.jpg">`;
  assert.equal(extraerLogoUrl(html, "https://x.mx/"), "https://cdn.x/brand.jpg");
});

test("inyectarLogo sustituye ⟦LOGO⟧ por el <img> data-URI, o lo quita si no hay", () => {
  const con = inyectarLogo("<div>⟦LOGO⟧</div>", "data:image/png;base64,AAA", "Clínica X");
  assert.match(con, /<img src="data:image\/png;base64,AAA"/);
  const sin = inyectarLogo("<div>⟦LOGO⟧</div>", null, "Clínica X");
  assert.equal(sin, "<div></div>");
});
