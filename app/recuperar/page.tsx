"use client";

import Link from "next/link";
import { useActionState } from "react";
import { solicitarReset, type EstadoRecuperar } from "./actions";

const estadoInicial: EstadoRecuperar = { mensaje: null, error: null };

/** Pantalla "olvidé mi contraseña": pide el email y envía el enlace de reset. */
export default function RecuperarPage() {
  const [estado, accion, pendiente] = useActionState(solicitarReset, estadoInicial);

  return (
    <main className="login-wrap">
      <form className="auth-card" action={accion}>
        <div className="logo">
          Ai Landing <b>Pro</b>
        </div>
        <p className="vsub" style={{ marginBottom: 4 }}>
          Restablecer contraseña
        </p>

        {estado.mensaje ? (
          <p className="auth-ok" role="status">
            {estado.mensaje}
          </p>
        ) : (
          <>
            <div className="field">
              <label className="l" htmlFor="email">
                Email de tu cuenta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="auth-input"
              />
            </div>

            {estado.error && (
              <p className="auth-error" role="alert">
                {estado.error}
              </p>
            )}

            <button className="btn-g btn" type="submit" disabled={pendiente}>
              {pendiente ? "Enviando…" : "Enviar enlace"}
            </button>
          </>
        )}

        <p className="vsub" style={{ marginTop: 12, fontSize: "0.85rem" }}>
          <Link href="/login">← Volver a entrar</Link>
        </p>
      </form>
    </main>
  );
}
