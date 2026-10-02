import { NextResponse } from 'next/server';
import { collectNews } from '@/src/news';
import { buildSignal } from '@/src/signal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const news = await collectNews();
    const signal = buildSignal(news);
    return NextResponse.json({ ok: true, signal, updatedAt: signal.updatedAt });
  } catch (error) {
    console.error('[signal] route failed', error);
    return NextResponse.json({ ok: false, error: 'signal_failed' }, { status: 502 });
  }
}
