import type { NewsImpact } from '../news/types';

export type SignalBias = 'BUY' | 'SELL' | 'WAIT';

export type MarketSignal = {
  symbol: 'XAUUSD';
  bias: SignalBias;
  confidence: number;
  score: number;
  impact: NewsImpact;
  updatedAt: string;
  drivers: string[];
  highImpactCount: number;
  sampleSize: number;
};
