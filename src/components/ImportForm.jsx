"use client";
import { useState } from "react";

const SAMPLE_CSV = `nom,type,latitude,longitude,region,capacite
Collège Moderne de Divo,college,5.8394,-5.3572,Lôh-Djiboua,800
Hôpital Général d'Aboisso,hopital,5.4667,-3.2000,Sud-Comoé,120`;

const SAMPLE_GEOJSON = `{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature",
      "properties": { "nom": "Marché de Treichville", "type": "marche", "region": "Abidjan" },
      "geometry": { "type": "Point", "coordinates": [-4.0090, 5.2930] } }
  ]
}`;

export default function ImportForm({ themes }) {
  const [form, setForm] = useState({
    datasetName: "",
    themeSlug: themes[0]?.slug || "",
    sourceName: "",
    format: "auto",
    verified: false,
    content: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError(""); setResult(null); setBusy(true);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, format: form.format === "auto" ? "" : form.format }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.error || "Import échoué."); return; }
    setResult(d);
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-300">Nom du jeu de données *</label>
          <input className="input mt-1" value={form.datasetName}
            onChange={(e) => set("datasetName", e.target.value)} placeholder="Ex: Collèges publics 2024" required />
        </div>
        <div>
          <label className="text-sm text-slate-300">Source *</label>
          <input className="input mt-1" value={form.sourceName}
            onChange={(e) => set("sourceName", e.target.value)} placeholder="Ex: Ministère de l'Éducation" required />
        </div>
        <div>
          <label className="text-sm text-slate-300">Thématique *</label>
          <select className="input mt-1" value={form.themeSlug} onChange={(e) => set("themeSlug", e.target.value)}>
            {themes.map((t) => <option key={t.slug} value={t.slug}>{t.icon} {t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-300">Format</label>
          <select className="input mt-1" value={form.format} onChange={(e) => set("format", e.target.value)}>
            <option value="auto">Détection automatique</option>
            <option value="geojson">GeoJSON / JSON</option>
            <option value="csv">CSV</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-300">Contenu (coller les données) *</label>
          <div className="flex gap-2 text-xs">
            <button type="button" className="text-ci-orange hover:underline"
              onClick={() => { set("content", SAMPLE_CSV); set("format", "csv"); }}>Exemple CSV</button>
            <button type="button" className="text-ci-orange hover:underline"
              onClick={() => { set("content", SAMPLE_GEOJSON); set("format", "geojson"); }}>Exemple GeoJSON</button>
          </div>
        </div>
        <textarea className="input mt-1 font-mono text-xs h-56" value={form.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder="Collez ici un CSV (avec colonnes latitude/longitude) ou un GeoJSON FeatureCollection…" required />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} />
        Marquer comme vérifié
      </label>

      {error && <div className="text-sm text-red-400">{error}</div>}
      {result && (
        <div className="text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
          ✓ Import réussi : {result.imported} entités intégrées
          {result.rejected ? `, ${result.rejected} rejetées (doublons/vides)` : ""}
          {result.joined ? `, ${result.joined} reliées à une limite administrative` : ""}.{" "}
          <a href={`/donnees`} className="underline">Voir les données</a>
        </div>
      )}

      <button disabled={busy} className="btn-primary">{busy ? "Import…" : "Importer les données"}</button>
    </form>
  );
}
