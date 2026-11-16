import { HttpError } from './http.js';

export interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export function textResult(text: string): McpToolResult {
  return { content: [{ type: 'text', text }] };
}

/**
 * Wrap an MCP tool handler so thrown errors return clean `isError: true` responses.
 */
export async function withErrorHandling(fn: () => Promise<McpToolResult>): Promise<McpToolResult> {
  try {
    return await fn();
  } catch (err) {
    const message =
      err instanceof HttpError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);

    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${message}` }],
    };
  }
}
