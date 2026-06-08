# Deploiement sur Supabase + Vercel

Ce projet se deploie en separant :

- le code applicatif dans GitHub
- la base PostgreSQL + PostGIS dans Supabase
- le frontend et le backend dans deux projets Vercel

Les gros fichiers DATAtourisme ne doivent pas etre versionnes ni deployes.

## 1. Verifier les fichiers exclus

Les fichiers suivants doivent rester locaux :

- `backend/data/places/raw/datatourisme-tourist-sites.jsonld`
- `backend/data/places/normalized/visit-places.normalized.json`

Ils sont ignores par Git et servent seulement a alimenter la base.

## 2. Creer le projet Supabase

1. Cree un projet Supabase.
2. Active l extension `postgis`.
3. Recupere l URL Postgres du projet.
4. Garde aussi le mot de passe de base a jour dans le dashboard Supabase.

## 3. Initialiser la base distante

Depuis ta machine locale, pointe `DATABASE_URL` vers Supabase :

```powershell
$env:DATABASE_URL="postgresql://..."
npm run db:migrate --workspace backend
```

## 4. Importer les donnees touristiques dans Supabase

Toujours depuis ta machine locale :

```powershell
$env:DATABASE_URL="postgresql://..."
npm run data:fetch-visit-places --workspace backend
npm run data:normalize-visit-places --workspace backend
npm run data:import-visit-places --workspace backend
```

Tu peux aussi rafraichir les communes si besoin :

```powershell
$env:DATABASE_URL="postgresql://..."
npm run data:refresh-communes --workspace backend
```

Important :

- ne fais pas cet import pendant le build Vercel
- relance-le seulement quand tu veux resynchroniser les donnees

## 5. Variables d environnement

### Frontend

Le frontend lit l URL de l API via `VITE_API_BASE_URL`.

Exemple local :

```env
VITE_API_BASE_URL=http://localhost:3000
```

Le fichier d exemple est :

- `frontend/.env.example`

### Backend

Le backend lit la base via `DATABASE_URL`.

Exemple local :

```env
DATABASE_URL=postgresql://voyage:voyage@localhost:5432/voyage
```

Le fichier d exemple est :

- `backend/.env.example`

## 6. Deployer le backend sur Vercel

1. Cree un nouveau projet Vercel depuis le meme repository GitHub.
2. Choisis `backend` comme `Root Directory`.
3. Ajoute la variable d environnement :

```env
DATABASE_URL=postgresql://...
```

Le backend est expose via `backend/api/index.ts` et `backend/vercel.json` reecrit les routes pour conserver les endpoints existants :

- `/health`
- `/cities`
- `/cities/administrative`
- `/circuit/places`

Une fois deploye, verifie :

```text
https://ton-backend.vercel.app/health
```

Tu dois obtenir un JSON avec `status: "ok"`.

## 7. Deployer le frontend sur Vercel

1. Cree un second projet Vercel depuis le meme repository GitHub.
2. Choisis `frontend` comme `Root Directory`.
3. Ajoute la variable d environnement :

```env
VITE_API_BASE_URL=https://ton-backend.vercel.app
```

Le frontend utilisera automatiquement cette URL au build et en production.

## 8. Verification finale

Verifie le flux complet :

1. le frontend charge
2. les villes se chargent depuis l API
3. tu peux creer un circuit
4. les lieux a visiter remontent depuis Supabase

## 9. Checklist de mise a jour des donnees

Quand tu veux mettre a jour les lieux :

```powershell
$env:DATABASE_URL="postgresql://..."
npm run data:fetch-visit-places --workspace backend
npm run data:normalize-visit-places --workspace backend
npm run data:import-visit-places --workspace backend
```

Le code n a pas besoin d etre redeploye si seule la base change.
