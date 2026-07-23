"use client";

import { useEffect, useState, useTransition } from "react";
import { generarMaqueta, maquetaExistente, detectarMarca } from "@/lib/maquetas/acciones";
import type { MarcaDetectada, MarcaOverride } from "@/lib/maquetas/generar";

/**
 * Dispara la generación de la maqueta del lead (harness IA → Claude) y muestra
 * el enlace público resultante para compartir con el cliente. La UI no conoce el
 * proveedor ni el almacenamiento: todo pasa por el server action.
 *
 * Incluye el PANEL DE MARCA: el operador ve la identidad detectada (colores,
 * tipografía, eslogan, logo) y la corrige antes de generar → control real del
 * design system, no solo detección automática.
 */

/** Estado editable de la marca (working copy del operador). */
interface MarcaEditable {
  colores: string[];
  tipografiaFamilia: string;
  eslogan: string;
  logoDataUri: string | null;
  tieneLogo: boolean;
  origen: "nueva" | "redisenio";
  sitioWeb: string | null;
}

function aEditable(m: MarcaDetectada): MarcaEditable {
  return {
    colores: m.colores.length ? m.colores : [""],
    tipografiaFamilia: m.tipografiaFamilia ?? "",
    eslogan: m.eslogan ?? "",
    logoDataUri: m.logoDataUri,
    tieneLogo: m.tieneLogo,
    origen: m.origen,
    sitioWeb: m.sitioWeb,
  };
}

/** "hace 2 h" / "hace 3 días" a partir de un ISO. */
function hace(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "hace un momento";
  const min = s / 60;
  if (min < 60) return `hace ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 24) return `hace ${Math.round(h)} h`;
  const d = h / 24;
  return `hace ${Math.round(d)} día${Math.round(d) === 1 ? "" : "s"}`;
}

function aOverride(m: MarcaEditable): MarcaOverride {
  const colores = m.colores.map((c) => c.trim()).filter((c) => /^#[0-9a-fA-F]{3,8}$/.test(c));
  return {
    colores,
    tipografiaFamilia: m.tipografiaFamilia.trim() || null,
    eslogan: m.eslogan.trim() || null,
  };
}

export function MaquetaBoton({ leadId }: { leadId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [ruta, setRuta] = useState<string | null>(null);
  const [numero, setNumero] = useState<number | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [origen, setOrigen] = useState<"nueva" | "redisenio" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  // Al abrir el lead: si ya tiene maqueta, muestra el botón "Ver" persistente.
  const [existente, setExistente] = useState<number | null>(null);
  // Vistas del prospecto (intención de compra): total + última apertura.
  const [vistas, setVistas] = useState<{ total: number; ultima: string | null } | null>(null);

  // Panel de marca (control de diseño).
  const [abierta, setAbierta] = useState(false);
  const [marca, setMarca] = useState<MarcaEditable | null>(null);
  const [detectando, iniciarDeteccion] = useTransition();
  const [avisoMarca, setAvisoMarca] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    maquetaExistente(leadId).then((r) => {
      if (vivo && r?.numero != null) {
        setExistente(r.numero);
        setVistas(r.vistas);
      }
    });
    return () => {
      vivo = false;
    };
  }, [leadId]);

  function toggleMarca() {
    const abrir = !abierta;
    setAbierta(abrir);
    // Detecta la marca la primera vez que se abre (cache-first, sin gastar API).
    if (abrir && !marca) {
      setAvisoMarca(null);
      iniciarDeteccion(async () => {
        const r = await detectarMarca(leadId);
        if (r.ok) {
          setMarca(aEditable(r.marca));
          if (!r.marca.colores.length && !r.marca.tipografiaFamilia && !r.marca.eslogan) {
            setAvisoMarca(
              "No se detectó marca guardada (sin sitio ni dossier). Complétala a mano o genera y se descubrirá.",
            );
          }
        } else {
          setAvisoMarca(r.error);
        }
      });
    }
  }

  function setColor(i: number, valor: string) {
    setMarca((m) => (m ? { ...m, colores: m.colores.map((c, j) => (j === i ? valor : c)) } : m));
  }
  function quitarColor(i: number) {
    setMarca((m) => (m ? { ...m, colores: m.colores.filter((_, j) => j !== i) } : m));
  }
  function agregarColor() {
    setMarca((m) => (m ? { ...m, colores: [...m.colores, ""] } : m));
  }

  function generar() {
    setError(null);
    setRuta(null);
    // Si el panel se abrió, envía el override (marca corregida); si no, auto puro.
    const override = abierta && marca ? aOverride(marca) : undefined;
    iniciar(async () => {
      const r = await generarMaqueta(leadId, override);
      if (r.ok) {
        setRuta(r.ruta);
        setNumero(r.numero);
        setCodigo(r.codigo);
        setOrigen(r.origen);
      } else {
        setError(r.error);
      }
    });
  }

  async function copiar() {
    if (!ruta) return;
    try {
      await navigator.clipboard.writeText(new URL(ruta, window.location.origin).toString());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* el enlace ya está visible para copiar a mano */
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}>
      {/* Botón fijo para ABRIR la maqueta si el lead ya tiene una. */}
      {existente != null && ruta == null && (
        <a
          className="btn-g btn"
          href={`/propuestas/${existente}`}
          target="_blank"
          rel="noreferrer"
          style={{ textAlign: "center", textDecoration: "none" }}
        >
          👁 Ver maqueta (#{existente})
        </a>
      )}

      {/* Intención de compra: ¿el prospecto abrió su propuesta? */}
      {existente != null && ruta == null && vistas != null && (
        <div
          style={{ fontSize: "0.8rem", textAlign: "center", color: vistas.total > 0 ? "var(--ok, #16a34a)" : "var(--muted)" }}
        >
          {vistas.total > 0 ? (
            <>
              👀 El prospecto la vio <b>{vistas.total}×</b>
              {vistas.ultima ? ` · última ${hace(vistas.ultima)}` : ""}
            </>
          ) : (
            <>Aún no abre su propuesta</>
          )}
        </div>
      )}

      {/* Panel de MARCA: ver y corregir la identidad antes de generar. */}
      <button
        className="btn"
        type="button"
        onClick={toggleMarca}
        style={{ background: "transparent", border: "1px solid var(--border, #333)" }}
      >
        {abierta ? "▾ Marca (colores · tipografía · eslogan)" : "🎛 Ver / editar marca del cliente"}
      </button>

      {abierta && (
        <div
          className="note"
          style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10 }}
        >
          {detectando && <div style={{ color: "var(--muted)" }}>Detectando marca…</div>}
          {avisoMarca && <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{avisoMarca}</div>}

          {marca && (
            <>
              {marca.sitioWeb && (
                <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                  Fuente: {marca.origen === "redisenio" ? "sitio actual" : "dossier"} ·{" "}
                  <span style={{ opacity: 0.8 }}>{marca.sitioWeb}</span>
                </div>
              )}

              {/* Colores de marca */}
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Colores de marca</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {marca.colores.map((c, i) => {
                    const valido = /^#[0-9a-fA-F]{6}$/.test(c);
                    return (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="color"
                          value={valido ? c : "#888888"}
                          onChange={(e) => setColor(i, e.target.value)}
                          style={{ width: 26, height: 26, padding: 0, border: "none", background: "none" }}
                          aria-label={`Selector de color ${i + 1}`}
                        />
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => setColor(i, e.target.value)}
                          placeholder="#RRGGBB"
                          style={{ width: 82, fontFamily: "monospace", fontSize: "0.8rem" }}
                        />
                        <button
                          type="button"
                          onClick={() => quitarColor(i)}
                          title="Quitar"
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)" }}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={agregarColor}
                    style={{ border: "1px dashed var(--border, #444)", background: "none", cursor: "pointer", fontSize: "0.8rem", padding: "2px 8px" }}
                  >
                    + color
                  </button>
                </div>
              </div>

              {/* Tipografía */}
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  Tipografía (nombre de Google Font; se embebe si existe)
                </label>
                <input
                  type="text"
                  value={marca.tipografiaFamilia}
                  onChange={(e) => setMarca((m) => (m ? { ...m, tipografiaFamilia: e.target.value } : m))}
                  placeholder="ej. Playfair Display"
                  style={{ width: "100%", marginTop: 4 }}
                />
              </div>

              {/* Eslogan */}
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Eslogan (va textual en el hero)</label>
                <input
                  type="text"
                  value={marca.eslogan}
                  onChange={(e) => setMarca((m) => (m ? { ...m, eslogan: e.target.value } : m))}
                  placeholder="ej. Tu belleza, nuestra pasión"
                  style={{ width: "100%", marginTop: 4 }}
                />
              </div>

              {/* Logo (auto) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Logo:</span>
                {marca.logoDataUri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marca.logoDataUri} alt="Logo detectado" style={{ maxHeight: 32, width: "auto", background: "#fff", borderRadius: 4, padding: 2 }} />
                ) : (
                  <span style={{ fontSize: "0.8rem" }}>sin logo detectado (se usará el nombre como wordmark)</span>
                )}
              </div>

              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                Lo que edites aquí <b>pisa</b> lo detectado al generar. Lo que dejes vacío usa lo automático.
              </div>
            </>
          )}
        </div>
      )}

      <button className="btn" type="button" onClick={generar} disabled={pendiente || detectando}>
        {pendiente
          ? "Generando maqueta…"
          : existente != null
            ? abierta
              ? "🔄 Regenerar con esta marca"
              : "🔄 Regenerar maqueta"
            : abierta
              ? "🎨 Generar con esta marca"
              : "🎨 Generar maqueta"}
      </button>

      {ruta && (
        <div className="note" style={{ marginTop: 8 }}>
          {origen === "redisenio" ? "Rediseño listo" : "Maqueta nueva lista"} ·{" "}
          {numero != null && <>Propuesta <b>#{numero}</b></>}
          {/* TU vista (sin candado, con tu login) */}
          {numero != null && (
            <div style={{ marginTop: 4 }}>
              <a href={`/propuestas/${numero}`} target="_blank" rel="noreferrer">
                👁 Ver maqueta (tú)
              </a>
            </div>
          )}
          {/* Enlace + código para el PROSPECTO */}
          <div style={{ marginTop: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Para el prospecto:</span>{" "}
            <a href={ruta} target="_blank" rel="noreferrer">enlace</a>
            <button className="btn" type="button" onClick={copiar} style={{ marginLeft: 8 }}>
              {copiado ? "✓ Copiado" : "Copiar enlace"}
            </button>
          </div>
          {codigo && (
            <div style={{ marginTop: 4 }}>
              Código de acceso: <b style={{ letterSpacing: "0.1em" }}>{codigo}</b>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                El prospecto necesita el enlace + este código (y su email). Sin ambos no se abre.
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="note" style={{ marginTop: 8 }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
