import type { News } from './types';

const CACHE_TTL_MS = 10_000;

let cachedNews: News[] | null = null;
let cachedAt = 0;
let inFlight: Promise<News[]> | null = null;

export async function withNewsCache(loader: () => Promise<News[]>): Promise<News[]> {
  const now = Date.now();

  if (cachedNews && now - cachedAt < CACHE_TTL_MS) {
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
