"use client";

import { useState, useTransition } from "react";
import type { EstadoFactura } from "@/lib/types/db";
import { cambiarEstadoFacturaVe } from "@/lib/data/acciones-ve";

/**
 * Estado de pago de una factura VE, conmutable (pendiente ⇄ pagada). Solo
 * refleja el cambio cuando persistió; si la acción falla, muestra el error.
 */
export function FacturaVeEstado({
  facturaId,
  estadoInicial,
}: {
  facturaId: string;
  estadoInicial: EstadoFactura;
}) {
  const [estado, setEstado] = useState<EstadoFactura>(estadoInicial);
  const [error, setError] = useState<string | null>(null);
  const [pendienteTx, iniciar] = useTransition();

  function alternar() {
    const nuevo: EstadoFactura = estado === "pagada" ? "pendiente" : "pagada";
    iniciar(async () => {
      const r = await cambiarEstadoFacturaVe(facturaId, nuevo);
      if (r.ok) {
        setEstado(nuevo);
        setError(null);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <span>
      <button
        type="button"
        className={estado === "pagada" ? "paid" : "pend"}
        style={{ border: "none", background: "none", padding: 0, font: "inherit" }}
        onClick={alternar}
        disabled={pendienteTx}
        title="Cambiar estado de pago"
      >
        {estado === "pagada" ? "Pagada" : "Pendiente"}
      </button>
      {error && (
        <small role="alert" style={{ display: "block", color: "var(--pink)" }}>
          {error}
        </small>
      )}
    </span>
  );
}
