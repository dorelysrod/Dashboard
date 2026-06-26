"use client";

import { useState, useTransition } from "react";
import type { EstadoFactura } from "@/lib/types/db";
import { cambiarEstadoFactura } from "@/lib/data/acciones";

/**
 * Estado de pago de una factura, conmutable (pendiente ⇄ pagada). Seguimiento de
 * cobros de la vista Facturación. Optimista: refleja el cambio al instante.
 */
export function FacturaEstado({
  facturaId,
  estadoInicial,
}: {
  facturaId: string;
  estadoInicial: EstadoFactura;
}) {
  const [estado, setEstado] = useState<EstadoFactura>(estadoInicial);
  const [pendienteTx, iniciar] = useTransition();

  function alternar() {
    const nuevo: EstadoFactura = estado === "pagada" ? "pendiente" : "pagada";
    iniciar(async () => {
      const r = await cambiarEstadoFactura(facturaId, nuevo);
      if (r.ok) setEstado(nuevo);
    });
  }

  return (
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
  );
}
