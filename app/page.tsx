import { redirect } from "next/navigation";

/** El panel arranca en Resumen. */
export default function Home() {
  redirect("/resumen");
}
