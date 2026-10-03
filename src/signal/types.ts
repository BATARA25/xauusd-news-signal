import type { NewsImpact } from '../news/types';
import type { MarketSnapshot } from '../market';

export type SignalBias = 'BUY' | 'SELL' | 'WAIT';
export type SignalPhase = 'PRE_RELEASE' | 'POST_RELEASE' | 'CONTEXT';

export type SignalComponents = {
  context: number;
  confirmation: number;
  surprise: number;
  reaction: number;
  marketRegime: number;
  macroAlignment: number;
  crossAsset: number;
  conflictPenalty: number;
};

export type OutcomeHorizon = '1m' | '5m' | '15m' | '30m' | '60m';

export type SignalOutcome = {
  horizon: OutcomeHorizon;
  entryPrice?: number;
  exitPrice?: number;
  returnPct?: number;
  rMultiple?: number;
  mfePct?: number;
  maePct?: number;
  hitTarget?: boolean;
  hitStop?: boolean;
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
  riskReward?: number;
  volatilityRegime?: MarketSnapshot['volatilityRegime'];
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
  market?: MarketSnapshot;
  regime: MarketSnapshot['trendRegime'];
  volatility: MarketSnapshot['volatilityRegime'];
  signalId: string;
  outcome?: Partial<Record<OutcomeHorizon, SignalOutcome>>;
};