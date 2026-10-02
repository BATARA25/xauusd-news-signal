import type { NewsImpact } from '../news/types';

export type SignalBias = 'BUY' | 'SELL' | 'WAIT';
export type SignalPhase = 'PRE_RELEASE' | 'POST_RELEASE' | 'CONTEXT';

export type SignalComponents = {
  context: number;
  confirmation: number;
  surprise: number;
  reaction: number;
};

export type MarketSignal = {
  symbol: 'XAUUSD';
  bias: SignalBias;
  confidence: number;
  evidenceScore: number;
  score: number;
  impact: NewsImpact;
  phase: SignalPhase;
  eventId?: string;
  eventName?: string;
  eventReleaseAt?: string;
  components: SignalComponents;
  updatedAt: string;
  drivers: string[];
  highImpactCount: number;
  sampleSize: number;
};
