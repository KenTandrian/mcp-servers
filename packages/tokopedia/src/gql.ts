import { DEFAULT_USER_AGENT, fetchWithRetry, HttpError, TtlCache } from '@kentandrian/mcp-core';

const TOKOPEDIA_GQL_URL = 'https://gql.tokopedia.com/graphql';

const BASE_HEADERS: Record<string, string> = {
  'User-Agent': DEFAULT_USER_AGENT,
  Accept: '*/*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Content-Type': 'application/json',
  Origin: 'https://www.tokopedia.com',
  Referer: 'https://www.tokopedia.com/',
  'X-Source': 'tokopedia-lite',
  'X-Version': '1.0',
};

export const tokopediaCache = new TtlCache(5 * 60 * 1000, 256);

/**
 * Send a GraphQL operation to Tokopedia's public gateway.
 */
export async function gqlRequest<T>(
  operationName: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = `${TOKOPEDIA_GQL_URL}/${operationName}`;
  const body = JSON.stringify({ operationName, query, variables: variables ?? {} });

  const res = await fetchWithRetry(
    url,
    { method: 'POST', headers: BASE_HEADERS, body },
    { label: `Tokopedia GQL (${operationName})` },
  );

  const json = (await res.json()) as { errors?: Array<{ message: string }> } & T;
  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new HttpError(`GraphQL error in ${operationName}: ${msg}`, undefined, operationName);
  }

  return json;
}
