import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import ImportForm from "@/components/ImportForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Importer des données — DataCity" };

export default async function ImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Accès restreint</h1>
        <p className="text-slate-400 mt-2">
          L'import de données est réservé aux administrateurs. Le premier compte créé est administrateur.
        </p>
      </div>
    );
  }
  const themes = await prisma.theme.findMany({
    select: { slug: true, name: true, icon: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Importer des données</h1>
      <p className="text-slate-400 mb-6">
        Intégrez des données de n'importe quelle source et format (GeoJSON, CSV, JSON).
        Elles seront nettoyées, dédoublonnées et reliées aux limites administratives connues.
      </p>
      <ImportForm themes={themes} />
    </div>
  );
}
