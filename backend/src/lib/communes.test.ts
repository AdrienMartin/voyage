import { describe, expect, it } from "vitest";
import AdmZip from "adm-zip";
import { buildCommunesFromContents } from "./communes.js";

describe("buildCommunesFromContents", () => {
  it("merges postal and population sources by INSEE code", () => {
    const postalCsv = [
      "Code_commune_INSEE;Nom_commune;Code_postal;longitude;latitude",
      "75056;Paris;75001;2.3417;48.8602",
      "75056;Paris;75002;2.3417;48.8602",
      "44109;Nantes;44000;-1.5536;47.2184",
    ].join("\n");

    const zip = new AdmZip();
    zip.addFile(
      "ensemble.csv",
      Buffer.from(
        [
          "Code Officiel Commune / Arrondissement Municipal;Population municipale",
          "75056;2102650",
          "44109;323204",
        ].join("\n"),
        "utf8",
      ),
    );

    const communes = buildCommunesFromContents({
      postalCsv,
      populationZip: zip.toBuffer(),
    });

    expect(communes).toEqual([
      {
        inseeCode: "44109",
        name: "Nantes",
        postalCodes: ["44000"],
        population: 323204,
        latitude: 47.2184,
        longitude: -1.5536,
      },
      {
        inseeCode: "75056",
        name: "Paris",
        postalCodes: ["75001", "75002"],
        population: 2102650,
        latitude: 48.8602,
        longitude: 2.3417,
      },
    ]);
  });

  it("ignores postal entries without matching population", () => {
    const postalCsv = [
      "Code_commune_INSEE;Nom_commune;Code_postal;longitude;latitude",
      "33063;Bordeaux;33000;-0.5792;44.8378",
    ].join("\n");

    const zip = new AdmZip();
    zip.addFile(
      "ensemble.csv",
      Buffer.from(
        [
          "Code Officiel Commune / Arrondissement Municipal;Population municipale",
          "44109;323204",
        ].join("\n"),
        "utf8",
      ),
    );

    const communes = buildCommunesFromContents({
      postalCsv,
      populationZip: zip.toBuffer(),
    });

    expect(communes).toEqual([]);
  });

  it("aggregates Paris arrondissements into the principal commune", () => {
    const postalCsv = [
      "Code_commune_INSEE;nom_de_la_commune;Code_postal;longitude;latitude",
      "75101;PARIS 01;75001;2.3360;48.8620",
      "75115;PARIS 15;75015;2.2937;48.8416",
    ].join("\n");

    const zip = new AdmZip();
    zip.addFile(
      "donnees_communes.csv",
      Buffer.from(
        [
          "COM;PMUN",
          "75101;15114",
          "75115;229713",
        ].join("\n"),
        "utf8",
      ),
    );

    const communes = buildCommunesFromContents({
      postalCsv,
      populationZip: zip.toBuffer(),
    });

    expect(communes).toHaveLength(1);
    expect(communes[0]).toMatchObject({
      inseeCode: "75056",
      name: "PARIS",
      postalCodes: ["75001", "75015"],
      population: 244827,
    });
    expect(communes[0].latitude).toBeGreaterThan(48.84);
    expect(communes[0].latitude).toBeLessThan(48.87);
    expect(communes[0].longitude).toBeGreaterThan(2.29);
    expect(communes[0].longitude).toBeLessThan(2.34);
  });
});
