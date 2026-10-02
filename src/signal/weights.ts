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
  preReleaseContextWeight: 0.8,
  preReleaseConfirmationWeight: 0.2,
  postReleaseSurpriseWeight: 0.4,
  postReleaseReactionWeight: 0.6,
  postReleaseWindowMinutes: 60,
} as const;

export function newsWeight(item: News, now = Date.now()): number {
  const impactWeight = item.impact === 'HIGH'
    ? SIGNAL_CONFIG.highImpactWeight
    : item.impact === 'MEDIUM'
      ? SIGNAL_CONFIG.mediumImpactWeight
      : SIGNAL_CONFIG.lowImpactWeight;
  const published = Date.parse(item.publishedAt);
  const ageHours = Number.isFinite(published)
    ? Math.max(0, (now - published) / 3600000)
    : SIGNAL_CONFIG.maxAgeHours;
  const recency = Math.max(
    SIGNAL_CONFIG.minimumRecencyWeight,
    1 - ageHours / SIGNAL_CONFIG.maxAgeHours,
  );
  return impactWeight * recency;
}

export function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
}

/**
 * Converts an economic release into a directional surprise for gold.
 * Lower-than-expected inflation/rates are bullish for gold; higher-than-expected
 * readings are bearish. For payrolls/growth, stronger-than-expected data is
 * treated as bearish because it can reduce expectations for monetary easing.
 */
export function releaseSurpriseDirection(actual?: number, forecast?: number, eventName = ''): number {
  if (!Number.isFinite(actual) || !Number.isFinite(forecast)) return 0;
  const expected = Number(forecast);
  if (expected === 0) return 0;
  const raw = clampUnit((Number(actual) - expected) / Math.max(Math.abs(expected), 1));
  const name = eventName.toLowerCase();
  const goldNegative = /cpi|inflation|ppi|rate|interest|yield|payroll|nfp|employment|jobs|gdp|retail sales|pmi/.test(name);
  return goldNegative ? -raw : raw;
}
