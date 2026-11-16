import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TtlCache } from '../src/cache.js';

describe('TtlCache', () => {
  it('builds deterministic keys with undefined normalized to empty string', () => {
    const cache = new TtlCache();
    assert.equal(cache.key('search', 'keyboard', 1, undefined, 'x'), 'search:keyboard|1||x');
  });

  it('stores and retrieves values before expiration', () => {
    const cache = new TtlCache(1000, 10);
    cache.set('k1', { ok: true });
    assert.deepEqual(cache.get('k1'), { ok: true });
  });

  it('expires entries after TTL elapses', async () => {
    const cache = new TtlCache(20, 10);
    cache.set('k1', 'value', 15);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(cache.get('k1'), undefined);
  });

  it('evicts the oldest entry when maxEntries is reached', () => {
    const cache = new TtlCache(1000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), 2);
    assert.equal(cache.get('c'), 3);
  });

  it('caches loader results via getOrSet', async () => {
    const cache = new TtlCache(1000, 10);
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return `result-${calls}`;
    };

    assert.equal(await cache.getOrSet('k', loader), 'result-1');
    assert.equal(await cache.getOrSet('k', loader), 'result-1');
    assert.equal(calls, 1);
  });
});
