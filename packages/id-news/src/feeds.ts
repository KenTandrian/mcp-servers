export type NewsSource = 'cnbc' | 'antara' | 'tempo';
export type NewsCategory = 'general' | 'business' | 'tech';

export interface FeedDefinition {
  source: NewsSource;
  sourceName: string;
  category: NewsCategory;
  url: string;
}

export const NEWS_FEEDS: FeedDefinition[] = [
  {
    source: 'cnbc',
    sourceName: 'CNBC Indonesia',
    category: 'general',
    url: 'https://www.cnbcindonesia.com/news/rss',
  },
  {
    source: 'cnbc',
    sourceName: 'CNBC Indonesia',
    category: 'business',
    url: 'https://www.cnbcindonesia.com/market/rss',
  },
  {
    source: 'cnbc',
    sourceName: 'CNBC Indonesia',
    category: 'tech',
    url: 'https://www.cnbcindonesia.com/tech/rss',
  },
  {
    source: 'antara',
    sourceName: 'Antara News',
    category: 'general',
    url: 'https://www.antaranews.com/rss/terkini.xml',
  },
  {
    source: 'antara',
    sourceName: 'Antara News',
    category: 'business',
    url: 'https://www.antaranews.com/rss/ekonomi.xml',
  },
  {
    source: 'antara',
    sourceName: 'Antara News',
    category: 'tech',
    url: 'https://www.antaranews.com/rss/tekno.xml',
  },
  {
    source: 'tempo',
    sourceName: 'Tempo',
    category: 'general',
    url: 'https://rss.tempo.co/nasional',
  },
  {
    source: 'tempo',
    sourceName: 'Tempo',
    category: 'business',
    url: 'https://rss.tempo.co/bisnis',
  },
];

/**
 * Select matching RSS feed definitions by optional source and category.
 */
export function selectFeeds(source?: NewsSource, category?: NewsCategory): FeedDefinition[] {
  return NEWS_FEEDS.filter(
    (f) => (!source || f.source === source) && (!category || f.category === category),
  );
}
