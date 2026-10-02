import type { NewsImpact } from '../news/types';

export type SignalBias = 'BUY' | 'SELL' | 'WAIT';
export type SignalPhase = 'PRE_RELEASE' | 'POST_RELEASE' | 'CONTEXT';

export type SignalComponents = {
  context: number;
  confirmation: number;
  surprise: number;
  reaction: number;
};

export type IntradaySetup = {
  status: 'ACTIVE' | 'WAIT';
  side: 'BUY' | 'SELL' | 'WAIT';
  entryLow?: number;
  entryHigh?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  trigger: string;
  note: string;
};

export type MarketSignal = {
  symbol: 'XAUUSD';
  bias: SignalBias;
  dailyBias: SignalBias;
  confidence: number;
  evidenceScore: number;
  score: number;
  impact: NewsImpact;
  phase: SignalPhase;
  eventId?: string;
  eventName?: string;
  eventReleaseAt?: string;
  components: SignalComponents;
  intradaySetup: IntradaySetup;
  price?: number;
  priceUpdatedAt?: string;
  updatedAt: string;
  drivers: string[];
  highImpactCount: number;
  sampleSize: number;
};
