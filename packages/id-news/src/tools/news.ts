import { textResult, withErrorHandling } from '@kentandrian/mcp-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { NEWS_FEEDS, type NewsCategory, type NewsSource, selectFeeds } from '../feeds.js';
import { fetchFeed, type NewsArticle } from '../rss.js';

function truncateSummary(text: string, maxLen = 220): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3)}...`;
}

/**
 * Fetch, deduplicate, and sort articles across all matching feeds.
 */
async function fetchCombinedArticles(
  source?: NewsSource,
  category?: NewsCategory,
): Promise<NewsArticle[]> {
  const feeds = selectFeeds(source, category);
  if (feeds.length === 0) return [];

  const settled = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed)));
  const seenLinks = new Set<string>();
  const articles: NewsArticle[] = [];

  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue;
    for (const item of outcome.value) {
      if (seenLinks.has(item.link)) continue;
      seenLinks.add(item.link);
      articles.push(item);
    }
  }

  articles.sort((a, b) => b.timestamp - a.timestamp);
  return articles;
}

/**
 * Filter articles by a case-insensitive keyword in title or summary.
 */
export function filterArticlesByKeyword(articles: NewsArticle[], query: string): NewsArticle[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return articles;
  return articles.filter(
    (a) => a.title.toLowerCase().includes(needle) || a.summary.toLowerCase().includes(needle),
  );
}

/**
 * Format a list of news articles into readable markdown.
 */
export function formatNewsDigest(title: string, articles: NewsArticle[], limit: number): string {
  const shown = articles.slice(0, limit);
  if (shown.length === 0) {
    return `${title}\n\nNo articles found.`;
  }

  const lines: string[] = [title, `${shown.length} article(s)`, ''];
  shown.forEach((a, idx) => {
    lines.push(`${idx + 1}. **${a.title}**`);
    lines.push(`   Source: ${a.sourceName} (${a.category})${a.pubDate ? ` | ${a.pubDate}` : ''}`);
    if (a.summary) {
      lines.push(`   ${truncateSummary(a.summary)}`);
    }
    lines.push(`   URL: ${a.link}`);
    if (idx < shown.length - 1) lines.push('');
  });

  return lines.join('\n');
}

export function registerNewsTools(server: McpServer): void {
  server.tool(
    'list_news_sources',
    'List supported Indonesian news outlets and categories available in @kentandrian/id-news-mcp.',
    {},
    async () =>
      withErrorHandling(async () => {
        const lines = ['Indonesian News Sources', ''];
        for (const f of NEWS_FEEDS) {
          lines.push(`- **${f.sourceName}** (\`${f.source}\`) — category: \`${f.category}\``);
        }
        return textResult(lines.join('\n'));
      }),
  );

  server.tool(
    'get_latest_news',
    'Get the latest Indonesian news digest from CNBC Indonesia, Antara News, and Tempo across general, business, or tech categories.',
    {
      source: z
        .enum(['cnbc', 'antara', 'tempo'])
        .optional()
        .describe('Optional outlet filter: "cnbc", "antara", or "tempo"'),
      category: z
        .enum(['general', 'business', 'tech'])
        .optional()
        .describe('Optional category filter: "general", "business", or "tech"'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(15)
        .describe('Maximum number of articles to return, 1-30 (default: 15)'),
    },
    async ({ source, category, limit }) =>
      withErrorHandling(async () => {
        const articles = await fetchCombinedArticles(source, category);
        const scope = [source ?? 'all sources', category ?? 'all categories'].join(' / ');
        return textResult(
          formatNewsDigest(`Indonesian News Digest (${scope})`, articles, limit ?? 15),
        );
      }),
  );

  server.tool(
    'search_news',
    'Search recent Indonesian news headlines and summaries across CNBC Indonesia, Antara News, and Tempo by keyword.',
    {
      query: z.string().min(1).describe('Keyword to search for in article titles and summaries'),
      source: z
        .enum(['cnbc', 'antara', 'tempo'])
        .optional()
        .describe('Optional outlet filter: "cnbc", "antara", or "tempo"'),
      category: z
        .enum(['general', 'business', 'tech'])
        .optional()
        .describe('Optional category filter: "general", "business", or "tech"'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(15)
        .describe('Maximum number of matching articles to return, 1-30 (default: 15)'),
    },
    async ({ query, source, category, limit }) =>
      withErrorHandling(async () => {
        const articles = await fetchCombinedArticles(source, category);
        const matches = filterArticlesByKeyword(articles, query);
        return textResult(
          formatNewsDigest(`Indonesian News Search for "${query}"`, matches, limit ?? 15),
        );
      }),
  );
}
