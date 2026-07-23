"use client";

import { useState, useTransition } from "react";
import { calificarLeadAction } from "@/lib/data/calificacion-accion";
import type { Calificacion } from "@/lib/data/scoring";

type Dossier = Record<string, unknown>;
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : null);
const lista = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/**
 * Califica el potencial del lead con la suscripción (enriquece + puntúa) y
 * muestra el tier + score + motivos. El operador ve al instante si vale la pena.
 */
export function CalificarBoton({ leadId }: { leadId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [cal, setCal] = useState<Calificacion | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calificar() {
    setError(null);
    setCal(null);
    setDossier(null);
    iniciar(async () => {
      const r = await calificarLeadAction(leadId);
      if (r.ok) {
        setCal(r.cal);
        setDossier(r.dossier);
      } else setError(r.error);
    });
  }

  const fila = (etiqueta: string, valor: unknown) => {
    const v = txt(valor);
    return v ? (
      <div>
        <span style={{ color: "var(--muted)" }}>{etiqueta}:</span> {v}
      </div>
    ) : null;
  };

  const color = (t: string) => (t === "A" ? "var(--mint)" : t === "B" ? "var(--amber)" : "var(--muted)");

  return (
    <div>
      <button className="btn" type="button" onClick={calificar} disabled={pendiente}>
        {pendiente ? "Calificando…" : "⭐ Calificar potencial"}
      </button>

      {cal && (
        <div className="note" style={{ marginTop: 8 }}>
          <b style={{ color: color(cal.tier) }}>
            Tier {cal.tier} · {cal.score}/100
            {cal.descalificado ? " · descalificado" : ""}
          </b>
          {cal.motivos.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {cal.motivos.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}

          {dossier && (
            <div style={{ marginTop: 10, display: "grid", gap: 3, fontSize: "0.85rem" }}>
              <b style={{ color: "var(--ink)" }}>Dossier del prospecto</b>
              {txt(dossier.resumen) && <div style={{ fontStyle: "italic" }}>{txt(dossier.resumen)}</div>}
              {fila("Eslogan", dossier.eslogan)}
              {fila("Categoría", dossier.categoria)}
              {lista(dossier.servicios).length > 0 && fila("Servicios", lista(dossier.servicios).join(" · "))}
              {fila("Seguidores IG", dossier.seguidoresIg)}
              {fila("Rating", txt(dossier.rating) && `${txt(dossier.rating)}★ (${txt(dossier.resenas) ?? "?"} reseñas)`)}
              {fila("Web actual", dossier.brechaWeb)}
              {fila("Teléfono", dossier.telefono)}
              {fila("Email", dossier.email)}
              {fila("Dirección", dossier.direccion)}
              {(txt(dossier.instagram) || txt(dossier.facebook) || txt(dossier.tiktok) || txt(dossier.sitioWeb)) && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                  {txt(dossier.instagram) && <a href={txt(dossier.instagram)!} target="_blank" rel="noreferrer">Instagram</a>}
                  {txt(dossier.facebook) && <a href={txt(dossier.facebook)!} target="_blank" rel="noreferrer">Facebook</a>}
                  {txt(dossier.tiktok) && <a href={txt(dossier.tiktok)!} target="_blank" rel="noreferrer">TikTok</a>}
                  {txt(dossier.sitioWeb) && <a href={txt(dossier.sitioWeb)!} target="_blank" rel="noreferrer">Web</a>}
                </div>
              )}
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
