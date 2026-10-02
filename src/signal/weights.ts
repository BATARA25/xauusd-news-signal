import type { News } from '../news/types';

export const SIGNAL_CONFIG = {
  sampleSize: 30,
  maxAgeHours: 48,
  minimumRecencyWeight: 0.35,
  highImpactWeight: 3,
  mediumImpactWeight: 2,
  lowImpactWeight: 1,
  waitThreshold: 0.12,
  maxConfidence: 95,
  minConfidence: 20,
} as const;

export function newsWeight(item: News, now = Date.now()): number {
  const impactWeight = item.impact === 'HIGH' ? SIGNAL_CONFIG.highImpactWeight : item.impact === 'MEDIUM' ? SIGNAL_CONFIG.mediumImpactWeight : SIGNAL_CONFIG.lowImpactWeight;
  const published = Date.parse(item.publishedAt);
  const ageHours = Number.isFinite(published) ? Math.max(0, (now - published) / 3600000) : SIGNAL_CONFIG.maxAgeHours;
  const recency = Math.max(SIGNAL_CONFIG.minimumRecencyWeight, 1 - ageHours / SIGNAL_CONFIG.maxAgeHours);
  return impactWeight * recency;
}
