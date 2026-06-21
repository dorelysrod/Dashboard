import { Header } from "@/components/panel/Header";
import { Ribbon } from "@/components/panel/Ribbon";
import { NavTabs } from "@/components/panel/NavTabs";
import { LeadDrawerProvider } from "@/components/panel/drawer-context";
import { LeadDrawer } from "@/components/panel/LeadDrawer";

/** Shell del panel: ribbon + header + nav + contenido + drawer global. */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LeadDrawerProvider>
      <Ribbon />
      <Header />
      <NavTabs />
      <div className="wrap">{children}</div>
      <LeadDrawer />
    </LeadDrawerProvider>
  );
}
