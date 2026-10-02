import type { NewsEvent } from '../news/types';

const EVENT_PATTERNS: Array<{ pattern: RegExp; name: string; id: string }> = [
  { pattern: /non[- ]farm payroll|\bnfp\b|payrolls?/i, name: 'US Nonfarm Payrolls', id: 'US_NFP' },
  { pattern: /consumer price index|\bcpi\b|inflation/i, name: 'US CPI / Inflation', id: 'US_CPI' },
  { pattern: /producer price index|\bppi\b/i, name: 'US PPI', id: 'US_PPI' },
  { pattern: /fomc|federal open market committee/i, name: 'FOMC', id: 'US_FOMC' },
  { pattern: /fed(eral reserve)? .*rate|interest rate decision|rate decision/i, name: 'Fed Rate Decision', id: 'US_RATE' },
  { pattern: /gross domestic product|\bgdp\b/i, name: 'US GDP', id: 'US_GDP' },
  { pattern: /retail sales/i, name: 'US Retail Sales', id: 'US_RETAIL_SALES' },
  { pattern: /pce price index|\bpce\b/i, name: 'US PCE', id: 'US_PCE' },
];

export function detectEvent(text: string): NewsEvent | undefined {
  const match = EVENT_PATTERNS.find((event) => event.pattern.test(text));
  return match ? { id: match.id, name: match.name } : undefined;
}
