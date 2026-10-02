const STOP_WORDS = new Set(['the','a','an','of','to','in','on','for','and','or','is','are','as','at','by','with','from','after','before','says','said']);

export function tokenize(title: string): string[] {
  return [...new Set(title.toLowerCase().replace(/[^a-z0-9\\s]/g, ' ').split(/\\s+/).filter((word) => word && !STOP_WORDS.has(word)))];
}

export function similarity(a: string, b: string): number {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

export function noveltyScore(title: string, previousTitles: string[]): number {
  if (!previousTitles.length) return 1;
  const maxSimilarity = Math.max(...previousTitles.map((candidate) => similarity(title, candidate)));
  return Math.max(0, Math.min(1, 1 - maxSimilarity));
}

export function canonicalHeadline(title: string): string {
  return tokenize(title).sort().join(' ');
}
