// Mapping des couches du Géoportail ANSTAT vers les thématiques de la plateforme.
// + nettoyage des libellés (la plateforme corrige la donnée).

// Thématiques ajoutées pour couvrir toutes les couches.
export const ANSTAT_THEMES = [
  { slug: "eau", name: "Eau & assainissement", category: "infrastructure", icon: "💧", color: "#06b6d4", description: "Châteaux d'eau, bornes fontaines, stations et réseaux d'eau." },
  { slug: "transport", name: "Transport & mobilité", category: "infrastructure", icon: "🚉", color: "#6366f1", description: "Gares, débarcadères, stations-service et directions des transports." },
  { slug: "culte", name: "Lieux de culte", category: "infrastructure", icon: "⛪", color: "#7c3aed", description: "Églises, mosquées et autres lieux de culte." },
  { slug: "environnement", name: "Environnement & forêts", category: "infrastructure", icon: "🌳", color: "#15803d", description: "Aires protégées, cantonnements et postes des eaux et forêts." },
  { slug: "social", name: "Social & Culture", category: "infrastructure", icon: "🤝", color: "#db2777", description: "Centres sociaux, culture, ONG, orphelinats et réinsertion." },
  { slug: "commerce", name: "Commerce & Économie", category: "infrastructure", icon: "🛒", color: "#d97706", description: "Marchés, abattoirs, sociétés et activités économiques." },
];

const norm = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Règles ordonnées : première correspondance gagne (mots-clés sur le nom de couche).
const RULES = [
  ["justice", ["justice", "avocat", "hussier", "cour supp", "coup d'appe", "juridiction", "maison d'arret", "reinsertion", "contitutionnel", "constitutionnel", "ministere justice"]],
  ["defense", ["etat major", "battallion", "bataillon", "legion", "escadron", "compagnie", "unite de commandemant"]],
  ["securite", ["securite", "securité", "commissariat", "police", "gendarmerie", "pompier", "brigade", "prefcture police"]],
  ["sante", ["chr", "chu", "csu", "sante", "hopital", "pharmac", "dispensaire"]],
  ["ecoles", ["ecole", "ecle", "dren", "iep", "iepp", "lycee", "secondaire", "ets superieur", "profess"]],
  ["finance", ["bank", "banque", "finance", "point money", "tresor", "impot", "douane"]],
  ["eau", ["chateau eau", "borne fontaine", "station eau", "sodeci", "forage"]],
  ["transport", ["gare", "debarcadere", "transport", "station service", "raffinerie"]],
  ["culte", ["eglise", "mosquee", "mosque", "temple", "paroisse"]],
  ["environnement", ["eaux et foret", "eaux foret", "air protege", "foret", "corridor", "cantonnement"]],
  ["social", ["social", "socia", "culturel", "cuturel", "culture", "bibliotheque", "musee", "ong", "orphelinat", "poupou", "sos village", "centre cuturel"]],
  ["commerce", ["marche", "abattoir", "societe", "commerce"]],
  ["administration", ["district", "sous-prefecture", "prefecture", "mairie", "conseil", "direction", "dir ", "ministere", "minstere", "ambassade", "consulat", "autre direction", "admin"]],
];

export function anstatThemeFor(fileName) {
  const n = norm(fileName.replace(/\.json$/i, ""));
  for (const [theme, kws] of RULES) {
    if (kws.some((k) => n.includes(k))) return theme;
  }
  return "administration";
}

// Corrections de libellés (typos de la source) pour un type lisible.
const LABEL_FIX = {
  "coup d'appe": "cour d'appel",
  "cours suppreme": "cour suprême",
  "conseil contitutionnel": "conseil constitutionnel",
  "prefcture police": "préfecture de police",
  "ecle profess": "école professionnelle",
  "centre cuturel": "centre culturel",
  "marche betail": "marché à bétail",
  "battallion": "bataillon",
  "poupounière": "pouponnière",
  "minstere commerce": "ministère du commerce",
  "minstere securite": "ministère de la sécurité",
  "iep2": "iep",
  "csu": "centre de santé urbain",
  "chr": "centre hospitalier régional",
  "chu": "centre hospitalier universitaire",
  "dren": "direction régionale éducation",
};

export function anstatLabel(fileName) {
  const base = fileName.replace(/\.json$/i, "").trim();
  const key = norm(base);
  if (LABEL_FIX[key]) return LABEL_FIX[key];
  return base.toLowerCase();
}
