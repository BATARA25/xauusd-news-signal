import type { News } from '../news/types';
import { clampUnit, newsWeight, releaseSurpriseDirection, SIGNAL_CONFIG } from './weights';
import { buildIntradaySetup } from './setup';
import type { MarketSignal, SignalComponents, SignalPhase } from './types';

function aggregate(news: News[], now: number, predicate?: (item: News) => boolean): number {
  let numerator = 0;
  let denominator = 0;
  for (const item of news) {
    if (predicate && !predicate(item)) continue;
    const direction = item.direction === 'BULLISH' ? 1 : item.direction === 'BEARISH' ? -1 : 0;
    const weight = newsWeight(item, now);
    numerator += direction * (item.score / 100) * weight;
    denominator += weight;
  }
  return denominator > 0 ? clampUnit(numerator / denominator) : 0;
}

function findEvent(news: News[], now: number) {
  const events = news
    .filter((item) => item.event?.id && item.event.releaseAt)
    .map((item) => item.event!)
    .filter((event, index, all) =>
      all.findIndex((candidate) => candidate.id === event.id && candidate.releaseAt === event.releaseAt) === index,
    );

  return events
    .map((event) => ({ event, releaseAt: Date.parse(event.releaseAt!) }))
    .filter(({ releaseAt }) => {
      if (!Number.isFinite(releaseAt)) return false;
      const minutesFromRelease = (releaseAt - now) / 60000;
      return minutesFromRelease >= -SIGNAL_CONFIG.postReleaseWindowMinutes
        && minutesFromRelease <= SIGNAL_CONFIG.preReleaseWindowMinutes;
    })
    .sort((a, b) => Math.abs(a.releaseAt - now) - Math.abs(b.releaseAt - now))[0]?.event;
}

function resolvePhase(event: News['event'], now: number): SignalPhase {
  if (!event?.releaseAt) return 'CONTEXT';
  const releaseAt = Date.parse(event.releaseAt);
  if (!Number.isFinite(releaseAt)) return 'CONTEXT';
  if (releaseAt > now) return 'PRE_RELEASE';
  const minutesSinceRelease = (now - releaseAt) / 60000;
  return minutesSinceRelease <= SIGNAL_CONFIG.postReleaseWindowMinutes ? 'POST_RELEASE' : 'CONTEXT';
}

function componentScore(components: SignalComponents, phase: SignalPhase): number {
  if (phase === 'PRE_RELEASE') {
    return clampUnit(components.context * SIGNAL_CONFIG.preReleaseContextWeight + components.confirmation * SIGNAL_CONFIG.preReleaseConfirmationWeight);
  }
  if (phase === 'POST_RELEASE') {
    return clampUnit(components.surprise * SIGNAL_CONFIG.postReleaseSurpriseWeight + components.reaction * SIGNAL_CONFIG.postReleaseReactionWeight);
  }
  return components.context;
}

function directionalAgreement(news: News[]): number {
  const directional = news.filter((item) => item.direction !== 'NEUTRAL');
  if (directional.length === 0) return 0;
  const bullish = directional.filter((item) => item.direction === 'BULLISH').length;
  const bearish = directional.length - bullish;
  return Math.max(bullish, bearish) / directional.length;
}

function evidenceScore(news: News[], event: News['event'], phase: SignalPhase): number {
  const sampleEvidence = Math.min(1, news.length / 10);
  const agreement = directionalAgreement(news);
  const sourceQuality = news.length === 0 ? 0 : news.reduce((sum, item) => sum + (item.sourceQuality ?? 0.5), 0) / news.length;
  const eventEvidence = event ? 1 : 0.25;
  const structuredReleaseEvidence = phase === 'POST_RELEASE' && event?.actual !== undefined && event?.forecast !== undefined ? 1 : 0.4;
  return Math.round((sampleEvidence * 0.30 + agreement * 0.25 + sourceQuality * 0.20 + eventEvidence * 0.10 + structuredReleaseEvidence * 0.15) * 100);
}

export function buildSignal(news: News[], now = Date.now(), market?: { price?: number; priceUpdatedAt?: string }): MarketSignal {
  const recent = news
    .filter((item) => {
      const published = Date.parse(item.publishedAt);
      return !Number.isFinite(published) || now - published <= SIGNAL_CONFIG.maxAgeHours * 3600000;
    })
    .slice(0, SIGNAL_CONFIG.sampleSize);

  const event = findEvent(recent, now);
  const phase = resolvePhase(event, now);
  const context = aggregate(recent, now);
  const confirmation = aggregate(recent, now, (item) => item.impact === 'HIGH');
  const reaction = event?.releaseAt
    ? aggregate(recent, now, (item) => {
        const published = Date.parse(item.publishedAt);
        return Number.isFinite(published) && published >= Date.parse(event.releaseAt!);
      })
    : 0;
  const surprise = releaseSurpriseDirection(event?.actual, event?.forecast, event?.name);
  const components: SignalComponents = { context, confirmation, surprise, reaction };
  const normalized = componentScore(components, phase);
  const score = Math.round(50 + normalized * 50);
  const evidence = evidenceScore(recent, event, phase);
  const rawConfidence = 50 + Math.abs(normalized) * 45;
  const confidence = Math.min(
    SIGNAL_CONFIG.maxConfidence,
    Math.max(SIGNAL_CONFIG.minConfidence, Math.round(20 + (rawConfidence - 20) * (evidence / 100))),
  );
  const bias = Math.abs(normalized) < SIGNAL_CONFIG.waitThreshold ? 'WAIT' : normalized > 0 ? 'BUY' : 'SELL';

  const highImpactCount = recent.filter((item) => item.impact === 'HIGH').length;
  const impact = highImpactCount > 0 ? 'HIGH' : recent.some((item) => item.impact === 'MEDIUM') ? 'MEDIUM' : 'LOW';
  const drivers: string[] = [];
  for (const item of recent) {
    if (item.direction !== 'NEUTRAL' && item.impact === 'HIGH' && drivers.length < 3) drivers.push(item.title);
  }

  return {
    symbol: 'XAUUSD',
    bias,
    dailyBias: bias,
    confidence,
    evidenceScore: evidence,
    score,
    impact,
    phase,
    eventId: event?.id,
    eventName: event?.name,
    eventReleaseAt: event?.releaseAt,
    components,
    intradaySetup: buildIntradaySetup(bias, market?.price, impact),
    price: market?.price,
    priceUpdatedAt: market?.priceUpdatedAt,
    updatedAt: new Date(now).toISOString(),
    drivers,
    highImpactCount,
    sampleSize: recent.length,
  };
}
