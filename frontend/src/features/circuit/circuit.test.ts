import { describe, expect, it } from "vitest";
import type { City } from "../../types/cities";
import {
  addCircuitCity,
  createCircuitHistory,
  getCircuitLegs,
  getCircuitTotalDistanceKm,
  redoCircuitHistory,
  resetCircuitHistory,
  toCircuitCity,
  undoCircuitHistory,
  pushCircuitHistory,
} from "./circuit";

const paris: City = {
  inseeCode: "75056",
  name: "PARIS",
  postalCodes: ["75001"],
  population: 2_103_778,
  latitude: 48.8566,
  longitude: 2.3522,
  distanceMeters: 0,
};

const lyon: City = {
  inseeCode: "69123",
  name: "LYON",
  postalCodes: ["69001"],
  population: 522_250,
  latitude: 45.7578,
  longitude: 4.832,
  distanceMeters: 0,
};

const lille: City = {
  inseeCode: "59350",
  name: "LILLE",
  postalCodes: ["59000"],
  population: 236_710,
  latitude: 50.6292,
  longitude: 3.0573,
  distanceMeters: 0,
};

describe("addCircuitCity", () => {
  it("adds a city to an empty circuit", () => {
    expect(addCircuitCity([], paris)).toEqual([toCircuitCity(paris)]);
  });

  it("preserves the selection order when adding different cities", () => {
    expect(addCircuitCity([toCircuitCity(paris)], lyon)).toEqual([
      toCircuitCity(paris),
      toCircuitCity(lyon),
    ]);
  });

  it("allows revisiting the same city later in the circuit", () => {
    expect(
      addCircuitCity([toCircuitCity(paris), toCircuitCity(lyon)], paris),
    ).toEqual([toCircuitCity(paris), toCircuitCity(lyon), toCircuitCity(paris)]);
  });
});

describe("circuit distances", () => {
  it("returns zero distance for the first leg", () => {
    const legs = getCircuitLegs([toCircuitCity(paris)]);

    expect(legs).toEqual([
      {
        order: 1,
        city: toCircuitCity(paris),
        distanceFromPreviousKm: 0,
      },
    ]);
  });

  it("computes the distance between consecutive cities in order", () => {
    const legs = getCircuitLegs([toCircuitCity(paris), toCircuitCity(lyon)]);

    expect(legs[1].distanceFromPreviousKm).toBeGreaterThan(390);
    expect(legs[1].distanceFromPreviousKm).toBeLessThan(400);
  });

  it("sums all leg distances for the circuit total", () => {
    const totalDistanceKm = getCircuitTotalDistanceKm([
      toCircuitCity(paris),
      toCircuitCity(lyon),
      toCircuitCity(lille),
    ]);

    expect(totalDistanceKm).toBeGreaterThan(940);
    expect(totalDistanceKm).toBeLessThan(960);
  });
});

describe("circuit history", () => {
  it("records a new present and clears the redo stack", () => {
    const history = pushCircuitHistory(createCircuitHistory(), [toCircuitCity(paris)]);

    expect(history.past).toEqual([[]]);
    expect(history.present).toEqual([toCircuitCity(paris)]);
    expect(history.future).toEqual([]);
  });

  it("undoes to the previous circuit state", () => {
    const history = pushCircuitHistory(
      pushCircuitHistory(createCircuitHistory(), [toCircuitCity(paris)]),
      [toCircuitCity(paris), toCircuitCity(lyon)],
    );

    expect(undoCircuitHistory(history)).toEqual({
      past: [[]],
      present: [toCircuitCity(paris)],
      future: [[toCircuitCity(paris), toCircuitCity(lyon)]],
    });
  });

  it("redoes the next circuit state", () => {
    const history = undoCircuitHistory(
      pushCircuitHistory(
        pushCircuitHistory(createCircuitHistory(), [toCircuitCity(paris)]),
        [toCircuitCity(paris), toCircuitCity(lyon)],
      ),
    );

    expect(redoCircuitHistory(history)).toEqual({
      past: [[], [toCircuitCity(paris)]],
      present: [toCircuitCity(paris), toCircuitCity(lyon)],
      future: [],
    });
  });

  it("resets the circuit while preserving undo history", () => {
    const history = resetCircuitHistory(
      pushCircuitHistory(createCircuitHistory(), [toCircuitCity(paris)]),
    );

    expect(history.past).toEqual([[], [toCircuitCity(paris)]]);
    expect(history.present).toEqual([]);
    expect(history.future).toEqual([]);
  });
});
