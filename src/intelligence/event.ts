import type { NewsEvent } from '../news/types';
import { nearestScheduledEvent } from './schedule';

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

function parseNumber(value: string): number | undefined {
  const normalized = value.replace(/,/g, '').trim().toLowerCase();
  const multiplier = normalized.endsWith('k') ? 1000 : normalized.endsWith('m') ? 1000000 : 1;
  const numeric = Number(normalized.replace(/[km]$/, ''));
  return Number.isFinite(numeric) ? numeric * multiplier : undefined;
}

function extractMetric(text: string, labels: string[]): number | undefined {
  const pattern = new RegExp('(?:' + labels.join('|') + ')\\s*(?:was|is|came in at|reported at|:)?\\s*(-?\\d+(?:,\\d{3})*(?:\\.\\d+)?(?:[km])?)', 'i');
  return parseNumber(pattern.exec(text)?.[1] ?? '');
}

function enrichEventValues(event: NewsEvent, text: string): NewsEvent {
  const actual = extractMetric(text, ['actual', 'actuals', 'came in']);
  const forecast = extractMetric(text, ['forecast', 'expected', 'estimate', 'consensus']);
  const previous = extractMetric(text, ['previous', 'prior']);
  return {
    ...event,
    ...(actual !== undefined ? { actual } : {}),
    ...(forecast !== undefined ? { forecast } : {}),
    ...(previous !== undefined ? { previous } : {}),
  };
}

export function detectEvent(text: string, publishedAt = new Date().toISOString()): NewsEvent | undefined {
  const match = EVENT_PATTERNS.find((event) => event.pattern.test(text));
  if (!match) return undefined;
  const scheduled = nearestScheduledEvent(match.id, publishedAt);
  const event = scheduled
    ? { id: match.id, name: match.name, releaseAt: scheduled.releaseAt }
    : { id: match.id, name: match.name };
  return enrichEventValues(event, text);
}
