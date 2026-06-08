const DEFAULT_API_BASE_URL = "http://localhost:3000";

export function resolveApiBaseUrl(
  envValue: string | undefined = import.meta.env.VITE_API_BASE_URL,
) {
  const candidate = envValue?.trim();
  if (candidate === undefined || candidate === "") {
    return DEFAULT_API_BASE_URL;
  }

  return candidate.replace(/\/+$/u, "");
}

