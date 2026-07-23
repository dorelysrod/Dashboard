import { test } from "node:test";
import assert from "node:assert/strict";
import { accionesDeHoy, ETAPAS_ACCIONABLES } from "../../lib/data/resumen";
import { mapearEtapa } from "../../lib/data/mapeo";
import { LEADS } from "../../lib/data/seed";
import type { EtapaLead } from "../../lib/types/db";
import type { Lead } from "../../lib/types/dominio";

/**
 * Regression T-007: Resumen ya no carga TODOS los leads para derivar las
 * "Acciones de hoy"; la query se acota server-side a ETAPAS_ACCIONABLES.
 * Estos tests prueban que el filtro por etapa NO pierde ninguna acción:
 * `accionesDeHoy` solo genera acciones para leads en esas etapas, así que
 * filtrar antes es una optimización sin cambio de comportamiento.
 */

const TODAS_LAS_ETAPAS: EtapaLead[] = [
  "nuevo",
  "inspeccionado",
  "cotizado",
  "enviado",
  "abierto",
  "aceptado",
  "en_desarrollo",
  "entregado",
  "descartado",
];

/** Lead mínimo con señales FUERTES (hot si su etapa aplica). */
function leadConSenal(etapa: EtapaLead): Lead {
  return {
    id: `l-${etapa}`,
    nombre: `Negocio ${etapa}`,
    etapa: mapearEtapa(etapa),
    etapaDb: etapa,
    aperturas: 5,
    clics: 1,
  } as Lead;
}

test("las etapas fuera de ETAPAS_ACCIONABLES no generan acciones ni con señales fuertes", () => {
  const excluidas = TODAS_LAS_ETAPAS.filter(
    (e) => !ETAPAS_ACCIONABLES.includes(e),
  );
  assert.deepEqual(accionesDeHoy(excluidas.map(leadConSenal)), []);
});

test("filtrar por ETAPAS_ACCIONABLES antes de accionesDeHoy produce EXACTAMENTE las mismas acciones", () => {
  const todos = TODAS_LAS_ETAPAS.map(leadConSenal);
  const soloAccionables = todos.filter((l) =>
    ETAPAS_ACCIONABLES.includes(l.etapaDb),
  );
  assert.deepEqual(accionesDeHoy(todos), accionesDeHoy(soloAccionables));
  // Y las etapas accionables SÍ generan acción (el test no pasa por vacuidad).
  assert.equal(accionesDeHoy(soloAccionables).length, ETAPAS_ACCIONABLES.length);
});

test("paridad sobre el seed real: el filtro no altera el resultado", () => {
  const filtrados = LEADS.filter((l) => ETAPAS_ACCIONABLES.includes(l.etapaDb));
  assert.deepEqual(accionesDeHoy(LEADS), accionesDeHoy(filtrados));
});
