export type CircuitPointInput = {
  latitude: number;
  longitude: number;
};

export type CircuitVisitPlaceSearchParams = {
  circuitPoints: CircuitPointInput[];
  proximityRadiusMeters: number;
  limit: number;
};

export type VisitPlaceRow = {
  source: string;
  sourceId: string;
  name: string;
  category: string;
  subCategory: string | null;
  description: string | null;
  commune: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  websiteUrl: string | null;
  rankingScore: number;
  distanceToCircuitMeters: number;
};
