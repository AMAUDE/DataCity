import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getData() {
  const [themes, sources, datasets, features, verified] = await Promise.all([
    prisma.theme.count(),
    prisma.source.count(),
    prisma.dataset.count(),
    prisma.feature.count(),
    prisma.feature.count({ where: { verified: true } }),
  ]);
  const themeList = await prisma.theme.findMany({
    include: { _count: { select: { datasets: true } } },
    orderBy: { category: "asc" },
  });
  return { stats: { themes, sources, datasets, features, verified }, themeList };
}

function Stat({ value, label }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
      <div className="text-xs sm:text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}

export default async function Home() {
  const { stats, themeList } = await getData();
  const pct = stats.features ? Math.round((stats.verified / stats.features) * 100) : 0;
  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hero */}
      <section className="py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 badge bg-white/5 text-slate-300 mb-4">
          🇨🇮 Plateforme dédiée à la Côte d'Ivoire
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight max-w-3xl">
          La <span className="text-ci-orange">donnée géographique</span> vraie, vérifiée et
          accessible à tous
        </h1>
        <p className="mt-4 text-slate-300 max-w-2xl text-base sm:text-lg">
          DataCity centralise, corrige et recoupe les données issues de multiples sources et
          formats pour offrir une base de référence fiable : infrastructures, limites
          administratives, tableaux et cartographie — le tout téléchargeable.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/themes" className="btn-primary">Explorer les thématiques</Link>
          <Link href="/carte" className="btn-ghost">Voir la cartographie</Link>
          <Link href="/donnees" className="btn-ghost">Parcourir les données</Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Stat value={stats.themes} label="Thématiques" />
        <Stat value={stats.sources} label="Sources" />
        <Stat value={stats.datasets} label="Jeux de données" />
        <Stat value={stats.features} label="Entités géographiques" />
        <Stat value={`${pct}%`} label="Données vérifiées" />
      </section>

      {/* Comment ça marche */}
      <section className="mt-14 grid md:grid-cols-3 gap-4">
        {[
          { t: "1 · Multi-sources", d: "Institutions publiques, organismes ouverts et contributions communautaires — toute source fournissant de la donnée est prise en compte." },
          { t: "2 · Correction & jointure", d: "Les données de tout format (GeoJSON, CSV, JSON) sont nettoyées, dédoublonnées et reliées aux limites administratives." },
          { t: "3 · Vérifiée & téléchargeable", d: "Chaque donnée porte sa source et son statut de vérification, et se télécharge après identification." },
        ].map((c) => (
          <div key={c.t} className="card p-5">
            <h3 className="font-semibold text-white">{c.t}</h3>
            <p className="text-sm text-slate-400 mt-2">{c.d}</p>
          </div>
        ))}
      </section>

      {/* Thématiques */}
      <section className="mt-14 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Thématiques disponibles</h2>
          <Link href="/themes" className="text-sm text-ci-orange hover:underline">Tout voir →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {themeList.map((t) => (
            <Link key={t.slug} href={`/themes/${t.slug}`} className="card p-4 hover:border-ci-orange/50 transition">
              <div className="text-2xl">{t.icon}</div>
              <div className="mt-2 font-medium text-sm text-white">{t.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {t._count.datasets} jeu{t._count.datasets > 1 ? "x" : ""} · {t.category}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
