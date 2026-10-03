import { NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/src/market';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const horizons = [
  ['1m', 1], ['5m', 5], ['15m', 15], ['30m', 30], ['60m', 60],
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      signalId?: string;
      side?: 'BUY' | 'SELL';
      entryPrice?: number;
      stopLoss?: number;
      takeProfit1?: number;
      capturedAt?: string;
    };

    if (!body.signalId || !body.side || !Number.isFinite(body.entryPrice)) {
      return NextResponse.json({ ok: false, error: 'invalid_outcome_request' }, { status: 400 });
    }

    const market = await getMarketSnapshot();
    const current = market.goldPrice;
    if (!Number.isFinite(current)) {
      return NextResponse.json({ ok: false, error: 'market_price_unavailable' }, { status: 503 });
    }

    const risk = Number.isFinite(body.stopLoss)
      ? Math.abs(Number(body.entryPrice) - Number(body.stopLoss))
      : undefined;

    const direction = body.side === 'BUY' ? 1 : -1;
    const move = (current! - Number(body.entryPrice)) * direction;
    const returnPct = (move / Number(body.entryPrice)) * 100;
    const rMultiple = risk && risk > 0 ? move / risk : undefined;

    const outcome = Object.fromEntries(
      horizons.map(([horizon, minutes]) => [
        horizon,
        {
          horizon,
          entryPrice: Number(body.entryPrice),
          exitPrice: current,
          returnPct,
          rMultiple,
          capturedAt: new Date().toISOString(),
          horizonMinutes: minutes,
        },
      ]),
    );

    return NextResponse.json({
      ok: true,
      signalId: body.signalId,
      side: body.side,
      capturedAt: body.capturedAt ?? null,
      currentPrice: current,
      outcome,
      note: 'This endpoint captures the current mark-to-market observation. A scheduled sampler should persist observations at each horizon for realized MFE/MAE and target/stop hit classification.',
    });
  } catch (error) {
    console.error('[outcome] failed', error);
    return NextResponse.json({ ok: false, error: 'outcome_failed' }, { status: 500 });
  }
}
