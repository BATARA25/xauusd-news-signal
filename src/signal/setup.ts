import type { IntradaySetup, SignalBias } from './types';
import type { NewsImpact } from '../news/types';
import type { MarketSnapshot } from '../market';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildIntradaySetup(
  bias: SignalBias,
  price: number | undefined,
  impact: NewsImpact,
  market?: MarketSnapshot,
): IntradaySetup {
  if ((bias !== 'BUY' && bias !== 'SELL') || !Number.isFinite(price)) {
    return {
      status: 'WAIT',
      side: 'WAIT',
      trigger: 'Wait for confirmed direction, cross-asset alignment and live price.',
      note: 'No forced setup while the signal is WAIT or market price is unavailable.',
      volatilityRegime: market?.volatilityRegime,
    };
  }

  const p = Number(price);
  const atr = market?.goldAtr14;
  const fallbackStop = impact === 'HIGH' ? p * 0.0035 : impact === 'MEDIUM' ? p * 0.0028 : p * 0.0022;
  const stopDistance = Number.isFinite(atr) ? Math.max(Number(atr) * 1.35, fallbackStop * 0.65) : fallbackStop;
  const entryDistance = Number.isFinite(atr) ? Math.max(Number(atr) * 0.35, p * 0.00035) : p * (impact === 'HIGH' ? 0.0010 : 0.0007);
  const tp1Distance = stopDistance * 1.25;
  const tp2Distance = stopDistance * 2.0;
  const riskReward = 2.0;

  if (bias === 'BUY') {
    return {
      status: 'ACTIVE',
      side: 'BUY',
      entryLow: round(p - entryDistance),
      entryHigh: round(p + entryDistance),
      stopLoss: round(p - stopDistance),
      takeProfit1: round(p + tp1Distance),
      takeProfit2: round(p + tp2Distance),
      trigger: 'BUY only after price holds the entry zone and macro/news alignment remains positive.',
      note: 'ATR-aware volatility setup. Levels are dynamic risk controls, not guaranteed support/resistance.',
      riskReward,
      volatilityRegime: market?.volatilityRegime,
    };
  }

  return {
    status: 'ACTIVE',
    side: 'SELL',
    entryLow: round(p - entryDistance),
    entryHigh: round(p + entryDistance),
    stopLoss: round(p + stopDistance),
    takeProfit1: round(p - tp1Distance),
    takeProfit2: round(p - tp2Distance),
    trigger: 'SELL only after price rejects the entry zone and macro/news alignment remains negative.',
    note: 'ATR-aware volatility setup. Levels are dynamic risk controls, not guaranteed support/resistance.',
    riskReward,
    volatilityRegime: market?.volatilityRegime,
  };
}
