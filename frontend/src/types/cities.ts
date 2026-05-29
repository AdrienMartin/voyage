export type City = {
  inseeCode: string;
  name: string;
  postalCodes: string[];
  population: number;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};

export type CitySearchResponse = {
  total: number;
  cities: City[];
};

