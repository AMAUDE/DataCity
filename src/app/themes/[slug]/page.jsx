import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import DataExplorer from "@/components/DataExplorer";
import DownloadButtons from "@/components/DownloadButtons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const theme = await prisma.theme.findUnique({ where: { slug: params.slug } });
  return { title: theme ? `${theme.name} — DataCity` : "Thématique — DataCity" };
}

export default async function ThemePage({ params }) {
  const theme = await prisma.theme.findUnique({
    where: { slug: params.slug },
    include: {
      datasets: {
        include: { source: true, _count: { select: { features: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!theme) notFound();

  const totalFeatures = theme.datasets.reduce((s, d) => s + d._count.features, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <Link href="/themes" className="text-sm text-slate-400 hover:text-white">← Toutes les thématiques</Link>
      <div className="flex items-start gap-4 mt-3 mb-6">
        <span className="text-4xl">{theme.icon}</span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{theme.name}</h1>
          <p className="text-slate-400 mt-1">{theme.description}</p>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="badge bg-white/5 text-slate-300">{theme.datasets.length} jeu(x) de données</span>
            <span className="badge bg-white/5 text-slate-300">{totalFeatures} entités</span>
            <span className="badge bg-white/5 text-slate-300 capitalize">{theme.category}</span>
          </div>
        </div>
      </div>

      {/* Jeux de données + téléchargement */}
      <h2 className="text-lg font-semibold mb-3">Jeux de données</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {theme.datasets.map((d) => (
          <div key={d.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white">{d.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{d.description}</p>
              </div>
              {d.verified
                ? <span className="badge bg-green-500/15 text-green-400 shrink-0">✓ vérifié</span>
                : <span className="badge bg-yellow-500/15 text-yellow-400 shrink-0">à vérifier</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Source : <span className="text-slate-300">{d.source.name}</span></span>
              <span>·</span>
              <span>{d._count.features} entités</span>
              <span>·</span>
              <span>{d.format.toUpperCase()}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="text-xs text-slate-400 mb-2">Télécharger (identification requise) :</div>
              <DownloadButtons slug={d.slug} compact />
            </div>
          </div>
        ))}
      </div>

      {/* Explorateur filtré sur la thématique */}
      <h2 className="text-lg font-semibold mb-3">Visualiser les données</h2>
      <DataExplorer theme={theme.slug} showThemeFilter={false} />
    </div>
  );
}
