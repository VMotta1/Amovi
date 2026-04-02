const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const apiBaseUrl = rawApiBaseUrl?.trim().replace(/\/+$/, "") ?? "";

export const plaidApiAvailable = apiBaseUrl.length > 0;

export function buildApiUrl(path: string) {
  if (!plaidApiAvailable) {
    return null;
  }

  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
