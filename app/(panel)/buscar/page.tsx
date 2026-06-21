import { buscarProspectos } from "@/lib/data/busqueda";
import { BuscarPanel } from "@/components/panel/BuscarPanel";

export default async function BuscarPage() {
  const inicial = await buscarProspectos(
    "México — todas las ciudades",
    "Medicina estética",
  );

  return (
    <section className="view">
      <h2 className="vh">Buscar clientes</h2>
      <div className="vsub">
        La puerta de entrada del pipeline. Busca en Google Places y agrega los
        buenos con un clic.
      </div>
      <BuscarPanel inicial={inicial} />
    </section>
  );
}
