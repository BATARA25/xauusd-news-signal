import { NextResponse } from 'next/server';
import { collectNews } from '@/src/news';
import { buildSignal } from '@/src/signal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const receivedAt = new Date().toISOString();
  try {
    const realtime = new URL(request.url).searchParams.get('realtime') === '1';
    const news = await collectNews({ realtime });
    const analyzedAt = new Date().toISOString();

    let market: { price?: number; priceUpdatedAt?: string } = {};
    try {
      const priceResponse = await fetch('https://xaus.com/api/v1/spot?compact=1', {
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
        headers: { Accept: 'application/json' },
      });
      if (priceResponse.ok) {
        const data = await priceResponse.json();
        const price = Number(data?.spot_usd_oz ?? data?.xau?.price);
        if (Number.isFinite(price)) {
          market = { price, priceUpdatedAt: data?.updated_at ?? new Date().toISOString() };
        }
      }
    } catch {}

    const signal = buildSignal(news, Date.now(), market);
    const signalAt = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      signal,
      updatedAt: signal.updatedAt,
      receivedAt,
      analyzedAt,
      signalAt,
      analysisLatencyMs: Math.max(0, Date.parse(analyzedAt) - Date.parse(receivedAt)),
      signalLatencyMs: Math.max(0, Date.parse(signalAt) - Date.parse(receivedAt))
    });
  } catch (error) {
    console.error('[signal] route failed', error);
    return NextResponse.json({ ok: false, error: 'signal_failed' }, { status: 502 });
  }
}
