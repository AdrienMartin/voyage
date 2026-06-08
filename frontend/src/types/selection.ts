export type SelectionMode = "zone" | "department" | "region";
export type WorkflowStep = "selection" | "circuit" | "places";

export function toggleSelectionCode(
  selectedCodes: string[],
  code: string,
) {
  return selectedCodes.includes(code)
    ? selectedCodes.filter((selectedCode) => selectedCode !== code)
    : [...selectedCodes, code];
}
