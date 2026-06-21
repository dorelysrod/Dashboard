"use client";

import type { Lead } from "@/lib/types/dominio";
import { aEur, etiquetaScore, fE, fM } from "@/lib/format";
import { useLeadDrawer } from "./drawer-context";

/**
 * Fila de lead (pipeline + leads calientes). Reemplaza leadRow()/onclick del
 * mockup: abre el drawer vía contexto. `mostrarEtapa` alterna etapa vs score.
 */
export function LeadRow({
  lead,
  mostrarEtapa,
}: {
  lead: Lead;
  mostrarEtapa: boolean;
}) {
  const { abrir } = useLeadDrawer();
  const eur = aEur(lead.mxn);
  const score = etiquetaScore(eur, lead.esfuerzoDias);

  return (
    <div
      className="lrow"
      role="button"
      tabIndex={0}
      onClick={() => abrir(lead)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrir(lead);
        }
      }}
    >
      <div className="nm">
        <b>{lead.nombre}</b>
        <small>
          {lead.meta} · {lead.esfuerzoDias} días
        </small>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="money">
          {fE.format(eur)} <small>· {fM.format(lead.mxn)}</small>
        </div>
        <div
          style={{
            marginTop: 5,
            display: "flex",
            gap: 6,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {lead.aperturas ? (
            <span className="opens">
              👁 <b>{lead.aperturas}</b>
            </span>
          ) : (
            <span className="opens">—</span>
          )}
          {mostrarEtapa ? (
            <span className={`stage ${lead.etapa.css}`}>{lead.etapa.label}</span>
          ) : (
            <span className={`score ${score.css}`}>{score.label}</span>
          )}
        </div>
      </div>
    </div>
  );
}
