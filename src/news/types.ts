export type NewsImpact = 'HIGH' | 'MEDIUM' | 'LOW';
export type NewsDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

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
};
