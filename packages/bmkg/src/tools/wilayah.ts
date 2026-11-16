import { textResult, withErrorHandling } from '@mcp-servers/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bmkgCache, fetchJson } from '../api.js';

const WILAYAH_BASE = 'https://wilayah.id/api';

export interface RegionItem {
  code: string;
  name: string;
}

interface WilayahResponse {
  data: RegionItem[];
}

export type RegionLevel = 'provinces' | 'regencies' | 'districts' | 'villages';

/**
 * Build the `wilayah.id` API URL for a given administrative level and optional parent code.
 */
export function buildWilayahUrl(level: RegionLevel, parentCode?: string): string {
  if (level === 'provinces') {
    return `${WILAYAH_BASE}/provinces.json`;
  }
  if (!parentCode) {
    throw new Error(`parentCode is required when level is "${level}".`);
  }
  return `${WILAYAH_BASE}/${level}/${encodeURIComponent(parentCode)}.json`;
}

/**
 * Filter and format Indonesian administrative region records.
 */
export function formatRegionList(
  level: RegionLevel,
  regions: RegionItem[],
  parentCode?: string,
  query?: string,
): string {
  const normalized = query?.trim().toLowerCase();
  const filtered = normalized
    ? regions.filter(
        (r) => r.name.toLowerCase().includes(normalized) || r.code.includes(normalized),
      )
    : regions;

  if (filtered.length === 0) {
    return normalized
      ? `No ${level} matching "${query}"${parentCode ? ` under ${parentCode}` : ''}.`
      : `No ${level} found${parentCode ? ` under ${parentCode}` : ''}.`;
  }

  const header = `Indonesian ${level}${parentCode ? ` (parent: ${parentCode})` : ''}${normalized ? ` matching "${query}"` : ''}`;
  const lines = [header, `${filtered.length} result(s)`, ''];
  for (const r of filtered.slice(0, 60)) {
    lines.push(`- **${r.name}** — \`${r.code}\``);
  }
  if (filtered.length > 60) {
    lines.push(`_(+${filtered.length - 60} more; pass \`query\` to narrow results)_`);
  }
  return lines.join('\n');
}

export function registerWilayahTools(server: McpServer): void {
  server.tool(
    'list_regions',
    'Look up Indonesian administrative region codes (provinces -> regencies -> districts -> villages/ADM4) via wilayah.id to find ADM4 codes for get_weather_forecast.',
    {
      level: z
        .enum(['provinces', 'regencies', 'districts', 'villages'])
        .default('provinces')
        .describe('Administrative level to list'),
      parentCode: z
        .string()
        .optional()
        .describe('Parent region code (required for regencies, districts, and villages)'),
      query: z.string().optional().describe('Optional case-insensitive name or code filter'),
    },
    async ({ level, parentCode, query }) =>
      withErrorHandling(async () => {
        const regionLevel = level ?? 'provinces';
        const url = buildWilayahUrl(regionLevel, parentCode);
        const regions = await bmkgCache.getOrSet(
          bmkgCache.key('wilayah', regionLevel, parentCode ?? ''),
          async () => {
            const res = await fetchJson<WilayahResponse>(url, `wilayah.id (${regionLevel})`);
            return res.data ?? [];
          },
          60 * 60_000,
        );

        return textResult(formatRegionList(regionLevel, regions, parentCode, query));
      }),
  );
}
