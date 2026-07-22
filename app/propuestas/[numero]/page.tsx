import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { leerMaquetaPorNumero } from "@/lib/maquetas/store";

/**
 * Vista de OPERADORA de una propuesta: /propuestas/[numero]. Protegida por el
 * login del panel (el middleware exige sesión en esta ruta) → sin candado
 * email+código. Muestra los datos para compartir con el prospecto + la maqueta.
 * Es distinta del portal público del cliente (/p/[numero]).
 */
export const dynamic = "force-dynamic";

export default async function PropuestaOperadora({ params }: { params: Promise<{ numero: string }> }) {
  const { numero: raw } = await params;
  const numero = Number(raw);
  if (!Number.isInteger(numero) || numero <= 0) notFound();

  const m = await leerMaquetaPorNumero(numero);
  if (!m) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const landingsHost = process.env.LANDINGS_HOST;
  const urlPublica = `${landingsHost ? "https://" + landingsHost : `${proto}://${host}`}/p/${numero}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div style={{ background: "#23223A", color: "#fff", font: "13px system-ui", padding: "10px 16px", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <b>Propuesta #{numero}</b>
        <span>{m.titulo}</span>
        <span style={{ opacity: 0.85 }}>Enlace cliente: <code>{urlPublica}</code></span>
        <span style={{ opacity: 0.85 }}>Código: <b>{m.codigo ?? "—"}</b></span>
        {m.email && <span style={{ opacity: 0.85 }}>Email: {m.email}</span>}
        <span style={{ opacity: 0.7 }}>Expira: {new Date(m.expiraAt).toLocaleDateString("es-MX")}</span>
      </div>
      <iframe
        title={m.titulo || "Propuesta"}
        srcDoc={m.html}
        sandbox=""
        style={{ flex: 1, width: "100%", border: "0", display: "block" }}
      />
    </div>
  );
}
