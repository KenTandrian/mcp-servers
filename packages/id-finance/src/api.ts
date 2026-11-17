import { DEFAULT_USER_AGENT, fetchWithRetry, TtlCache } from '@kentandrian/mcp-core';

export const financeCache = new TtlCache(2 * 60 * 1000, 128);

/**
 * Fetch a text/XML endpoint with retry and timeout handling.
 */
export async function fetchText(url: string, label: string): Promise<string> {
  const res = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/xml, text/xml, */*',
      },
    },
    { label },
  );
  return await res.text();
}

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
