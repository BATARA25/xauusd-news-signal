export type SourceTier = 'OFFICIAL' | 'PREMIUM' | 'REPUTABLE' | 'AGGREGATOR' | 'UNKNOWN';

const OFFICIAL = /federal reserve|federalreserve\.gov|bureau of labor statistics|bls\.gov|u\.s\. treasury|treasury\.gov|ecb|bank of england|bank of japan/i;
const PREMIUM = /bloomberg|reuters|financial times|wall street journal|cnbc|marketwatch/i;
const REPUTABLE = /investing\.com|forexlive|fxstreet|kitco|dailyfx|yahoo finance/i;
const AGGREGATOR = /google news/i;

export function classifySource(source: string): SourceTier {
  if (OFFICIAL.test(source)) return 'OFFICIAL';
  if (PREMIUM.test(source)) return 'PREMIUM';
  if (REPUTABLE.test(source)) return 'REPUTABLE';
  if (AGGREGATOR.test(source)) return 'AGGREGATOR';
  return 'UNKNOWN';
}

export function sourceQualityScore(source: string): number {
  switch (classifySource(source)) {
    case 'OFFICIAL': return 1;
    case 'PREMIUM': return 0.92;
    case 'REPUTABLE': return 0.78;
    case 'AGGREGATOR': return 0.55;
    default: return 0.4;
  }
}
