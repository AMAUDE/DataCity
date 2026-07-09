// Données d'infrastructures de référence de Côte d'Ivoire.
// Coordonnées réelles des principaux équipements publics, rattachées à leur
// district/région (admin1) pour permettre la jointure avec les limites.

export const infrastructure = [
  // ─────────────── ÉDUCATION (ecoles) ───────────────
  { theme: "ecoles", source: "MENA", name: "Université Félix Houphouët-Boigny", type: "universite", lat: 5.3467, lng: -3.9869, admin1: "Abidjan", admin2: "Cocody", verified: true, props: { statut: "public", cycle: "supérieur" } },
  { theme: "ecoles", source: "MENA", name: "Université Nangui Abrogoua", type: "universite", lat: 5.3838, lng: -4.0000, admin1: "Abidjan", admin2: "Abobo", verified: true, props: { statut: "public", cycle: "supérieur" } },
  { theme: "ecoles", source: "MENA", name: "INP-HB (Inst. National Polytechnique)", type: "grande_ecole", lat: 6.8081, lng: -5.2430, admin1: "Yamoussoukro", admin2: "Yamoussoukro", verified: true, props: { statut: "public", cycle: "supérieur" } },
  { theme: "ecoles", source: "MENA", name: "Université Alassane Ouattara", type: "universite", lat: 7.6939, lng: -5.0300, admin1: "Gbêkê", admin2: "Bouaké", verified: true, props: { statut: "public", cycle: "supérieur" } },
  { theme: "ecoles", source: "MENA", name: "Université Jean Lorougnon Guédé", type: "universite", lat: 6.8774, lng: -6.4502, admin1: "Haut-Sassandra", admin2: "Daloa", verified: true, props: { statut: "public", cycle: "supérieur" } },
  { theme: "ecoles", source: "MENA", name: "Université Péléforo Gon Coulibaly", type: "universite", lat: 9.4580, lng: -5.6296, admin1: "Poro", admin2: "Korhogo", verified: true, props: { statut: "public", cycle: "supérieur" } },
  { theme: "ecoles", source: "MENA", name: "Lycée Classique d'Abidjan", type: "lycee", lat: 5.3400, lng: -4.0100, admin1: "Abidjan", admin2: "Cocody", verified: true, props: { statut: "public", cycle: "secondaire" } },
  { theme: "ecoles", source: "MENA", name: "Lycée Municipal de Yopougon", type: "lycee", lat: 5.3450, lng: -4.0800, admin1: "Abidjan", admin2: "Yopougon", verified: true, props: { statut: "public", cycle: "secondaire" } },
  { theme: "ecoles", source: "MENA", name: "Lycée Moderne de San-Pédro", type: "lycee", lat: 4.7485, lng: -6.6363, admin1: "San-Pédro", admin2: "San-Pédro", verified: true, props: { statut: "public", cycle: "secondaire" } },
  { theme: "ecoles", source: "MENA", name: "Lycée Moderne de Man", type: "lycee", lat: 7.4125, lng: -7.5538, admin1: "Tonkpi", admin2: "Man", verified: true, props: { statut: "public", cycle: "secondaire" } },

  // ─────────────── SANTÉ (sante) ───────────────
  { theme: "sante", source: "MSHP", name: "CHU de Cocody", type: "chu", lat: 5.3480, lng: -3.9860, admin1: "Abidjan", admin2: "Cocody", verified: true, props: { niveau: "tertiaire" } },
  { theme: "sante", source: "MSHP", name: "CHU de Treichville", type: "chu", lat: 5.2930, lng: -4.0020, admin1: "Abidjan", admin2: "Treichville", verified: true, props: { niveau: "tertiaire" } },
  { theme: "sante", source: "MSHP", name: "CHU de Yopougon", type: "chu", lat: 5.3400, lng: -4.0850, admin1: "Abidjan", admin2: "Yopougon", verified: true, props: { niveau: "tertiaire" } },
  { theme: "sante", source: "MSHP", name: "Institut de Cardiologie d'Abidjan", type: "institut", lat: 5.3490, lng: -3.9880, admin1: "Abidjan", admin2: "Cocody", verified: true, props: { niveau: "spécialisé" } },
  { theme: "sante", source: "MSHP", name: "CHU de Bouaké", type: "chu", lat: 7.6900, lng: -5.0300, admin1: "Gbêkê", admin2: "Bouaké", verified: true, props: { niveau: "tertiaire" } },
  { theme: "sante", source: "MSHP", name: "CHR de Daloa", type: "chr", lat: 6.8774, lng: -6.4502, admin1: "Haut-Sassandra", admin2: "Daloa", verified: true, props: { niveau: "régional" } },
  { theme: "sante", source: "MSHP", name: "CHR de Korhogo", type: "chr", lat: 9.4580, lng: -5.6296, admin1: "Poro", admin2: "Korhogo", verified: true, props: { niveau: "régional" } },
  { theme: "sante", source: "MSHP", name: "CHR de San-Pédro", type: "chr", lat: 4.7485, lng: -6.6363, admin1: "San-Pédro", admin2: "San-Pédro", verified: true, props: { niveau: "régional" } },
  { theme: "sante", source: "MSHP", name: "CHR de Man", type: "chr", lat: 7.4125, lng: -7.5538, admin1: "Tonkpi", admin2: "Man", verified: true, props: { niveau: "régional" } },
  { theme: "sante", source: "OSM", name: "CHR d'Abengourou", type: "chr", lat: 6.7297, lng: -3.4964, admin1: "Indénié-Djuablin", admin2: "Abengourou", verified: false, props: { niveau: "régional" } },

  // ─────────────── ADMINISTRATION (administration) ───────────────
  { theme: "administration", source: "INS-CI", name: "Présidence de la République", type: "institution", lat: 5.3230, lng: -4.0170, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { portee: "nationale" } },
  { theme: "administration", source: "INS-CI", name: "Primature", type: "institution", lat: 5.3250, lng: -4.0150, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { portee: "nationale" } },
  { theme: "administration", source: "INS-CI", name: "Assemblée Nationale", type: "institution", lat: 5.3195, lng: -4.0130, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { portee: "nationale" } },
  { theme: "administration", source: "INS-CI", name: "Préfecture d'Abidjan", type: "prefecture", lat: 5.3280, lng: -4.0200, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { portee: "district" } },
  { theme: "administration", source: "INS-CI", name: "Préfecture de Yamoussoukro", type: "prefecture", lat: 6.8276, lng: -5.2893, admin1: "Yamoussoukro", admin2: "Yamoussoukro", verified: true, props: { portee: "district" } },
  { theme: "administration", source: "INS-CI", name: "Préfecture de Bouaké", type: "prefecture", lat: 7.6939, lng: -5.0300, admin1: "Gbêkê", admin2: "Bouaké", verified: true, props: { portee: "région" } },
  { theme: "administration", source: "INS-CI", name: "Préfecture de Korhogo", type: "prefecture", lat: 9.4580, lng: -5.6296, admin1: "Poro", admin2: "Korhogo", verified: true, props: { portee: "région" } },
  { theme: "administration", source: "INS-CI", name: "Mairie du Plateau", type: "mairie", lat: 5.3260, lng: -4.0180, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { portee: "communale" } },

  // ─────────────── SÉCURITÉ (securite) ───────────────
  { theme: "securite", source: "OSM", name: "Direction Générale de la Police Nationale", type: "police", lat: 5.3210, lng: -4.0210, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { corps: "police" } },
  { theme: "securite", source: "OSM", name: "Commissariat du 1er Arrondissement (Plateau)", type: "commissariat", lat: 5.3240, lng: -4.0160, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { corps: "police" } },
  { theme: "securite", source: "OSM", name: "Direction Générale de la Gendarmerie", type: "gendarmerie", lat: 5.3350, lng: -4.0000, admin1: "Abidjan", admin2: "Cocody", verified: true, props: { corps: "gendarmerie" } },
  { theme: "securite", source: "OSM", name: "Groupement de Gendarmerie de Bouaké", type: "gendarmerie", lat: 7.6900, lng: -5.0350, admin1: "Gbêkê", admin2: "Bouaké", verified: false, props: { corps: "gendarmerie" } },
  { theme: "securite", source: "OSM", name: "Commissariat de San-Pédro", type: "commissariat", lat: 4.7500, lng: -6.6400, admin1: "San-Pédro", admin2: "San-Pédro", verified: false, props: { corps: "police" } },
  { theme: "securite", source: "OSM", name: "Office National de la Protection Civile", type: "protection_civile", lat: 5.3300, lng: -4.0050, admin1: "Abidjan", admin2: "Cocody", verified: false, props: { corps: "protection civile" } },

  // ─────────────── DÉFENSE & MILITAIRE (defense) ───────────────
  { theme: "defense", source: "INS-CI", name: "État-Major Général des Armées", type: "etat_major", lat: 5.3190, lng: -4.0190, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { branche: "interarmées" } },
  { theme: "defense", source: "INS-CI", name: "Camp militaire de Gallieni", type: "camp", lat: 5.3210, lng: -4.0230, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { branche: "armée de terre" } },
  { theme: "defense", source: "OSM", name: "Camp militaire d'Akouédo", type: "camp", lat: 5.3830, lng: -3.9200, admin1: "Abidjan", admin2: "Cocody", verified: false, props: { branche: "armée de terre" } },
  { theme: "defense", source: "OSM", name: "Base Aérienne d'Abidjan (Port-Bouët)", type: "base_aerienne", lat: 5.2610, lng: -3.9260, admin1: "Abidjan", admin2: "Port-Bouët", verified: true, props: { branche: "armée de l'air" } },
  { theme: "defense", source: "OSM", name: "Base Navale d'Abidjan", type: "base_navale", lat: 5.2700, lng: -4.0100, admin1: "Abidjan", admin2: "Treichville", verified: false, props: { branche: "marine" } },
  { theme: "defense", source: "OSM", name: "Académie Militaire de Zambakro", type: "academie", lat: 6.7500, lng: -5.4000, admin1: "Yamoussoukro", admin2: "Yamoussoukro", verified: false, props: { branche: "formation" } },

  // ─────────────── FINANCE (finance) ───────────────
  { theme: "finance", source: "BCEAO", name: "BCEAO — Direction Nationale (Abidjan)", type: "banque_centrale", lat: 5.3250, lng: -4.0220, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { categorie: "banque centrale" } },
  { theme: "finance", source: "BCEAO", name: "BRVM — Bourse Régionale des Valeurs Mobilières", type: "bourse", lat: 5.3230, lng: -4.0200, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { categorie: "marché financier" } },
  { theme: "finance", source: "BCEAO", name: "Direction Générale du Trésor Public", type: "tresor", lat: 5.3270, lng: -4.0175, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { categorie: "trésor" } },
  { theme: "finance", source: "OSM", name: "Siège SGCI (Société Générale)", type: "banque", lat: 5.3255, lng: -4.0185, admin1: "Abidjan", admin2: "Plateau", verified: false, props: { categorie: "banque commerciale" } },
  { theme: "finance", source: "OSM", name: "Siège Ecobank Côte d'Ivoire", type: "banque", lat: 5.3240, lng: -4.0165, admin1: "Abidjan", admin2: "Plateau", verified: false, props: { categorie: "banque commerciale" } },
  { theme: "finance", source: "OSM", name: "Siège NSIA Banque", type: "banque", lat: 5.3235, lng: -4.0155, admin1: "Abidjan", admin2: "Plateau", verified: false, props: { categorie: "banque commerciale" } },
  { theme: "finance", source: "BCEAO", name: "Agence BCEAO de Bouaké", type: "banque_centrale", lat: 7.6910, lng: -5.0320, admin1: "Gbêkê", admin2: "Bouaké", verified: true, props: { categorie: "banque centrale" } },

  // ─────────────── JUSTICE (justice) ───────────────
  { theme: "justice", source: "MJDH", name: "Cour Suprême", type: "cour_supreme", lat: 5.3220, lng: -4.0140, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { degre: "suprême" } },
  { theme: "justice", source: "MJDH", name: "Cour d'Appel d'Abidjan", type: "cour_appel", lat: 5.3200, lng: -4.0120, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { degre: "appel" } },
  { theme: "justice", source: "MJDH", name: "Tribunal de Première Instance d'Abidjan-Plateau", type: "tribunal", lat: 5.3210, lng: -4.0125, admin1: "Abidjan", admin2: "Plateau", verified: true, props: { degre: "première instance" } },
  { theme: "justice", source: "MJDH", name: "Cour d'Appel de Bouaké", type: "cour_appel", lat: 7.6920, lng: -5.0310, admin1: "Gbêkê", admin2: "Bouaké", verified: true, props: { degre: "appel" } },
  { theme: "justice", source: "MJDH", name: "Cour d'Appel de Daloa", type: "cour_appel", lat: 6.8770, lng: -6.4510, admin1: "Haut-Sassandra", admin2: "Daloa", verified: true, props: { degre: "appel" } },
  { theme: "justice", source: "MJDH", name: "Tribunal de Première Instance de Korhogo", type: "tribunal", lat: 9.4585, lng: -5.6290, admin1: "Poro", admin2: "Korhogo", verified: false, props: { degre: "première instance" } },
  { theme: "justice", source: "MJDH", name: "Maison d'Arrêt et de Correction d'Abidjan (MACA)", type: "penitentiaire", lat: 5.3900, lng: -4.0300, admin1: "Abidjan", admin2: "Yopougon", verified: true, props: { degre: "pénitentiaire" } },
];
