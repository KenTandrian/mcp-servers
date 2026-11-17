import { textResult, withErrorHandling } from '@kentandrian/mcp-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchJson, financeCache } from '../api.js';

const INDODAX_SUMMARIES_URL = 'https://indodax.com/api/summaries';
const PINTU_RATES_URL = 'https://api.pintu.co.id/v2/trade/price-changes';

export interface IndodaxTicker {
  buy: string;
  sell: string;
  last: string;
  high: string;
  low: string;
  name: string;
  vol_idr?: string;
}

interface IndodaxSummariesResponse {
  tickers: Record<string, IndodaxTicker>;
}

export interface PintuPriceChange {
  pair: string;
  latestPrice: string;
  day: string;
  week: string;
  month: string;
  year: string;
}

interface PintuResponse {
  code: string;
  payload: PintuPriceChange[];
}

export interface NormalizedCryptoPrice {
  symbol: string;
  exchange: 'indodax' | 'pintu';
  lastIdr: number;
  buyIdr?: number;
  sellIdr?: number;
  high24hIdr?: number;
  low24hIdr?: number;
  change24hPct?: string;
  change7dPct?: string;
}

function formatIdr(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID', {
    maximumFractionDigits: amount < 1000 ? 4 : 0,
  })}`;
}

/**
 * Normalize Indodax `*_idr` tickers into `NormalizedCryptoPrice` records.
 */
export function normalizeIndodaxTickers(
  tickers: Record<string, IndodaxTicker>,
): NormalizedCryptoPrice[] {
  const results: NormalizedCryptoPrice[] = [];
  for (const [pair, t] of Object.entries(tickers)) {
    if (!pair.endsWith('_idr')) continue;
    const symbol = pair.slice(0, -4).toUpperCase();
    const lastIdr = Number(t.last);
    if (!Number.isFinite(lastIdr)) continue;

    results.push({
      symbol,
      exchange: 'indodax',
      lastIdr,
      buyIdr: Number(t.buy),
      sellIdr: Number(t.sell),
      high24hIdr: Number(t.high),
      low24hIdr: Number(t.low),
    });
  }
  return results;
}

/**
 * Normalize Pintu `pair/idr` price-change entries into `NormalizedCryptoPrice` records.
 */
export function normalizePintuPrices(payload: PintuPriceChange[]): NormalizedCryptoPrice[] {
  const results: NormalizedCryptoPrice[] = [];
  for (const p of payload) {
    if (!p.pair.endsWith('/idr')) continue;
    const symbol = p.pair.slice(0, -4).toUpperCase();
    const lastIdr = Number(p.latestPrice);
    if (!Number.isFinite(lastIdr)) continue;

    results.push({
      symbol,
      exchange: 'pintu',
      lastIdr,
      change24hPct: p.day,
      change7dPct: p.week,
    });
  }
  return results;
}

/**
 * Format IDR crypto prices for display.
 */
export function formatCryptoPrices(
  prices: NormalizedCryptoPrice[],
  symbols?: string[],
  limit = 20,
): string {
  const wanted = symbols?.map((s) => s.trim().toUpperCase()).filter(Boolean);
  const filtered =
    wanted && wanted.length > 0 ? prices.filter((p) => wanted.includes(p.symbol)) : prices;

  const shown = filtered.slice(0, limit);
  if (shown.length === 0) {
    return 'No matching IDR crypto pairs found.';
  }

  const lines = [`Indonesian Crypto Prices (IDR)`, `${shown.length} entry(s)`, ''];
  for (const p of shown) {
    if (p.exchange === 'indodax') {
      lines.push(
        `- **${p.symbol}/IDR** (Indodax): ${formatIdr(p.lastIdr)} | Bid: ${formatIdr(p.buyIdr ?? 0)} | Ask: ${formatIdr(p.sellIdr ?? 0)} | 24h: ${formatIdr(p.low24hIdr ?? 0)}–${formatIdr(p.high24hIdr ?? 0)}`,
      );
    } else {
      lines.push(
        `- **${p.symbol}/IDR** (Pintu): ${formatIdr(p.lastIdr)} | 24h: ${p.change24hPct ?? '0'}% | 7d: ${p.change7dPct ?? '0'}%`,
      );
    }
  }
  return lines.join('\n');
}

/**
 * Format a side-by-side comparison of one coin across Indodax and Pintu.
 */
export function formatCryptoComparison(
  symbol: string,
  indodax?: NormalizedCryptoPrice,
  pintu?: NormalizedCryptoPrice,
): string {
  const code = symbol.toUpperCase();
  if (!indodax && !pintu) {
    return `Symbol "${code}" not found on Indodax or Pintu.`;
  }

  const lines = [`**${code}/IDR** Exchange Comparison`, ''];
  if (indodax) {
    lines.push(
      `- **Indodax:** Last ${formatIdr(indodax.lastIdr)} (Bid ${formatIdr(indodax.buyIdr ?? 0)} / Ask ${formatIdr(indodax.sellIdr ?? 0)}) | 24h Range: ${formatIdr(indodax.low24hIdr ?? 0)}–${formatIdr(indodax.high24hIdr ?? 0)}`,
    );
  } else {
    lines.push('- **Indodax:** Not listed');
  }

  if (pintu) {
    lines.push(
      `- **Pintu:** Last ${formatIdr(pintu.lastIdr)} | 24h: ${pintu.change24hPct ?? '0'}% | 7d: ${pintu.change7dPct ?? '0'}%`,
    );
  } else {
    lines.push('- **Pintu:** Not listed');
  }

  if (indodax && pintu && pintu.lastIdr > 0) {
    const diff = indodax.lastIdr - pintu.lastIdr;
    const spreadPct = ((diff / pintu.lastIdr) * 100).toFixed(2);
    lines.push('', `Spread (Indodax vs Pintu): ${formatIdr(Math.abs(diff))} (${spreadPct}%)`);
  }

  return lines.join('\n');
}

async function getIndodaxPrices(): Promise<NormalizedCryptoPrice[]> {
  return financeCache.getOrSet(
    financeCache.key('indodax_summaries'),
    async () => {
      const res = await fetchJson<IndodaxSummariesResponse>(
        INDODAX_SUMMARIES_URL,
        'Indodax summaries',
      );
      return normalizeIndodaxTickers(res.tickers ?? {});
    },
    30_000,
  );
}

async function getPintuPrices(): Promise<NormalizedCryptoPrice[]> {
  return financeCache.getOrSet(
    financeCache.key('pintu_rates'),
    async () => {
      const res = await fetchJson<PintuResponse>(PINTU_RATES_URL, 'Pintu price changes');
      return normalizePintuPrices(res.payload ?? []);
    },
    30_000,
  );
}

export function registerCryptoTools(server: McpServer): void {
  server.tool(
    'get_crypto_prices_idr',
    'Get live cryptocurrency prices in Indonesian Rupiah (IDR) from Indodax and/or Pintu.',
    {
      exchange: z
        .enum(['all', 'indodax', 'pintu'])
        .default('all')
        .describe('Exchange source: "all", "indodax", or "pintu"'),
      symbols: z
        .array(z.string())
        .optional()
        .describe('Optional list of coin symbols, e.g. ["BTC", "ETH", "SOL"]'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe('Maximum entries to return when symbols is omitted, 1-50 (default: 20)'),
    },
    async ({ exchange, symbols, limit }) =>
      withErrorHandling(async () => {
        const source = exchange ?? 'all';
        const tasks: Array<Promise<NormalizedCryptoPrice[]>> = [];
        if (source === 'all' || source === 'indodax') tasks.push(getIndodaxPrices());
        if (source === 'all' || source === 'pintu') tasks.push(getPintuPrices());

        const settled = await Promise.all(tasks);
        const combined = settled.flat();
        return textResult(formatCryptoPrices(combined, symbols, limit ?? 20));
      }),
  );

  server.tool(
    'compare_crypto_idr',
    'Compare a cryptocurrency IDR price side-by-side between Indodax and Pintu, including spread percentage.',
    {
      symbol: z.string().min(1).describe('Coin symbol, e.g. "BTC", "ETH", "SOL", "USDT"'),
    },
    async ({ symbol }) =>
      withErrorHandling(async () => {
        const code = symbol.trim().toUpperCase();
        const [indodaxAll, pintuAll] = await Promise.all([getIndodaxPrices(), getPintuPrices()]);
        const indodax = indodaxAll.find((p) => p.symbol === code);
        const pintu = pintuAll.find((p) => p.symbol === code);
        return textResult(formatCryptoComparison(code, indodax, pintu));
      }),
  );
}
