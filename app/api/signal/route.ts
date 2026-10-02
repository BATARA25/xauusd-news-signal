import { NextResponse } from 'next/server';
import { collectNews } from '@/src/news';
import { buildSignal } from '@/src/signal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const realtime = new URL(request.url).searchParams.get('realtime') === '1';
    const news = await collectNews({ realtime });
    const signal = buildSignal(news);
    return NextResponse.json({ ok: true, signal, updatedAt: signal.updatedAt });
  } catch (error) {
    console.error('[signal] route failed', error);
    return NextResponse.json({ ok: false, error: 'signal_failed' }, { status: 502 });
  }
}
