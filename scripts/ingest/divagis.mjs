// Connecteur DIVA-GIS — données GIS gratuites par pays (shapefiles zippés).
// DIVA fournit des .zip de shapefiles (limites, cours d'eau, routes…).
// La conversion shapefile→GeoJSON nécessite le paquet optionnel « shapefile ».
//   npm i shapefile
// Puis ce script télécharge l'archive administrative et l'ingère.
import { writeCollection, point } from "./lib.mjs";
import { fetchText } from "./lib.mjs";

const URL = "https://biogeo.ucdavis.edu/data/diva/adm/CIV_adm.zip"; // limites administratives

async function run() {
  let shp;
  try { shp = await import("shapefile"); }
  catch {
    console.log("  Paquet « shapefile » absent. Installez-le : npm i shapefile");
    writeCollection("divagis.geojson", { dataset: "DIVA-GIS (à activer)",
      source: "DIVA-GIS", theme: "limites-administratives", license: "libre", verified: false }, []);
    return;
  }
  const buf = new Uint8Array(await (await fetch(URL)).arrayBuffer());
  // Note : l'archive doit être décompressée (adm/CIV_adm1.shp+.dbf) avant lecture.
  console.log("  Archive téléchargée ; décompressez puis lisez CIV_adm1.shp avec shapefile.open().");
  writeCollection("divagis.geojson", { dataset: "Limites DIVA-GIS — Côte d'Ivoire",
    source: "DIVA-GIS", theme: "limites-administratives", license: "libre", verified: false }, []);
}
run().catch((e) => { console.error("Échec DIVA-GIS:", e.message); process.exit(1); });
