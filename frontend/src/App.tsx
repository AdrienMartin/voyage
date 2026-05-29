import { Suspense, lazy, useState } from "react";
import { useAdministrativeAreas } from "./features/areas/useAdministrativeAreas";
import { toAreaOptions } from "./features/areas/areaOptions";
import { useCitiesSearch } from "./features/cities/useCitiesSearch";
import {
  addCircuitCity,
  type CircuitCity,
  createCircuitHistory,
  getCircuitLegs,
  getCircuitTotalDistanceKm,
  pushCircuitHistory,
  redoCircuitHistory,
  resetCircuitHistory,
  undoCircuitHistory,
} from "./features/circuit/circuit";
import { formatRadiusLabel } from "./lib/geo";
import type { City } from "./types/cities";
import type { SelectedPoint } from "./types/geo";
import {
  toggleSelectionCode,
  type SelectionMode,
  type WorkflowStep,
} from "./types/selection";

const DEFAULT_RADIUS_IN_METERS = 50_000;
const MIN_RADIUS_IN_METERS = 5_000;
const MAX_RADIUS_IN_METERS = 300_000;
const RADIUS_STEP_IN_METERS = 5_000;
const FranceMap = lazy(async () =>
  import("./components/FranceMap").then((module) => ({
    default: module.FranceMap,
  })),
);

export function App() {
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("selection");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("zone");
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedDepartmentCodes, setSelectedDepartmentCodes] = useState<string[]>([]);
  const [selectedRegionCodes, setSelectedRegionCodes] = useState<string[]>([]);
  const [radiusInMeters, setRadiusInMeters] = useState(DEFAULT_RADIUS_IN_METERS);
  const [visibleCitiesOnMapCount, setVisibleCitiesOnMapCount] = useState(0);
  const [circuitHistory, setCircuitHistory] = useState(createCircuitHistory);
  const {
    departments,
    regions,
    isLoading: isLoadingAdministrativeAreas,
    errorMessage: administrativeAreasErrorMessage,
  } = useAdministrativeAreas();
  const activeZonePoint = selectionMode === "zone" ? selectedPoint : null;
  const { cities, cityErrorMessage, isLoadingCities } = useCitiesSearch({
    selectionMode,
    selectedPoint: activeZonePoint,
    selectedDepartmentCodes,
    selectedRegionCodes,
    radiusInMeters,
  });
  const circuitCities = circuitHistory.present;
  const circuitLegs = getCircuitLegs(circuitCities);
  const circuitTotalDistanceKm = getCircuitTotalDistanceKm(circuitCities);
  const isSelectionStep = workflowStep === "selection";
  const isCircuitStep = workflowStep === "circuit";
  const isSummaryStep = workflowStep === "summary";
  const isZoneMode = selectionMode === "zone";
  const isDepartmentMode = selectionMode === "department";
  const isRegionMode = selectionMode === "region";
  const hasAdministrativeSelection =
    selectedDepartmentCodes.length > 0 || selectedRegionCodes.length > 0;
  const hasSelection =
    (isZoneMode && selectedPoint !== null) ||
    (!isZoneMode && hasAdministrativeSelection);
  const canOpenCircuitStep =
    hasSelection && !isLoadingCities && cityErrorMessage === null && cities.length > 0;
  const canOpenSummaryStep = circuitCities.length > 0;

  function resetCircuitBuilder() {
    setCircuitHistory(createCircuitHistory());
  }

  function handleAddCircuitCity(city: City | CircuitCity) {
    if (!isCircuitStep) {
      return;
    }

    setCircuitHistory((currentCircuitHistory) =>
      pushCircuitHistory(
        currentCircuitHistory,
        addCircuitCity(currentCircuitHistory.present, city),
      ),
    );
  }

  function handleSelectionModeChange(nextMode: SelectionMode) {
    setSelectionMode(nextMode);
    setSelectedPoint(null);
    setSelectedDepartmentCodes([]);
    setSelectedRegionCodes([]);
    resetCircuitBuilder();
    setWorkflowStep("selection");
  }

  function handleSelectPoint(nextPoint: SelectedPoint) {
    setSelectedPoint(nextPoint);
    resetCircuitBuilder();
  }

  function handleRadiusChange(nextRadiusInMeters: number) {
    setRadiusInMeters(nextRadiusInMeters);
    resetCircuitBuilder();
  }

  function handleToggleDepartment(code: string) {
    setSelectedDepartmentCodes((currentCodes) =>
      toggleSelectionCode(currentCodes, code),
    );
    resetCircuitBuilder();
  }

  function handleToggleRegion(code: string) {
    setSelectedRegionCodes((currentCodes) => toggleSelectionCode(currentCodes, code));
    resetCircuitBuilder();
  }

  function handlePreviousStep() {
    setWorkflowStep((currentStep) => {
      if (currentStep === "summary") {
        return "circuit";
      }

      if (currentStep === "circuit") {
        return "selection";
      }

      return currentStep;
    });
  }

  function handleNextStep() {
    setWorkflowStep((currentStep) => {
      if (currentStep === "selection" && canOpenCircuitStep) {
        return "circuit";
      }

      if (currentStep === "circuit" && canOpenSummaryStep) {
        return "summary";
      }

      return currentStep;
    });
  }

  const regionOptions = toAreaOptions(regions);
  const departmentOptions = toAreaOptions(departments);
  const selectedRegions = regionOptions.filter((region) =>
    selectedRegionCodes.includes(region.code),
  );
  const selectedDepartments = departmentOptions.filter((department) =>
    selectedDepartmentCodes.includes(department.code),
  );

  return (
    <main className="app-shell">
      <section className="layout-shell">
        <aside className="info-panel">
          <div className="panel-stack">
            <div className="intro-block">
              <p className="eyebrow">Voyage</p>
              <h1>Selection geographique de villes</h1>
              <p className="body-copy">
                Posez un point sur la carte, ajustez le rayon, puis laissez
                l'application faire ressortir les villes les plus importantes de
                la zone.
              </p>
            </div>

            <div className="selection-card workflow-card">
              <p className="selection-label">Parcours</p>
              <div className="workflow-steps" aria-label="Etapes du parcours">
                <div className={getWorkflowStepClassName(isSelectionStep, hasSelection)}>
                  <span className="workflow-step-index">1</span>
                  <div>
                    <p className="workflow-step-title">Selection</p>
                    <p className="workflow-step-body">Choisissez la zone de travail.</p>
                  </div>
                </div>
                <div className={getWorkflowStepClassName(isCircuitStep, canOpenCircuitStep)}>
                  <span className="workflow-step-index">2</span>
                  <div>
                    <p className="workflow-step-title">Circuit</p>
                    <p className="workflow-step-body">Composez le circuit dans la zone.</p>
                  </div>
                </div>
                <div className={getWorkflowStepClassName(isSummaryStep, canOpenSummaryStep)}>
                  <span className="workflow-step-index">3</span>
                  <div>
                    <p className="workflow-step-title">Recapitulatif</p>
                    <p className="workflow-step-body">Verifiez le trajet et les distances.</p>
                  </div>
                </div>
              </div>
              <div className="workflow-actions">
                <button
                  type="button"
                  className="workflow-action-button"
                  onClick={handlePreviousStep}
                  disabled={isSelectionStep}
                >
                  Etape precedente
                </button>
                <button
                  type="button"
                  className="workflow-action-button workflow-action-button-primary"
                  onClick={handleNextStep}
                  disabled={
                    (isSelectionStep && !canOpenCircuitStep) ||
                    (isCircuitStep && !canOpenSummaryStep) ||
                    isSummaryStep
                  }
                >
                  {isSelectionStep
                    ? "Passer au circuit"
                    : isCircuitStep
                      ? "Voir le recapitulatif"
                      : "Parcours termine"}
                </button>
              </div>
            </div>

            <div className="selection-card spotlight-card">
              <div className="status-pill-row">
                <span className="status-pill">
                  {isSelectionStep
                    ? "Etape 1 - selection"
                    : isCircuitStep
                      ? "Etape 2 - circuit"
                      : "Etape 3 - recapitulatif"}
                </span>
                <span className="status-pill">
                  {isZoneMode
                    ? selectedPoint === null
                      ? "En attente de selection"
                      : "Zone active"
                    : isDepartmentMode
                      ? "Selection par departements"
                      : "Selection par regions"}
                </span>
              </div>
              <div className="metrics-grid">
                <article className="metric-card">
                  <p className="metric-label">{isZoneMode ? "Point" : "Selection"}</p>
                  {!isZoneMode ? (
                    <p className="metric-empty">
                      {hasAdministrativeSelection
                        ? "Zones en cours"
                        : "Aucune zone choisie"}
                    </p>
                  ) : selectedPoint === null ? (
                    <p className="metric-empty">Aucun point</p>
                  ) : (
                    <>
                      <p className="metric-value">{selectedPoint.lat.toFixed(3)}</p>
                      <p className="metric-subvalue">{selectedPoint.lon.toFixed(3)}</p>
                    </>
                  )}
                </article>
                <article className="metric-card">
                  <p className="metric-label">Rayon</p>
                  <p className="metric-value">
                    {isZoneMode ? formatRadiusLabel(radiusInMeters) : "-"}
                  </p>
                  <p className="metric-subvalue">
                    {isZoneMode ? "zone de recherche" : "non utilise"}
                  </p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Villes</p>
                  <p className="metric-value">{cities.length}</p>
                  <p className="metric-subvalue">trouvees</p>
                </article>
              </div>
            </div>

            <div className={`selection-card ${!isSelectionStep ? "selection-card-disabled" : ""}`}>
              <div className="selection-mode-header">
                <p className="selection-label">Etape 1 - zone de travail</p>
                <div className="selection-mode-buttons">
                  <button
                    type="button"
                    className={getSelectionModeButtonClassName(isZoneMode)}
                    disabled={!isSelectionStep}
                    onClick={() => {
                      handleSelectionModeChange("zone");
                    }}
                  >
                    Zone
                  </button>
                  <button
                    type="button"
                    className={getSelectionModeButtonClassName(isDepartmentMode)}
                    disabled={!isSelectionStep}
                    onClick={() => {
                      handleSelectionModeChange("department");
                    }}
                  >
                    Departements
                  </button>
                  <button
                    type="button"
                    className={getSelectionModeButtonClassName(isRegionMode)}
                    disabled={!isSelectionStep}
                    onClick={() => {
                      handleSelectionModeChange("region");
                    }}
                  >
                    Regions
                  </button>
                </div>
              </div>
              {isZoneMode ? (
                <>
                  <div className="radius-header">
                    <p className="selection-label">Reglage du rayon</p>
                    <p className="radius-value">{formatRadiusLabel(radiusInMeters)}</p>
                  </div>
                  <input
                    className="radius-slider"
                    type="range"
                    min={MIN_RADIUS_IN_METERS}
                    max={MAX_RADIUS_IN_METERS}
                    step={RADIUS_STEP_IN_METERS}
                    value={radiusInMeters}
                    disabled={!isSelectionStep}
                    onChange={(event) => {
                      handleRadiusChange(Number(event.target.value));
                    }}
                  />
                  <div className="range-ticks" aria-hidden="true">
                    <span>5 km</span>
                    <span>150 km</span>
                    <span>300 km</span>
                  </div>
                  <p className="radius-help">
                    Le cercle pilote directement la recherche backend et l'affichage
                    cartographique.
                  </p>
                </>
              ) : (
                <>
                  <label className="selection-field">
                    <span className="selection-field-label">
                      {isDepartmentMode
                        ? "Choisir un ou plusieurs departements"
                        : "Choisir une ou plusieurs regions"}
                    </span>
                    <select
                      className="selection-select selection-select-multiple"
                      multiple
                      size={isDepartmentMode ? 10 : 8}
                      disabled={!isSelectionStep}
                      value={
                        isDepartmentMode
                          ? selectedDepartmentCodes
                          : selectedRegionCodes
                      }
                      onChange={(event) => {
                        const nextSelectedCodes = [...event.target.selectedOptions].map(
                          (option) => option.value,
                        );
                        if (isDepartmentMode) {
                          setSelectedDepartmentCodes(nextSelectedCodes);
                          resetCircuitBuilder();
                        } else {
                          setSelectedRegionCodes(nextSelectedCodes);
                          resetCircuitBuilder();
                        }
                      }}
                    >
                      {(isDepartmentMode
                        ? departmentOptions
                        : regionOptions
                      ).map((area) => (
                        <option key={area.code} value={area.code}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="radius-help">
                    {isSelectionStep
                      ? "Cliquez directement sur la carte pour ajouter ou retirer une zone, ou utilisez cette liste multiple."
                      : "Revenez a l'etape 1 pour modifier la zone selectionnee."}
                  </p>
                  {isLoadingAdministrativeAreas && (
                    <p className="selection-empty">Chargement des contours administratifs...</p>
                  )}
                  {administrativeAreasErrorMessage !== null && (
                    <p className="cities-error">{administrativeAreasErrorMessage}</p>
                  )}
                  {isDepartmentMode && (
                    <>
                      <p className="cities-highlight">
                        {formatCountLabel(selectedDepartments.length, "departement")} selectionne
                        {selectedDepartments.length > 1 ? "s" : ""}.
                      </p>
                      {selectedDepartments.length > 0 && (
                        <div className="selection-chip-list">
                          {selectedDepartments.map((department) => (
                            <button
                              key={department.code}
                              type="button"
                              className="selection-chip"
                              disabled={!isSelectionStep}
                              onClick={() => {
                                setSelectedDepartmentCodes((currentCodes) =>
                                  currentCodes.filter((code) => code !== department.code),
                                );
                                resetCircuitBuilder();
                              }}
                            >
                              {department.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {isRegionMode && (
                    <>
                      <p className="cities-highlight">
                        {formatCountLabel(selectedRegions.length, "region")} selectionnee
                        {selectedRegions.length > 1 ? "s" : ""}.
                      </p>
                      {selectedRegions.length > 0 && (
                        <div className="selection-chip-list">
                          {selectedRegions.map((region) => (
                            <button
                              key={region.code}
                              type="button"
                              className="selection-chip"
                              disabled={!isSelectionStep}
                              onClick={() => {
                                setSelectedRegionCodes((currentCodes) =>
                                  currentCodes.filter((code) => code !== region.code),
                                );
                                resetCircuitBuilder();
                              }}
                            >
                              {region.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="selection-card cities-card">
              <div className="cities-header">
                <p className="selection-label">
                  {isSummaryStep ? "Etape 3 - recapitulatif" : "Etape 2 - circuit"}
                </p>
              </div>
              {!isCircuitStep && !isSummaryStep && (
                <p className="cities-summary">
                  Passez a l'etape 2 pour commencer a selectionner les villes du circuit.
                </p>
              )}
              <div className="circuit-actions">
                <button
                  type="button"
                  className="circuit-action-button"
                  onClick={() => {
                    setCircuitHistory((currentCircuitHistory) =>
                      undoCircuitHistory(currentCircuitHistory),
                    );
                  }}
                  disabled={!isCircuitStep || circuitHistory.past.length === 0}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="circuit-action-button"
                  onClick={() => {
                    setCircuitHistory((currentCircuitHistory) =>
                      redoCircuitHistory(currentCircuitHistory),
                    );
                  }}
                  disabled={!isCircuitStep || circuitHistory.future.length === 0}
                >
                  Refaire
                </button>
                <button
                  type="button"
                  className="circuit-action-button circuit-action-button-danger"
                  onClick={() => {
                    setCircuitHistory((currentCircuitHistory) =>
                      resetCircuitHistory(currentCircuitHistory),
                    );
                  }}
                  disabled={(!isCircuitStep && !isSummaryStep) || circuitCities.length === 0}
                >
                  Reinitialiser
                </button>
              </div>
              <p className="cities-summary">
                {formatCountLabel(circuitCities.length, "ville")} selectionnee
                {circuitCities.length > 1 ? "s" : ""}.
              </p>
              <p className="circuit-total-distance">
                Total: <strong>{formatCircuitDistance(circuitTotalDistanceKm)}</strong>
              </p>
              {isCircuitStep && (
                <p className="cities-highlight">
                  Cliquez sur une ville de la carte pour l'ajouter au circuit.
                </p>
              )}
              {isCircuitStep && circuitCities.length > 0 && (
                <p className="cities-highlight">
                  Vous pouvez repasser par une meme ville plusieurs fois.
                </p>
              )}
              {circuitLegs.length > 0 && (
                <div className="circuit-table-wrap">
                  <table className="circuit-table">
                    <thead>
                      <tr>
                        <th>Etape</th>
                        <th>Ville</th>
                        <th>Depuis la precedente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {circuitLegs.map((leg) => (
                        <tr key={`${leg.order}-${leg.city.inseeCode}`}>
                          <td>{leg.order}</td>
                          <td>{leg.city.name}</td>
                          <td>{formatCircuitDistance(leg.distanceFromPreviousKm)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </aside>
        <Suspense fallback={<MapPanelFallback />}>
          <FranceMap
            workflowStep={workflowStep}
            selectionMode={selectionMode}
            selectedPoint={activeZonePoint}
            radiusInMeters={radiusInMeters}
            minRadiusInMeters={MIN_RADIUS_IN_METERS}
            maxRadiusInMeters={MAX_RADIUS_IN_METERS}
            departments={departments}
            regions={regions}
            selectedDepartmentCodes={selectedDepartmentCodes}
            selectedRegionCodes={selectedRegionCodes}
            cities={cities}
            circuitCities={circuitCities}
            isLoadingCities={isLoadingCities}
            cityErrorMessage={cityErrorMessage}
            onVisibleCitiesChange={setVisibleCitiesOnMapCount}
            onToggleDepartment={handleToggleDepartment}
            onRadiusChange={handleRadiusChange}
            onToggleRegion={handleToggleRegion}
            onToggleCircuitCity={handleAddCircuitCity}
            onSelectPoint={handleSelectPoint}
          />
        </Suspense>
      </section>
    </main>
  );
}

function formatCircuitDistance(distanceKm: number) {
  return `${distanceKm.toFixed(1).replace(".", ",")} km`;
}

function formatCountLabel(count: number, singularNoun: string) {
  return `${count} ${singularNoun}${count > 1 ? "s" : ""}`;
}

function getSelectionModeButtonClassName(isActive: boolean) {
  return isActive
    ? "selection-mode-button selection-mode-button-active"
    : "selection-mode-button";
}

function getWorkflowStepClassName(isActive: boolean, isComplete: boolean) {
  if (isActive) {
    return "workflow-step workflow-step-active";
  }

  if (isComplete) {
    return "workflow-step workflow-step-complete";
  }

  return "workflow-step";
}

function MapPanelFallback() {
  return (
    <section className="map-panel" aria-label="Carte de France">
      <div className="map-frame map-frame-loading">
        <div className="map-loading-shell">
          <p className="map-overlay-eyebrow">Carte active</p>
          <p className="map-loading-title">Chargement du module cartographique</p>
          <p className="map-loading-body">
            La carte et ses interactions arrivent. L&apos;interface reste disponible pendant le
            chargement.
          </p>
        </div>
      </div>
    </section>
  );
}
