import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpError } from '../src/http.js';
import { textResult, withErrorHandling } from '../src/mcp.js';

describe('mcp helpers', () => {
  it('wraps text in MCP content structure', () => {
    assert.deepEqual(textResult('hello'), {
      content: [{ type: 'text', text: 'hello' }],
    });
  });

  it('returns handler result when no error is thrown', async () => {
    const res = await withErrorHandling(async () => textResult('ok'));
    assert.deepEqual(res, { content: [{ type: 'text', text: 'ok' }] });
  });

  it('formats HttpError into an isError MCP result', async () => {
    const res = await withErrorHandling(async () => {
      throw new HttpError('HTTP 502 from Tokopedia', 502);
    });
    assert.equal(res.isError, true);
    assert.deepEqual(res.content, [{ type: 'text', text: 'Error: HTTP 502 from Tokopedia' }]);
  });

  it('formats non-Error values into an isError MCP result', async () => {
    const res = await withErrorHandling(async () => {
      throw 'unexpected string';
    });
    assert.equal(res.isError, true);
    assert.deepEqual(res.content, [{ type: 'text', text: 'Error: unexpected string' }]);
  });
});
