"use client";

import { useState } from "react";
import type { Prospecto } from "@/lib/types/dominio";

/**
 * Panel de Buscar. Reemplaza renderSearch()/addPipe() del mockup. Fase 1: el
 * botón Buscar re-muestra el seed (stub Places); en fase 2 llamará al servicio
 * con ciudad/rubro. "+ Agregar" marca el prospecto como añadido al pipeline.
 */
export function BuscarPanel({ inicial }: { inicial: Prospecto[] }) {
  const [ciudad, setCiudad] = useState("México — todas las ciudades");
  const [rubro, setRubro] = useState("Medicina estética");
  const [resultados, setResultados] = useState<Prospecto[]>(inicial);
  const [agregados, setAgregados] = useState<Set<number>>(new Set());

  function buscar() {
    // Fase 1: stub Places → mismo seed. M3/fase 2: buscarProspectos(ciudad, rubro).
    setResultados(inicial);
  }

  function agregar(i: number) {
    setAgregados((prev) => new Set(prev).add(i));
  }

  return (
    <div className="panel">
      <div className="sbar">
        <input
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          aria-label="Ciudad"
        />
        <input
          value={rubro}
          onChange={(e) => setRubro(e.target.value)}
          aria-label="Rubro"
        />
        <button className="btn-g btn" onClick={buscar}>
          Buscar
        </button>
      </div>
      <div>
        {resultados.map((p, i) => (
          <div className="lrow" style={{ cursor: "default" }} key={p.nombre}>
            <div className="nm">
              <b>{p.nombre}</b>
              <small>
                {p.meta} · Medicina estética · {p.rating}★ ({p.resenas}) ·{" "}
                {p.senal}
              </small>
            </div>
            <button
              className={`addbtn ${agregados.has(i) ? "done" : ""}`}
              onClick={() => agregar(i)}
            >
              {agregados.has(i) ? "✓ En pipeline" : "+ Agregar"}
            </button>
          </div>
        ))}
      </div>
      <div className="note">
        Resultados de Google Places. El sistema descarta los que ya están en tu
        pipeline y marca el tier por señal de reseñas.
      </div>
    </div>
  );
}
