import { buscarProspectos } from "@/lib/data/busqueda";
import { BuscarPanel } from "@/components/panel/BuscarPanel";
import { modoIAActivo } from "@/lib/ai";

export default async function BuscarPage() {
  // En modo real, NO lanzamos la búsqueda IA en cada carga (es lenta y cuesta):
  // arrancamos vacío y el operador pulsa Buscar. En demo, mostramos el seed.
  const inicial =
    modoIAActivo() === "anthropic" && process.env.AI_MOCK !== "1"
      ? []
      : await buscarProspectos("México — todas las ciudades", "Medicina estética");

  return (
    <section className="view">
      <h2 className="vh">Buscar clientes</h2>
      <div className="vsub">
        La puerta de entrada del pipeline. Escribe ciudad y rubro, busca con
        Claude y agrega los buenos con un clic.
      </div>
      <BuscarPanel inicial={inicial} />
    </section>
  );
}
