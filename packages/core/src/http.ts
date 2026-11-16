export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface RetryOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  label?: string;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function backoffMs(attempt: number, baseMs: number, retryAfter?: string | null): number {
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0 && seconds <= 10) {
    return seconds * 1000;
  }
  return baseMs * 2 ** attempt + Math.floor(Math.random() * 100);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a URL with timeout and exponential-backoff retries on network errors, 429, and 5xx.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const { timeoutMs = 15_000, maxAttempts = 3, baseBackoffMs = 300, label = url } = options;

  let lastError: Error | undefined;
  let retryAfter: string | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(backoffMs(attempt - 1, baseBackoffMs, retryAfter));
    }

    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        lastError = new HttpError(
          `Timed out after ${Math.round(timeoutMs / 1000)}s calling ${label}.`,
          undefined,
          label,
        );
      } else {
        lastError = new HttpError(
          `Network error calling ${label}: ${err instanceof Error ? err.message : String(err)}`,
          undefined,
          label,
        );
      }
      retryAfter = null;
      continue;
    }

    if (res.ok) return res;

    if (isRetryableStatus(res.status) && attempt < maxAttempts - 1) {
      retryAfter = res.headers.get('retry-after');
      lastError = new HttpError(`HTTP ${res.status} from ${label}`, res.status, label);
      continue;
    }

    throw new HttpError(`HTTP ${res.status} from ${label}`, res.status, label);
  }

  throw lastError ?? new HttpError(`Failed calling ${label}`, undefined, label);
}
