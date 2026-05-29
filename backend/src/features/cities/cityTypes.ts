export type CitySearchParams = {
  lat: number;
  lon: number;
  radius: number;
  limit: number;
};

export type AdministrativeCitySearchParams = {
  departmentCodes: string[];
  regionCodes: string[];
  limit: number;
};

export type CityRow = {
  inseeCode: string;
  name: string;
  postalCodes: string[];
  population: number;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};
