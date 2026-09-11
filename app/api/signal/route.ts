import { NextResponse } from 'next/server';
import { collectNews } from '@/src/news';
import { buildSignal } from '@/src/signal';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const news = await collectNews();
    return NextResponse.json({ ok: true, signal: buildSignal(news) });
  } catch {
    return NextResponse.json({ ok: false, error: 'signal_failed' }, { status: 502 });
  }
}
