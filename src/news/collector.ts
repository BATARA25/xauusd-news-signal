import Parser from 'rss-parser';
import type { News, NewsDirection, NewsImpact } from './types';

const parser = new Parser();

const FEEDS = [
  { source: 'Google News', url: 'https://news.google.com/rss/search?q=XAUUSD%20OR%20gold%20OR%20Federal%20Reserve%20OR%20FOMC&hl=en-US&gl=US&ceid=US:en' },
  { source: 'Federal Reserve', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
] as const;

const BULLISH_TERMS = ['rate cut','rate cuts','dovish','lower rates','lower yield','weaker dollar','weak dollar','recession','slowing inflation'] as const;
const BEARISH_TERMS = ['rate hike','rate hikes','hawkish','higher rates','higher yield','strong dollar','strong usd','sticky inflation'] as const;
const HIGH_IMPACT_TERMS = ['fomc','fed decision','interest rate','rate decision','cpi','nfp','nonfarm payroll','ppi','inflation'] as const;
const RELEVANCE_PATTERN = /gold|xauusd|xau\/usd|federal reserve|fed|fomc|inflation|cpi|ppi|nfp|nonfarm|dollar|treasury|yield|interest rate/i;

function classify(text: string): Pick<News, 'impact' | 'direction' | 'score'> {
  const bullish = BULLISH_TERMS.filter((term) => text.includes(term)).length;
  const bearish = BEARISH_TERMS.filter((term) => text.includes(term)).length;
  const direction: NewsDirection = bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL';
  const impact: NewsImpact = HIGH_IMPACT_TERMS.some((term) => text.includes(term)) ? 'HIGH' : bullish + bearish > 0 ? 'MEDIUM' : 'LOW';
  const score = Math.min(100, Math.max(0, Math.round(50 + (bullish - bearish) * 18 + (impact === 'HIGH' ? 20 : impact === 'MEDIUM' ? 8 : 0))));
  return { impact, direction, score };
}

function normalize(item: Parser.Item, source: string): News | null {
  const title = item.title?.trim() ?? '';
  const snippet = (item.contentSnippet ?? item.content ?? '').replace(/\s+/g, ' ').trim();
  const text = title + ' ' + snippet;
  if (!title || !RELEVANCE_PATTERN.test(text)) return null;
  const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
  return {
    id: item.guid ?? item.link ?? source + '-' + publishedAt + '-' + title,
    title,
    url: item.link ?? '#',
    source,
    publishedAt,
    ...classify(text.toLowerCase()),
    summary: snippet.slice(0, 220),
  };
}

async function collectFeed(source: string, url: string): Promise<News[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 30).map((item) => normalize(item, source)).filter((item): item is News => item !== null);
  } catch (error) {
    console.error('[news] feed failed', { source, error });
    return [];
  }
}

export async function collectNews(): Promise<News[]> {
  const batches = await Promise.all(FEEDS.map((feed) => collectFeed(feed.source, feed.url)));
  const deduped = new Map<string, News>();
  for (const item of batches.flat()) {
    const existing = deduped.get(item.id);
    if (!existing || Date.parse(item.publishedAt) > Date.parse(existing.publishedAt)) deduped.set(item.id, item);
  }
  return [...deduped.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 50);
}
