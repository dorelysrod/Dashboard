"use client";

import { useState, useTransition } from "react";
import type { Nicho, Prospecto } from "@/lib/types/dominio";
import { crearLeadDesdeProspecto } from "@/lib/data/acciones";
import { buscarProspectosAction } from "@/lib/data/buscar-accion";
import { mapearNicho, NICHOS } from "@/lib/data/mapeo";
import { paginar } from "@/lib/data/paginacion";

/**
 * Panel de Buscar. Reemplaza renderSearch()/addPipe() del mockup. Fase 1: el
 * botón Buscar re-muestra el seed (stub Places); en fase 2 llamará al servicio
 * con ciudad/rubro. "+ Agregar" crea el lead en Supabase (etapa `nuevo`).
 * Filtro por nicho (chips) y paginación en memoria con el mismo helper puro
 * que usa el servicio de leads.
 */
export function BuscarPanel({ inicial }: { inicial: Prospecto[] }) {
  const [ciudad, setCiudad] = useState("México — todas las ciudades");
  const [rubro, setRubro] = useState("Medicina estética");
  const [resultados, setResultados] = useState<Prospecto[]>(inicial);
  // Estados por NOMBRE de prospecto (no por índice: el filtro y la paginación
  // recolocan las filas y un índice apuntaría al prospecto equivocado).
  const [estado, setEstado] = useState<Record<string, "done" | "error">>({});
  const [mensaje, setMensaje] = useState<Record<string, string>>({});
  const [activo, setActivo] = useState<string | null>(null);
  const [nichoFiltro, setNichoFiltro] = useState<Nicho | null>(null);
  const [pagina, setPagina] = useState(1);
  const [pendiente, iniciarTransicion] = useTransition();
  const [buscando, iniciarBusqueda] = useTransition();
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [buscado, setBuscado] = useState(false);

  const filtrados = nichoFiltro
    ? resultados.filter((p) => p.nicho === nichoFiltro)
    : resultados;
  const vista = paginar(filtrados, pagina);

  function buscar() {
    setErrorBusqueda(null);
    iniciarBusqueda(async () => {
      try {
        const r = await buscarProspectosAction(ciudad, rubro);
        setResultados(r);
        setEstado({});
        // Sin esto, un error de la búsqueda anterior reaparecería si un
        // prospecto nuevo comparte nombre con uno viejo.
        setMensaje({});
        setPagina(1);
        setBuscado(true);
      } catch {
        setErrorBusqueda("No se pudo completar la búsqueda. Intenta de nuevo.");
      }
    });
  }

  function filtrar(n: Nicho | null) {
    setNichoFiltro(n);
    setPagina(1);
  }

  function agregar(p: Prospecto) {
    setActivo(p.nombre);
    setMensaje((m) => ({ ...m, [p.nombre]: "" }));
    iniciarTransicion(async () => {
      const r = await crearLeadDesdeProspecto(p);
      setEstado((s) => ({ ...s, [p.nombre]: r.ok ? "done" : "error" }));
      if (!r.ok && r.error) setMensaje((m) => ({ ...m, [p.nombre]: r.error! }));
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
        <button className="btn-g btn" onClick={buscar} disabled={buscando}>
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>
      <div className="chips" role="group" aria-label="Filtrar por nicho">
        <button
          type="button"
          className={`chip ${nichoFiltro === null ? "on" : ""}`}
          aria-pressed={nichoFiltro === null}
          onClick={() => filtrar(null)}
        >
          Todos
        </button>
        {NICHOS.map((n) => (
          <button
            key={n}
            type="button"
            className={`chip ${nichoFiltro === n ? "on" : ""}`}
            aria-pressed={nichoFiltro === n}
            onClick={() => filtrar(n)}
          >
            {mapearNicho(n).label}
          </button>
        ))}
      </div>
      {errorBusqueda && <div className="note" role="status">{errorBusqueda}</div>}
      {buscado && !buscando && resultados.length === 0 && (
        <div className="note" role="status">
          No se encontraron prospectos nuevos para esa ciudad/rubro (o ya están todos en tu pipeline).
        </div>
      )}
      {nichoFiltro !== null && !buscando && resultados.length > 0 && filtrados.length === 0 && (
        <div className="note" role="status">
          Ningún resultado en el nicho {mapearNicho(nichoFiltro).label}.
        </div>
      )}
      <div>
        {vista.items.map((p) => {
          const nicho = mapearNicho(p.nicho);
          const hecho = estado[p.nombre] === "done";
          const cargando = pendiente && activo === p.nombre;
          return (
            <div key={p.nombre}>
              <div className="lrow" style={{ cursor: "default" }}>
                <div className="nm">
                  <b>{p.nombre}</b>
                  <small>
                    {p.meta} ·{" "}
                    <span className={`nicho ${nicho.css}`}>{nicho.label}</span> ·{" "}
                    {p.rating}★ ({p.resenas}) · {p.senal}
                  </small>
                </div>
                <button
                  className={`addbtn ${hecho ? "done" : ""}`}
                  onClick={() => agregar(p)}
                  disabled={hecho || cargando}
                >
                  {hecho
                    ? "✓ En pipeline"
                    : cargando
                      ? "Agregando…"
                      : "+ Agregar"}
                </button>
              </div>
              {mensaje[p.nombre] && (
                <div className="note" role="status">
                  {mensaje[p.nombre]}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {vista.totalPaginas > 1 && (
        <nav className="pag" aria-label="Paginación de prospectos">
          <button
            type="button"
            className="pbtn"
            disabled={vista.pagina <= 1}
            onClick={() => setPagina(vista.pagina - 1)}
          >
            ← Anterior
          </button>
          <span className="pinfo" aria-live="polite">
            Página {vista.pagina} de {vista.totalPaginas} · {vista.total} prospectos
          </span>
          <button
            type="button"
            className="pbtn"
            disabled={vista.pagina >= vista.totalPaginas}
            onClick={() => setPagina(vista.pagina + 1)}
          >
            Siguiente →
          </button>
        </nav>
      )}
      <div className="note">
        Búsqueda con Claude (web). El sistema descarta los que ya están en tu
        pipeline. Rating/reseñas son aproximados — verifícalos antes de contactar.
      </div>
    </div>
  );
}
