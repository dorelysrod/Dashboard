"use client";

import { useEffect, useState, useTransition } from "react";
import {
  obtenerFichaLead,
  generarGuionVenta,
  generarMensajesLead,
  type FichaLead,
  type Guion,
  type Mensajes,
} from "@/lib/data/ficha-accion";

const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : null);
const arr = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/**
 * Ficha de VENTA del lead: todo para la reunión — dolor, contacto, servicios,
 * calificación, guion y mensajes por canal. Lee TODO de nuestra base (dossier +
 * guion + mensajes cacheados); solo llama la suscripción si pides generar algo
 * que aún no existe. Siempre visible arriba del drawer.
 */
export function FichaVenta({ leadId }: { leadId: string }) {
  const [ficha, setFicha] = useState<FichaLead | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guion, setGuion] = useState<Guion | null>(null);
  const [mensajes, setMensajes] = useState<Mensajes | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [gPend, genGuion] = useTransition();
  const [mPend, genMsg] = useTransition();

  useEffect(() => {
    let vivo = true;
    setFicha(null); setGuion(null); setMensajes(null); setErr(null); setCargando(true);
    obtenerFichaLead(leadId).then((f) => {
      if (!vivo) return;
      setFicha(f);
      setGuion(f?.guion ?? null); // cacheado
      setMensajes(f?.mensajes ?? null); // cacheado
      setCargando(false);
    });
    return () => { vivo = false; };
  }, [leadId]);

  const d = (ficha?.dossier ?? null) as any;
  const tieneDossier = d && Object.keys(d).length > 0;

  function crearGuion() {
    setErr(null);
    genGuion(async () => {
      const r = await generarGuionVenta(leadId);
      if (r.ok) setGuion(r.guion); else setErr(r.error);
    });
  }
  function crearMensajes() {
    setErr(null);
    genMsg(async () => {
      const r = await generarMensajesLead(leadId);
      if (r.ok) setMensajes(r.mensajes); else setErr(r.error);
    });
  }

  if (cargando) return null;
  if (!tieneDossier) {
    return (
      <div className="reco" style={{ marginBottom: 12 }}>
        <b>Ficha de venta</b> — aún sin dossier. Pulsa <b>⭐ Calificar potencial</b> (abajo) para
        reunir su dolor, contacto y datos de venta.
      </div>
    );
  }

  const dolor = arr(d.dolor);
  const gancho = txt(d.ganchoDolor);
  const servicios = arr(d.servicios);
  const color = ficha?.tier === "A" ? "var(--mint)" : ficha?.tier === "B" ? "var(--amber)" : "var(--muted)";
  const contacto = [
    txt(ficha?.telefono || d.telefono) && `📱 ${txt(ficha?.telefono || d.telefono)}`,
    txt(d.instagram) && "📷 Instagram",
    txt(d.facebook) && "📘 Facebook",
    txt(d.email) && `✉️ ${txt(d.email)}`,
    txt(d.direccion) && `📍 ${txt(d.direccion)}`,
  ].filter(Boolean);

  return (
    <div className="reco" style={{ marginBottom: 12, background: "#FBFAFF", border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <b>🎯 Ficha de venta</b>
        {ficha?.tier && <span style={{ color, fontWeight: 700 }}>Tier {ficha.tier}</span>}
        {txt(d.categoria) && <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>· {txt(d.categoria)}</span>}
      </div>

      {txt(d.resumen) && <div style={{ fontStyle: "italic", marginBottom: 8 }}>{txt(d.resumen)}</div>}

      {(dolor.length > 0 || gancho) && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: "var(--pink)", fontWeight: 700 }}>Su dolor</div>
          {gancho && <div style={{ marginBottom: 2 }}>➤ {gancho}</div>}
          {dolor.length > 0 && (
            <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>{dolor.map((x, i) => <li key={i}>{x}</li>)}</ul>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 3, fontSize: "0.85rem" }}>
        {servicios.length > 0 && <div><span style={{ color: "var(--muted)" }}>Servicios:</span> {servicios.join(" · ")}</div>}
        {txt(d.rating) && (
          <div>
            <span style={{ color: "var(--muted)" }}>Reputación:</span> {txt(d.rating)}★ ({txt(d.resenas) ?? "?"} reseñas)
            {txt(d.seguidoresIg) && ` · ${txt(d.seguidoresIg)} seguidores IG`}
          </div>
        )}
        {contacto.length > 0 && <div><span style={{ color: "var(--muted)" }}>Contacto:</span> {contacto.join("  ")}</div>}
      </div>

      {err && <div className="note" style={{ marginTop: 6 }}>⚠ {err}</div>}

      {/* Mensajes por canal (cache-first) */}
      <div style={{ marginTop: 10 }}>
        {!mensajes ? (
          <button className="btn" type="button" onClick={crearMensajes} disabled={mPend}>
            {mPend ? "Generando mensajes…" : "✍️ Generar mensajes (WhatsApp/DM/correo)"}
          </button>
        ) : (
          <div style={{ display: "grid", gap: 6, fontSize: "0.87rem" }}>
            <b>Mensajes por dolor</b>
            <Mensaje etiqueta="WhatsApp" texto={mensajes.whatsapp} />
            <Mensaje etiqueta="Instagram DM" texto={mensajes.dm} />
            <Mensaje etiqueta={`Correo — ${mensajes.asunto}`} texto={mensajes.correo} />
          </div>
        )}
      </div>

      {/* Guion de venta (cache-first) */}
      <div style={{ marginTop: 10 }}>
        {!guion ? (
          <button className="btn" type="button" onClick={crearGuion} disabled={gPend}>
            {gPend ? "Preparando guion…" : "🗣 Generar guion de venta"}
          </button>
        ) : (
          <div style={{ display: "grid", gap: 8, fontSize: "0.87rem" }}>
            <div><b>Apertura</b><div>{guion.apertura}</div></div>
            {guion.puntosVenta.length > 0 && (
              <div><b>Puntos que cierran</b>
                <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>{guion.puntosVenta.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </div>
            )}
            {guion.objeciones.length > 0 && (
              <div><b>Objeciones y respuestas</b>
                {guion.objeciones.map((o, i) => (
                  <div key={i} style={{ marginTop: 3 }}>
                    <span style={{ color: "var(--pink)" }}>“{o.objecion}”</span> → {o.respuesta}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Mensaje({ etiqueta, texto }: { etiqueta: string; texto: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1200); } catch { /* selecciona a mano */ }
  }
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 8, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b style={{ fontSize: "0.82rem" }}>{etiqueta}</b>
        <button className="btn" type="button" onClick={copiar} style={{ padding: "2px 8px", fontSize: "0.78rem" }}>
          {copiado ? "✓" : "Copiar"}
        </button>
      </div>
      <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{texto}</div>
    </div>
  );
}
