import { obtenerLeads } from "@/lib/data/leads";
import { LeadRow } from "@/components/panel/LeadRow";

export default async function PipelinePage() {
  const leads = await obtenerLeads();

  return (
    <section className="view">
      <h2 className="vh">Pipeline</h2>
      <div className="vsub">
        Toca un lead para ver inspección, cotización, correo y seguimiento.
      </div>
      <div className="panel">
        {leads.map((l) => (
          <LeadRow key={l.id} lead={l} mostrarEtapa />
        ))}
      </div>
    </section>
  );
}
