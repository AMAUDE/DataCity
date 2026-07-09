import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sources — DataCity" };

function Rel({ n }) {
  return (
    <span className="inline-flex gap-0.5" title={`Fiabilité ${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? "text-ci-orange" : "text-slate-600"}>★</span>
      ))}
    </span>
  );
}

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({
    include: { _count: { select: { datasets: true } } },
    orderBy: { reliability: "desc" },
  });
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Sources de données</h1>
      <p className="text-slate-400 mb-8">
        La plateforme est multi-sources : chaque donnée est rattachée à son fournisseur et à une note de fiabilité.
      </p>
      <div className="space-y-3">
        {sources.map((s) => (
          <div key={s.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-white">{s.name}</h3>
                <Rel n={s.reliability} />
              </div>
              {s.organization && <div className="text-xs text-slate-500 mt-0.5">{s.organization}</div>}
              {s.description && <p className="text-sm text-slate-400 mt-1">{s.description}</p>}
            </div>
            <div className="text-right shrink-0">
              <div className="badge bg-white/5 text-slate-300">{s._count.datasets} jeu(x)</div>
              {s.license && <div className="text-xs text-slate-500 mt-1">{s.license}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
