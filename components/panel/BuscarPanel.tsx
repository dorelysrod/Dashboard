"use client";

import { useState, useTransition } from "react";
import type { Prospecto } from "@/lib/types/dominio";
import { crearLeadDesdeProspecto } from "@/lib/data/acciones";

/**
 * Panel de Buscar. Reemplaza renderSearch()/addPipe() del mockup. Fase 1: el
 * botón Buscar re-muestra el seed (stub Places); en fase 2 llamará al servicio
 * con ciudad/rubro. "+ Agregar" crea el lead en Supabase (etapa `nuevo`).
 */
export function BuscarPanel({ inicial }: { inicial: Prospecto[] }) {
  const [ciudad, setCiudad] = useState("México — todas las ciudades");
  const [rubro, setRubro] = useState("Medicina estética");
  const [resultados, setResultados] = useState<Prospecto[]>(inicial);
  const [estado, setEstado] = useState<Record<number, "done" | "error">>({});
  const [mensaje, setMensaje] = useState<Record<number, string>>({});
  const [activo, setActivo] = useState<number | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function buscar() {
    // Fase 1: stub Places → mismo seed. Fase 2: buscarProspectos(ciudad, rubro).
    setResultados(inicial);
  }

  function agregar(i: number, p: Prospecto) {
    setActivo(i);
    setMensaje((m) => ({ ...m, [i]: "" }));
    iniciarTransicion(async () => {
      const r = await crearLeadDesdeProspecto(p);
      setEstado((s) => ({ ...s, [i]: r.ok ? "done" : "error" }));
      if (!r.ok && r.error) setMensaje((m) => ({ ...m, [i]: r.error! }));
      setActivo(null);
    });
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
        {resultados.map((p, i) => {
          const hecho = estado[i] === "done";
          const cargando = pendiente && activo === i;
          return (
            <div key={p.nombre}>
              <div className="lrow" style={{ cursor: "default" }}>
                <div className="nm">
                  <b>{p.nombre}</b>
                  <small>
                    {p.meta} · Medicina estética · {p.rating}★ ({p.resenas}) ·{" "}
                    {p.senal}
                  </small>
                </div>
                <button
                  className={`addbtn ${hecho ? "done" : ""}`}
                  onClick={() => agregar(i, p)}
                  disabled={hecho || cargando}
                >
                  {hecho
                    ? "✓ En pipeline"
                    : cargando
                      ? "Agregando…"
                      : "+ Agregar"}
                </button>
              </div>
              {mensaje[i] && (
                <div className="note" role="status">
                  {mensaje[i]}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="note">
        Resultados de Google Places. El sistema descarta los que ya están en tu
        pipeline y marca el tier por señal de reseñas.
      </div>
    </div>
  );
}
