"use client";

import { useMemo, useState, useTransition } from "react";
import { crearFacturaVe } from "@/lib/data/acciones-ve";
import {
  calcularFacturaVe,
  fBs,
  fUsd,
  type MonedaFacturaVe,
  type ParametrosFiscalVe,
} from "@/lib/data/fiscal-ve-calculos";

/**
 * Emisión de factura Venezuela (persona natural con RIF): datos del cliente,
 * monto en USD o Bs, tasa BCV del día e IGTF opcional. La vista previa usa el
 * mismo motor puro que persiste el servidor (fiscal-ve-calculos).
 */
export function FacturaVeForm({
  siguienteNumero,
  parametros,
}: {
  siguienteNumero: number;
  parametros: ParametrosFiscalVe;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteRif, setClienteRif] = useState("");
  const [clienteDomicilio, setClienteDomicilio] = useState("");
  const [concepto, setConcepto] = useState("");
  const [moneda, setMoneda] = useState<MonedaFacturaVe>("USD");
  const [monto, setMonto] = useState("");
  const [tasaBcv, setTasaBcv] = useState(
    parametros.tasa_bcv > 0 ? String(parametros.tasa_bcv) : "",
  );
  const [aplicaIgtf, setAplicaIgtf] = useState(true);
  const [numeroControl, setNumeroControl] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState<string | null>(null);
  const [emitidaId, setEmitidaId] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const vista = useMemo(() => {
    const m = Number(monto);
    const t = Number(tasaBcv);
    if (!Number.isFinite(m) || m <= 0 || !Number.isFinite(t) || t <= 0) {
      return null;
    }
    return calcularFacturaVe({
      monto: m,
      moneda,
      tasaBcv: t,
      ivaPct: parametros.iva_pct,
      aplicaIgtf,
      igtfPct: parametros.igtf_pct,
    });
  }, [monto, moneda, tasaBcv, aplicaIgtf, parametros]);

  function emitir() {
    setError(null);
    if (monto.trim() === "" || tasaBcv.trim() === "") {
      setError("Ingresa el monto y la tasa BCV del día.");
      return;
    }
    iniciar(async () => {
      const r = await crearFacturaVe({
        clienteNombre,
        clienteRif,
        clienteDomicilio,
        concepto,
        moneda,
        monto: Number(monto),
        tasaBcv: Number(tasaBcv),
        aplicaIgtf,
        numeroControl,
        fecha,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEmitidaId(r.facturaId ?? null);
      setClienteNombre("");
      setClienteRif("");
      setClienteDomicilio("");
      setConcepto("");
      setMonto("");
      setNumeroControl("");
    });
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
        }}
      >
        <input
          className="auth-input"
          placeholder="Cliente (nombre o razón social)"
          value={clienteNombre}
          onChange={(e) => setClienteNombre(e.target.value)}
        />
        <input
          className="auth-input"
          placeholder="RIF / C.I. del cliente (V-12345678-9, opcional)"
          value={clienteRif}
          onChange={(e) => setClienteRif(e.target.value)}
        />
        <input
          className="auth-input"
          placeholder="Domicilio fiscal del cliente (opcional)"
          value={clienteDomicilio}
          onChange={(e) => setClienteDomicilio(e.target.value)}
          style={{ gridColumn: "1 / -1" }}
        />
        <input
          className="auth-input"
          placeholder="Concepto del servicio"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          style={{ gridColumn: "1 / -1" }}
        />
        <select
          className="auth-input"
          value={moneda}
          onChange={(e) => setMoneda(e.target.value as MonedaFacturaVe)}
          aria-label="Moneda del monto"
        >
          <option value="USD">Monto en USD</option>
          <option value="VES">Monto en Bs</option>
        </select>
        <input
          className="auth-input"
          type="number"
          min={0}
          step="0.01"
          placeholder={moneda === "USD" ? "Monto (USD)" : "Monto (Bs)"}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <input
          className="auth-input"
          type="number"
          min={0}
          step="0.0001"
          placeholder="Tasa BCV (Bs por USD)"
          value={tasaBcv}
          onChange={(e) => setTasaBcv(e.target.value)}
        />
        <input
          className="auth-input"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          aria-label="Fecha de emisión"
        />
        <input
          className="auth-input"
          placeholder={`N.º de control (vacío = 00-${String(siguienteNumero).padStart(6, "0")})`}
          value={numeroControl}
          onChange={(e) => setNumeroControl(e.target.value)}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: ".85rem",
          }}
        >
          <input
            type="checkbox"
            checked={aplicaIgtf}
            onChange={(e) => setAplicaIgtf(e.target.checked)}
          />
          Pago en divisas (IGTF {Math.round(parametros.igtf_pct * 100)}%)
        </label>
      </div>

      {vista && (
        <div className="note" style={{ marginTop: 10 }}>
          Base {fBs.format(vista.baseBs)} · IVA{" "}
          {Math.round(parametros.iva_pct * 100)}% {fBs.format(vista.ivaBs)}
          {vista.igtfBs > 0 && <> · IGTF {fBs.format(vista.igtfBs)}</>} ·{" "}
          <b>Total {fBs.format(vista.totalBs)}</b> ({fUsd.format(vista.totalUsd)}
          )
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        <button className="btn btn-g" onClick={emitir} disabled={enviando}>
          {enviando ? "Emitiendo…" : `Emitir factura N.º ${siguienteNumero}`}
        </button>
        {emitidaId && (
          <a
            className="btn"
            href={`/imprimir/factura-ve/${emitidaId}`}
            target="_blank"
            rel="noreferrer"
          >
            Imprimir factura emitida
          </a>
        )}
      </div>
      {error && (
        <div className="note" role="alert" style={{ marginTop: 8 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
