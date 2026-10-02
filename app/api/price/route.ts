import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const response = await fetch('https://xaus.com/api/v1/spot?compact=1', {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('price_upstream_' + response.status);
    const data = await response.json();
    const value = Number(data?.spot_usd_oz ?? data?.xau?.price);
    if (!Number.isFinite(value)) throw new Error('invalid_price');
    return NextResponse.json({
      ok: true,
      price: value,
      updatedAt: data?.updated_at ?? new Date().toISOString(),
      source: 'xaus.com',
      stale: data?.data_state?.status === 'stale',
    });
  } catch (error) {
    console.error('[price] route failed', error);
    return NextResponse.json({ ok: false, error: 'price_failed' }, { status: 502 });
  }
}
