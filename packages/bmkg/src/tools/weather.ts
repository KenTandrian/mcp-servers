import { textResult, withErrorHandling } from '@kentandrian/mcp-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bmkgCache, fetchJson } from '../api.js';

const BMKG_WEATHER_URL = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';

export interface WeatherLocation {
  adm1: string;
  adm2: string;
  adm3: string;
  adm4: string;
  desa: string;
  kecamatan: string;
  kotkab: string;
  provinsi: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface WeatherForecastSlot {
  local_datetime: string;
  t: number;
  hu: number;
  weather_desc: string;
  weather_desc_en: string;
  wd: string;
  ws: number;
  tcc: number;
  tp: number;
}

interface WeatherResponse {
  data?: Array<{
    lokasi: WeatherLocation;
    cuaca: WeatherForecastSlot[][];
  }>;
}

/**
 * Format BMKG 3-hourly weather forecast slots into readable markdown.
 */
export function formatWeatherForecast(
  lokasi: WeatherLocation,
  cuacaDays: WeatherForecastSlot[][],
  maxDays = 3,
): string {
  const days = cuacaDays.slice(0, maxDays);
  if (days.length === 0) {
    return `No forecast slots available for ${lokasi.desa} (${lokasi.adm4}).`;
  }

  const lines: string[] = [
    `Weather Forecast: **${lokasi.desa}, ${lokasi.kecamatan}, ${lokasi.kotkab}, ${lokasi.provinsi}**`,
    `ADM4: ${lokasi.adm4} | Coordinates: ${lokasi.lat}, ${lokasi.lon} | Timezone: ${lokasi.timezone}`,
  ];

  days.forEach((slots, dayIdx) => {
    lines.push('', `### Day ${dayIdx + 1}`);
    for (const s of slots) {
      const desc = s.weather_desc_en ? `${s.weather_desc} (${s.weather_desc_en})` : s.weather_desc;
      lines.push(
        `- ${s.local_datetime}: ${desc} | ${s.t}°C | Humidity: ${s.hu}% | Wind: ${s.wd} ${s.ws} km/h | Rain: ${s.tp} mm`,
      );
    }
  });

  return lines.join('\n');
}

export function registerWeatherTools(server: McpServer): void {
  server.tool(
    'get_weather_forecast',
    'Get BMKG 3-day, 3-hourly weather forecast for an Indonesian village/kelurahan by its ADM4 code (e.g. "31.71.03.1001"). Use list_regions to discover ADM4 codes.',
    {
      adm4: z
        .string()
        .regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, 'Expected ADM4 code format like "31.71.03.1001"')
        .describe('Indonesian ADM4 village/kelurahan code, e.g. "31.71.03.1001"'),
      days: z
        .number()
        .int()
        .min(1)
        .max(3)
        .default(2)
        .describe('Number of forecast days to include, 1-3 (default: 2)'),
    },
    async ({ adm4, days }) =>
      withErrorHandling(async () => {
        const maxDays = days ?? 2;
        const text = await bmkgCache.getOrSet(
          bmkgCache.key('weather', adm4, maxDays),
          async () => {
            const url = `${BMKG_WEATHER_URL}?adm4=${encodeURIComponent(adm4)}`;
            const res = await fetchJson<WeatherResponse>(url, `BMKG weather (${adm4})`);
            const entry = res.data?.[0];
            if (!entry) {
              return `No weather forecast found for ADM4 code "${adm4}".`;
            }
            return formatWeatherForecast(entry.lokasi, entry.cuaca ?? [], maxDays);
          },
          15 * 60_000,
        );
        return textResult(text);
      }),
  );
}
