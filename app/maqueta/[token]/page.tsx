import { notFound } from "next/navigation";
import { leerMaquetaPorToken } from "@/lib/maquetas/store";
import { ProteccionCaptura } from "@/components/maqueta/ProteccionCaptura";

/**
 * Vista PÚBLICA de una maqueta, para enseñarla al cliente. Gating server-side:
 * el acceso es por token de capacidad opaco + expiración (no hay URL por id, no
 * requiere login). Si el token no existe o expiró → 404, sin filtrar nada.
 *
 * El HTML generado se renderiza en un iframe SANDBOXED (sin scripts) para
 * aislarlo del panel, con la capa de disuasión anti-captura encima.
 */
export const dynamic = "force-dynamic";

export default async function MaquetaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const maqueta = await leerMaquetaPorToken(token);
  if (!maqueta) notFound();

  return (
    <ProteccionCaptura clienteNombre={maqueta.titulo || "Cliente"}>
      <iframe
        title={maqueta.titulo || "Maqueta"}
        srcDoc={maqueta.html}
        sandbox=""
        style={{ width: "100%", height: "100dvh", border: "0", display: "block" }}
      />
    </ProteccionCaptura>
  );
}
