# Donnees locales des lieux a visiter

## Objectif

Ce dossier stocke les sources brutes synchronisees localement pour les lieux a visiter
autour du circuit.

Pour la premiere passe, la source ciblee est:

- DATAtourisme via le catalogue officiel de `data.gouv.fr`

Le pipeline telecharge actuellement la ressource:

- `Sites touristiques`

Ce choix est volontairement partiel:

- il couvre deja le besoin produit principal de lieux a visiter
- il reste compatible avec un futur import plus complet
- il evite de melanger trop tot les evenements, produits ou autres ressources

## Structure

- `raw/datatourisme-tourist-sites.jsonld`: donnees source brutes telechargees
- `raw/manifest.json`: metadonnees de la synchronisation locale
- `normalized/visit-places.normalized.json`: projection normalisee vers le modele de l application

Remarque:

- la ressource DATAtourisme peut etre telechargee compressee en `gzip`
- la normalisation gere maintenant ce cas automatiquement

Le champ `rankingScore` est maintenant calcule pendant la normalisation a partir de
regles simples et lisibles:

- type de lieu
- richesse de la description
- presence d image
- presence d URL utile
- presence de commune
- presence de date de mise a jour source

La future recherche autour du circuit s'appuie ensuite sur PostGIS avec:

- une ligne geographique construite a partir des villes du circuit
- un rayon fixe configurable autour de cette ligne
- un tri principal par `rankingScore`, puis par proximite au circuit

## Commande

```bash
npm run data:fetch-visit-places --workspace backend
npm run data:normalize-visit-places --workspace backend
npm run data:import-visit-places --workspace backend
```
