"use client";

import { useEffect, useState, useTransition } from "react";
import type { SolicitudIA } from "@/lib/ai/tipos";
import { prepararGeneracion } from "@/lib/ai/acciones";

/**
 * Flujo manual del harness IA (fase 1, sin API): pide el prompt al harness, lo
 * muestra para copiar en Claude, y recibe la respuesta pegada. Al aplicar, el
 * padre la parsea y la guarda. Reutilizable por las pestañas del drawer.
 */
export function PanelIA({
  solicitud,
  onAplicar,
  onCerrar,
}: {
  solicitud: SolicitudIA;
  onAplicar: (respuestaCruda: string) => void;
  onCerrar: () => void;
}) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [pegado, setPegado] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [cargando, iniciarCarga] = useTransition();

  function generar() {
    setError(null);
    iniciarCarga(async () => {
      try {
        const r = await prepararGeneracion(solicitud);
        if (r.manual) {
          setPrompt(r.prompt);
        } else {
          // Fase 2: el proveedor automático (Claude) resolvió; aplicar directo.
          setAuto(true);
          onAplicar(r.respuesta.texto);
          onCerrar();
        }
      } catch (e) {
        // El camino automático puede fallar (auth, red, límite). No silenciar:
        // mostrar el error y permitir reintentar sin cerrar el drawer.
        setAuto(true);
        setError(e instanceof Error ? e.message : "No se pudo generar con Claude.");
      }
    });
  }

  useEffect(() => {
    generar();
    // solo al montar para esta solicitud
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camino automático (fase 2): mientras genera, o si falló, no se muestra el
  // flujo manual de copiar/pegar — sería confuso.
  if (auto) {
    return (
      <div className="ia-panel">
        {error ? (
          <>
            <div className="note">⚠ {error}</div>
            <div className="dact">
              <button className="btn-g btn" type="button" disabled={cargando} onClick={generar}>
                {cargando ? "Generando…" : "Reintentar"}
              </button>
              <button className="btn" type="button" onClick={onCerrar}>
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <div className="ia-step">Generando con Claude…</div>
        )}
      </div>
    );
  }

  async function copiar() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setError("No se pudo copiar; selecciónalo y copia manualmente.");
    }
  }

  return (
    <div className="ia-panel">
      <div className="ia-step">
        1. Copia este prompt y pégalo en Claude:
      </div>
      <textarea
        className="auth-input ia-prompt"
        readOnly
        rows={6}
        value={cargando && !prompt ? "Generando prompt…" : (prompt ?? "")}
      />
      <div className="dact">
        <button className="btn" type="button" onClick={copiar} disabled={!prompt}>
          {copiado ? "✓ Copiado" : "Copiar prompt"}
        </button>
      </div>

      <div className="ia-step">2. Pega aquí la respuesta de Claude:</div>
      <textarea
        className="auth-input"
        rows={6}
        value={pegado}
        onChange={(e) => setPegado(e.target.value)}
        placeholder="Pega la respuesta…"
      />

      {error && <div className="note">{error}</div>}

      <div className="dact">
        <button
          className="btn-g btn"
          type="button"
          disabled={!pegado.trim()}
          onClick={() => onAplicar(pegado)}
        >
          Aplicar
        </button>
        <button className="btn" type="button" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
