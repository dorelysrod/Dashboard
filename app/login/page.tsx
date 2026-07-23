"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { iniciarSesion, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = { error: null };

function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(
    iniciarSesion,
    estadoInicial,
  );
  // Señal de /auth/callback: enlace de restablecer inválido o vencido.
  const enlaceInvalido = useSearchParams().get("error") === "enlace_invalido";

  return (
    <main className="login-wrap">
      <form className="auth-card" action={accion}>
        <div className="logo">
          Ai Landing <b>Pro</b>
        </div>
        <p className="vsub" style={{ marginBottom: 4 }}>
          Entra al panel operativo.
        </p>

        {enlaceInvalido && (
          <p className="auth-error" role="alert">
            El enlace de restablecimiento no es válido o expiró. Solicita uno
            nuevo desde «¿Olvidaste tu contraseña?».
          </p>
        )}

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

        <p className="vsub" style={{ marginTop: 12, fontSize: "0.85rem" }}>
          <a href="/recuperar">¿Olvidaste tu contraseña?</a>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams exige un límite de Suspense al prerenderizar.
  return (
    <Suspense fallback={null}>
      <FormularioLogin />
    </Suspense>
  );
}
