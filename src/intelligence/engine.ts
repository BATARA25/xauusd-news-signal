import type { News } from '../news/types';
import { canonicalHeadline, noveltyScore, similarity } from './novelty';
import { classifySource, sourceQualityScore } from './source';

export type IntelligenceMetadata = {
  sourceTier: ReturnType<typeof classifySource>;
  sourceQuality: number;
  novelty: number;
  marketMoving: number;
  duplicateOf?: string;
};

function marketMovingScore(item: News, sourceQuality: number, novelty: number): number {
  const impact = item.impact === 'HIGH' ? 1 : item.impact === 'MEDIUM' ? 0.65 : 0.3;
  const direction = item.direction === 'NEUTRAL' ? 0.35 : 1;
  return Math.max(0, Math.min(1, impact * 0.5 + sourceQuality * 0.25 + novelty * 0.15 + direction * 0.1));
}

export function enrichNews(items: News[]): News[] {
  const accepted: News[] = [];
  const titleMemory: string[] = [];

  for (const item of items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))) {
    const quality = sourceQualityScore(item.source);
    const novelty = noveltyScore(item.title, titleMemory);
    const canonical = canonicalHeadline(item.title);
    const duplicate = accepted.find((candidate) => similarity(candidate.title, item.title) >= 0.72);

    const enriched: News = {
      ...item,
      sourceTier: classifySource(item.source),
      sourceQuality: quality,
      novelty,
      marketMoving: marketMovingScore(item, quality, novelty),
      duplicateOf: duplicate?.id,
      canonicalHeadline: canonical,
    };

    if (!duplicate || quality > duplicate.sourceQuality) {
      accepted.push(enriched);
      titleMemory.push(item.title);
    }
  }

  return accepted
    .sort((a, b) => (b.marketMoving ?? 0) - (a.marketMoving ?? 0) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 50);
}
