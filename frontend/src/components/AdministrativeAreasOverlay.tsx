import type { ProjectedAdministrativeAreas } from "../features/areas/administrativeOverlay";
import type { SelectionMode, WorkflowStep } from "../types/selection";

type AdministrativeAreasOverlayProps = {
  projectedAdministrativeAreas: ProjectedAdministrativeAreas | null;
  selectedDepartmentCodes: string[];
  selectedRegionCodes: string[];
  selectionMode: SelectionMode;
  workflowStep: WorkflowStep;
};

export function AdministrativeAreasOverlay({
  projectedAdministrativeAreas,
  selectedDepartmentCodes,
  selectedRegionCodes,
  selectionMode,
  workflowStep,
}: AdministrativeAreasOverlayProps) {
  if (
    projectedAdministrativeAreas === null ||
    (selectionMode !== "region" && selectionMode !== "department")
  ) {
    return null;
  }

  const selectedCodes =
    selectionMode === "region" ? selectedRegionCodes : selectedDepartmentCodes;
  const isSelectionStep = workflowStep === "selection";
  const visibleFeatures = isSelectionStep
    ? projectedAdministrativeAreas.features
    : projectedAdministrativeAreas.features.filter((feature) =>
        selectedCodes.includes(feature.code),
      );

  return (
    <svg
      className="administrative-overlay-layer"
      viewBox={`0 0 ${projectedAdministrativeAreas.width} ${projectedAdministrativeAreas.height}`}
      aria-hidden="true"
    >
      {visibleFeatures.map((feature) => {
        const isSelected = selectedCodes.includes(feature.code);

        return (
          <g key={feature.code}>
            <path
              d={feature.path}
              className={
                isSelected && isSelectionStep
                  ? "administrative-area-path administrative-area-path-selected"
                  : isSelected
                    ? "administrative-area-path administrative-area-path-outline-only"
                  : "administrative-area-path"
              }
            />
            {isSelectionStep && (
              <text
                x={feature.labelX}
                y={feature.labelY}
                className={
                  isSelected
                    ? "administrative-area-label administrative-area-label-selected"
                    : "administrative-area-label"
                }
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {feature.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
