"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DownloadButtons({ slug, compact }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function download(format) {
    setMsg("");
    setBusy(format);
    try {
      const res = await fetch(`/api/download?dataset=${encodeURIComponent(slug)}&format=${format}`);
      if (res.status === 401) {
        setMsg("Connexion requise pour télécharger.");
        setBusy("");
        setTimeout(() => router.push("/login"), 900);
        return;
      }
      if (!res.ok) {
        setMsg("Téléchargement impossible.");
        setBusy("");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.${format === "csv" ? "csv" : format === "json" ? "json" : "geojson"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy("");
    }
  }

  const formats = [
    ["geojson", "GeoJSON"],
    ["csv", "CSV"],
    ["json", "JSON"],
  ];

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-2"}>
      <div className="flex flex-wrap gap-2">
        {formats.map(([f, label]) => (
          <button key={f} onClick={() => download(f)} disabled={busy === f}
            className="btn-ghost text-xs">
            {busy === f ? "…" : `⬇ ${label}`}
          </button>
        ))}
      </div>
      {msg && <span className="text-xs text-ci-orange">{msg}</span>}
    </div>
  );
}
