"use client";

import { useEffect, useState, useTransition } from "react";
import type { Lead } from "@/lib/types/dominio";
import type { EtapaLead } from "@/lib/types/db";
import { avanzarEtapa } from "@/lib/data/acciones";
import { aEur, etiquetaScore, fE, fM, PAQUETE_BASE_MXN } from "@/lib/format";
import { useLeadDrawer } from "./drawer-context";

const DTABS = ["Inspección", "Cotización", "Correo", "Seguimiento"] as const;

function accionSugerida(lead: Lead): string {
  if (lead.aperturas >= 3)
    return "Abrió varias veces sin responder → seguimiento directo hoy.";
  if (lead.clics > 0)
    return "Hizo clic → lead caliente, ofrece llamada de 15 min.";
  if (lead.aperturas === 0)
    return "No ha abierto → reenvía con otro asunto en 2 días.";
  return "Dale seguimiento.";
}

/**
 * Drawer de detalle (la 10ª vista). Siempre montado (off-screen) para conservar
 * la animación de deslizamiento del mockup; `ultimo` mantiene el contenido
 * durante el cierre. Las acciones (enviar, aceptar) se cablean en M3.
 */
export function LeadDrawer() {
  const { lead, cerrar } = useLeadDrawer();
  const [ultimo, setUltimo] = useState<Lead | null>(null);
  const [tab, setTab] = useState(0);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  useEffect(() => {
    if (lead) {
      setUltimo(lead);
      setTab(0);
      setErrorAccion(null);
    }
  }, [lead]);

  /** Cambia la etapa del lead vía Server Action; al lograrlo cierra el drawer
   *  (la lista re-renderiza con el dato fresco que devuelve revalidatePath). */
  function cambiarEtapa(id: string, etapa: EtapaLead) {
    setErrorAccion(null);
    iniciarTransicion(async () => {
      const r = await avanzarEtapa(id, etapa);
      if (r.ok) cerrar();
      else setErrorAccion(r.error);
    });
  }

  const abierto = lead !== null;
  const data = lead ?? ultimo;
  const eur = data ? aEur(data.mxn) : 0;
  const score = data ? etiquetaScore(eur, data.esfuerzoDias) : null;

  return (
    <>
      <div className={`ov ${abierto ? "on" : ""}`} onClick={cerrar} />
      <div className={`drawer ${abierto ? "on" : ""}`} aria-hidden={!abierto}>
        {data && (
          <>
            <div className="dhead">
              <button className="x" onClick={cerrar} aria-label="Cerrar detalle">
                ×
              </button>
              <h2>{data.nombre}</h2>
              <div className="meta">
                {data.meta} ·{" "}
                <span className={`stage ${data.etapa.css}`}>
                  {data.etapa.label}
                </span>
              </div>
              <div className="dtabs">
                {DTABS.map((t, i) => (
                  <button
                    key={t}
                    className={`dtab ${tab === i ? "on" : ""}`}
                    onClick={() => setTab(i)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="dbody">
              {/* Inspección */}
              {tab === 0 && (
                <div>
                  <div className="field">
                    <div className="l">Tecnología detectada</div>
                    <div className="vv">{data.tecnologia}</div>
                  </div>
                  <div className="field">
                    <div className="l">Hosting</div>
                    <div className="vv">{data.hosting || "—"}</div>
                  </div>
                  <div className="field">
                    <div className="l">Qué mejorar</div>
                    <div className="vv">{data.mejoras}</div>
                  </div>
                  <div
                    className="reco"
                    dangerouslySetInnerHTML={{ __html: data.recomendacion }}
                  />
                  <div className="note">
                    Inspección y recomendación generadas por Claude. Tú decides.
                  </div>
                </div>
              )}

              {/* Cotización */}
              {tab === 1 && (
                <div>
                  <div>
                    <div className="qline">
                      <span>Paquete base</span>
                      <span className="mono">{fM.format(PAQUETE_BASE_MXN)}</span>
                    </div>
                    {data.modulos.map((m) => (
                      <div className="qline" key={m}>
                        <span>{m}</span>
                        <span className="mono">+</span>
                      </div>
                    ))}
                  </div>
                  <div className="qtot">
                    <div className="b">
                      <div className="k">Inicial</div>
                      <div className="v">{fM.format(data.mxn)}</div>
                    </div>
                    <div className="b">
                      <div className="k">≈ Euros</div>
                      <div className="v eur">{fE.format(eur)}</div>
                    </div>
                    <div className="b">
                      <div className="k">Entrega</div>
                      <div className="v eta">~{data.esfuerzoDias} días</div>
                    </div>
                  </div>
                  <div className="note">
                    Generada por Claude. La revisas antes de enviar.
                  </div>
                </div>
              )}

              {/* Correo */}
              {tab === 2 && (
                <div>
                  <div className="email">{data.correo}</div>
                  <div className="dact">
                    <button
                      className="btn-g btn"
                      type="button"
                      disabled={pendiente}
                      onClick={() => cambiarEtapa(data.id, "enviado")}
                    >
                      Aprobar y enviar
                    </button>
                    <button className="btn" type="button" disabled={pendiente}>
                      Reescribir con Claude
                    </button>
                  </div>
                  {errorAccion && <div className="note">{errorAccion}</div>}
                </div>
              )}

              {/* Seguimiento */}
              {tab === 3 && (
                <div>
                  <div className="track">
                    <div className="t hot">
                      <div className="v">{data.aperturas}</div>
                      <div className="k">Aperturas</div>
                    </div>
                    <div className="t">
                      <div className="v">{data.clics}</div>
                      <div className="k">Clics</div>
                    </div>
                    <div className="t">
                      <div className="v">{data.vioCotizacion ? "Sí" : "No"}</div>
                      <div className="k">Vio cotización</div>
                    </div>
                  </div>
                  <div className="field">
                    <div className="l">Score</div>
                    <div className="vv">
                      {score && (
                        <span className={`score ${score.css}`}>{score.label}</span>
                      )}{" "}
                      · {fE.format(eur)} · {data.esfuerzoDias} días
                    </div>
                  </div>
                  <div className="field">
                    <div className="l">Acción sugerida</div>
                    <div className="vv">{accionSugerida(data)}</div>
                  </div>
                  <div className="dact">
                    <button
                      className="btn-g btn"
                      type="button"
                      disabled={pendiente}
                      onClick={() => cambiarEtapa(data.id, "aceptado")}
                    >
                      Aceptar
                    </button>
                    <button className="btn" type="button" disabled={pendiente}>
                      Seguimiento
                    </button>
                    <button
                      className="btn"
                      type="button"
                      disabled={pendiente}
                      onClick={() => cambiarEtapa(data.id, "descartado")}
                    >
                      Descartar
                    </button>
                  </div>
                  {errorAccion && <div className="note">{errorAccion}</div>}
                  <div className="note">
                    La factura y el intake se generan en un milestone posterior.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
