"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = { error: null };

export default function LoginPage() {
  const [estado, accion, pendiente] = useActionState(
    iniciarSesion,
    estadoInicial,
  );

  return (
    <main className="login-wrap">
      <form className="auth-card" action={accion}>
        <div className="logo">
          Ai Landing <b>Pro</b>
        </div>
        <p className="vsub" style={{ marginBottom: 4 }}>
          Entra al panel operativo.
        </p>

        <div className="field">
          <label className="l" htmlFor="email">
            Email
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

        <div className="field">
          <label className="l" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
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
          {pendiente ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
