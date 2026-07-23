import type { Metadata } from "next";
import { cookies } from "next/headers";
import { leerMaquetaPorNumero, registrarVista } from "@/lib/maquetas/store";
import { cookieAcceso, firmarAcceso } from "@/lib/maquetas/portal";
import { decidirAccesoPortal } from "@/lib/maquetas/acceso";
import { esOperadoraLogueada } from "@/lib/supabase/operadora";
import { ProteccionCaptura } from "@/components/maqueta/ProteccionCaptura";
import { PortalGate } from "@/components/maqueta/PortalGate";

/** Un enlace filtrado nunca debe acabar indexado en buscadores. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Portal público de propuestas: /p/[numero]. El número es un identificador corto
 * (no secreto); el acceso se abre con EMAIL + CÓDIGO (candado). Tras verificar,
 * una cookie firmada de vida corta deja ver la propuesta; al expirar, re-verifica.
 * Pensado para vivir en un dominio SEPARADO del panel (ver middleware).
 */
export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero: raw } = await params;
  const numero = Number(raw);
  if (!Number.isInteger(numero) || numero <= 0) return <NoDisponible />;

  const m = await leerMaquetaPorNumero(numero);
  if (!m || !m.codigo) return <NoDisponible />;

  // ¿Cookie de acceso válida (atada al código actual)?
  const store = await cookies();
  const cookie = store.get(cookieAcceso(numero))?.value;
  const decision = decidirAccesoPortal({
    esOperadora: await esOperadoraLogueada(),
    cookieValida: cookie === firmarAcceso(numero, m.codigo),
  });

  if (!decision.autorizado) {
    return <PortalGate numero={numero} titulo={m.titulo || "Propuesta"} pideEmail={Boolean(m.email)} />;
  }

  // Vista AUTORIZADA = el prospecto está viendo su propuesta → señal de intención.
  // Los bots de preview de enlaces caen en el gate (sin cookie), no se cuentan.
  // La operadora logueada tampoco cuenta: la vista solo es señal del PROSPECTO.
  // No bloquea el render si el registro falla.
  if (decision.contarVista) {
    try {
      await registrarVista(numero);
    } catch {
      /* tracking best-effort */
    }
  }

  return (
    <ProteccionCaptura clienteNombre={m.titulo || "Cliente"}>
      {decision.modoOperadora && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            background: "#23223A",
            color: "#fff",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 12,
            padding: "6px 14px",
            borderRadius: 999,
            opacity: 0.92,
            pointerEvents: "none",
          }}
        >
          Modo dueña — esta apertura no cuenta como vista del cliente
        </div>
      )}
      <iframe
        title={m.titulo || "Propuesta"}
        srcDoc={m.html}
        sandbox=""
        style={{ width: "100%", height: "100dvh", border: "0", display: "block" }}
      />
    </ProteccionCaptura>
  );
}

function NoDisponible() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", fontFamily: "system-ui", color: "#23223A", background: "#F6F5FB", padding: 24, textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Propuesta no disponible</h1>
        <p style={{ color: "#5B554C" }}>El enlace no existe o expiró. Pide uno nuevo a tu contacto.</p>
      </div>
    </main>
  );
}
