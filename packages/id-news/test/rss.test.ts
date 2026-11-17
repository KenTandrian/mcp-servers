import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { selectFeeds } from '../src/feeds.js';
import { parseRssItems } from '../src/rss.js';
import { filterArticlesByKeyword, formatNewsDigest } from '../src/tools/news.js';

describe('id-news RSS parser and formatters', () => {
  it('selects feeds by source and category', () => {
    assert.equal(selectFeeds('cnbc', 'tech').length, 1);
    assert.equal(selectFeeds(undefined, 'business').length, 3);
    assert.equal(selectFeeds().length, 8);
  });

  it('parses RSS XML items with CDATA, HTML tags, and entities', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title><![CDATA[Bank Indonesia &amp; Rupiah Update]]></title>
            <link>https://example.com/bi-update</link>
            <pubDate>Tue, 17 Nov 2026 02:00:00 +0700</pubDate>
            <description><![CDATA[<p>Kurs rupiah menguat <b>hari ini</b>.</p>]]></description>
          </item>
          <item>
            <title>Missing Link Item</title>
          </item>
        </channel>
      </rss>`;

    const items = parseRssItems(xml, {
      source: 'cnbc',
      sourceName: 'CNBC Indonesia',
      category: 'business',
      url: 'https://www.cnbcindonesia.com/market/rss',
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.title, 'Bank Indonesia & Rupiah Update');
    assert.equal(items[0]?.summary, 'Kurs rupiah menguat hari ini.');
    assert.ok((items[0]?.timestamp ?? 0) > 0);
  });

  it('filters articles by keyword and formats digest', () => {
    const articles = [
      {
        title: 'AI Startup Funding in Jakarta',
        link: 'https://example.com/1',
        pubDate: 'Tue, 17 Nov 2026 01:00:00 GMT',
        timestamp: 2000,
        summary: 'Tech investment grows.',
        source: 'cnbc' as const,
        sourceName: 'CNBC Indonesia',
        category: 'tech' as const,
      },
      {
        title: 'Weather Report',
        link: 'https://example.com/2',
        pubDate: 'Tue, 17 Nov 2026 00:00:00 GMT',
        timestamp: 1000,
        summary: 'Sunny in Bandung.',
        source: 'antara' as const,
        sourceName: 'Antara News',
        category: 'general' as const,
      },
    ];

    const filtered = filterArticlesByKeyword(articles, 'startup');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.link, 'https://example.com/1');

    const digest = formatNewsDigest('Tech Digest', filtered, 10);
    assert.match(digest, /1\. \*\*AI Startup Funding in Jakarta\*\*/);
    assert.match(digest, /Source: CNBC Indonesia \(tech\)/);
  });
});
