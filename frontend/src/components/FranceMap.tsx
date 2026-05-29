import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Feature,
  GeoJsonProperties,
  Geometry,
  Polygon,
} from "geojson";
import type { GeoJSONSource, Map } from "maplibre-gl";
import type * as maplibreglType from "maplibre-gl";
import {
  createCircleFeature,
  getDestinationPoint,
  getDistanceInMeters,
  isPointInMetropolitanFrance,
} from "../lib/geo";
import {
  type CircuitCity,
} from "../features/circuit/circuit";
import {
  createProjectedCircuitSegment,
  groupProjectedCircuitStops,
  projectCircuitCities,
} from "../features/circuit/circuitOverlay";
import { resolveMapClickAction } from "../features/map/mapClick";
import { selectDisplayedCities, type MapBounds } from "../features/cities/cityDisplay";
import { projectAdministrativeAreas } from "../features/areas/administrativeOverlay";
import { findAdministrativeAreaAtPoint } from "../features/areas/administrativeGeometry";
import type { AdministrativeAreaFeatureProperties } from "../features/areas/useAdministrativeAreas";
import { AdministrativeAreasOverlay } from "./AdministrativeAreasOverlay";
import type { City } from "../types/cities";
import type { SelectedPoint } from "../types/geo";
import type { SelectionMode, WorkflowStep } from "../types/selection";

const FRANCE_CENTER: [number, number] = [2.2137, 46.2276];
const FRANCE_BOUNDS: [[number, number], [number, number]] = [
  [-5.5, 41.0],
  [9.8, 51.5],
];
const BASEMAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const CIRCLE_SOURCE_ID = "selection-circle";
const CIRCLE_FILL_LAYER_ID = "selection-circle-fill";
const CIRCLE_STROKE_LAYER_ID = "selection-circle-stroke";
const CITIES_SOURCE_ID = "cities";
const CITY_LABELS_SOURCE_ID = "city-labels";
const CITIES_CIRCLE_LAYER_ID = "cities-circle";
const CITIES_LABEL_LAYER_ID = "cities-label";
const REGIONS_SOURCE_ID = "regions";
const REGIONS_SELECTED_SOURCE_ID = "regions-selected";
const REGIONS_FILL_LAYER_ID = "regions-fill";
const REGIONS_STROKE_LAYER_ID = "regions-stroke";
const REGIONS_LABEL_LAYER_ID = "regions-label";
const REGIONS_SELECTED_FILL_LAYER_ID = "regions-selected-fill";
const REGIONS_SELECTED_STROKE_LAYER_ID = "regions-selected-stroke";
const DEPARTMENTS_SOURCE_ID = "departments";
const DEPARTMENTS_SELECTED_SOURCE_ID = "departments-selected";
const DEPARTMENTS_FILL_LAYER_ID = "departments-fill";
const DEPARTMENTS_STROKE_LAYER_ID = "departments-stroke";
const DEPARTMENTS_LABEL_LAYER_ID = "departments-label";
const DEPARTMENTS_SELECTED_FILL_LAYER_ID = "departments-selected-fill";
const DEPARTMENTS_SELECTED_STROKE_LAYER_ID = "departments-selected-stroke";

type FranceMapProps = {
  workflowStep: WorkflowStep;
  selectionMode: SelectionMode;
  selectedPoint: SelectedPoint | null;
  radiusInMeters: number;
  minRadiusInMeters: number;
  maxRadiusInMeters: number;
  departments: GeoJSON.FeatureCollection<
    GeoJSON.Geometry,
    AdministrativeAreaFeatureProperties
  > | null;
  regions: GeoJSON.FeatureCollection<
    GeoJSON.Geometry,
    AdministrativeAreaFeatureProperties
  > | null;
  selectedDepartmentCodes: string[];
  selectedRegionCodes: string[];
  cities: City[];
  circuitCities: CircuitCity[];
  isLoadingCities: boolean;
  cityErrorMessage: string | null;
  onVisibleCitiesChange: (count: number) => void;
  onToggleDepartment: (code: string) => void;
  onRadiusChange: (radiusInMeters: number) => void;
  onToggleRegion: (code: string) => void;
  onToggleCircuitCity: (city: City | CircuitCity) => void;
  onSelectPoint: (point: SelectedPoint) => void;
};

export function FranceMap({
  workflowStep,
  selectionMode,
  selectedPoint,
  radiusInMeters,
  minRadiusInMeters,
  maxRadiusInMeters,
  departments,
  regions,
  selectedDepartmentCodes,
  selectedRegionCodes,
  cities,
  circuitCities,
  isLoadingCities,
  cityErrorMessage,
  onVisibleCitiesChange,
  onToggleDepartment,
  onRadiusChange,
  onToggleRegion,
  onToggleCircuitCity,
  onSelectPoint,
}: FranceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<maplibreglType.Marker | null>(null);
  const radiusHandleRef = useRef<maplibreglType.Marker | null>(null);
  const maplibreRef = useRef<typeof maplibreglType | null>(null);
  const suppressNextMapClickRef = useRef(false);
  const isDraggingRadiusHandleRef = useRef(false);
  const radiusInMetersRef = useRef(radiusInMeters);
  const workflowStepRef = useRef(workflowStep);
  const selectionModeRef = useRef(selectionMode);
  const viewportAnimationFrameRef = useRef<number | null>(null);
  const citiesRef = useRef<City[]>(cities);
  const departmentsRef = useRef(departments);
  const regionsRef = useRef(regions);
  const selectedDepartmentCodesRef = useRef(selectedDepartmentCodes);
  const selectedRegionCodesRef = useRef(selectedRegionCodes);
  const onToggleDepartmentRef = useRef(onToggleDepartment);
  const onRadiusChangeRef = useRef(onRadiusChange);
  const onSelectPointRef = useRef(onSelectPoint);
  const onToggleRegionRef = useRef(onToggleRegion);
  const onToggleCircuitCityRef = useRef(onToggleCircuitCity);
  const [mapStatus, setMapStatus] = useState<
    "loading" | "ready" | "error" | "outside-france"
  >("loading");
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const [isDraggingRadiusHandle, setIsDraggingRadiusHandle] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(4.8);
  const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null);
  const [hoveredCityName, setHoveredCityName] = useState<string | null>(null);
  const [hoveredAreaName, setHoveredAreaName] = useState<string | null>(null);
  const isSelectionStep = workflowStep === "selection";
  const isCircuitStep = workflowStep === "circuit";
  const isSummaryStep = workflowStep === "summary";
  const isZoneMode = selectionMode === "zone";
  const hasAdministrativeSelection =
    selectedDepartmentCodes.length > 0 || selectedRegionCodes.length > 0;

  // Keep MapLibre event handlers in sync immediately after React renders.
  citiesRef.current = cities;
  radiusInMetersRef.current = radiusInMeters;
  departmentsRef.current = departments;
  regionsRef.current = regions;
  selectedDepartmentCodesRef.current = selectedDepartmentCodes;
  selectedRegionCodesRef.current = selectedRegionCodes;
  onToggleDepartmentRef.current = onToggleDepartment;
  onRadiusChangeRef.current = onRadiusChange;
  onSelectPointRef.current = onSelectPoint;
  onToggleRegionRef.current = onToggleRegion;
  onToggleCircuitCityRef.current = onToggleCircuitCity;
  workflowStepRef.current = workflowStep;
  selectionModeRef.current = selectionMode;

  useEffect(() => {
    isDraggingRadiusHandleRef.current = isDraggingRadiusHandle;
  }, [isDraggingRadiusHandle]);

  useEffect(() => {
    setHoveredAreaName(null);
    setHoveredCityName(null);

    if (selectionMode !== "zone" && mapStatus === "outside-france") {
      setMapStatus("ready");
    }
  }, [mapStatus, selectionMode, workflowStep]);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null || isDraggingRadiusHandleRef.current) {
      return;
    }

    map.getCanvas().style.cursor = "crosshair";
  }, [selectionMode, selectedDepartmentCodes, selectedRegionCodes]);

  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) {
      return;
    }

    let isDisposed = false;
    let currentMap: Map | null = null;

    const initializeMap = async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (isDisposed || containerRef.current === null) {
          return;
        }

        maplibreRef.current = maplibregl;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLE_URL,
          center: FRANCE_CENTER,
          zoom: 4.8,
          minZoom: 4,
          maxZoom: 12,
          maxBounds: FRANCE_BOUNDS,
        });
        map.getCanvas().style.cursor = "crosshair";

        const handleLoad = () => {
          hideBasemapLabels(map);
          syncViewportState(map, setCurrentZoom, setCurrentBounds);

          map.addSource(CIRCLE_SOURCE_ID, {
            type: "geojson",
            data: emptyCircleFeature(),
          });

          map.addLayer({
            id: CIRCLE_FILL_LAYER_ID,
            type: "fill",
            source: CIRCLE_SOURCE_ID,
            paint: {
              "fill-color": "#2f7cf6",
              "fill-opacity": 0.12,
            },
          });

          map.addLayer({
            id: CIRCLE_STROKE_LAYER_ID,
            type: "line",
            source: CIRCLE_SOURCE_ID,
            paint: {
              "line-color": "#2f7cf6",
              "line-width": 2,
              "line-opacity": 0.9,
            },
          });

          map.addSource(CITIES_SOURCE_ID, {
            type: "geojson",
            data: emptyCitiesFeatureCollection(),
          });

          map.addSource(CITY_LABELS_SOURCE_ID, {
            type: "geojson",
            data: emptyCitiesFeatureCollection(),
          });

          map.addSource(REGIONS_SOURCE_ID, {
            type: "geojson",
            data: emptyAdministrativeAreasFeatureCollection(),
          });

          map.addSource(REGIONS_SELECTED_SOURCE_ID, {
            type: "geojson",
            data: emptyAdministrativeAreasFeatureCollection(),
          });

          map.addSource(DEPARTMENTS_SOURCE_ID, {
            type: "geojson",
            data: emptyAdministrativeAreasFeatureCollection(),
          });

          map.addSource(DEPARTMENTS_SELECTED_SOURCE_ID, {
            type: "geojson",
            data: emptyAdministrativeAreasFeatureCollection(),
          });

          map.addLayer({
            id: CITIES_CIRCLE_LAYER_ID,
            type: "circle",
            source: CITIES_SOURCE_ID,
            paint: {
              "circle-color": "#163d78",
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["get", "population"],
                0,
                4,
                50000,
                6,
                200000,
                10,
                2000000,
                16,
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
              "circle-opacity": 0.88,
            },
          });

          map.addLayer({
            id: CITIES_LABEL_LAYER_ID,
            type: "symbol",
            source: CITY_LABELS_SOURCE_ID,
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Semibold"],
              "symbol-sort-key": ["*", -1, ["get", "population"]],
              "text-size": 12,
              "text-variable-anchor": ["top", "bottom", "left", "right"],
              "text-radial-offset": 1.1,
              "text-allow-overlap": false,
              "text-max-width": 10,
            },
            paint: {
              "text-color": "#10233d",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.4,
            },
          });

          map.addLayer({
            id: REGIONS_FILL_LAYER_ID,
            type: "fill",
            source: REGIONS_SOURCE_ID,
            paint: {
              "fill-color": "#3e8ed8",
              "fill-opacity": 0.001,
            },
          });

          map.addLayer({
            id: REGIONS_STROKE_LAYER_ID,
            type: "line",
            source: REGIONS_SOURCE_ID,
            paint: {
              "line-color": "#1c5c9e",
              "line-width": 2,
              "line-opacity": 0.85,
            },
          });

          map.addLayer({
            id: REGIONS_LABEL_LAYER_ID,
            type: "symbol",
            source: REGIONS_SOURCE_ID,
            layout: {
              "text-field": ["get", "nom"],
              "text-font": ["Open Sans Semibold"],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                4,
                12,
                7,
                14,
                10,
                16,
              ],
              "text-allow-overlap": true,
              "text-ignore-placement": false,
              "text-max-width": 10,
              "symbol-z-order": "source",
            },
            paint: {
              "text-color": "#0f2c4a",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.4,
            },
          });

          map.addLayer({
            id: REGIONS_SELECTED_FILL_LAYER_ID,
            type: "fill",
            source: REGIONS_SELECTED_SOURCE_ID,
            paint: {
              "fill-color": "#f1b766",
              "fill-opacity": 0.4,
            },
          });

          map.addLayer({
            id: REGIONS_SELECTED_STROKE_LAYER_ID,
            type: "line",
            source: REGIONS_SELECTED_SOURCE_ID,
            paint: {
              "line-color": "#d87e12",
              "line-width": 3.5,
              "line-opacity": 0.92,
            },
          });

          map.addLayer({
            id: DEPARTMENTS_FILL_LAYER_ID,
            type: "fill",
            source: DEPARTMENTS_SOURCE_ID,
            paint: {
              "fill-color": "#3e8ed8",
              "fill-opacity": 0.001,
            },
          });

          map.addLayer({
            id: DEPARTMENTS_STROKE_LAYER_ID,
            type: "line",
            source: DEPARTMENTS_SOURCE_ID,
            paint: {
              "line-color": "#1c5c9e",
              "line-width": 1.6,
              "line-opacity": 0.85,
            },
          });

          map.addLayer({
            id: DEPARTMENTS_LABEL_LAYER_ID,
            type: "symbol",
            source: DEPARTMENTS_SOURCE_ID,
            layout: {
              "text-field": ["get", "nom"],
              "text-font": ["Open Sans Semibold"],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5,
                10,
                7,
                11,
                9,
                12,
              ],
              "text-allow-overlap": true,
              "text-ignore-placement": false,
              "text-max-width": 8,
              "symbol-z-order": "source",
            },
            paint: {
              "text-color": "#153554",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.2,
            },
          });

          map.addLayer({
            id: DEPARTMENTS_SELECTED_FILL_LAYER_ID,
            type: "fill",
            source: DEPARTMENTS_SELECTED_SOURCE_ID,
            paint: {
              "fill-color": "#f1b766",
              "fill-opacity": 0.38,
            },
          });

          map.addLayer({
            id: DEPARTMENTS_SELECTED_STROKE_LAYER_ID,
            type: "line",
            source: DEPARTMENTS_SELECTED_SOURCE_ID,
            paint: {
              "line-color": "#d87e12",
              "line-width": 2.8,
              "line-opacity": 0.92,
            },
          });

          const regionsSource = map.getSource(REGIONS_SOURCE_ID) as GeoJSONSource;
          const regionsSelectedSource = map.getSource(
            REGIONS_SELECTED_SOURCE_ID,
          ) as GeoJSONSource;
          const departmentsSource = map.getSource(DEPARTMENTS_SOURCE_ID) as GeoJSONSource;
          const departmentsSelectedSource = map.getSource(
            DEPARTMENTS_SELECTED_SOURCE_ID,
          ) as GeoJSONSource;

          regionsSource.setData(
            regionsRef.current ?? emptyAdministrativeAreasFeatureCollection(),
          );
          regionsSelectedSource.setData(
            selectAdministrativeAreaFeatureCollection(
              regionsRef.current,
              selectedRegionCodesRef.current,
            ),
          );
          departmentsSource.setData(
            departmentsRef.current ?? emptyAdministrativeAreasFeatureCollection(),
          );
          departmentsSelectedSource.setData(
            selectAdministrativeAreaFeatureCollection(
              departmentsRef.current,
              selectedDepartmentCodesRef.current,
            ),
          );

          hideAdministrativeAreaLayers(map);

          setIsMapReady(true);
          setMapStatus("ready");
        };

        const handleInitialLoadError = () => {
          setMapStatus("error");
        };

        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.once("load", handleLoad);
        map.once("error", handleInitialLoadError);
        const syncViewportStateOnFrame = () => {
          if (viewportAnimationFrameRef.current !== null) {
            return;
          }

          viewportAnimationFrameRef.current = window.requestAnimationFrame(() => {
            viewportAnimationFrameRef.current = null;
            syncViewportState(map, setCurrentZoom, setCurrentBounds);
          });
        };

        map.on("zoom", syncViewportStateOnFrame);
        map.on("move", syncViewportStateOnFrame);
        map.on("mousemove", (event) => {
          const activeSelectionMode = selectionModeRef.current;
          const isSelectionInteractionStep = workflowStepRef.current === "selection";
          const administrativeArea =
            !isSelectionInteractionStep
              ? null
              : activeSelectionMode === "region"
              ? findAdministrativeAreaAtPoint(regionsRef.current, {
                  lat: event.lngLat.lat,
                  lon: event.lngLat.lng,
                })
              : activeSelectionMode === "department"
                ? findAdministrativeAreaAtPoint(departmentsRef.current, {
                    lat: event.lngLat.lat,
                    lon: event.lngLat.lng,
                  })
                : null;
          if (administrativeArea !== null) {
            map.getCanvas().style.cursor = "pointer";
            setHoveredAreaName(administrativeArea.nom);
            setHoveredCityName(null);
            return;
          }

          const cityLayers = getExistingLayerIds(map, [
            CITIES_CIRCLE_LAYER_ID,
            CITIES_LABEL_LAYER_ID,
          ]);
          const cityFeature =
            workflowStepRef.current !== "circuit"
              ? undefined
              :
            cityLayers.length === 0
              ? undefined
              : map.queryRenderedFeatures(event.point, {
                  layers: cityLayers,
                })[0];

          if (cityFeature !== undefined) {
            if (!isDraggingRadiusHandleRef.current) {
              map.getCanvas().style.cursor = "pointer";
            }
            const cityName = cityFeature.properties?.name;
            setHoveredCityName(typeof cityName === "string" ? cityName : null);
            setHoveredAreaName(null);
            return;
          }

          if (!isDraggingRadiusHandleRef.current) {
            map.getCanvas().style.cursor = "crosshair";
            setHoveredCityName(null);
            setHoveredAreaName(null);
          }
        });
        map.on("mouseleave", () => {
          if (!isDraggingRadiusHandleRef.current) {
            map.getCanvas().style.cursor = "crosshair";
          }
          setHoveredCityName(null);
          setHoveredAreaName(null);
        });
        currentMap = map;
        mapRef.current = map;
      } catch {
        if (!isDisposed) {
          setMapStatus("error");
        }
      }
    };

    void initializeMap();

    return () => {
      isDisposed = true;
      setIsMapReady(false);
      if (viewportAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportAnimationFrameRef.current);
        viewportAnimationFrameRef.current = null;
      }
      currentMap?.remove();
      maplibreRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !isMapReady) {
      return;
    }

    const handleMapClick = (event: maplibreglType.MapMouseEvent) => {
      if (suppressNextMapClickRef.current) {
        suppressNextMapClickRef.current = false;
        return;
      }

      const currentWorkflowStep = workflowStepRef.current;
      const currentSelectionMode = selectionModeRef.current;
      const clickedPoint = {
        lat: event.lngLat.lat,
        lon: event.lngLat.lng,
      };
      const clickedRegion =
        currentWorkflowStep === "selection" && currentSelectionMode === "region"
          ? findAdministrativeAreaAtPoint(regionsRef.current, clickedPoint)
          : null;
      const clickedDepartment =
        currentWorkflowStep === "selection" && currentSelectionMode === "department"
          ? findAdministrativeAreaAtPoint(departmentsRef.current, clickedPoint)
          : null;

      const clickableCityLayers = getExistingLayerIds(map, [
        CITIES_CIRCLE_LAYER_ID,
        CITIES_LABEL_LAYER_ID,
      ]);
      const cityFeature =
        currentWorkflowStep !== "circuit"
          ? undefined
          : clickableCityLayers.length === 0
            ? undefined
            : map.queryRenderedFeatures(event.point, {
                layers: clickableCityLayers,
              })[0];
      const clickedCity =
        cityFeature === undefined
          ? null
          : citiesRef.current.find(
              (candidateCity) =>
                candidateCity.inseeCode === cityFeature.properties?.inseeCode,
            ) ?? null;

      const action = resolveMapClickAction({
        workflowStep: currentWorkflowStep,
        selectionMode: currentSelectionMode,
        clickedPoint,
        clickedDepartmentCode: clickedDepartment?.code,
        clickedRegionCode: clickedRegion?.code,
        clickedCity,
        isPointInMetropolitanFrance: isPointInMetropolitanFrance(clickedPoint),
      });

      if (action.type === "toggle-region") {
        onToggleRegionRef.current(action.code);
        return;
      }

      if (action.type === "toggle-department") {
        onToggleDepartmentRef.current(action.code);
        return;
      }

      if (action.type === "toggle-city") {
        onToggleCircuitCityRef.current(action.city);
        return;
      }

      if (action.type === "outside-france") {
        setMapStatus("outside-france");
        return;
      }

      if (action.type === "select-point") {
        setMapStatus("ready");
        renderSelectionCircle(map, action.point, radiusInMetersRef.current);
        onSelectPointRef.current(action.point);
      }
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (map === null || maplibregl === null) {
      return;
    }

    markerRef.current?.remove();
    markerRef.current = null;

    if (selectedPoint === null || !isSelectionStep) {
      return;
    }

    const markerElement = document.createElement("div");
    markerElement.className = "selection-marker";

    const marker = new maplibregl.Marker({
      element: markerElement,
      anchor: "center",
      draggable: isSelectionStep,
    })
      .setLngLat([selectedPoint.lon, selectedPoint.lat])
      .addTo(map);

    marker.on("dragstart", () => {
      setIsDraggingMarker(true);
      suppressNextMapClickRef.current = true;
    });

    marker.on("dragend", () => {
      setIsDraggingMarker(false);
      const nextLocation = marker.getLngLat();
      const nextPoint = {
        lat: nextLocation.lat,
        lon: nextLocation.lng,
      };

      if (!isPointInMetropolitanFrance(nextPoint)) {
        marker.setLngLat([selectedPoint.lon, selectedPoint.lat]);
        setMapStatus("outside-france");
        return;
      }

      setMapStatus("ready");
      onSelectPoint(nextPoint);
    });

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [isSelectionStep, onSelectPoint, selectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (map === null || maplibregl === null) {
      return;
    }

    radiusHandleRef.current?.remove();
    radiusHandleRef.current = null;

    if (selectedPoint === null || !isSelectionStep) {
      return;
    }

    const radiusHandleElement = document.createElement("div");
    radiusHandleElement.className = "radius-handle-marker";

    const radiusHandle = new maplibregl.Marker({
      element: radiusHandleElement,
      anchor: "center",
      draggable: true,
    })
      .setLngLat(getRadiusHandleLngLat(selectedPoint, radiusInMeters))
      .addTo(map);

    radiusHandle.on("dragstart", () => {
      setIsDraggingRadiusHandle(true);
      setHoveredCityName(null);
      suppressNextMapClickRef.current = true;
      map.getCanvas().style.cursor = "grabbing";
    });

    radiusHandle.on("drag", () => {
      const nextLocation = radiusHandle.getLngLat();
      onRadiusChangeRef.current(
        clampRadius(
          getDistanceInMeters(selectedPoint, {
            lat: nextLocation.lat,
            lon: nextLocation.lng,
          }),
          minRadiusInMeters,
          maxRadiusInMeters,
        ),
      );
    });

    radiusHandle.on("dragend", () => {
      setIsDraggingRadiusHandle(false);
      suppressNextMapClickRef.current = true;
      map.getCanvas().style.cursor = "crosshair";
      radiusHandle.setLngLat(
        getRadiusHandleLngLat(selectedPoint, radiusInMetersRef.current),
      );
    });

    radiusHandleRef.current = radiusHandle;

    return () => {
      radiusHandle.remove();
      radiusHandleRef.current = null;
    };
  }, [
    isSelectionStep,
    maxRadiusInMeters,
    minRadiusInMeters,
    selectedPoint,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isMapReady || map === null || !map.isStyleLoaded()) {
      return;
    }

    const source = map.getSource(CIRCLE_SOURCE_ID) as GeoJSONSource | undefined;
    if (source === undefined) {
      return;
    }

    source.setData(
      selectedPoint === null || isDraggingMarker
        ? emptyCircleFeature()
        : createCircleFeature(selectedPoint, radiusInMeters),
    );
  }, [isDraggingMarker, isMapReady, radiusInMeters, selectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isMapReady || map === null || !map.isStyleLoaded()) {
      return;
    }

    if (
      map.getLayer(CIRCLE_FILL_LAYER_ID) === undefined ||
      map.getLayer(CIRCLE_STROKE_LAYER_ID) === undefined
    ) {
      return;
    }

    const showSelectionCircle = isZoneMode && selectedPoint !== null;
    const fillOpacity =
      showSelectionCircle && isSelectionStep ? 0.12 : showSelectionCircle ? 0.04 : 0;
    const strokeOpacity = showSelectionCircle ? 0.9 : 0;

    map.setPaintProperty(CIRCLE_FILL_LAYER_ID, "fill-opacity", fillOpacity);
    map.setPaintProperty(CIRCLE_STROKE_LAYER_ID, "line-opacity", strokeOpacity);
  }, [isMapReady, isSelectionStep, isZoneMode, selectedPoint]);

  useEffect(() => {
    if (selectedPoint === null || isDraggingRadiusHandle) {
      return;
    }

    radiusHandleRef.current?.setLngLat(getRadiusHandleLngLat(selectedPoint, radiusInMeters));
  }, [isDraggingRadiusHandle, radiusInMeters, selectedPoint]);

  const displayedCities = useMemo(
    () => selectDisplayedCities(cities, currentBounds, currentZoom),
    [cities, currentBounds, currentZoom],
  );

  useEffect(() => {
    onVisibleCitiesChange(displayedCities.length);
  }, [displayedCities.length, onVisibleCitiesChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isMapReady || map === null || !map.isStyleLoaded()) {
      return;
    }

    const source = map.getSource(CITIES_SOURCE_ID) as GeoJSONSource | undefined;
    const labelSource = map.getSource(CITY_LABELS_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    if (source === undefined || labelSource === undefined) {
      return;
    }

    source.setData(createCitiesFeatureCollection(displayedCities));
    labelSource.setData(createCitiesFeatureCollection(displayedCities));
  }, [displayedCities, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isMapReady || map === null || !map.isStyleLoaded()) {
      return;
    }

    const regionsSource = map.getSource(REGIONS_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    const regionsSelectedSource = map.getSource(REGIONS_SELECTED_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    const departmentsSource = map.getSource(DEPARTMENTS_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    const departmentsSelectedSource = map.getSource(DEPARTMENTS_SELECTED_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    if (
      regionsSource === undefined ||
      regionsSelectedSource === undefined ||
      departmentsSource === undefined ||
      departmentsSelectedSource === undefined
    ) {
      return;
    }

    regionsSource.setData(regions ?? emptyAdministrativeAreasFeatureCollection());
    regionsSelectedSource.setData(
      selectAdministrativeAreaFeatureCollection(regions, selectedRegionCodes),
    );
    departmentsSource.setData(
      departments ?? emptyAdministrativeAreasFeatureCollection(),
    );
    departmentsSelectedSource.setData(
      selectAdministrativeAreaFeatureCollection(departments, selectedDepartmentCodes),
    );

    hideAdministrativeAreaLayers(map);
  }, [
    departments,
    isMapReady,
    regions,
    selectedDepartmentCodes,
    selectedRegionCodes,
  ]);

  const projectedCircuitCities = useMemo(
    () => projectCircuitCities(mapRef.current, circuitCities),
    [circuitCities, currentBounds, currentZoom],
  );
  const projectedCircuitStops = useMemo(
    () => groupProjectedCircuitStops(projectedCircuitCities),
    [projectedCircuitCities],
  );
  const projectedCircuitSegments = useMemo(
    () =>
      projectedCircuitCities
        .slice(1)
        .map((city, index) =>
          createProjectedCircuitSegment(projectedCircuitCities[index], city),
        ),
    [projectedCircuitCities],
  );
  const displayedCityInseeCodes = useMemo(
    () => new Set(displayedCities.map((displayedCity) => displayedCity.inseeCode)),
    [displayedCities],
  );
  const projectedAdministrativeAreas = useMemo(
    () =>
      projectAdministrativeAreas(
        mapRef.current,
        selectionMode === "region"
          ? regions
          : selectionMode === "department"
            ? departments
            : null,
      ),
    [currentBounds, currentZoom, departments, regions, selectionMode],
  );
  return (
    <section className="map-panel" aria-label="Carte de France">
      <div className="map-frame">
        <div ref={containerRef} className="map-canvas" />
        <AdministrativeAreasOverlay
          projectedAdministrativeAreas={projectedAdministrativeAreas}
          selectedDepartmentCodes={selectedDepartmentCodes}
          selectedRegionCodes={selectedRegionCodes}
          selectionMode={selectionMode}
          workflowStep={workflowStep}
        />
        <div className="circuit-overlay-layer">
          {projectedCircuitSegments.map((segment) => (
            <div
              key={segment.key}
              className="circuit-overlay-segment"
              style={{
                left: `${segment.left}px`,
                top: `${segment.top}px`,
                width: `${segment.length}px`,
                transform: `translateY(-50%) rotate(${segment.angleDeg}deg)`,
              }}
            />
          ))}
          {projectedCircuitStops.map((circuitStop) => (
            <div
              key={circuitStop.inseeCode}
              className="circuit-stop-overlay"
              style={{
                left: `${circuitStop.x}px`,
                top: `${circuitStop.y}px`,
              }}
            >
              <button
                type="button"
                className="circuit-city-marker"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleCircuitCityRef.current(circuitStop);
                }}
                aria-label={`Ville ${circuitStop.name}, étapes ${circuitStop.orders.join(", ")}`}
              >
                <span className="circuit-city-marker-order">
                  {circuitStop.orders.join(" · ")}
                </span>
              </button>
              {!displayedCityInseeCodes.has(circuitStop.inseeCode) && (
                <span className="circuit-city-name-label">{circuitStop.name}</span>
              )}
            </div>
          ))}
        </div>
        <div className="map-overlay-card">
          <p className="map-overlay-eyebrow">Carte active</p>
          <p className="map-overlay-title">
            {isSelectionStep && !isZoneMode && !hasAdministrativeSelection
              ? selectionMode === "department"
                ? "Sélectionnez un ou plusieurs départements"
                : "Sélectionnez une ou plusieurs régions"
              : isSelectionStep && isZoneMode && selectedPoint === null
                ? "Sélectionnez une zone pour afficher les villes"
              : isCircuitStep
                ? "Cliquez sur les villes pour construire le circuit"
              : isSummaryStep
                ? "Récapitulatif du circuit"
              : cityErrorMessage !== null
                ? "Le chargement des villes a échoué"
                : isLoadingCities
                  ? "Recherche des villes en cours"
                  : cities.length > 0
                    ? `${cities.length} villes trouvées`
                    : isZoneMode
                      ? "Aucune ville trouvée dans cette zone"
                      : "Aucune ville trouvée dans cette sélection"}
          </p>
          {(isZoneMode ? selectedPoint !== null : hasAdministrativeSelection) &&
            cityErrorMessage !== null && (
            <p className="map-overlay-body">
              Vérifiez que le backend est bien lancé, puis recommencez la recherche.
            </p>
          )}
          {(isZoneMode ? selectedPoint !== null : hasAdministrativeSelection) &&
            cityErrorMessage === null &&
            isLoadingCities && (
            <p className="map-overlay-body">
              La recherche met à jour la carte avec les villes de la sélection courante.
            </p>
          )}
          {(isZoneMode ? selectedPoint !== null : hasAdministrativeSelection) &&
            cityErrorMessage === null &&
            !isLoadingCities &&
            cities.length === 0 && (
              <p className="map-overlay-body">
                {isZoneMode
                  ? "Essayez un rayon plus large ou déplacez le point vers une zone plus dense."
                  : "Ajoutez d'autres zones ou changez de niveau administratif."}
              </p>
            )}
          {(isZoneMode ? selectedPoint !== null : hasAdministrativeSelection) &&
            cityErrorMessage === null &&
            !isLoadingCities &&
            cities.length > 0 && (
            <p className="map-overlay-body">
              {displayedCities.length} ville{displayedCities.length > 1 ? "s" : ""} affichée
              {displayedCities.length > 1 ? "s" : ""} dans la vue courante.
            </p>
          )}
          {circuitCities.length > 0 && (
            <p className="map-overlay-body">
              Circuit en cours: {circuitCities.length} ville
              {circuitCities.length > 1 ? "s" : ""} sélectionnée
              {circuitCities.length > 1 ? "s" : ""}.
            </p>
          )}
          {isCircuitStep && hoveredCityName !== null && (
            <p className="map-overlay-body map-overlay-body-interaction">
              Cliquez sur <strong>{hoveredCityName}</strong> pour l'ajouter au circuit.
            </p>
          )}
          {isSelectionStep && hoveredAreaName !== null && (
            <p className="map-overlay-body map-overlay-body-interaction">
              Cliquez sur <strong>{hoveredAreaName}</strong> pour la sélectionner.
            </p>
          )}
        </div>
        <div className={`map-status map-status-${mapStatus}`}>
          {mapStatus === "loading" && "Chargement de la carte..."}
          {mapStatus === "ready" && "Carte prête."}
          {mapStatus === "outside-france" &&
            "Sélection possible uniquement en France métropolitaine."}
          {mapStatus === "error" &&
            "Le fond de carte n'a pas pu être chargé."}
        </div>
      </div>
    </section>
  );
}

function emptyCircleFeature(): Feature<Polygon, GeoJsonProperties> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[]],
    },
  };
}

function hideBasemapLabels(map: Map) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol") {
      continue;
    }

    map.setLayoutProperty(layer.id, "visibility", "none");
  }
}

function emptyCitiesFeatureCollection(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function emptyAdministrativeAreasFeatureCollection(): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function createCitiesFeatureCollection(
  cities: City[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: cities.map((city) => ({
      type: "Feature",
      properties: {
        inseeCode: city.inseeCode,
        name: city.name,
        population: city.population,
      },
      geometry: {
        type: "Point",
        coordinates: [city.longitude, city.latitude],
      },
    })),
  };
}

function syncViewportState(
  map: Map,
  setZoom: (zoom: number) => void,
  setBounds: (bounds: MapBounds) => void,
) {
  const bounds = map.getBounds();
  setZoom(map.getZoom());
  setBounds({
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  });
}

function getExistingLayerIds(map: Map, layerIds: string[]) {
  return layerIds.filter((layerId) => map.getLayer(layerId) !== undefined);
}

function hideAdministrativeAreaLayers(map: Map) {
  const administrativeLayerIds = [
    REGIONS_FILL_LAYER_ID,
    REGIONS_STROKE_LAYER_ID,
    REGIONS_LABEL_LAYER_ID,
    REGIONS_SELECTED_FILL_LAYER_ID,
    REGIONS_SELECTED_STROKE_LAYER_ID,
    DEPARTMENTS_FILL_LAYER_ID,
    DEPARTMENTS_STROKE_LAYER_ID,
    DEPARTMENTS_LABEL_LAYER_ID,
    DEPARTMENTS_SELECTED_FILL_LAYER_ID,
    DEPARTMENTS_SELECTED_STROKE_LAYER_ID,
  ];

  for (const layerId of administrativeLayerIds) {
    if (map.getLayer(layerId) !== undefined) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  }
}

function selectAdministrativeAreaFeatureCollection(
  featureCollection:
    | GeoJSON.FeatureCollection<GeoJSON.Geometry, AdministrativeAreaFeatureProperties>
    | null,
  selectedCodes: string[],
): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
  if (featureCollection === null || selectedCodes.length === 0) {
    return emptyAdministrativeAreasFeatureCollection();
  }

  return {
    type: "FeatureCollection",
    features: featureCollection.features.filter(
      (feature) => selectedCodes.includes(feature.properties.code),
    ),
  };
}

function getRadiusHandleLngLat(
  selectedPoint: SelectedPoint,
  radiusInMeters: number,
): [number, number] {
  const handlePoint = getDestinationPoint(selectedPoint, 90, radiusInMeters);
  return [handlePoint.lon, handlePoint.lat];
}

function clampRadius(
  radiusInMeters: number,
  minRadiusInMeters: number,
  maxRadiusInMeters: number,
) {
  return Math.min(maxRadiusInMeters, Math.max(minRadiusInMeters, radiusInMeters));
}

function renderSelectionCircle(
  map: Map,
  selectedPoint: SelectedPoint,
  radiusInMeters: number,
) {
  const source = map.getSource(CIRCLE_SOURCE_ID) as GeoJSONSource | undefined;
  if (source !== undefined) {
    source.setData(createCircleFeature(selectedPoint, radiusInMeters));
  }

  if (map.getLayer(CIRCLE_FILL_LAYER_ID) !== undefined) {
    map.setPaintProperty(CIRCLE_FILL_LAYER_ID, "fill-opacity", 0.12);
  }

  if (map.getLayer(CIRCLE_STROKE_LAYER_ID) !== undefined) {
    map.setPaintProperty(CIRCLE_STROKE_LAYER_ID, "line-opacity", 0.9);
  }
}
