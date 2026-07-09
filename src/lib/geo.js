// Utilitaires d'export / conversion multi-formats
export function featuresToGeoJSON(features) {
  return {
    type: "FeatureCollection",
    features: features.map((f) => {
      let geometry = null;
      if (f.geometry) {
        try {
          geometry = JSON.parse(f.geometry);
        } catch {
          geometry = null;
        }
      }
      if (!geometry && f.latitude != null && f.longitude != null) {
        geometry = { type: "Point", coordinates: [f.longitude, f.latitude] };
      }
      let props = {};
      if (f.properties) {
        try {
          props = JSON.parse(f.properties);
        } catch {
          props = {};
        }
      }
      return {
        type: "Feature",
        geometry,
        properties: {
          id: f.id,
          nom: f.name,
          type: f.featureType,
          district_region: f.admin1 || null,
          departement_commune: f.admin2 || null,
          verifie: f.verified,
          ...props,
        },
      };
    }),
  };
}

export function featuresToCSV(features) {
  const rows = features.map((f) => {
    let props = {};
    if (f.properties) {
      try {
        props = JSON.parse(f.properties);
      } catch {
        props = {};
      }
    }
    return {
      id: f.id,
      nom: f.name,
      type: f.featureType,
      latitude: f.latitude ?? "",
      longitude: f.longitude ?? "",
      district_region: f.admin1 ?? "",
      departement_commune: f.admin2 ?? "",
      verifie: f.verified ? "oui" : "non",
      ...props,
    };
  });
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}
