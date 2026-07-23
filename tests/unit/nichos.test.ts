import { test } from "node:test";
import assert from "node:assert/strict";
import { clasificarWebMaps, analizarBrechaNicho, calificarNicho } from "../../lib/data/nichos";

test("clasificarWebMaps: vacío y redes/agregadores no son web propia", () => {
  assert.equal(clasificarWebMaps(null), "sin_web");
  assert.equal(clasificarWebMaps("  "), "sin_web");
  assert.equal(clasificarWebMaps("https://www.facebook.com/miclinica"), "sin_web");
  assert.equal(clasificarWebMaps("https://linktr.ee/miclinica"), "sin_web");
  assert.equal(clasificarWebMaps("https://www.booking.com/hotel/mx/casa.html"), "sin_web");
});

test("clasificarWebMaps: constructores de plantilla → débil; dominio propio → decente", () => {
  assert.equal(clasificarWebMaps("https://negocio.wixsite.com/vet"), "debil");
  assert.equal(clasificarWebMaps("https://belleza-sagil.ueniweb.com/"), "debil");
  assert.equal(clasificarWebMaps("https://alfaanimal.mx/"), "decente");
});

test("analizarBrechaNicho: agrega por consulta y ordena por brecha descendente", () => {
  const tabla = analizarBrechaNicho([
    { consulta: "vets", website: "" },
    { consulta: "vets", website: "https://x.wixsite.com/a" },
    { consulta: "vets", website: "https://vetpropia.mx" },
    { consulta: "vets", website: null },
    { consulta: "hoteles", website: "https://hotelpropio.mx" },
    { consulta: "hoteles", website: "https://otrohotel.mx" },
  ]);
  assert.equal(tabla[0].consulta, "vets");
  assert.equal(tabla[0].total, 4);
  assert.equal(tabla[0].sinWeb, 2);
  assert.equal(tabla[0].webDebil, 1);
  assert.equal(tabla[0].brechaPct, 75);
  assert.equal(tabla[1].brechaPct, 0);
});

test("nicho ideal: necesidad estructural + brecha amplia + ticket alto → tier A", () => {
  const c = calificarNicho({
    nombre: "turismo dental", necesidad: "estructural", brechaPct: 60,
    ticket: "alto", cierre: "rapido", prospectableMaps: true, recurrencia: "natural",
  });
  assert.equal(c.tier, "A");
  assert.ok(!c.descalificado);
});

test("brecha empírica <10% descalifica (mercado saturado de webs)", () => {
  const c = calificarNicho({
    nombre: "hoteles boutique", necesidad: "estructural", brechaPct: 0,
    ticket: "alto", cierre: "medio", prospectableMaps: true, recurrencia: "natural",
  });
  assert.ok(c.descalificado);
  assert.equal(c.tier, "C");
});

test("no prospectable por Maps descalifica", () => {
  const c = calificarNicho({
    nombre: "saas b2b", necesidad: "estructural", brechaPct: 80,
    ticket: "alto", cierre: "rapido", prospectableMaps: false, recurrencia: "natural",
  });
  assert.ok(c.descalificado);
});

test("brecha sin validar → neutro y motivo de correr el scraper", () => {
  const c = calificarNicho({
    nombre: "tours", necesidad: "estructural", brechaPct: null,
    ticket: "medio", cierre: "medio", prospectableMaps: true, recurrencia: "posible",
  });
  assert.ok(!c.descalificado);
  assert.ok(c.motivos.some((m) => /scraper/i.test(m)));
});

test("necesidad débil + ticket bajo descalifica (sin pitch posible)", () => {
  const c = calificarNicho({
    nombre: "papelerías", necesidad: "debil", brechaPct: 90,
    ticket: "bajo", cierre: "rapido", prospectableMaps: true, recurrencia: "nula",
  });
  assert.ok(c.descalificado);
});
