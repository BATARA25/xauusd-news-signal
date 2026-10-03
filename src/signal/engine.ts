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
    if (!direction) continue;
    const strength = Math.abs(item.score - 50) / 50;
    const weight = newsWeight(item, now);
    numerator += direction * strength * weight;
    denominator += weight;
  }
  return denominator ? clampUnit(numerator / denominator) : 0;
}

function findEvent(news: News[], now: number) {
  const events = news.filter((n) => n.event?.id && n.event.releaseAt).map((n) => n.event!);
  const unique = events.filter((e, i, all) => all.findIndex((x) => x.id === e.id && x.releaseAt === e.releaseAt) === i);
  return unique.map((event) => ({ event, releaseAt: Date.parse(event.releaseAt!) }))
    .filter(({ releaseAt }) => Number.isFinite(releaseAt))
    .filter(({ releaseAt }) => {
      const minutes = (releaseAt - now) / 60000;
      return minutes >= -SIGNAL_CONFIG.postReleaseWindowMinutes && minutes <= SIGNAL_CONFIG.preReleaseWindowMinutes;
    })
    .sort((a, b) => Math.abs(a.releaseAt - now) - Math.abs(b.releaseAt - now))[0]?.event;
}

function resolvePhase(event: News['event'], now: number): SignalPhase {
  if (!event?.releaseAt) return 'CONTEXT';
  const releaseAt = Date.parse(event.releaseAt);
  if (!Number.isFinite(releaseAt)) return 'CONTEXT';
  return releaseAt > now ? 'PRE_RELEASE'
    : (now - releaseAt) / 60000 <= SIGNAL_CONFIG.postReleaseWindowMinutes ? 'POST_RELEASE' : 'CONTEXT';
}

function marketRegimeScore(market?: MarketSnapshot): number {
  if (!market) return 0;
  return market.trendRegime === 'BULL' ? 1 : market.trendRegime === 'BEAR' ? -1 : 0;
}

function crossAssetScore(market?: MarketSnapshot): number {
  if (!market) return 0;
  const usd = market.dxyReturn1h === undefined ? 0 : -Math.sign(market.dxyReturn1h);
  const yields = market.us10yChange1h === undefined ? 0 : -Math.sign(market.us10yChange1h);
  const vol = market.vixChange1h === undefined ? 0 : Math.sign(market.vixChange1h) * 0.25;
  return clampUnit(usd * 0.42 + yields * 0.42 + vol * 0.16);
}

function marketConfirmationScore(market?: MarketSnapshot): number {
  if (!market) return 0;
  return clampUnit(marketRegimeScore(market) * 0.45 + market.macroAlignment * 0.35 + crossAssetScore(market) * 0.20);
}

function conflictPenalty(normalizedNews: number, market?: MarketSnapshot): number {
  if (!market || !normalizedNews) return 0;
  const confirmation = marketConfirmationScore(market);
  if (!confirmation || Math.sign(normalizedNews) === Math.sign(confirmation)) return 0;
  return Math.min(SIGNAL_CONFIG.maxConflictPenalty, Math.abs(confirmation) * SIGNAL_CONFIG.maxConflictPenalty);
}

function componentScore(components: SignalComponents, phase: SignalPhase): number {
  let base: number;
  if (phase === 'PRE_RELEASE') {
    base = components.context * SIGNAL_CONFIG.preReleaseContextWeight + components.confirmation * SIGNAL_CONFIG.preReleaseConfirmationWeight;
  } else if (phase === 'POST_RELEASE') {
    base = components.surprise * SIGNAL_CONFIG.postReleaseSurpriseWeight + components.reaction * SIGNAL_CONFIG.postReleaseReactionWeight;
  } else {
    base = components.context * 0.65 + components.marketRegime * 0.15 + components.macroAlignment * 0.10 + components.crossAsset * 0.10;
  }
  const confirmation = clampUnit(components.marketRegime * 0.45 + components.macroAlignment * 0.35 + components.crossAsset * 0.20);
  return clampUnit(base * 0.78 + confirmation * 0.22 - components.conflictPenalty);
}

function directionalAgreement(news: News[]): number {
  const directional = news.filter((n) => n.direction !== 'NEUTRAL');
  if (!directional.length) return 0;
  const bullish = directional.filter((n) => n.direction === 'BULLISH').length;
  return Math.max(bullish, directional.length - bullish) / directional.length;
}

function evidenceScore(news: News[], event: News['event'], phase: SignalPhase, market?: MarketSnapshot): number {
  const directional = news.filter((n) => n.direction !== 'NEUTRAL');
  const sampleEvidence = Math.min(1, news.length / 10);
  const agreement = directionalAgreement(news);
  const sourceQuality = news.length ? news.reduce((s, n) => s + (n.sourceQuality ?? 0.5), 0) / news.length : 0;
  const sourceDiversity = Math.min(1, new Set(news.map((n) => n.source.toLowerCase().trim()).filter(Boolean)).size / 3);
  const eventEvidence = event ? 1 : 0.25;
  const releaseEvidence = phase === 'POST_RELEASE' && event?.actual !== undefined && event?.forecast !== undefined ? 1 : 0.35;
  const marketEvidence = market ? Math.min(1, 0.55 + Math.abs(marketConfirmationScore(market)) * 0.45) : 0.35;
  return Math.round((sampleEvidence * 0.15 + agreement * 0.20 + sourceQuality * 0.13 + sourceDiversity * 0.13 + eventEvidence * 0.08 + releaseEvidence * 0.13 + marketEvidence * 0.18) * 100);
}

function directionalGate(news: News[], normalized: number, event: News['event'], phase: SignalPhase, market?: MarketSnapshot): 'BUY' | 'SELL' | 'WAIT' {
  if (Math.abs(normalized) < SIGNAL_CONFIG.waitThreshold) return 'WAIT';
  const directional = news.filter((n) => n.direction !== 'NEUTRAL');
  const bullish = directional.filter((n) => n.direction === 'BULLISH');
  const bearish = directional.filter((n) => n.direction === 'BEARISH');
  const dominant = normalized > 0 ? bullish : bearish;
  const sources = new Set(dominant.map((n) => n.source.toLowerCase().trim())).size;
  const agreement = directional.length ? Math.max(bullish.length, bearish.length) / directional.length : 0;
  const structuredRelease = phase === 'POST_RELEASE' && event?.actual !== undefined && event?.forecast !== undefined;

  if (!structuredRelease && (dominant.length < SIGNAL_CONFIG.minimumDirectionalItems || sources < SIGNAL_CONFIG.minimumDirectionalSources || agreement < SIGNAL_CONFIG.conflictAgreementThreshold)) return 'WAIT';

  if (market) {
    const confirmation = marketConfirmationScore(market);
    const conflict = Math.sign(normalized) !== Math.sign(confirmation) && Math.abs(confirmation) >= 0.55;
    if (conflict && !structuredRelease) return 'WAIT';
  }
  return normalized > 0 ? 'BUY' : 'SELL';
}

export function buildSignal(news: News[], now = Date.now(), market?: MarketSnapshot, priceOverride?: { price?: number; priceUpdatedAt?: string }): MarketSignal {
  const recent = news.filter((n) => {
    const published = Date.parse(n.publishedAt);
    return !Number.isFinite(published) || now - published <= SIGNAL_CONFIG.maxAgeHours * 3600000;
  }).sort((a, b) => newsWeight(b, now) - newsWeight(a, now)).slice(0, SIGNAL_CONFIG.sampleSize);

  const event = findEvent(recent, now);
  const phase = resolvePhase(event, now);
  const context = aggregate(recent, now);
  const confirmation = aggregate(recent, now, (n) => n.impact === 'HIGH');
  const reaction = event?.releaseAt ? aggregate(recent, now, (n) => {
    const published = Date.parse(n.publishedAt);
    return Number.isFinite(published) && published >= Date.parse(event.releaseAt!);
  }) : 0;
  const surprise = releaseSurpriseDirection(event?.actual, event?.forecast, event?.name);
  const crossAsset = crossAssetScore(market);
  const penalty = conflictPenalty(context, market);
  const components: SignalComponents = {
    context, confirmation, surprise, reaction,
    marketRegime: marketRegimeScore(market),
    macroAlignment: market?.macroAlignment ?? 0,
    crossAsset,
    conflictPenalty: penalty,
  };

  const normalized = componentScore(components, phase);
  const evidence = evidenceScore(recent, event, phase, market);
  const bias = directionalGate(recent, normalized, event, phase, market);
  const rawConfidence = 50 + Math.abs(normalized) * 42;
  const confidence = Math.min(SIGNAL_CONFIG.maxConfidence, Math.max(SIGNAL_CONFIG.minConfidence, Math.round(25 + (rawConfidence - 25) * evidence / 100)));
  const score = Math.round(50 + normalized * 50);
  const highImpactCount = recent.filter((n) => n.impact === 'HIGH').length;
  const impact = highImpactCount > 0 ? 'HIGH' : recent.some((n) => n.impact === 'MEDIUM') ? 'MEDIUM' : 'LOW';

  const drivers = recent.filter((n) => n.direction !== 'NEUTRAL').slice(0, 3).map((n) => n.title);
  const price = priceOverride?.price ?? market?.goldPrice;

  return {
    symbol: 'XAUUSD', bias, dailyBias: bias, confidence, evidenceScore: evidence, score, impact, phase,
    eventId: event?.id, eventName: event?.name, eventReleaseAt: event?.releaseAt, components,
    intradaySetup: buildIntradaySetup(bias, price, impact, market),
    price, priceUpdatedAt: priceOverride?.priceUpdatedAt ?? market?.updatedAt, updatedAt: new Date(now).toISOString(),
    drivers, highImpactCount, sampleSize: recent.length, market,
    regime: market?.trendRegime ?? 'RANGE', volatility: market?.volatilityRegime ?? 'NORMAL',
    signalId: crypto.randomUUID(),
  };
}