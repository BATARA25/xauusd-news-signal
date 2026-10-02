import type { News } from '../news/types';
import { newsWeight, SIGNAL_CONFIG } from './weights';
import type { MarketSignal } from './types';

export function buildSignal(news: News[], now = Date.now()): MarketSignal {
  const recent = news.slice(0, SIGNAL_CONFIG.sampleSize);
  let weightedDirection = 0;
  let totalWeight = 0;
  const drivers: string[] = [];

  for (const item of recent) {
    const direction = item.direction === 'BULLISH' ? 1 : item.direction === 'BEARISH' ? -1 : 0;
    const weight = newsWeight(item, now);
    weightedDirection += direction * (item.score / 100) * weight;
    totalWeight += weight;
    if (item.impact === 'HIGH' && item.direction !== 'NEUTRAL' && drivers.length < 3) drivers.push(item.title);
  }

  const normalized = totalWeight > 0 ? weightedDirection / totalWeight : 0;
  const score = Math.round(50 + normalized * 50);
  const confidence = Math.min(SIGNAL_CONFIG.maxConfidence, Math.max(SIGNAL_CONFIG.minConfidence, Math.round(50 + Math.abs(normalized) * 45)));
  const bias = Math.abs(normalized) < SIGNAL_CONFIG.waitThreshold ? 'WAIT' : normalized > 0 ? 'BUY' : 'SELL';
  const highImpactCount = recent.filter((item) => item.impact === 'HIGH').length;
  const impact = highImpactCount > 0 ? 'HIGH' : recent.some((item) => item.impact === 'MEDIUM') ? 'MEDIUM' : 'LOW';

  return {
    symbol: 'XAUUSD',
    bias,
    confidence,
    score,
    impact,
    updatedAt: new Date(now).toISOString(),
    drivers,
    highImpactCount,
    sampleSize: recent.length,
  };
}
