CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communes (
  id BIGSERIAL PRIMARY KEY,
  insee_code CHAR(5) NOT NULL,
  name TEXT NOT NULL,
  postal_codes TEXT[] NOT NULL DEFAULT '{}',
  population INTEGER NOT NULL CHECK (population >= 0),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  geog geography(Point, 4326) GENERATED ALWAYS AS (geom::geography) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT communes_insee_code_unique UNIQUE (insee_code),
  CONSTRAINT communes_coordinates_match_geom CHECK (
    abs(ST_Y(geom) - latitude) < 0.000001 AND
    abs(ST_X(geom) - longitude) < 0.000001
  )
);

CREATE INDEX IF NOT EXISTS communes_population_desc_idx
  ON communes (population DESC);

CREATE INDEX IF NOT EXISTS communes_name_idx
  ON communes (name);

CREATE INDEX IF NOT EXISTS communes_geom_gist_idx
  ON communes
  USING GIST (geom);

CREATE INDEX IF NOT EXISTS communes_geog_gist_idx
  ON communes
  USING GIST (geog);

COMMENT ON TABLE communes IS
  'Communes francaises importees pour la recherche geographique et l affichage cartographique.';

COMMENT ON COLUMN communes.insee_code IS
  'Code INSEE officiel de la commune.';

COMMENT ON COLUMN communes.population IS
  'Population municipale utilisee pour le tri des resultats.';

COMMENT ON COLUMN communes.geom IS
  'Point WGS84 pour l affichage cartographique.';

COMMENT ON COLUMN communes.geog IS
  'Projection geography WGS84 pour les calculs de distance en metres.';

