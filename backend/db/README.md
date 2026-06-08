# Modele de donnees des communes

## Table `communes`

- `insee_code`: identifiant metier stable de la commune
- `name`: nom d affichage
- `postal_codes`: tableau de codes postaux associes
- `population`: entier pour trier les resultats geographiques
- `latitude` / `longitude`: coordonnees explicites utiles pour l API et le debug
- `geom`: point PostGIS `geometry(Point, 4326)` pour l affichage et les operations spatiales standard
- `geog`: point PostGIS `geography(Point, 4326)` derive de `geom`, pour les calculs de distance en metres

## Index retenus

- `communes_geog_gist_idx`: index principal pour `ST_DWithin` et les recherches par rayon en metres
- `communes_geom_gist_idx`: utile pour d autres operations cartographiques ou de bounding box
- `communes_population_desc_idx`: optimise le tri par population
- `communes_name_idx`: prepare les recherches ou controles textuels

## Table `visit_places`

- `source`: nom de la source amont, prevu d abord pour DATAtourisme
- `source_id`: identifiant stable dans la source
- `name`: nom du lieu
- `category`: categorie normalisee pour l API et le ranking
- `sub_category`: sous categorie plus fine quand elle est utile
- `description`: texte descriptif optionnel
- `commune`: commune rattachee si disponible
- `image_url`: visuel principal si disponible
- `website_url`: URL utile de detail si disponible
- `ranking_score`: score interne simple pour prioriser les lieux
- `latitude` / `longitude`: coordonnees explicites utiles pour l API et le debug
- `geom`: point PostGIS `geometry(Point, 4326)` pour l affichage
- `geog`: point PostGIS `geography(Point, 4326)` derive de `geom`, pour les calculs de distance en metres autour du circuit
- `source_updated_at`: date de mise a jour source si connue
- `imported_at`: date d import en base

## Index retenus pour `visit_places`

- `visit_places_geog_gist_idx`: index principal pour `ST_DWithin` autour du circuit
- `visit_places_geom_gist_idx`: utile pour d autres usages cartographiques
- `visit_places_ranking_score_desc_idx`: optimise le tri par pertinence
- `visit_places_category_idx`: prepare les filtres ou regroupements de categories
- `visit_places_commune_idx`: prepare les usages de filtre ou d affichage par commune
- `visit_places_name_idx`: prepare les controles textuels
- `visit_places_source_idx`: facilite les operations de synchronisation par source

## Migration

Lancer la migration:

```bash
npm run db:migrate --workspace backend
```

Par defaut, le backend vise:

```text
postgresql://voyage:voyage@localhost:5432/voyage
```

Vous pouvez surcharger avec `DATABASE_URL`.

## Import des sources

Sources retenues:

- La Poste dataNOVA pour le CSV des communes avec codes INSEE, codes postaux et centroïdes
- Insee pour le fichier d'ensemble des populations de reference 2023

Commandes:

```bash
npm run data:fetch-communes --workspace backend
npm run data:import-communes --workspace backend
```

## Synchronisation des lieux a visiter

Pour les lieux a visiter, la premiere passe met en place une synchronisation locale
des sources DATAtourisme, sans import SQL complet pour l instant.

Commande:

```bash
npm run data:fetch-visit-places --workspace backend
```

Hypothese actuelle:

- la ressource DATAtourisme telechargee en priorite est `Sites touristiques`
- le catalogue de source est resolu via l API officielle de `data.gouv.fr`
- les donnees brutes sont stockees localement dans `backend/data/places/raw/`
