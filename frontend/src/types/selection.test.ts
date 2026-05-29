import { describe, expect, it } from "vitest";
import { toggleSelectionCode } from "./selection";

describe("toggleSelectionCode", () => {
  it("adds a code when it is not selected yet", () => {
    expect(toggleSelectionCode(["75"], "92")).toEqual(["75", "92"]);
  });

  it("removes a code when it is already selected", () => {
    expect(toggleSelectionCode(["75", "92"], "75")).toEqual(["92"]);
  });

  it("preserves the existing order for other codes", () => {
    expect(toggleSelectionCode(["11", "24", "32"], "24")).toEqual(["11", "32"]);
  });
});
