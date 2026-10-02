import type { News } from './types';

const NORMAL_CACHE_TTL_MS = 10_000;
const REALTIME_CACHE_TTL_MS = 750;

let cachedNews: News[] | null = null;
let cachedAt = 0;
let inFlight: Promise<News[]> | null = null;

export async function withNewsCache(
  loader: () => Promise<News[]>,
  options: { realtime?: boolean } = {},
): Promise<News[]> {
  const now = Date.now();
  const ttl = options.realtime ? REALTIME_CACHE_TTL_MS : NORMAL_CACHE_TTL_MS;

  if (cachedNews && now - cachedAt < ttl) {
    return cachedNews;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = loader()
    .then((news) => {
      cachedNews = news;
      cachedAt = Date.now();
      return news;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
