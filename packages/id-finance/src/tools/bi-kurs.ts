import { textResult, withErrorHandling } from '@kentandrian/mcp-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchText, financeCache } from '../api.js';

const BI_KURS_URL = 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursLokal3';

export interface BiKursRow {
  currency: string;
  unit: number;
  buy: number;
  sell: number;
  mid: number;
  date: string;
}

function extractXmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.trim() ?? '';
}

/**
 * Parse Bank Indonesia `getSubKursLokal3` XML response into `BiKursRow` records.
 */
export function parseBiKursXml(xml: string): BiKursRow[] {
  const rows: BiKursRow[] = [];
  const tables = xml.matchAll(/<Table\b[^>]*>([\s\S]*?)<\/Table>/gi);

  for (const match of tables) {
    const block = match[1];
    const currency = extractXmlTag(block, 'mts_subkurslokal');
    const unit = Number(extractXmlTag(block, 'nil_subkurslokal'));
    const buy = Number(
      extractXmlTag(block, 'beli_subkursasing') || extractXmlTag(block, 'beli_subkurslokal'),
    );
    const sell = Number(
      extractXmlTag(block, 'jual_subkursasing') || extractXmlTag(block, 'jual_subkurslokal'),
    );
    const date = extractXmlTag(block, 'tgl_subkurslokal');

    if (!currency || !Number.isFinite(buy) || !Number.isFinite(sell) || !Number.isFinite(unit)) {
      continue;
    }

    rows.push({
      currency,
      unit: unit > 0 ? unit : 1,
      buy,
      sell,
      mid: (buy + sell) / 2,
      date: date.slice(0, 10),
    });
  }

  return rows;
}

function formatDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Format Bank Indonesia Kurs Transaksi rows into readable markdown.
 */
export function formatBiKurs(currency: string, rows: BiKursRow[]): string {
  if (rows.length === 0) {
    return `No Bank Indonesia exchange rate found for ${currency}.`;
  }

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const perUnitNote = latest.unit !== 1 ? ` (per ${latest.unit} ${latest.currency})` : '';
  const fmt = (n: number) =>
    `Rp${n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const lines = [
    `Bank Indonesia Kurs Transaksi: **${latest.currency}/IDR**${perUnitNote}`,
    `Date: ${latest.date}`,
    `- Buy (Kurs Beli): ${fmt(latest.buy)}`,
    `- Sell (Kurs Jual): ${fmt(latest.sell)}`,
    `- Mid (Kurs Tengah): ${fmt(latest.mid)}`,
  ];

  if (sorted.length > 1) {
    lines.push('', 'Recent history:');
    for (const r of sorted.slice(-5).reverse()) {
      lines.push(`- ${r.date}: Buy ${fmt(r.buy)} | Sell ${fmt(r.sell)} | Mid ${fmt(r.mid)}`);
    }
  }

  return lines.join('\n');
}

export function registerBiKursTools(server: McpServer): void {
  server.tool(
    'get_idr_exchange_rate',
    'Get official Bank Indonesia (BI) Kurs Transaksi IDR exchange rate (buy, sell, mid) for a foreign currency such as USD, SGD, EUR, JPY, AUD, or CNY.',
    {
      currency: z
        .string()
        .min(3)
        .max(3)
        .default('USD')
        .describe('3-letter ISO currency code (e.g. "USD", "SGD", "EUR", "JPY", "AUD")'),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date format')
        .optional()
        .describe('Optional target date (YYYY-MM-DD). Defaults to latest available business day.'),
    },
    async ({ currency, date }) =>
      withErrorHandling(async () => {
        const code = currency.toUpperCase();
        const end = date ? new Date(`${date}T00:00:00Z`) : new Date();
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 7);

        const startStr = formatDateYmd(start);
        const endStr = formatDateYmd(end);

        const text = await financeCache.getOrSet(
          financeCache.key('bi_kurs', code, startStr, endStr),
          async () => {
            const url = `${BI_KURS_URL}?mts=${encodeURIComponent(code)}&startdate=${startStr}&enddate=${endStr}`;
            const xml = await fetchText(url, `Bank Indonesia Kurs (${code})`);
            const rows = parseBiKursXml(xml);
            return formatBiKurs(code, rows);
          },
          15 * 60_000,
        );

        return textResult(text);
      }),
  );
}
