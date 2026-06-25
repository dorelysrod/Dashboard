"use client";

import { useEffect, useState, useTransition } from "react";
import type { Lead } from "@/lib/types/dominio";
import type { EtapaLead } from "@/lib/types/db";
import {
  avanzarEtapa,
  guardarCotizacion,
  guardarInspeccion,
} from "@/lib/data/acciones";
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

interface FormInsp {
  tecnologia: string;
  hosting: string;
  mejoras: string;
  recomendacion: string;
}
interface FormCot {
  total: string;
  modulos: string;
}

/**
 * Drawer de detalle (la 10ª vista). Siempre montado (off-screen) para conservar
 * la animación de deslizamiento del mockup; `ultimo` mantiene el contenido
 * durante el cierre. M3: edición de inspección y cotización con persistencia a
 * Supabase; un `parche` optimista refleja los cambios sin reabrir el drawer.
 */
export function LeadDrawer() {
  const { lead, cerrar } = useLeadDrawer();
  const [ultimo, setUltimo] = useState<Lead | null>(null);
  const [tab, setTab] = useState(0);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  // Overlay optimista sobre el lead mostrado: lo que se guarda se ve al instante.
  const [parche, setParche] = useState<Partial<Lead>>({});
  const [editInsp, setEditInsp] = useState(false);
  const [editCot, setEditCot] = useState(false);
  const [formInsp, setFormInsp] = useState<FormInsp>({
    tecnologia: "",
    hosting: "",
    mejoras: "",
    recomendacion: "",
  });
  const [formCot, setFormCot] = useState<FormCot>({ total: "", modulos: "" });

  useEffect(() => {
    if (lead) {
      setUltimo(lead);
      setTab(0);
      setErrorAccion(null);
      setParche({});
      setEditInsp(false);
      setEditCot(false);
    }
  }, [lead]);

  const abierto = lead !== null;
  const base = lead ?? ultimo;
  const vista = base ? { ...base, ...parche } : null;
  const eur = vista ? aEur(vista.mxn) : 0;
  const score = vista ? etiquetaScore(eur, vista.esfuerzoDias) : null;

  /** Cambia la etapa del lead; al lograrlo cierra el drawer (la lista refresca). */
  function cambiarEtapa(id: string, etapa: EtapaLead) {
    setErrorAccion(null);
    iniciarTransicion(async () => {
      const r = await avanzarEtapa(id, etapa);
      if (r.ok) cerrar();
      else setErrorAccion(r.error);
    });
  }

  function abrirEdicionInsp() {
    if (!vista) return;
    setFormInsp({
      tecnologia: vista.tecnologia,
      hosting: vista.hosting,
      mejoras: vista.mejoras ? vista.mejoras.split(" · ").join("\n") : "",
      recomendacion: vista.recomendacion,
    });
    setErrorAccion(null);
    setEditInsp(true);
  }

  function persistirInsp() {
    if (!vista) return;
    setErrorAccion(null);
    const mejorasArr = formInsp.mejoras
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    iniciarTransicion(async () => {
      const r = await guardarInspeccion(vista.id, {
        tecnologia: formInsp.tecnologia,
        hosting: formInsp.hosting,
        mejoras: mejorasArr,
        recomendacion: formInsp.recomendacion,
      });
      if (r.ok) {
        setParche((p) => ({
          ...p,
          tecnologia: formInsp.tecnologia,
          hosting: formInsp.hosting,
          mejoras: mejorasArr.join(" · "),
          recomendacion: formInsp.recomendacion,
        }));
        setEditInsp(false);
      } else setErrorAccion(r.error);
    });
  }

  function abrirEdicionCot() {
    if (!vista) return;
    setFormCot({ total: String(vista.mxn), modulos: vista.modulos.join("\n") });
    setErrorAccion(null);
    setEditCot(true);
  }

  function persistirCot() {
    if (!vista) return;
    setErrorAccion(null);
    const total = Number(formCot.total);
    const modulosArr = formCot.modulos
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    iniciarTransicion(async () => {
      const r = await guardarCotizacion(vista.id, {
        modulos: modulosArr,
        totalMxn: total,
      });
      if (r.ok) {
        setParche((p) => ({ ...p, mxn: total, modulos: modulosArr }));
        setEditCot(false);
      } else setErrorAccion(r.error);
    });
  }

  return (
    <>
      <div className={`ov ${abierto ? "on" : ""}`} onClick={cerrar} />
      <div className={`drawer ${abierto ? "on" : ""}`} aria-hidden={!abierto}>
        {vista && (
          <>
            <div className="dhead">
              <button className="x" onClick={cerrar} aria-label="Cerrar detalle">
                ×
              </button>
              <h2>{vista.nombre}</h2>
              <div className="meta">
                {vista.meta} ·{" "}
                <span className={`stage ${vista.etapa.css}`}>
                  {vista.etapa.label}
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
              {tab === 0 && !editInsp && (
                <div>
                  <div className="field">
                    <div className="l">Tecnología detectada</div>
                    <div className="vv">{vista.tecnologia || "—"}</div>
                  </div>
                  <div className="field">
                    <div className="l">Hosting</div>
                    <div className="vv">{vista.hosting || "—"}</div>
                  </div>
                  <div className="field">
                    <div className="l">Qué mejorar</div>
                    <div className="vv">{vista.mejoras || "—"}</div>
                  </div>
                  {vista.recomendacion && (
                    <div
                      className="reco"
                      dangerouslySetInnerHTML={{ __html: vista.recomendacion }}
                    />
                  )}
                  <div className="dact">
                    <button
                      className="btn"
                      type="button"
                      onClick={abrirEdicionInsp}
                    >
                      Editar inspección
                    </button>
                  </div>
                  {errorAccion && <div className="note">{errorAccion}</div>}
                </div>
              )}
              {tab === 0 && editInsp && (
                <div>
                  <div className="field">
                    <label className="l" htmlFor="i-tec">
                      Tecnología detectada
                    </label>
                    <input
                      id="i-tec"
                      className="auth-input"
                      value={formInsp.tecnologia}
                      onChange={(e) =>
                        setFormInsp((f) => ({ ...f, tecnologia: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="l" htmlFor="i-host">
                      Hosting
                    </label>
                    <input
                      id="i-host"
                      className="auth-input"
                      value={formInsp.hosting}
                      onChange={(e) =>
                        setFormInsp((f) => ({ ...f, hosting: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="l" htmlFor="i-mej">
                      Qué mejorar (una por línea)
                    </label>
                    <textarea
                      id="i-mej"
                      className="auth-input"
                      rows={4}
                      value={formInsp.mejoras}
                      onChange={(e) =>
                        setFormInsp((f) => ({ ...f, mejoras: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="l" htmlFor="i-reco">
                      Recomendación
                    </label>
                    <textarea
                      id="i-reco"
                      className="auth-input"
                      rows={3}
                      value={formInsp.recomendacion}
                      onChange={(e) =>
                        setFormInsp((f) => ({
                          ...f,
                          recomendacion: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="dact">
                    <button
                      className="btn-g btn"
                      type="button"
                      disabled={pendiente}
                      onClick={persistirInsp}
                    >
                      {pendiente ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      className="btn"
                      type="button"
                      disabled={pendiente}
                      onClick={() => setEditInsp(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                  {errorAccion && <div className="note">{errorAccion}</div>}
                </div>
              )}

              {/* Cotización */}
              {tab === 1 && !editCot && (
                <div>
                  <div>
                    <div className="qline">
                      <span>Paquete base</span>
                      <span className="mono">{fM.format(PAQUETE_BASE_MXN)}</span>
                    </div>
                    {vista.modulos.map((m) => (
                      <div className="qline" key={m}>
                        <span>{m}</span>
                        <span className="mono">+</span>
                      </div>
                    ))}
                  </div>
                  <div className="qtot">
                    <div className="b">
                      <div className="k">Inicial</div>
                      <div className="v">{fM.format(vista.mxn)}</div>
                    </div>
                    <div className="b">
                      <div className="k">≈ Euros</div>
                      <div className="v eur">{fE.format(eur)}</div>
                    </div>
                    <div className="b">
                      <div className="k">Entrega</div>
                      <div className="v eta">~{vista.esfuerzoDias} días</div>
                    </div>
                  </div>
                  <div className="dact">
                    <button
                      className="btn"
                      type="button"
                      onClick={abrirEdicionCot}
                    >
                      Editar cotización
                    </button>
                  </div>
                  {errorAccion && <div className="note">{errorAccion}</div>}
                </div>
              )}
              {tab === 1 && editCot && (
                <div>
                  <div className="field">
                    <label className="l" htmlFor="c-total">
                      Total inicial (MXN)
                    </label>
                    <input
                      id="c-total"
                      className="auth-input"
                      type="number"
                      min={0}
                      value={formCot.total}
                      onChange={(e) =>
                        setFormCot((f) => ({ ...f, total: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="l" htmlFor="c-mod">
                      Módulos (uno por línea)
                    </label>
                    <textarea
                      id="c-mod"
                      className="auth-input"
                      rows={5}
                      value={formCot.modulos}
                      onChange={(e) =>
                        setFormCot((f) => ({ ...f, modulos: e.target.value }))
                      }
                    />
                  </div>
                  <div className="note">
                    ≈ {fE.format(aEur(Number(formCot.total) || 0))} al tipo de cambio actual.
                  </div>
                  <div className="dact">
                    <button
                      className="btn-g btn"
                      type="button"
                      disabled={pendiente}
                      onClick={persistirCot}
                    >
                      {pendiente ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      className="btn"
                      type="button"
                      disabled={pendiente}
                      onClick={() => setEditCot(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                  {errorAccion && <div className="note">{errorAccion}</div>}
                </div>
              )}

              {/* Correo */}
              {tab === 2 && (
                <div>
                  <div className="email">{vista.correo}</div>
                  <div className="dact">
                    <button
                      className="btn-g btn"
                      type="button"
                      disabled={pendiente}
                      onClick={() => cambiarEtapa(vista.id, "enviado")}
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
                      <div className="v">{vista.aperturas}</div>
                      <div className="k">Aperturas</div>
                    </div>
                    <div className="t">
                      <div className="v">{vista.clics}</div>
                      <div className="k">Clics</div>
                    </div>
                    <div className="t">
                      <div className="v">{vista.vioCotizacion ? "Sí" : "No"}</div>
                      <div className="k">Vio cotización</div>
                    </div>
                  </div>
                  <div className="field">
                    <div className="l">Score</div>
                    <div className="vv">
                      {score && (
                        <span className={`score ${score.css}`}>{score.label}</span>
                      )}{" "}
                      · {fE.format(eur)} · {vista.esfuerzoDias} días
                    </div>
                  </div>
                  <div className="field">
                    <div className="l">Acción sugerida</div>
                    <div className="vv">{accionSugerida(vista)}</div>
                  </div>
                  <div className="dact">
                    <button
                      className="btn-g btn"
                      type="button"
                      disabled={pendiente}
                      onClick={() => cambiarEtapa(vista.id, "aceptado")}
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
                      onClick={() => cambiarEtapa(vista.id, "descartado")}
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
