"use client";

import { useState, useTransition } from "react";
import { guardarParametrosFiscalVe } from "@/lib/data/acciones-ve";
import type { ParametrosFiscalVe } from "@/lib/data/fiscal-ve-calculos";

/**
 * Datos del emisor y parámetros del régimen VE (config.FISCAL_VE): nombre,
 * RIF, domicilio fiscal, valor de la UT, tasa BCV por defecto y cargas
 * familiares (rebajas de ISLR).
 */
export function ParametrosVeForm({
  parametros,
}: {
  parametros: ParametrosFiscalVe;
}) {
  const [nombre, setNombre] = useState(parametros.nombre);
  const [rif, setRif] = useState(parametros.rif);
  const [domicilio, setDomicilio] = useState(parametros.domicilio);
  const [utBs, setUtBs] = useState(String(parametros.ut_bs));
  const [tasaBcv, setTasaBcv] = useState(
    parametros.tasa_bcv > 0 ? String(parametros.tasa_bcv) : "",
  );
  const [cargas, setCargas] = useState(String(parametros.cargas_familiares));
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [esError, setEsError] = useState(false);
  const [guardando, iniciar] = useTransition();

  function guardar() {
    setMensaje(null);
    iniciar(async () => {
      const r = await guardarParametrosFiscalVe({
        nombre,
        rif,
        domicilio,
        utBs: Number(utBs),
        tasaBcv: tasaBcv.trim() === "" ? 0 : Number(tasaBcv),
        cargasFamiliares: cargas.trim() === "" ? 0 : Number(cargas),
      });
      setEsError(!r.ok);
      setMensaje(r.ok ? "Guardado." : r.error);
    });
  }

  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ cursor: "pointer", fontSize: ".85rem" }}>
        ⚙️ Datos del emisor y parámetros (RIF, UT, tasa BCV)
      </summary>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          marginTop: 10,
        }}
      >
        <input
          className="auth-input"
          placeholder="Tu nombre y apellido (emisor)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          className="auth-input"
          placeholder="Tu RIF (V-12345678-9)"
          value={rif}
          onChange={(e) => setRif(e.target.value)}
        />
        <input
          className="auth-input"
          placeholder="Tu domicilio fiscal"
          value={domicilio}
          onChange={(e) => setDomicilio(e.target.value)}
          style={{ gridColumn: "1 / -1" }}
        />
        <input
          className="auth-input"
          type="number"
          min={0}
          step="0.01"
          placeholder="Valor UT (Bs)"
          title="Valor de la Unidad Tributaria en Bs (lo publica el SENIAT)"
          value={utBs}
          onChange={(e) => setUtBs(e.target.value)}
        />
        <input
          className="auth-input"
          type="number"
          min={0}
          step="0.0001"
          placeholder="Tasa BCV por defecto (Bs/USD)"
          value={tasaBcv}
          onChange={(e) => setTasaBcv(e.target.value)}
        />
        <input
          className="auth-input"
          type="number"
          min={0}
          step="1"
          placeholder="Cargas familiares (rebaja 10 UT c/u)"
          value={cargas}
          onChange={(e) => setCargas(e.target.value)}
        />
        <button
          className="btn btn-g"
          onClick={guardar}
          disabled={guardando}
          style={{ alignSelf: "center" }}
        >
          {guardando ? "Guardando…" : "Guardar parámetros"}
        </button>
      </div>
      {mensaje && (
        <div className="note" role={esError ? "alert" : "status"} style={{ marginTop: 8 }}>
          {esError ? `⚠️ ${mensaje}` : `✅ ${mensaje}`}
        </div>
      )}
    </details>
  );
}
