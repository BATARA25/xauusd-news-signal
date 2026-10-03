import type { News } from '../news/types';
import { clampUnit, newsWeight, releaseSurpriseDirection, SIGNAL_CONFIG } from './weights';
import { buildIntradaySetup } from './setup';
import type { MarketSnapshot } from '../market';
import type { MarketSignal, SignalComponents, SignalPhase } from './types';

function aggregate(news: News[], now: number, predicate?: (item: News) => boolean): number {
  let numerator = 0;
  let denominator = 0;
  for (const item of news) {
    if (predicate && !predicate(item)) continue;
    const direction = item.direction === 'BULLISH' ? 1 : item.direction === 'BEARISH' ? -1 : 0;
    if (direction === 0) continue;
    const strength = Math.abs(item.score - 50) / 50;
    const weight = newsWeight(item, now);
    numerator += direction * strength * weight;
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

function marketRegimeScore(market?: MarketSnapshot): number {
  if (!market) return 0;
  return market.trendRegime === 'BULL' ? 1 : market.trendRegime === 'BEAR' ? -1 : 0;
}

function marketConfirmationScore(market?: MarketSnapshot): number {
  if (!market) return 0;
  return clampUnit(marketRegimeScore(market) * 0.55 + market.macroAlignment * 0.45);
}

function componentScore(components: SignalComponents, phase: SignalPhase): number {
  const marketConfirmation = clampUnit(components.marketRegime * 0.55 + components.macroAlignment * 0.45);
  let base: number;

  if (phase === 'PRE_RELEASE') {
    base = components.context * SIGNAL_CONFIG.preReleaseContextWeight
      + components.confirmation * SIGNAL_CONFIG.preReleaseConfirmationWeight;
  } else if (phase === 'POST_RELEASE') {
    base = components.surprise * SIGNAL_CONFIG.postReleaseSurpriseWeight
      + components.reaction * SIGNAL_CONFIG.postReleaseReactionWeight;
  } else {
    base = components.context * 0.65
      + components.marketRegime * 0.20
      + components.macroAlignment * 0.15;
  }

  return clampUnit(base * 0.80 + marketConfirmation * 0.20);
}

function directionalAgreement(news: News[]): number {
  const directional = news.filter((item) => item.direction !== 'NEUTRAL');
  if (directional.length === 0) return 0;
  const bullish = directional.filter((item) => item.direction === 'BULLISH').length;
  const bearish = directional.length - bullish;
  return Math.max(bullish, bearish) / directional.length;
}

function evidenceScore(news: News[], event: News['event'], phase: SignalPhase, market?: MarketSnapshot): number {
  const directional = news.filter((item) => item.direction !== 'NEUTRAL');
  const sampleEvidence = Math.min(1, news.length / 10);
  const agreement = directionalAgreement(news);
  const sourceQuality = news.length === 0
    ? 0
    : news.reduce((sum, item) => sum + (item.sourceQuality ?? 0.5), 0) / news.length;
  const uniqueSources = new Set(news.map((item) => item.source.toLowerCase().trim()).filter(Boolean)).size;
  const sourceDiversity = Math.min(1, uniqueSources / 3);
  const eventEvidence = event ? 1 : 0.25;
  const structuredReleaseEvidence =
    phase === 'POST_RELEASE' && event?.actual !== undefined && event?.forecast !== undefined ? 1 : 0.35;
  const marketEvidence = market
    ? Math.min(1, 0.55 + Math.abs(marketConfirmationScore(market)) * 0.45)
    : 0.35;

  return Math.round((
    sampleEvidence * 0.17
    + agreement * 0.22
    + sourceQuality * 0.13
    + sourceDiversity * 0.13
    + eventEvidence * 0.08
    + structuredReleaseEvidence * 0.12
    + marketEvidence * 0.15
  ) * 100);
}

function directionalGate(
  news: News[],
  normalized: number,
  event: News['event'],
  phase: SignalPhase,
  market?: MarketSnapshot,
): 'BUY' | 'SELL' | 'WAIT' {
  if (Math.abs(normalized) < SIGNAL_CONFIG.waitThreshold) return 'WAIT';

  const directional = news.filter((item) => item.direction !== 'NEUTRAL');
  const bullish = directional.filter((item) => item.direction === 'BULLISH');
  const bearish = directional.filter((item) => item.direction === 'BEARISH');
  const dominant = normalized > 0 ? bullish : bearish;
  const dominantSources = new Set(dominant.map((item) => item.source.toLowerCase().trim())).size;
  const agreement = directional.length ? Math.max(bullish.length, bearish.length) / directional.length : 0;

  const structuredRelease =
    phase === 'POST_RELEASE'
    && event?.actual !== undefined
    && event?.forecast !== undefined;

  if (!structuredRelease && (
    dominant.length < SIGNAL_CONFIG.minimumDirectionalItems
    || dominantSources < SIGNAL_CONFIG.minimumDirectionalSources
    || agreement < SIGNAL_CONFIG.conflictAgreementThreshold
  )) return 'WAIT';

  if (market) {
    const marketConfirmation = marketConfirmationScore(market);
    const sameDirection = Math.sign(normalized) === Math.sign(marketConfirmation);
    const strongConflict = Math.abs(marketConfirmation) >= 0.55 && !sameDirection;
    if (strongConflict && !structuredRelease) return 'WAIT';
  }

  return normalized > 0 ? 'BUY' : 'SELL';
}

export function buildSignal(
  news: News[],
  now = Date.now(),
  market?: MarketSnapshot,
  priceOverride?: { price?: number; priceUpdatedAt?: string },
): MarketSignal {
  const recent = news
    .filter((item) => {
      const published = Date.parse(item.publishedAt);
      return !Number.isFinite(published) || now - published <= SIGNAL_CONFIG.maxAgeHours * 3600000;
    })
    .sort((a, b) => newsWeight(b, now) - newsWeight(a, now))
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
  const components: SignalComponents = {
    context,
    confirmation,
    surprise,
    reaction,
    marketRegime: marketRegimeScore(market),
    macroAlignment: market?.macroAlignment ?? 0,
  };

  const normalized = componentScore(components, phase);
  const evidence = evidenceScore(recent, event, phase, market);
  const bias = directionalGate(recent, normalized, event, phase, market);
  const rawConfidence = 50 + Math.abs(normalized) * 42;
  const evidenceAdjusted = 25 + (rawConfidence - 25) * (evidence / 100);
  const confidence = Math.min(
    SIGNAL_CONFIG.maxConfidence,
    Math.max(SIGNAL_CONFIG.minConfidence, Math.round(evidenceAdjusted)),
  );

  const score = Math.round(50 + normalized * 50);
  const highImpactCount = recent.filter((item) => item.impact === 'HIGH').length;
  const impact = highImpactCount > 0 ? 'HIGH'
    : recent.some((item) => item.impact === 'MEDIUM') ? 'MEDIUM' : 'LOW';

  const drivers: string[] = [];
  for (const item of recent) {
    if (item.direction !== 'NEUTRAL' && item.impact === 'HIGH' && drivers.length < 3) drivers.push(item.title);
  }
  if (drivers.length === 0) {
    for (const item of recent) {
      if (item.direction !== 'NEUTRAL' && drivers.length < 3) drivers.push(item.title);
    }
  }

  const price = priceOverride?.price ?? market?.goldPrice;
  const priceUpdatedAt = priceOverride?.priceUpdatedAt ?? market?.updatedAt;

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
    intradaySetup: buildIntradaySetup(bias, price, impact, market),
    price,
    priceUpdatedAt,
    updatedAt: new Date(now).toISOString(),
    drivers,
    highImpactCount,
    sampleSize: recent.length,
    market,
    regime: market?.trendRegime ?? 'RANGE',
    volatility: market?.volatilityRegime ?? 'NORMAL',
  };
}
