import type { CircuitCity } from "../circuit/circuit";
import type { City } from "../../types/cities";
import type { SelectedPoint } from "../../types/geo";
import type { SelectionMode, WorkflowStep } from "../../types/selection";

type ClickedCity = City | CircuitCity;

export type ResolveMapClickActionInput = {
  workflowStep: WorkflowStep;
  selectionMode: SelectionMode;
  clickedPoint: SelectedPoint;
  clickedDepartmentCode?: string | null;
  clickedRegionCode?: string | null;
  clickedCity?: ClickedCity | null;
  isPointInMetropolitanFrance: boolean;
};

export type MapClickAction =
  | { type: "none" }
  | { type: "toggle-region"; code: string }
  | { type: "toggle-department"; code: string }
  | { type: "toggle-city"; city: ClickedCity }
  | { type: "outside-france" }
  | { type: "select-point"; point: SelectedPoint };

export function resolveMapClickAction({
  workflowStep,
  selectionMode,
  clickedPoint,
  clickedDepartmentCode = null,
  clickedRegionCode = null,
  clickedCity = null,
  isPointInMetropolitanFrance,
}: ResolveMapClickActionInput): MapClickAction {
  if (workflowStep === "selection" && selectionMode === "region" && clickedRegionCode !== null) {
    return {
      type: "toggle-region",
      code: clickedRegionCode,
    };
  }

  if (
    workflowStep === "selection" &&
    selectionMode === "department" &&
    clickedDepartmentCode !== null
  ) {
    return {
      type: "toggle-department",
      code: clickedDepartmentCode,
    };
  }

  if (workflowStep === "circuit" && clickedCity !== null) {
    return {
      type: "toggle-city",
      city: clickedCity,
    };
  }

  if (workflowStep !== "selection" || selectionMode !== "zone") {
    return { type: "none" };
  }

  if (!isPointInMetropolitanFrance) {
    return { type: "outside-france" };
  }

  return {
    type: "select-point",
    point: clickedPoint,
  };
}
