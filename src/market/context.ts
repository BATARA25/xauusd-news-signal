export type MarketSnapshot = {
  goldPrice?: number;
  goldReturn1h?: number;
  goldReturn4h?: number;
  goldEma20?: number;
  goldEma50?: number;
  goldAtr14?: number;
  dxyPrice?: number;
  dxyReturn1h?: number;
  us10y?: number;
  us10yChange1h?: number;
  vix?: number;
  vixChange1h?: number;
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  trendRegime: 'BULL' | 'BEAR' | 'RANGE';
  macroAlignment: number;
  updatedAt: string;
};

type YahooChart = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
  };
};

const SYMBOLS = {
  gold: 'GC=F',
  dxy: 'DX-Y.NYB',
  us10y: '^TNX',
  vix: '^VIX',
} as const;

function finite(values: Array<number | null | undefined>): number[] {
  return values.filter((v): v is number => Number.isFinite(v));
}

function ema(values: number[], period: number): number | undefined {
  if (values.length < period) return undefined;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (const value of values.slice(period)) e = value * k + e * (1 - k);
  return e;
}

function returns(values: number[], bars: number): number | undefined {
  if (values.length <= bars) return undefined;
  const from = values[values.length - 1 - bars];
  const to = values[values.length - 1];
  return from ? (to - from) / from : undefined;
}

function atr(values: number[], period = 14): number | undefined {
  if (values.length < period + 1) return undefined;
  const ranges: number[] = [];
  for (let i = 1; i < values.length; i++) ranges.push(Math.abs(values[i] - values[i - 1]));
  const recent = ranges.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

async function fetchSeries(symbol: string): Promise<number[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=false`;
  const response = await fetch(url, {
    next: { revalidate: 5 },
    signal: AbortSignal.timeout(3500),
    headers: { Accept: 'application/json', 'User-Agent': 'NewsXLeak/1.0' },
  });
  if (!response.ok) throw new Error(`Yahoo ${symbol}: HTTP ${response.status}`);
  const data = (await response.json()) as YahooChart;
  return finite(data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []);
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const entries = await Promise.allSettled(
    Object.entries(SYMBOLS).map(async ([key, symbol]) => [key, await fetchSeries(symbol)] as const),
  );
  const series: Partial<Record<keyof typeof SYMBOLS, number[]>> = {};
  for (const entry of entries) {
    if (entry.status === 'fulfilled') series[entry.value[0] as keyof typeof SYMBOLS] = entry.value[1];
  }

  const gold = series.gold ?? [];
  const dxy = series.dxy ?? [];
  const us10y = series.us10y ?? [];
  const vix = series.vix ?? [];

  const goldPrice = gold.at(-1);
  const goldEma20 = ema(gold, 20);
  const goldEma50 = ema(gold, 50);
  const goldAtr14 = atr(gold);
  const goldReturn1h = returns(gold, 12);
  const goldReturn4h = returns(gold, 48);
  const dxyPrice = dxy.at(-1);
  const dxyReturn1h = returns(dxy, 12);
  const us10yValue = us10y.at(-1);
  const us10yChange1h = us10y.length > 12 ? (us10y.at(-1)! - us10y.at(-13)!) : undefined;
  const vixValue = vix.at(-1);
  const vixChange1h = returns(vix, 12);

  const atrPct = goldPrice && goldAtr14 ? goldAtr14 / goldPrice : 0;
  const volatilityRegime = atrPct > 0.0025 ? 'EXTREME' : atrPct > 0.0017 ? 'HIGH' : atrPct < 0.0008 ? 'LOW' : 'NORMAL';

  const trend =
    goldPrice !== undefined && goldEma20 !== undefined && goldEma50 !== undefined
      ? goldPrice > goldEma20 && goldEma20 > goldEma50
        ? 'BULL'
        : goldPrice < goldEma20 && goldEma20 < goldEma50
          ? 'BEAR'
          : 'RANGE'
      : 'RANGE';

  // Macro alignment is intentionally a confirmation factor, not a standalone signal:
  // gold tends to face pressure from rising USD/yields and support from falling USD/yields.
  const goldTrend = trend === 'BULL' ? 1 : trend === 'BEAR' ? -1 : 0;
  const usdFactor = dxyReturn1h === undefined ? 0 : -Math.sign(dxyReturn1h);
  const yieldFactor = us10yChange1h === undefined ? 0 : -Math.sign(us10yChange1h);
  const macroAlignment = Math.max(-1, Math.min(1, goldTrend * 0.4 + usdFactor * 0.3 + yieldFactor * 0.3));

  return {
    goldPrice,
    goldReturn1h,
    goldReturn4h,
    goldEma20,
    goldEma50,
    goldAtr14,
    dxyPrice,
    dxyReturn1h,
    us10y: us10yValue,
    us10yChange1h,
    vix: vixValue,
    vixChange1h,
    volatilityRegime,
    trendRegime: trend,
    macroAlignment,
    updatedAt: new Date().toISOString(),
  };
}
