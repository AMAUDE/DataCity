import DataExplorer from "@/components/DataExplorer";
export const metadata = { title: "Cartographie — DataCity" };
export default function Page() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Cartographie</h1>
      <p className="text-slate-400 mb-6">
        Visualisez les infrastructures et les limites administratives de la Côte d'Ivoire.
        Basculez en vue « Carte » ci-dessous.
      </p>
      <DataExplorer showThemeFilter />
    </div>
  );
}
