"use client";

import { useActionState } from "react";
import { verificarAccesoAction, type EstadoPortal } from "@/app/p/[numero]/actions";

const inicial: EstadoPortal = { error: null };

/**
 * Candado del portal: pide email + código para abrir la propuesta #numero.
 * Al verificar, la server action pone la cookie y redirige a la misma URL,
 * que ya muestra la propuesta.
 */
export function PortalGate({
  numero,
  titulo,
  pideEmail,
}: {
  numero: number;
  titulo: string;
  pideEmail: boolean;
}) {
  const accion = verificarAccesoAction.bind(null, numero);
  const [estado, formAction, pendiente] = useActionState(accion, inicial);

  return (
    <main className="login-wrap">
      <form className="auth-card" action={formAction}>
        <div className="logo">
          Ai Landing <b>Pro</b>
        </div>
        <p className="vsub" style={{ marginBottom: 4 }}>
          Propuesta para <b>{titulo}</b>
        </p>
        <p className="vsub" style={{ marginBottom: 8, fontSize: "0.85rem" }}>
          Ingresa tus datos de acceso para verla.
        </p>

        {pideEmail && (
          <div className="field">
            <label className="l" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="auth-input" />
          </div>
        )}

        <div className="field">
          <label className="l" htmlFor="codigo">Código de acceso</label>
          <input
            id="codigo"
            name="codigo"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            required
            className="auth-input"
            style={{ letterSpacing: "0.15em", textTransform: "uppercase" }}
          />
        </div>

        {estado.error && (
          <p className="auth-error" role="alert">{estado.error}</p>
        )}

        <button className="btn-g btn" type="submit" disabled={pendiente}>
          {pendiente ? "Verificando…" : "Ver propuesta"}
        </button>
      </form>
    </main>
  );
}
