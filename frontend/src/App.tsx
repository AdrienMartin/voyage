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
import {
  canShowCircuitPlaces,
  DEFAULT_CIRCUIT_PLACES_RADIUS_IN_METERS,
} from "./features/places/placesConfig";
import { useCircuitPlacesSearch } from "./features/places/useCircuitPlacesSearch";
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
  const [visibleVisitPlacesOnMapCount, setVisibleVisitPlacesOnMapCount] = useState(0);
  const [circuitHistory, setCircuitHistory] = useState(createCircuitHistory);
  const [circuitPlacesRadiusInMeters] = useState(
    DEFAULT_CIRCUIT_PLACES_RADIUS_IN_METERS,
  );
  const {
    departments,
    regions,
    isLoading: isLoadingAdministrativeAreas,
    errorMessage: administrativeAreasErrorMessage,
  } = useAdministrativeAreas();

  const regionOptions = toAreaOptions(regions);
  const departmentOptions = toAreaOptions(departments);
  const selectedRegions = regionOptions.filter((region) =>
    selectedRegionCodes.includes(region.code),
  );
  const selectedDepartments = departmentOptions.filter((department) =>
    selectedDepartmentCodes.includes(department.code),
  );

  const activeZonePoint = selectionMode === "zone" ? selectedPoint : null;
  const { cities, cityErrorMessage, isLoadingCities } = useCitiesSearch({
    selectionMode,
    selectedPoint: activeZonePoint,
    selectedDepartmentCodes,
    selectedRegionCodes,
    radiusInMeters,
  });

  const circuitCities = circuitHistory.present;
  const {
    visitPlaces: circuitPlaces,
    isLoadingVisitPlaces,
    visitPlacesErrorMessage,
  } = useCircuitPlacesSearch({
    isEnabled:
      workflowStep === "places" && canShowCircuitPlaces(circuitCities.length),
    circuitCities,
    proximityRadiusMeters: circuitPlacesRadiusInMeters,
  });
  const circuitLegs = getCircuitLegs(circuitCities);
  const circuitTotalDistanceKm = getCircuitTotalDistanceKm(circuitCities);
  const isSelectionStep = workflowStep === "selection";
  const isCircuitStep = workflowStep === "circuit";
  const isPlacesStep = workflowStep === "places";
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
  const canOpenPlacesStep = circuitCities.length > 0;
  const canLoadCircuitPlaces = canShowCircuitPlaces(circuitCities.length);
  const shouldShowCircuitPlaces = isPlacesStep && canLoadCircuitPlaces;
  const selectedAreaCount = isDepartmentMode
    ? selectedDepartments.length
    : isRegionMode
      ? selectedRegions.length
      : selectedPoint === null
        ? 0
        : 1;
  const currentCoverageLabel = isZoneMode
    ? formatRadiusLabel(radiusInMeters)
    : formatCountLabel(selectedAreaCount, isDepartmentMode ? "departement" : "region");
  const primaryStepActionLabel = isSelectionStep
    ? "Continuer"
    : isCircuitStep
      ? "Voir les lieux"
      : "Parcours termine";

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
      if (currentStep === "places") {
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

      if (currentStep === "circuit" && canOpenPlacesStep) {
        return "places";
      }

      return currentStep;
    });
  }

  return (
    <main className="app-shell">
      <section className="layout-shell">
        <aside className="info-panel">
          <div className="panel-stack">
            <header className="intro-block">
              <h1>CityCircuit Pro</h1>
              <p className="eyebrow">Planificateur logistique</p>
              <p className="body-copy">
                Definissez une zone, composez un circuit de villes, explorez les lieux
                a visiter a proximite, puis verifiez le trajet final.
              </p>
            </header>

            <section className="selection-card workflow-card">
              <div className="workflow-nav" aria-label="Etapes du parcours">
                <div className={getWorkflowStepClassName(isSelectionStep, hasSelection)}>
                  <p className="workflow-step-kicker">Etape 1</p>
                  <p className="workflow-step-title">Selection de zone</p>
                </div>
                <div className={getWorkflowStepClassName(isCircuitStep, canOpenCircuitStep)}>
                  <p className="workflow-step-kicker">Etape 2</p>
                  <p className="workflow-step-title">Creation du circuit</p>
                </div>
                <div className={getWorkflowStepClassName(isPlacesStep, canOpenPlacesStep)}>
                  <p className="workflow-step-kicker">Etape 3</p>
                  <p className="workflow-step-title">Lieux a visiter</p>
                </div>
              </div>
            </section>

            {isSelectionStep && (
              <section className={`selection-card ${!isSelectionStep ? "selection-card-disabled" : ""}`}>
                <div className="selection-mode-header">
                  <p className="selection-label">Mode de selection</p>
                  <div className="selection-mode-buttons">
                    <button
                      type="button"
                      className={getSelectionModeButtonClassName(isZoneMode)}
                      disabled={!isSelectionStep}
                      onClick={() => {
                        handleSelectionModeChange("zone");
                      }}
                    >
                      Cercle
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
                  <section className="parameter-card">
                    <div className="radius-header">
                      <p className="parameter-title">Rayon</p>
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
                      <span>300 km</span>
                    </div>
                  </section>
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
                        {(isDepartmentMode ? departmentOptions : regionOptions).map((area) => (
                          <option key={area.code} value={area.code}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="radius-help">
                      Cliquez sur la carte pour ajouter ou retirer une zone, ou utilisez
                      cette liste multiple.
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
                                    currentCodes.filter((currentCode) => currentCode !== department.code),
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
                                    currentCodes.filter((currentCode) => currentCode !== region.code),
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
              </section>
            )}

            {!isSelectionStep && (
              <section className="selection-card cities-card">
                <div className="cities-header">
                  <p className="selection-label section-title-tight">
                    {isCircuitStep
                      ? "Etape 2 - circuit"
                      : "Etape 3 - lieux a visiter"}
                  </p>
                  <span className="cities-summary-badge">
                    {isPlacesStep
                      ? formatCountLabel(circuitPlaces.length, "lieu")
                      : formatCountLabel(circuitCities.length, "ville")}
                  </span>
                </div>

                {isCircuitStep && (
                  <>
                    <div className="circuit-actions">
                      <button
                        type="button"
                        className="circuit-action-button"
                        onClick={() => {
                          setCircuitHistory((currentCircuitHistory) =>
                            undoCircuitHistory(currentCircuitHistory),
                          );
                        }}
                        disabled={circuitHistory.past.length === 0}
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
                        disabled={circuitHistory.future.length === 0}
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
                        disabled={circuitCities.length === 0}
                      >
                        Reinitialiser
                      </button>
                    </div>
                    <p className="circuit-total-distance">
                      Total: <strong>{formatCircuitDistance(circuitTotalDistanceKm)}</strong>
                    </p>
                    <p className="cities-highlight">
                      Cliquez sur une ville de la carte pour l'ajouter au circuit.
                    </p>
                  </>
                )}

                {isPlacesStep && (
                  <>
                    <p className="circuit-total-distance">
                      Circuit courant: <strong>{formatCircuitDistance(circuitTotalDistanceKm)}</strong>
                    </p>
                    {!canLoadCircuitPlaces ? (
                      <p className="cities-highlight">
                        Ajoutez au moins 2 villes au circuit pour rendre cette etape pertinente.
                      </p>
                    ) : null}
                    {shouldShowCircuitPlaces && isLoadingVisitPlaces && (
                      <p className="cities-summary">
                        Chargement des lieux a visiter autour du circuit...
                      </p>
                    )}
                    {shouldShowCircuitPlaces && visitPlacesErrorMessage !== null && (
                      <p className="cities-error">{visitPlacesErrorMessage}</p>
                    )}
                    {shouldShowCircuitPlaces &&
                      !isLoadingVisitPlaces &&
                      visitPlacesErrorMessage === null &&
                      circuitPlaces.length === 0 && (
                        <p className="cities-summary">
                          Aucun lieu a visiter n'a ete trouve a proximite de ce circuit.
                        </p>
                      )}
                    {shouldShowCircuitPlaces &&
                      !isLoadingVisitPlaces &&
                      visitPlacesErrorMessage === null &&
                      circuitPlaces.length > 0 && (
                        <>
                          <div className="places-summary-card">
                            <p className="places-summary-kicker">Lecture de carte</p>
                            <p className="places-summary-title">
                              {formatCountLabel(circuitPlaces.length, "lieu")} trouve
                              {circuitPlaces.length > 1 ? "s" : ""}
                            </p>
                            <p className="places-summary-body">
                              {visibleVisitPlacesOnMapCount} visible
                              {visibleVisitPlacesOnMapCount > 1 ? "s" : ""} sur la carte.
                              La carte garde un sous-ensemble lisible selon le zoom pour
                              laisser le circuit prioritaire.
                            </p>
                          </div>
                          <div className="places-list">
                            {circuitPlaces.map((place) => (
                              <article
                                key={`${place.source}-${place.sourceId}`}
                                className="place-card"
                              >
                                <div className="place-card-header">
                                  <div>
                                    <h3 className="place-card-title">{place.name}</h3>
                                    <p className="place-card-meta">
                                      {place.category}
                                      {place.commune !== null ? ` - ${place.commune}` : ""}
                                    </p>
                                  </div>
                                  <span className="place-card-distance">
                                    {formatPlaceDistance(place.distanceToCircuitMeters)}
                                  </span>
                                </div>
                              </article>
                            ))}
                          </div>
                        </>
                      )}
                    <p className="circuit-total-distance">
                      Total: <strong>{formatCircuitDistance(circuitTotalDistanceKm)}</strong>
                    </p>
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
                  </>
                )}
              </section>
            )}

            {isSelectionStep && (
              <section className="selection-card coverage-card">
                <div className="coverage-card-header">
                  <div>
                    <p className="coverage-card-kicker">Couverture actuelle</p>
                    <p className="coverage-card-value">{currentCoverageLabel}</p>
                  </div>
                  <div className="coverage-card-icon" aria-hidden="true">
                    +
                  </div>
                </div>
              </section>
            )}
          </div>

          <footer className="sidebar-footer">
            <button
              type="button"
              className="sidebar-primary-action"
              onClick={handleNextStep}
              disabled={
                (isSelectionStep && !canOpenCircuitStep) ||
                (isCircuitStep && !canOpenPlacesStep) ||
                isPlacesStep
              }
            >
              <span>{primaryStepActionLabel}</span>
              <span className="sidebar-primary-action-arrow" aria-hidden="true">
                →
              </span>
            </button>
            {!isSelectionStep && (
              <div className="sidebar-footer-links">
                <button
                  type="button"
                  className="sidebar-footer-link"
                  onClick={handlePreviousStep}
                >
                  Etape precedente
                </button>
              </div>
            )}
          </footer>
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
            visitPlaces={shouldShowCircuitPlaces ? circuitPlaces : []}
            isLoadingVisitPlaces={isLoadingVisitPlaces}
            visitPlacesErrorMessage={visitPlacesErrorMessage}
            isCircuitPlacesEnabled={shouldShowCircuitPlaces}
            isLoadingCities={isLoadingCities}
            cityErrorMessage={cityErrorMessage}
            onVisibleCitiesChange={setVisibleCitiesOnMapCount}
            onVisibleVisitPlacesChange={setVisibleVisitPlacesOnMapCount}
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

function formatPlaceDistance(distanceMeters: number) {
  return distanceMeters >= 1000
    ? `${(distanceMeters / 1000).toFixed(1).replace(".", ",")} km`
    : `${Math.round(distanceMeters)} m`;
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
