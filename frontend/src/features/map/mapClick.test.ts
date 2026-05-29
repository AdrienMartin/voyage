import { describe, expect, it } from "vitest";
import { resolveMapClickAction } from "./mapClick";

const clickedPoint = { lat: 47.2184, lon: -1.5536 };
const clickedCity = {
  inseeCode: "44109",
  name: "NANTES",
  postalCodes: ["44000"],
  population: 325070,
  latitude: 47.2184,
  longitude: -1.5536,
  distanceMeters: 0,
};

describe("resolveMapClickAction", () => {
  it("selects a point in zone mode during step 1", () => {
    expect(
      resolveMapClickAction({
        workflowStep: "selection",
        selectionMode: "zone",
        clickedPoint,
        isPointInMetropolitanFrance: true,
      }),
    ).toEqual({
      type: "select-point",
      point: clickedPoint,
    });
  });

  it("keeps selecting a point after switching from an administrative mode to zone mode", () => {
    expect(
      resolveMapClickAction({
        workflowStep: "selection",
        selectionMode: "zone",
        clickedPoint,
        clickedDepartmentCode: "44",
        clickedRegionCode: "52",
        isPointInMetropolitanFrance: true,
      }),
    ).toEqual({
      type: "select-point",
      point: clickedPoint,
    });
  });

  it("toggles a region in region mode during step 1", () => {
    expect(
      resolveMapClickAction({
        workflowStep: "selection",
        selectionMode: "region",
        clickedPoint,
        clickedRegionCode: "52",
        isPointInMetropolitanFrance: true,
      }),
    ).toEqual({
      type: "toggle-region",
      code: "52",
    });
  });

  it("toggles a department in department mode during step 1", () => {
    expect(
      resolveMapClickAction({
        workflowStep: "selection",
        selectionMode: "department",
        clickedPoint,
        clickedDepartmentCode: "44",
        isPointInMetropolitanFrance: true,
      }),
    ).toEqual({
      type: "toggle-department",
      code: "44",
    });
  });

  it("toggles a city in circuit step", () => {
    expect(
      resolveMapClickAction({
        workflowStep: "circuit",
        selectionMode: "zone",
        clickedPoint,
        clickedCity,
        isPointInMetropolitanFrance: true,
      }),
    ).toEqual({
      type: "toggle-city",
      city: clickedCity,
    });
  });

  it("rejects a point outside metropolitan France in zone mode", () => {
    expect(
      resolveMapClickAction({
        workflowStep: "selection",
        selectionMode: "zone",
        clickedPoint,
        isPointInMetropolitanFrance: false,
      }),
    ).toEqual({
      type: "outside-france",
    });
  });

  it("does nothing in summary step", () => {
    expect(
      resolveMapClickAction({
        workflowStep: "summary",
        selectionMode: "zone",
        clickedPoint,
        clickedCity,
        clickedDepartmentCode: "44",
        clickedRegionCode: "52",
        isPointInMetropolitanFrance: true,
      }),
    ).toEqual({
      type: "none",
    });
  });
});
