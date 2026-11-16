import { DEFAULT_USER_AGENT, fetchWithRetry, TtlCache } from '@mcp-servers/core';

export const bmkgCache = new TtlCache(5 * 60 * 1000, 256);

/**
 * Fetch and parse a JSON endpoint with retry and timeout handling.
 */
export async function fetchJson<T>(url: string, label: string): Promise<T> {
  const res = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
    },
    { label },
  );
  return (await res.json()) as T;
}
