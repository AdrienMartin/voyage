import { describe, expect, it } from "vitest";
import { resolveCitySearchPlan } from "./citySearchPlan";

const point = { lat: 48.8566, lon: 2.3522 };

describe("resolveCitySearchPlan", () => {
  it("does nothing in zone mode when no point is selected", () => {
    expect(
      resolveCitySearchPlan({
        selectionMode: "zone",
        selectedPoint: null,
        selectedDepartmentCodes: [],
        selectedRegionCodes: [],
        radiusInMeters: 50_000,
      }),
    ).toEqual({ type: "none" });
  });

  it("searches by zone when a point is selected", () => {
    expect(
      resolveCitySearchPlan({
        selectionMode: "zone",
        selectedPoint: point,
        selectedDepartmentCodes: ["75"],
        selectedRegionCodes: ["11"],
        radiusInMeters: 50_000,
      }),
    ).toEqual({
      type: "zone",
      point,
      radiusInMeters: 50_000,
    });
  });

  it("switches from department mode back to a zone search", () => {
    expect(
      resolveCitySearchPlan({
        selectionMode: "zone",
        selectedPoint: point,
        selectedDepartmentCodes: ["44"],
        selectedRegionCodes: [],
        radiusInMeters: 80_000,
      }),
    ).toEqual({
      type: "zone",
      point,
      radiusInMeters: 80_000,
    });
  });

  it("does nothing in department mode when nothing is selected", () => {
    expect(
      resolveCitySearchPlan({
        selectionMode: "department",
        selectedPoint: point,
        selectedDepartmentCodes: [],
        selectedRegionCodes: ["52"],
        radiusInMeters: 50_000,
      }),
    ).toEqual({ type: "none" });
  });

  it("searches by departments only in department mode", () => {
    expect(
      resolveCitySearchPlan({
        selectionMode: "department",
        selectedPoint: point,
        selectedDepartmentCodes: ["44", "49"],
        selectedRegionCodes: ["52"],
        radiusInMeters: 50_000,
      }),
    ).toEqual({
      type: "administrative",
      departmentCodes: ["44", "49"],
    });
  });

  it("does nothing in region mode when nothing is selected", () => {
    expect(
      resolveCitySearchPlan({
        selectionMode: "region",
        selectedPoint: point,
        selectedDepartmentCodes: ["44"],
        selectedRegionCodes: [],
        radiusInMeters: 50_000,
      }),
    ).toEqual({ type: "none" });
  });

  it("searches by regions only in region mode", () => {
    expect(
      resolveCitySearchPlan({
        selectionMode: "region",
        selectedPoint: point,
        selectedDepartmentCodes: ["44"],
        selectedRegionCodes: ["52", "24"],
        radiusInMeters: 50_000,
      }),
    ).toEqual({
      type: "administrative",
      regionCodes: ["52", "24"],
    });
  });
});
