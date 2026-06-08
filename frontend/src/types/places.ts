export type VisitPlace = {
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

export type VisitPlaceSearchResponse = {
  total: number;
  places: VisitPlace[];
};
