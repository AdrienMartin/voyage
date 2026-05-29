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
