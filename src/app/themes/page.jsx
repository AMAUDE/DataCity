import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thématiques — DataCity" };

export default async function ThemesPage() {
  const themes = await prisma.theme.findMany({
    include: { _count: { select: { datasets: true } }, datasets: { include: { _count: { select: { features: true } } } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const groups = { infrastructure: [], limites: [], indicateurs: [] };
  themes.forEach((t) => groups[t.category]?.push(t));

  const Section = ({ title, items }) => (
    <div className="mb-10">
      <h2 className="text-lg font-semibold mb-3 capitalize">{title}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => {
          const feats = t.datasets.reduce((s, d) => s + d._count.features, 0);
          return (
            <Link key={t.slug} href={`/themes/${t.slug}`}
              className="card p-5 hover:border-ci-orange/50 transition flex flex-col">
              <div className="flex items-start justify-between">
                <span className="text-3xl">{t.icon}</span>
                <span className="badge bg-white/5 text-slate-400">{feats} entités</span>
              </div>
              <h3 className="mt-3 font-semibold text-white">{t.name}</h3>
              <p className="text-sm text-slate-400 mt-1 flex-1">{t.description}</p>
              <div className="mt-3 text-xs text-ci-orange">{t._count.datasets} jeu(x) de données →</div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Thématiques</h1>
      <p className="text-slate-400 mb-8">Les données organisées par domaine, pour la Côte d'Ivoire.</p>
      <Section title="Infrastructures" items={groups.infrastructure} />
      <Section title="Limites administratives" items={groups.limites} />
      {groups.indicateurs.length > 0 && (
        <Section title="Population & Économie" items={groups.indicateurs} />
      )}
    </div>
  );
}
