"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Disuasión anti-captura para la vista pública de la maqueta. HONESTO sobre sus
 * límites: la web NO puede impedir un screenshot del sistema operativo. Esto solo
 * DISUADE y deja rastro:
 *  - marca de agua repetida con el nombre del cliente (identifica la fuga);
 *  - bloquea menú contextual, arrastre y atajos de guardar/imprimir;
 *  - oculta el contenido cuando la pestaña pierde foco (cambio de app / captura
 *    de ventana en background) hasta que el usuario vuelve.
 * El gating real (sin URL directa, token que expira) vive en el servidor.
 */
export function ProteccionCaptura({
  clienteNombre,
  children,
}: {
  clienteNombre: string;
  children: React.ReactNode;
}) {
  const [oculto, setOculto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ocultar = () => setOculto(true);
    const mostrar = () => setOculto(false);
    const onVisibilidad = () => setOculto(document.visibilityState !== "visible");

    // PrintScreen NO quita el foco ni cambia la visibilidad: blur/focus nunca
    // restaurarían la cortina y el contenido quedaría oculto sin salida. Se
    // restaura sola tras un instante (ya disuadió la captura).
    const ocultarBreve = () => {
      setOculto(true);
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setOculto(false), 1500);
    };

    const bloquear = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // Guardar / imprimir / "screenshot" de macOS (Cmd+Shift+…): disuadir.
      if ((e.metaKey || e.ctrlKey) && (k === "s" || k === "p")) e.preventDefault();
      if (k === "printscreen") ocultarBreve();
    };
    // En Windows, PrintScreen suele emitir solo keyup.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "printscreen") ocultarBreve();
    };

    document.addEventListener("visibilitychange", onVisibilidad);
    window.addEventListener("blur", ocultar);
    window.addEventListener("focus", mostrar);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    const el = ref.current;
    el?.addEventListener("contextmenu", bloquear);
    el?.addEventListener("dragstart", bloquear);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilidad);
      window.removeEventListener("blur", ocultar);
      window.removeEventListener("focus", mostrar);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      el?.removeEventListener("contextmenu", bloquear);
      el?.removeEventListener("dragstart", bloquear);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  // Marca de agua repetida en diagonal (SVG data-uri como fondo del overlay).
  const marca = encodeURIComponent(clienteNombre + " · vista previa");
  const watermark =
    `url("data:image/svg+xml;utf8,` +
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'>` +
    `<text x='0' y='100' transform='rotate(-24 160 90)' fill='rgba(35,34,58,0.10)' ` +
    `font-family='sans-serif' font-size='18'>${marca}</text></svg>")`;

  return (
    <div
      ref={ref}
      style={{ position: "relative", width: "100%", height: "100dvh", userSelect: "none" }}
    >
      {children}

      {/* Overlay de marca de agua (no captura clicks del contenido). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: watermark,
          backgroundRepeat: "repeat",
          zIndex: 10,
        }}
      />

      {/* Cortina al perder foco / cambiar de pestaña. */}
      <div
        aria-hidden={!oculto}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          display: oculto ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6F5FB",
          color: "#23223A",
          fontFamily: "system-ui, sans-serif",
          fontSize: 18,
          textAlign: "center",
          padding: 24,
        }}
      >
        Vista previa oculta. Vuelve a esta pestaña para verla.
      </div>
    </div>
  );
}
