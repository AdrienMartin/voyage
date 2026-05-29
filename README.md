# Voyage

Application web de selection de villes sur une carte de France.

## Prerequis

- Node.js 22+
- npm 10+
- Docker Desktop

## Demarrage

1. Installer les dependances:

   ```bash
   npm install
   ```

2. Demarrer PostgreSQL + PostGIS:

   ```bash
   docker compose up -d
   ```

3. Lancer le frontend et le backend:

   ```bash
   npm run dev
   ```

## Base de donnees

La migration du schema PostGIS des communes se lance avec:

```bash
npm run db:migrate --workspace backend
```

Le modele et les index sont documentes dans [backend/db/README.md](backend/db/README.md).

L'import reproductible des communes s'execute ensuite avec:

```bash
npm run data:fetch-communes --workspace backend
npm run data:import-communes --workspace backend
```

## Services

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432
