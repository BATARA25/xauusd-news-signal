import type { News } from './news';

export type MarketSignal = {
  symbol: 'XAUUSD';
  bias: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  score: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  updatedAt: string;
  drivers: string[];
  highImpactCount: number;
  sampleSize: number;
};

function weight(item: News) {
  const impactWeight = item.impact === 'HIGH' ? 3 : item.impact === 'MEDIUM' ? 2 : 1;
  const ageHours = Math.max(0, (Date.now() - Date.parse(item.publishedAt)) / 3600000);
  const recency = Math.max(0.35, 1 - ageHours / 48);
  return impactWeight * recency;
}

export function buildSignal(news: News[]): MarketSignal {
  const recent = news.slice(0, 30);
  let total = 0;
  let totalWeight = 0;
  const drivers: string[] = [];

  for (const item of recent) {
    const direction = item.direction === 'BULLISH' ? 1 : item.direction === 'BEARISH' ? -1 : 0;
    const w = weight(item);
    total += direction * (item.score / 100) * w;
    totalWeight += w;
    if (item.impact === 'HIGH' && item.direction !== 'NEUTRAL' && drivers.length < 3) {
      drivers.push(item.title);
    }
  }

  const normalized = totalWeight ? total / totalWeight : 0;
  const score = Math.round(50 + normalized * 50);
  const confidence = Math.min(95, Math.max(20, Math.round(50 + Math.abs(normalized) * 45)));
  const bias = Math.abs(normalized) < 0.12 ? 'WAIT' : normalized > 0 ? 'BUY' : 'SELL';
  const highImpactCount = recent.filter(x => x.impact === 'HIGH').length;
  const impact = highImpactCount > 0 ? 'HIGH' : recent.some(x => x.impact === 'MEDIUM') ? 'MEDIUM' : 'LOW';

  return {
    symbol: 'XAUUSD',
    bias,
    confidence,
    score,
    impact,
    updatedAt: new Date().toISOString(),
    drivers,
    highImpactCount,
    sampleSize: recent.length,
  };
}
