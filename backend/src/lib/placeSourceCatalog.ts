export type DataGouvDatasetResource = {
  id: string;
  title: string;
  url: string;
  format?: string | null;
  mime?: string | null;
  last_modified?: string | null;
};

export type DataGouvDataset = {
  id: string;
  title: string;
  page?: string | null;
  resources: DataGouvDatasetResource[];
};

export function findDatasetResourceByTitle(
  resources: DataGouvDatasetResource[],
  expectedTitle: string,
) {
  const normalizedExpectedTitle = normalizeTitle(expectedTitle);

  const resource = resources.find(
    (candidateResource) =>
      normalizeTitle(candidateResource.title) === normalizedExpectedTitle,
  );

  if (resource === undefined) {
    throw new Error(`Unable to find dataset resource "${expectedTitle}".`);
  }

  return resource;
}

function normalizeTitle(title: string) {
  return title.trim().toLocaleLowerCase("fr-FR");
}
