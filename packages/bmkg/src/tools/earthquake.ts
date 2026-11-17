import { textResult, withErrorHandling } from '@kentandrian/mcp-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bmkgCache, fetchJson } from '../api.js';

const BMKG_TEWS_BASE = 'https://data.bmkg.go.id/DataMKG/TEWS';

export interface GempaItem {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Coordinates: string;
  Lintang: string;
  Bujur: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi?: string;
  Dirasakan?: string;
  Shakemap?: string;
}

interface AutoGempaResponse {
  Infogempa: {
    gempa: GempaItem;
  };
}

interface GempaListResponse {
  Infogempa: {
    gempa: GempaItem[];
  };
}

/**
 * Format a single BMKG earthquake record into readable markdown.
 */
export function formatEarthquake(gempa: GempaItem, index?: number): string {
  const prefix = index !== undefined ? `${index}. ` : '';
  const lines: string[] = [
    `${prefix}**M${gempa.Magnitude}** — ${gempa.Wilayah}`,
    `   Time: ${gempa.Tanggal} ${gempa.Jam} (${gempa.DateTime})`,
    `   Depth: ${gempa.Kedalaman} | Coordinates: ${gempa.Lintang}, ${gempa.Bujur} (${gempa.Coordinates})`,
  ];

  if (gempa.Potensi) {
    lines.push(`   Tsunami/Impact: ${gempa.Potensi}`);
  }
  if (gempa.Dirasakan) {
    lines.push(`   Felt (MMI): ${gempa.Dirasakan}`);
  }
  if (gempa.Shakemap) {
    lines.push(`   Shakemap: ${BMKG_TEWS_BASE}/${gempa.Shakemap}`);
  }

  return lines.join('\n');
}

export function registerEarthquakeTools(server: McpServer): void {
  server.tool(
    'get_latest_earthquake',
    'Get the latest significant earthquake recorded by BMKG (Indonesia), including magnitude, depth, coordinates, felt report, and shakemap URL.',
    {},
    async () =>
      withErrorHandling(async () => {
        const text = await bmkgCache.getOrSet(
          bmkgCache.key('autogempa'),
          async () => {
            const data = await fetchJson<AutoGempaResponse>(
              `${BMKG_TEWS_BASE}/autogempa.json`,
              'BMKG autogempa',
            );
            return `Latest BMKG Earthquake\n\n${formatEarthquake(data.Infogempa.gempa)}`;
          },
          60_000,
        );
        return textResult(text);
      }),
  );

  server.tool(
    'get_recent_earthquakes',
    'Get the 15 most recent earthquakes in Indonesia from BMKG, either M >= 5.0 events or felt (dirasakan) events.',
    {
      type: z
        .enum(['felt', 'm5_plus'])
        .default('felt')
        .describe('Feed type: "felt" (dirasakan) or "m5_plus" (magnitude >= 5.0)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(15)
        .default(10)
        .describe('Number of earthquakes to return, 1-15 (default: 10)'),
    },
    async ({ type, limit }) =>
      withErrorHandling(async () => {
        const feedType = type ?? 'felt';
        const maxItems = limit ?? 10;
        const endpoint = feedType === 'm5_plus' ? 'gempaterkini.json' : 'gempadirasakan.json';
        const title =
          feedType === 'm5_plus'
            ? 'Recent M5.0+ Earthquakes (BMKG)'
            : 'Recent Felt Earthquakes (BMKG)';

        const text = await bmkgCache.getOrSet(
          bmkgCache.key('gempa_list', feedType, maxItems),
          async () => {
            const data = await fetchJson<GempaListResponse>(
              `${BMKG_TEWS_BASE}/${endpoint}`,
              `BMKG ${endpoint}`,
            );
            const items = (data.Infogempa.gempa ?? []).slice(0, maxItems);
            if (items.length === 0) {
              return 'No recent earthquakes found.';
            }
            const formatted = items.map((g, idx) => formatEarthquake(g, idx + 1)).join('\n\n');
            return `${title}\n\n${formatted}`;
          },
          60_000,
        );

        return textResult(text);
      }),
  );
}
