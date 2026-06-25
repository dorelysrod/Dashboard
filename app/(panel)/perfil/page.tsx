import { crearClienteServidor } from "@/lib/supabase/server";
import { CambiarContrasenaForm } from "@/components/panel/CambiarContrasenaForm";

/** Perfil del operador: email de la cuenta + cambio de contraseña. */
export default async function PerfilPage() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "—";

  return (
    <section className="view">
      <h2 className="vh">Perfil</h2>
      <div className="vsub">Tu cuenta de operador y seguridad de acceso.</div>

      <div className="field" style={{ maxWidth: 420 }}>
        <div className="l">Email</div>
        <div className="vv">{email}</div>
      </div>

      <h3 className="vh" style={{ fontSize: "1rem", marginTop: 18 }}>
        Cambiar contraseña
      </h3>
      <CambiarContrasenaForm />
    </section>
  );
}
