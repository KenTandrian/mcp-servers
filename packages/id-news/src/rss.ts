import { DEFAULT_USER_AGENT, fetchWithRetry, TtlCache } from '@kentandrian/mcp-core';
import type { FeedDefinition, NewsCategory, NewsSource } from './feeds.js';

export const newsCache = new TtlCache(5 * 60 * 1000, 64);

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  timestamp: number;
  summary: string;
  source: NewsSource;
  sourceName: string;
  category: NewsCategory;
}

function decodeEntities(input: string): string {
  return input
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ');
}

function stripTagsAndCdata(raw: string): string {
  const withoutCdata = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const withoutTags = withoutCdata.replace(/<[^>]+>/g, ' ');
  return decodeEntities(withoutTags)
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1] ? stripTagsAndCdata(match[1]) : '';
}

/**
 * Parse an RSS 2.0 XML string into normalized `NewsArticle` records.
 */
export function parseRssItems(xml: string, feed: FeedDefinition): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemMatches = xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    if (!title || !link) continue;

    const pubDate = extractTag(block, 'pubDate');
    const parsedTime = pubDate ? Date.parse(pubDate) : Number.NaN;
    const summary = extractTag(block, 'description');

    items.push({
      title,
      link,
      pubDate,
      timestamp: Number.isFinite(parsedTime) ? parsedTime : 0,
      summary,
      source: feed.source,
      sourceName: feed.sourceName,
      category: feed.category,
    });
  }

  return items;
}

/**
 * Fetch and parse an RSS feed with TTL caching and retry handling.
 */
export async function fetchFeed(feed: FeedDefinition): Promise<NewsArticle[]> {
  return newsCache.getOrSet(newsCache.key('feed', feed.source, feed.category), async () => {
    const res = await fetchWithRetry(
      feed.url,
      {
        method: 'GET',
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      },
      { label: `${feed.sourceName} (${feed.category})` },
    );
    const xml = await res.text();
    return parseRssItems(xml, feed);
  });
}
