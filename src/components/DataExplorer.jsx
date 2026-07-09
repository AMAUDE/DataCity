"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

// Explorateur : filtres + table + carte. Utilisé pour l'exploration globale
// et par thématique (prop `theme` verrouille la thématique).
export default function DataExplorer({ theme, showThemeFilter = true }) {
  const [themes, setThemes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table"); // table | carte
  const [selTheme, setSelTheme] = useState(theme || "");
  const [q, setQ] = useState("");
  const [admin1, setAdmin1] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    fetch("/api/themes-list")
      .then((r) => r.json())
      .then(setThemes)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (theme || selTheme) params.set("theme", theme || selTheme);
    params.set("geometry", "1");
    fetch(`/api/features?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setFeatures(Array.isArray(data) ? data : []);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [theme, selTheme]);

  const admins = useMemo(() => {
    const s = new Set();
    features.forEach((f) => f.admin1 && s.add(f.admin1));
    return Array.from(s).sort();
  }, [features]);

  const filtered = useMemo(() => {
    return features.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (admin1 && f.admin1 !== admin1) return false;
      if (onlyVerified && !f.verified) return false;
      return true;
    });
  }, [features, q, admin1, onlyVerified]);

  const points = filtered.filter((f) => f.latitude != null && f.longitude != null)
    .map((f) => ({ ...f, color: f.theme?.color, subtitle: `${f.featureType} · ${f.admin1 || "—"}` }));
  const polygons = filtered.filter((f) => f.geometry && f.geometry.type !== "Point")
    .map((f) => ({ name: f.name, geometry: f.geometry, color: f.theme?.color, subtitle: f.featureType }));

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      {/* Contrôles */}
      <div className="card p-4 mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {showThemeFilter && (
            <select className="input" value={selTheme} onChange={(e) => setSelTheme(e.target.value)}>
              <option value="">Toutes les thématiques</option>
              {themes.map((t) => (
                <option key={t.slug} value={t.slug}>{t.icon} {t.name}</option>
              ))}
            </select>
          )}
          <input className="input" placeholder="Rechercher un nom…" value={q}
            onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={admin1} onChange={(e) => setAdmin1(e.target.value)}>
            <option value="">Tous districts/régions</option>
            {admins.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} />
            Vérifiées uniquement
          </label>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-slate-400">
            {loading ? "Chargement…" : `${filtered.length} entité(s)`}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setView("table")}
              className={`btn text-xs ${view === "table" ? "bg-ci-orange text-white" : "border border-white/10 text-slate-300"}`}>
              Table
            </button>
            <button onClick={() => setView("carte")}
              className={`btn text-xs ${view === "carte" ? "bg-ci-orange text-white" : "border border-white/10 text-slate-300"}`}>
              Carte
            </button>
          </div>
        </div>
      </div>

      {view === "carte" ? (
        <div className="card overflow-hidden" style={{ height: "70vh" }}>
          <MapView points={points} polygons={polygons} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nom</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">District/Région</th>
                  <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Coordonnées</th>
                  <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Thématique</th>
                  <th className="text-left px-3 py-2 font-medium">État</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((f) => (
                  <tr key={f.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-3 py-2 text-white">{f.name}</td>
                    <td className="px-3 py-2 text-slate-400">{f.featureType}</td>
                    <td className="px-3 py-2 text-slate-400 hidden sm:table-cell">{f.admin1 || "—"}</td>
                    <td className="px-3 py-2 text-slate-500 hidden md:table-cell font-mono text-xs">
                      {f.latitude != null ? `${f.latitude.toFixed(3)}, ${f.longitude.toFixed(3)}` : "polygone"}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <span className="badge" style={{ background: (f.theme?.color || "#888") + "22", color: f.theme?.color }}>
                        {f.theme?.name}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {f.verified
                        ? <span className="badge bg-green-500/15 text-green-400">vérifié</span>
                        : <span className="badge bg-yellow-500/15 text-yellow-400">à vérifier</span>}
                    </td>
                  </tr>
                ))}
                {!loading && shown.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Aucune donnée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 text-sm">
              <button className="btn-ghost text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Précédent</button>
              <span className="text-slate-400">Page {page} / {pages}</span>
              <button className="btn-ghost text-xs" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
