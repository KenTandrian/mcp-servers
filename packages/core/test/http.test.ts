import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fetchWithRetry, HttpError } from '../src/http.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchWithRetry', () => {
  it('returns response immediately on 200 OK', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    const res = await fetchWithRetry('https://example.com/ok', { method: 'GET' });
    assert.equal(res.status, 200);
    assert.equal(calls, 1);
  });

  it('retries on 503 and succeeds on subsequent attempt', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response('unavailable', { status: 503 });
      }
      return new Response('recovered', { status: 200 });
    }) as typeof fetch;

    const res = await fetchWithRetry(
      'https://example.com/retry',
      { method: 'GET' },
      { maxAttempts: 3, baseBackoffMs: 1 },
    );
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
  });

  it('does not retry non-retryable 404 errors', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    await assert.rejects(
      () =>
        fetchWithRetry(
          'https://example.com/missing',
          { method: 'GET' },
          { maxAttempts: 3, baseBackoffMs: 1, label: 'MissingEndpoint' },
        ),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.endpoint, 'MissingEndpoint');
        return true;
      },
    );
    assert.equal(calls, 1);
  });

  it('retries on network errors and throws HttpError when exhausted', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      throw new Error('ECONNRESET');
    }) as typeof fetch;

    await assert.rejects(
      () =>
        fetchWithRetry(
          'https://example.com/down',
          { method: 'GET' },
          { maxAttempts: 2, baseBackoffMs: 1, label: 'DownEndpoint' },
        ),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.match(err.message, /Network error calling DownEndpoint: ECONNRESET/);
        return true;
      },
    );
    assert.equal(calls, 2);
  });
});
