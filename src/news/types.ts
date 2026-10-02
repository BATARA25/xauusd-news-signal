export type NewsImpact = 'HIGH' | 'MEDIUM' | 'LOW';
export type NewsDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type NewsSourceTier = 'OFFICIAL' | 'PREMIUM' | 'REPUTABLE' | 'AGGREGATOR' | 'UNKNOWN';

export type NewsEvent = {
  id: string;
  name: string;
  releaseAt?: string;
  actual?: number;
  forecast?: number;
  previous?: number;
  unit?: string;
};

export type News = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  impact: NewsImpact;
  direction: NewsDirection;
  score: number;
  summary: string;
  event?: NewsEvent;
  sourceTier?: NewsSourceTier;
  sourceQuality?: number;
  novelty?: number;
  marketMoving?: number;
  duplicateOf?: string;
  canonicalHeadline?: string;
};
