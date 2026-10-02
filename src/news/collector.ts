import Parser from 'rss-parser';
import type { News, NewsDirection, NewsImpact } from './types';
import { detectEvent, enrichNews } from '../intelligence';
import { withNewsCache } from './cache';

const parser = new Parser();

const FEEDS = [
  { source: 'Google News', url: 'https://news.google.com/rss/search?q=XAUUSD%20OR%20gold%20OR%20Federal%20Reserve%20OR%20FOMC&hl=en-US&gl=US&ceid=US:en' },
] as const;

const FEED_TIMEOUT_MS = 5000;
const OFFICIAL_RELEASE_TIMEOUT_MS = 2000;
const BLS_EMPLOYMENT_URL = 'https://www.bls.gov/news.release/empsit.nr0.htm';

const BULLISH_TERMS = ['rate cut','rate cuts','dovish','lower rates','lower yield','weaker dollar','weak dollar','recession','slowing inflation','cooler inflation','soft inflation','rate cuts expected','hike is unlikely','hike unlikely','no urgency to hike','wait before hiking'] as const;
const BEARISH_TERMS = ['rate hike','rate hikes','hawkish','higher rates','higher yield','strong dollar','strong usd','sticky inflation','hot inflation','inflation remains elevated'] as const;
const NEGATED_BEARISH_TERMS = ['no rate hike','no rate hikes','no urgency to hike','hike is unlikely','hike unlikely','rate hike unlikely','rates may stay unchanged','wait before hiking','delay the hike','delay rate hike'] as const;
const HIGH_IMPACT_TERMS = ['fomc','fed decision','interest rate','rate decision','cpi','nfp','nonfarm payroll','ppi','inflation'] as const;
const RELEVANCE_PATTERN = /gold|xauusd|xau\/usd|federal reserve|fed|fomc|inflation|cpi|ppi|nfp|nonfarm|payroll|employment situation|unemployment|dollar|treasury|yield|interest rate/i;

function classify(text: string): Pick<News, 'impact' | 'direction' | 'score'> {
  const bullish = BULLISH_TERMS.filter((term) => text.includes(term)).length;
  const negatedBearish = NEGATED_BEARISH_TERMS.filter((term) => text.includes(term)).length;
  const bearish = Math.max(0, BEARISH_TERMS.filter((term) => text.includes(term)).length - negatedBearish);
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
    event: detectEvent(text, publishedAt),
  };
}

async function collectFeed(source: string, url: string): Promise<News[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
        'User-Agent': 'NewsXLeak/1.0 (+XAUUSD news intelligence)',
      },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const xml = await response.text();
    const feed = await parser.parseString(xml);

    return (feed.items ?? [])
      .slice(0, 30)
      .map((item) => normalize(item, source))
      .filter((item): item is News => item !== null);
  } catch (error) {
    console.error('[news] feed failed', { source, error });
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function collectOfficialEmployment(): Promise<News[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFFICIAL_RELEASE_TIMEOUT_MS);

  try {
    const response = await fetch(BLS_EMPLOYMENT_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html, text/plain;q=0.9, */*;q=0.1',
        'User-Agent': 'NewsXLeak/1.0 (+XAUUSD news intelligence)',
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();

    const titleMatch = text.match(/THE EMPLOYMENT SITUATION - ([A-Z]+ 2026)/i);
    if (!titleMatch) return [];

    const publishedAt = new Date().toISOString();
    const payrollMatch = text.match(/Total nonfarm payroll employment (?:increased|decreased) by ([0-9,]+) in [A-Z]+/i);
    const unemploymentMatch = text.match(/unemployment rate (?:was|fell to|rose to) ([0-9.]+) percent/i);

    const details = [
      payrollMatch ? `NFP ${payrollMatch[1]}` : '',
      unemploymentMatch ? `unemployment ${unemploymentMatch[1]}%` : '',
    ].filter(Boolean).join(' · ');

    const headline = `Official BLS Employment Situation — ${titleMatch[1]}${details ? ` · ${details}` : ''}`;
    const eventText = `Employment Situation NFP Nonfarm Payroll unemployment ${details}`;

    return [{
      id: 'bls-employment-situation-' + titleMatch[1].toLowerCase().replace(/\s+/g, '-'),
      title: headline,
      url: BLS_EMPLOYMENT_URL,
      source: 'BLS',
      publishedAt,
      impact: 'HIGH',
      direction: 'NEUTRAL',
      score: 50,
      summary: 'Official BLS Employment Situation release detected directly from the BLS publication page.',
      event: detectEvent(eventText, publishedAt),
      sourceTier: 'OFFICIAL',
      sourceQuality: 1,
      novelty: 1,
      marketMoving: 1,
    }];
  } catch (error) {
    console.error('[news] official BLS check failed', error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function collectNewsUncached(realtime = false): Promise<News[]> {
  const batches = await Promise.all([
    ...FEEDS.map((feed) => collectFeed(feed.source, feed.url)),
    ...(realtime ? [collectOfficialEmployment()] : []),
  ]);

  const deduped = new Map<string, News>();
  for (const item of batches.flat()) {
    const existing = deduped.get(item.id);
    if (!existing || Date.parse(item.publishedAt) > Date.parse(existing.publishedAt)) {
      deduped.set(item.id, item);
    }
  }

  return enrichNews([...deduped.values()]);
}

export async function collectNews(options: { realtime?: boolean } = {}): Promise<News[]> {
  const realtime = options.realtime === true;
  return withNewsCache(() => collectNewsUncached(realtime), { realtime });
}
