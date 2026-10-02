import type { IntradaySetup, SignalBias } from './types';
import type { NewsImpact } from '../news/types';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildIntradaySetup(
  bias: SignalBias,
  price: number | undefined,
  impact: NewsImpact,
): IntradaySetup {
  if ((bias !== 'BUY' && bias !== 'SELL') || !Number.isFinite(price)) {
    return {
      status: 'WAIT',
      side: 'WAIT',
      trigger: 'Wait for a confirmed daily direction and live price.',
      note: 'No forced intraday setup while the signal is WAIT or price data is unavailable.',
    };
  }

  const p = Number(price);
  const buffer = impact === 'HIGH' ? 0.0015 : impact === 'MEDIUM' ? 0.0010 : 0.0007;
  const stop = impact === 'HIGH' ? 0.0035 : impact === 'MEDIUM' ? 0.0028 : 0.0022;
  const tp1 = stop * 0.9;
  const tp2 = stop * 1.6;

  if (bias === 'BUY') {
    return {
      status: 'ACTIVE',
      side: 'BUY',
      entryLow: round(p * (1 - buffer)),
      entryHigh: round(p * (1 + buffer)),
      stopLoss: round(p * (1 - stop)),
      takeProfit1: round(p * (1 + tp1)),
      takeProfit2: round(p * (1 + tp2)),
      trigger: 'BUY only while price holds the entry zone and the macro bias remains BUY.',
      note: 'Dynamic news-driven setup. Levels are volatility buffers, not technical support/resistance.',
    };
  }

  return {
    status: 'ACTIVE',
    side: 'SELL',
    entryLow: round(p * (1 - buffer)),
    entryHigh: round(p * (1 + buffer)),
    stopLoss: round(p * (1 + stop)),
    takeProfit1: round(p * (1 - tp1)),
    takeProfit2: round(p * (1 - tp2)),
    trigger: 'SELL only while price rejects the entry zone and the macro bias remains SELL.',
    note: 'Dynamic news-driven setup. Levels are volatility buffers, not technical support/resistance.',
  };
}
