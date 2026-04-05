# 💧 Vivaqua — Réseau en direct

Application web interactive de visualisation du réseau eau de Vivaqua sur les 23 communes desservies en Belgique.

🔗 **[Voir l'application en direct](https://kakarot9797.github.io/vivaqua-reseau-map)**

---

## 📸 Aperçu

> Carte interactive · Mode sombre · Quiz · Scoring · Responsive mobile

---

## ✨ Fonctionnalités

- 🗺️ **Carte interactive** — 18 incidents simulés sur les 23 communes réelles (Bruxelles + Wallonie)
- 🔴🟠🔵 **Filtres par type** — Pannes, Chantiers, Coupures prévues
- 🔍 **Recherche par commune** — Filtrage en temps réel
- 📍 **Signalement citoyen** — Formulaire de signalement avec points de scoring
- 📊 **Statistiques** — Graphique d'évolution sur 7 jours + indicateurs clés
- 🔧 **Onglet Réseau** — Chiffres officiels Vivaqua + carte des 23 communes cliquables
- 🎯 **Quiz éducatif** — 35 questions tirées aléatoirement, basées sur les FAQ officielles vivaqua.be
- 🏆 **Système de scoring** — Niveaux, badges, historique sauvegardés localement
- 🌙 **Mode sombre** — Design vibrant inspiré de Waze
- 📱 **Responsive mobile** — Fonctionne sur tous les écrans

---

## 🏗️ Technologies utilisées

| Technologie | Usage |
|-------------|-------|
| HTML5 / CSS3 | Structure et design |
| JavaScript (Vanilla) | Logique et interactions |
| [Leaflet.js](https://leafletjs.com/) | Cartographie interactive |
| [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) | Clustering des marqueurs |
| CARTO / OpenStreetMap | Fond de carte |
| localStorage | Sauvegarde du scoring |
| GitHub Pages | Déploiement |

---

## 📊 Données

Les données d'incidents sont **simulées à titre de démonstration**. Les informations sur le réseau (communes, km de conduites, sites de captage) sont issues du site officiel [vivaqua.be](https://www.vivaqua.be).

**Chiffres officiels Vivaqua :**
- 23 communes desservies (19 Bruxelles + 4 Wallonie)
- 3 112 km de conduites de distribution
- 26 sites de captage en Belgique
- 131 millions m³ d'eau produits par an
- ~20% des Belges desservis

---

## 🚀 Lancer le projet

```bash
# Cloner le repo
git clone https://github.com/kakarot9797/vivaqua-reseau-map.git

# Ouvrir directement dans le navigateur
open index.html
```

Ou accéder directement : [kakarot9797.github.io/vivaqua-reseau-map](https://kakarot9797.github.io/vivaqua-reseau-map)

---

## 👨‍💻 Développeur

**Aymane Bouhdid**  
Projet portfolio développé dans le cadre d'une candidature chez Vivaqua.

---

*Sources officielles : [vivaqua.be](https://www.vivaqua.be) · Données cartographiques : © OpenStreetMap © CARTO*
