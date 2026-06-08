CREATE TABLE IF NOT EXISTS visit_places (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  description TEXT,
  commune TEXT,
  image_url TEXT,
  website_url TEXT,
  ranking_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (ranking_score >= 0),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  geog geography(Point, 4326) GENERATED ALWAYS AS (geom::geography) STORED,
  source_updated_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT visit_places_source_source_id_unique UNIQUE (source, source_id),
  CONSTRAINT visit_places_coordinates_match_geom CHECK (
    abs(ST_Y(geom) - latitude) < 0.000001 AND
    abs(ST_X(geom) - longitude) < 0.000001
  )
);

CREATE INDEX IF NOT EXISTS visit_places_source_idx
  ON visit_places (source);

CREATE INDEX IF NOT EXISTS visit_places_category_idx
  ON visit_places (category);

CREATE INDEX IF NOT EXISTS visit_places_commune_idx
  ON visit_places (commune);

CREATE INDEX IF NOT EXISTS visit_places_ranking_score_desc_idx
  ON visit_places (ranking_score DESC);

CREATE INDEX IF NOT EXISTS visit_places_name_idx
  ON visit_places (name);

CREATE INDEX IF NOT EXISTS visit_places_geom_gist_idx
  ON visit_places
  USING GIST (geom);

CREATE INDEX IF NOT EXISTS visit_places_geog_gist_idx
  ON visit_places
  USING GIST (geog);

COMMENT ON TABLE visit_places IS
  'Lieux a visiter importes depuis des sources touristiques pour la recherche autour des circuits.';

COMMENT ON COLUMN visit_places.source IS
  'Nom de la source d origine, par exemple DATAtourisme.';

COMMENT ON COLUMN visit_places.source_id IS
  'Identifiant stable dans la source amont.';

COMMENT ON COLUMN visit_places.category IS
  'Categorie normalisee du lieu pour l affichage et le ranking.';

COMMENT ON COLUMN visit_places.sub_category IS
  'Sous categorie source ou normalisee quand elle apporte un niveau de detail utile.';

COMMENT ON COLUMN visit_places.ranking_score IS
  'Score de priorisation interne, simple et ajustable.';

COMMENT ON COLUMN visit_places.geom IS
  'Point WGS84 pour l affichage cartographique.';

COMMENT ON COLUMN visit_places.geog IS
  'Projection geography WGS84 pour les calculs de distance autour du circuit.';

COMMENT ON COLUMN visit_places.source_updated_at IS
  'Date de mise a jour connue cote source si elle est disponible.';
