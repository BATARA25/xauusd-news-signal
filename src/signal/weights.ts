import type { News } from '../news/types';

export const SIGNAL_CONFIG = {
  sampleSize: 30,
  maxAgeHours: 24,
  minimumRecencyWeight: 0.25,
  highImpactWeight: 3.5,
  mediumImpactWeight: 1.8,
  lowImpactWeight: 0.7,
  waitThreshold: 0.16,
  maxConfidence: 92,
  minConfidence: 25,
  preReleaseContextWeight: 0.65,
  preReleaseConfirmationWeight: 0.35,
  postReleaseSurpriseWeight: 0.55,
  postReleaseReactionWeight: 0.45,
  postReleaseWindowMinutes: 60,
  preReleaseWindowMinutes: 24 * 60,
  minimumDirectionalSources: 2,
  minimumDirectionalItems: 3,
  conflictAgreementThreshold: 0.60,
  maxConflictPenalty: 0.35,
  outcomeCaptureHorizons: ['1m', '5m', '15m', '30m', '60m'] as const,
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
  const recency = Math.max(SIGNAL_CONFIG.minimumRecencyWeight, 1 - ageHours / SIGNAL_CONFIG.maxAgeHours);
  const sourceQuality = item.sourceQuality ?? 0.5;
  const novelty = item.novelty ?? 1;
  const marketMoving = item.marketMoving ?? 0.5;
  const intelligenceMultiplier = 0.7 + sourceQuality * 0.2 + novelty * 0.05 + marketMoving * 0.05;
  return impactWeight * recency * intelligenceMultiplier;
}

export function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function releaseSurpriseDirection(actual?: number, forecast?: number, eventName = ''): number {
  if (!Number.isFinite(actual) || !Number.isFinite(forecast)) return 0;
  const expected = Number(forecast);
  if (expected === 0) return 0;
  const raw = clampUnit((Number(actual) - expected) / Math.max(Math.abs(expected), 1));
  const name = eventName.toLowerCase();
  const goldNegative = /cpi|inflation|ppi|rate|interest|yield|payroll|nfp|employment|jobs|gdp|retail sales|pmi/.test(name);
  return goldNegative ? -raw : raw;
}