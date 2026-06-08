export type VisitPlaceRankingInput = {
  category: string;
  subCategory: string | null;
  description: string | null;
  commune: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  sourceUpdatedAt: string | null;
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  Castle: 28,
  Museum: 28,
  ReligiousSite: 24,
  ReligiousSiteStructure: 24,
  HistoricSite: 24,
  Landmark: 22,
  NaturalHeritage: 22,
  ParkAndGarden: 20,
  ThemePark: 20,
  LocalTouristOffice: 8,
};

export function computeVisitPlaceRankingScore(
  input: VisitPlaceRankingInput,
) {
  let score = getCategoryWeight(input.category, input.subCategory);

  score += getDescriptionWeight(input.description);
  score += input.imageUrl === null ? 0 : 10;
  score += input.websiteUrl === null ? 0 : 6;
  score += input.commune === null ? 0 : 4;
  score += input.sourceUpdatedAt === null ? 0 : 2;

  return Math.round(score);
}

function getCategoryWeight(category: string, subCategory: string | null) {
  const normalizedCategory = normalizeCategoryKey(category);
  if (
    normalizedCategory !== null &&
    normalizedCategory in CATEGORY_WEIGHTS
  ) {
    return CATEGORY_WEIGHTS[normalizedCategory]!;
  }

  const normalizedSubCategory = normalizeCategoryKey(subCategory);
  if (normalizedSubCategory !== null && normalizedSubCategory in CATEGORY_WEIGHTS) {
    return CATEGORY_WEIGHTS[normalizedSubCategory]!;
  }

  return 14;
}

function getDescriptionWeight(description: string | null) {
  if (description === null) {
    return 0;
  }

  const length = description.trim().length;
  if (length >= 280) {
    return 14;
  }

  if (length >= 120) {
    return 10;
  }

  if (length >= 40) {
    return 6;
  }

  if (length > 0) {
    return 2;
  }

  return 0;
}

function normalizeCategoryKey(value: string | null) {
  if (value === null) {
    return null;
  }

  return value.replace(/\s+/g, "");
}
