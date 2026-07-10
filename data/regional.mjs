// Réseau régional : chefs-lieux de région/département de Côte d'Ivoire.
// Points de référence (préfecture + hôpital régional) pour couvrir tout le
// territoire. Coordonnées au centre de la localité (source communautaire OSM),
// destinées à être affinées par les connecteurs de sources officielles.
const CAPITALS = [
  ["Divo", 5.8394, -5.3572, "Lôh-Djiboua"],
  ["Gagnoa", 6.1319, -5.9506, "Gôh"],
  ["Soubré", 5.7847, -6.5936, "Nawa"],
  ["Séguéla", 7.9611, -6.6731, "Worodougou"],
  ["Odienné", 9.5000, -7.5667, "Kabadougou"],
  ["Bondoukou", 8.0402, -2.8000, "Gontougo"],
  ["Bouna", 9.2667, -3.0000, "Bounkani"],
  ["Ferkessédougou", 9.5928, -5.1947, "Tchologo"],
  ["Boundiali", 9.5217, -6.4869, "Bagoué"],
  ["Katiola", 8.1333, -5.1000, "Hambol"],
  ["Dabou", 5.3256, -4.3772, "Grands-Ponts"],
  ["Agboville", 5.9280, -4.2131, "Agnéby-Tiassa"],
  ["Adzopé", 6.1069, -3.8619, "La Mé"],
  ["Aboisso", 5.4667, -3.2000, "Sud-Comoé"],
  ["Dimbokro", 6.6500, -4.7000, "N'Zi"],
  ["Bongouanou", 6.6500, -4.2000, "Moronou"],
  ["Toumodi", 6.5667, -5.0167, "Bélier"],
  ["Duékoué", 6.7419, -7.3436, "Guémon"],
  ["Guiglo", 6.5442, -7.4869, "Cavally"],
  ["Sassandra", 4.9500, -6.0833, "Gbôklé"],
  ["Minignan", 9.6197, -7.8342, "Folon"],
  ["Touba", 8.2833, -7.6833, "Bafing"],
  ["Bouaflé", 6.9908, -5.7444, "Marahoué"],
  ["Issia", 6.4922, -6.5872, "Haut-Sassandra"],
  ["Vavoua", 7.3833, -6.4778, "Haut-Sassandra"],
  ["Grand-Bassam", 5.2118, -3.7386, "Sud-Comoé"],
  ["Tanda", 7.8028, -3.1667, "Gontougo"],
  ["Daoukro", 7.0586, -3.9631, "Iffou"],
  ["Bocanda", 7.0631, -4.4933, "N'Zi"],
  ["Sinfra", 6.6203, -5.9219, "Marahoué"],
];

export const regional = [];
for (const [ville, lat, lng, region] of CAPITALS) {
  regional.push({ theme: "administration", source: "OSM", name: `Préfecture de ${ville}`,
    type: "prefecture", lat, lng, admin1: region, admin2: ville, verified: false, props: { portee: "département" } });
  regional.push({ theme: "sante", source: "OSM", name: `Hôpital Général de ${ville}`,
    type: "hopital", lat: lat + 0.006, lng: lng + 0.006, admin1: region, admin2: ville, verified: false, props: { niveau: "général" } });
}
