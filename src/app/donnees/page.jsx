import DataExplorer from "@/components/DataExplorer";
export const metadata = { title: "Explorer les données — DataCity" };
export default function Page() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Explorer les données</h1>
      <p className="text-slate-400 mb-6">
        Filtrez, recherchez et visualisez toutes les données de référence en table ou sur la carte.
      </p>
      <DataExplorer showThemeFilter />
    </div>
  );
}
