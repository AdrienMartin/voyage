import type { SelectedPoint } from "../../types/geo";
import type { SelectionMode } from "../../types/selection";

export type CitySearchPlanInput = {
  selectionMode: SelectionMode;
  selectedPoint: SelectedPoint | null;
  selectedDepartmentCodes: string[];
  selectedRegionCodes: string[];
  radiusInMeters: number;
};

export type CitySearchPlan =
  | { type: "none" }
  | {
      type: "zone";
      point: SelectedPoint;
      radiusInMeters: number;
    }
  | {
      type: "administrative";
      departmentCodes?: string[];
      regionCodes?: string[];
    };

export function resolveCitySearchPlan({
  selectionMode,
  selectedPoint,
  selectedDepartmentCodes,
  selectedRegionCodes,
  radiusInMeters,
}: CitySearchPlanInput): CitySearchPlan {
  if (selectionMode === "zone") {
    if (selectedPoint === null) {
      return { type: "none" };
    }

    return {
      type: "zone",
      point: selectedPoint,
      radiusInMeters,
    };
  }

  if (selectionMode === "department") {
    if (selectedDepartmentCodes.length === 0) {
      return { type: "none" };
    }

    return {
      type: "administrative",
      departmentCodes: selectedDepartmentCodes,
    };
  }

  if (selectedRegionCodes.length === 0) {
    return { type: "none" };
  }

  return {
    type: "administrative",
    regionCodes: selectedRegionCodes,
  };
}
